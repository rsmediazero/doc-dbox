// Configuration
const API_BASE = window.location.origin;
let startTime = new Date();

// DOM Elements
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    notificationContainer: document.getElementById('notificationContainer'),
    quickEndpoint: document.getElementById('quickEndpoint'),
    responseQuick: document.getElementById('response-quick'),
    serverPort: document.getElementById('serverPort'),
    debugStatus: document.getElementById('debugStatus'),
    uptime: document.getElementById('uptime'),
    memoryUsage: document.getElementById('memoryUsage'),
    endpointCount: document.getElementById('endpointCount'),
    nodeVersion: document.getElementById('nodeVersion'),
    environment: document.getElementById('environment'),
    configInfo: document.getElementById('configInfo')
};

// Utility Functions
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    elements.notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

function showLoading(message) {
    elements.loadingText.textContent = message;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function formatJson(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return JSON.stringify(parsed, null, 2);
    } catch {
        return data;
    }
}

// API Test Functions
async function quickTest(pretty = false) {
    const endpoint = elements.quickEndpoint.value.trim();
    if (!endpoint) {
        showNotification('Please enter an endpoint', 'error');
        return;
    }
    
    showLoading('Testing endpoint...');
    
    try {
        let url = API_BASE + endpoint;
        if (pretty) url += (url.includes('?') ? '&' : '?') + 'pretty=true';
        
        const response = await fetch(url);
        const data = await response.json();
        
        elements.responseQuick.innerHTML = `
            <div style="margin-bottom: 1rem; padding: 0.5rem; background: ${response.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; border-radius: 4px; border-left: 4px solid ${response.ok ? '#10b981' : '#ef4444'}">
                <strong>${response.status} ${response.statusText}</strong><br>
                <small>${url}</small>
            </div>
            <pre>${formatJson(data)}</pre>
        `;
        
        showNotification('Test completed successfully', 'success');
    } catch (error) {
        elements.responseQuick.innerHTML = `<div style="color: #ef4444">Error: ${error.message}</div>`;
        showNotification('Test failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function clearQuickTest() {
    elements.quickEndpoint.value = '';
    elements.responseQuick.innerHTML = '<div class="placeholder"><i class="fas fa-arrow-down"></i><p>Response will appear here</p></div>';
}

// Specific Endpoint Tests
async function testDramaList() {
    const page = document.getElementById('dramaListPage').value || 1;
    const log = document.getElementById('dramaListLog').value;
    elements.quickEndpoint.value = `/api/drama/list?pageNo=${page}&log=${log}`;
    await quickTest();
}

async function testDramaDetail() {
    const bookId = document.getElementById('dramaDetailId').value || '1';
    const needRecommend = document.getElementById('dramaDetailRecommend').value;
    elements.quickEndpoint.value = `/api/drama/${bookId}?needRecommend=${needRecommend}`;
    await quickTest();
}

async function testChapterList() {
    const bookId = document.getElementById('chapterListId').value || '1';
    elements.quickEndpoint.value = `/api/chapter/${bookId}`;
    await quickTest();
}

async function testBatchDownload() {
    const bookId = document.getElementById('batchBookId').value || '1';
    const chapterIds = document.getElementById('batchChapterIds').value || '[1,2,3]';
    
    showLoading('Testing batch download...');
    
    try {
        const response = await fetch(API_BASE + '/api/chapter/batch-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookId: bookId,
                chapterIdList: JSON.parse(chapterIds)
            })
        });
        
        const data = await response.json();
        elements.responseQuick.innerHTML = `<pre>${formatJson(data)}</pre>`;
        showNotification('Batch download test completed', 'success');
    } catch (error) {
        showNotification('Test failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function testSearch() {
    const keyword = document.getElementById('searchKeyword').value || 'love';
    elements.quickEndpoint.value = `/api/search?keyword=${encodeURIComponent(keyword)}`;
    await quickTest();
}

async function testHotSearch() {
    elements.quickEndpoint.value = '/api/search/hot';
    await quickTest();
}

// Server Info Functions
async function refreshServerInfo() {
    showLoading('Loading server info...');
    
    try {
        // Get stats from API
        const response = await fetch(API_BASE + '/api/stats');
        const data = await response.json();
        
        // Update UI
        if (data.memoryUsage) {
            const memoryMB = Math.round(data.memoryUsage / 1024 / 1024);
            elements.memoryUsage.textContent = `${memoryMB} MB`;
        }
        
        elements.nodeVersion.textContent = data.server?.nodeVersion || 'Unknown';
        elements.environment.textContent = data.server?.environment || 'Unknown';
        elements.configInfo.textContent = formatJson(data.config || {});
        
        showNotification('Server info updated', 'success');
    } catch (error) {
        showNotification('Failed to load server info', 'error');
    } finally {
        hideLoading();
    }
}

async function loadConfig() {
    try {
        const response = await fetch(API_BASE + '/health');
        const data = await response.json();
        elements.configInfo.textContent = formatJson(data.config || {});
        showNotification('Configuration reloaded', 'success');
    } catch (error) {
        showNotification('Failed to load config', 'error');
    }
}

// Uptime Counter
function updateUptime() {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    let uptime = '';
    if (hours > 0) uptime += `${hours}h `;
    if (minutes > 0) uptime += `${minutes}m `;
    uptime += `${seconds}s`;
    
    elements.uptime.textContent = uptime;
}

// Initialize
function initDocumentation() {
    // Set server port
    elements.serverPort.textContent = `Port ${window.location.port || '80'}`;
    
    // Start uptime counter
    setInterval(updateUptime, 1000);
    
    // Load initial server info
    refreshServerInfo();
    
    // Enable Enter key for quick test
    elements.quickEndpoint.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') quickTest();
    });
    
    // Show welcome message
    setTimeout(() => {
        showNotification('DramaBox API Documentation loaded successfully!', 'success', 5000);
    }, 1000);
}

// Global exports
window.quickTest = quickTest;
window.clearQuickTest = clearQuickTest;
window.testDramaList = testDramaList;
window.testDramaDetail = testDramaDetail;
window.testChapterList = testChapterList;
window.testBatchDownload = testBatchDownload;
window.testSearch = testSearch;
window.testHotSearch = testHotSearch;
window.refreshServerInfo = refreshServerInfo;
window.loadConfig = loadConfig;