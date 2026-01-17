import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js'; // Gunakan config.js bukan dotenv
import {
    getChapters,
    getDramaDetail,
    getDetailsv2,
    batchDownload,
    getDramaList,
    getCategories,
    getBookFromCategories,
    getRecommendedBooks,
    searchDrama,
    searchDramaIndex
} from './dramabox/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (config.debug) {
        console.log('Query:', req.query);
        console.log('Params:', req.params);
    }
    next();
});

// ==================== PRETTY PRINT MIDDLEWARE ====================
app.use((req, res, next) => {
    // Skip middleware untuk root endpoint (karena kita pakai HTML)
    if (req.path === '/' || req.path === '') {
        return next();
    }
    
    const originalJson = res.json;
    res.json = function(data) {
        const isPretty = req.query.pretty === 'true' || 
                        req.query.format === 'pretty' || 
                        req.query.p === '1';
        
        if (isPretty) {
            const indent = parseInt(req.query.indent) || 2;
            res.setHeader('Content-Type', 'application/json');
            return res.send(JSON.stringify(data, null, indent));
        }
        return originalJson.call(this, data);
    };
    next();
});

// ==================== API ROUTES ====================

// Root endpoint - Serve HTML documentation
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: {
            port: config.port,
            debug: config.debug,
            version: config.version
        }
    });
});

// ==================== STATS ENDPOINT ====================
app.get('/api/stats', (req, res) => {
    const stats = {
        status: 'online',
        timestamp: new Date().toISOString(),
        server: {
            port: PORT,
            environment: config.environment || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            configSource: 'config.js'
        },
        memoryUsage: process.memoryUsage().heapUsed,
        uptime: process.uptime(),
        config: {
            debug: config.debug,
            version: config.version,
            corsEnabled: config.cors !== false
        },
        endpoints: {
            total: 10,
            active: true
        }
    };
    
    const isPretty = req.query.pretty === 'true';
    if (isPretty) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(stats, null, 2));
    } else {
        res.json(stats);
    }
});

// ==================== DRAMA ENDPOINTS ====================
// Get drama list
app.get('/api/drama/list', async (req, res) => {
    try {
        const { pageNo = 1, log = false } = req.query;
        const data = await getDramaList(parseInt(pageNo), log === 'true');
        res.json({
            success: true,
            data,
            page: parseInt(pageNo)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get categories
app.get('/api/drama/categories', async (req, res) => {
    try {
        const { pageNo = 1 } = req.query;
        const data = await getCategories(parseInt(pageNo));
        res.json({
            success: true,
            data,
            page: parseInt(pageNo)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get books from category
app.get('/api/drama/category/:typeTwoId', async (req, res) => {
    try {
        const { typeTwoId } = req.params;
        const { pageNo = 1 } = req.query;
        const data = await getBookFromCategories(parseInt(typeTwoId), parseInt(pageNo));
        res.json({
            success: true,
            data,
            categoryId: parseInt(typeTwoId),
            page: parseInt(pageNo)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get recommended books
app.get('/api/drama/recommended', async (req, res) => {
    try {
        const { log = false } = req.query;
        const data = await getRecommendedBooks(log === 'true');
        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get drama detail
app.get('/api/drama/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { needRecommend = false } = req.query;
        const data = await getDramaDetail(bookId, needRecommend === 'true');
        res.json({
            success: true,
            data,
            bookId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get drama detail v2
app.get('/api/drama/:bookId/v2', async (req, res) => {
    try {
        const { bookId } = req.params;
        const data = await getDetailsv2(bookId);
        res.json({
            success: true,
            data,
            bookId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== CHAPTER ENDPOINTS ====================

// Get chapters
app.get('/api/chapter/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { log = false } = req.query;
        const data = await getChapters(bookId, log === 'true');
        res.json({
            success: true,
            data,
            bookId,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Batch download chapters
app.post('/api/chapter/batch-download', async (req, res) => {
    try {
        const { bookId, chapterIdList } = req.body;
        
        if (!bookId || !chapterIdList || !Array.isArray(chapterIdList)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request. Requires bookId and chapterIdList array'
            });
        }
        
        const data = await batchDownload(bookId, chapterIdList);
        res.json({
            success: true,
            data,
            bookId,
            chaptersCount: chapterIdList.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== SEARCH ENDPOINTS ====================

// Search drama
app.get('/api/search', async (req, res) => {
    try {
        const { keyword, log = false } = req.query;
        
        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: 'Keyword is required'
            });
        }
        
        const data = await searchDrama(keyword, log === 'true');
        res.json({
            success: true,
            data,
            keyword,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get hot search list
app.get('/api/search/hot', async (req, res) => {
    try {
        const { log = false } = req.query;
        const data = await searchDramaIndex(log === 'true');
        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.url,
        availableEndpoints: {
            docs: 'GET /',
            health: 'GET /health',
            stats: 'GET /api/stats',
            drama: {
                list: 'GET /api/drama/list',
                categories: 'GET /api/drama/categories',
                detail: 'GET /api/drama/:bookId',
                recommended: 'GET /api/drama/recommended'
            }
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
        stack: config.debug ? err.stack : undefined
    });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║           DramaBox API Documentation Server       ║
║                by lannzephry                      ║
╠═══════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                  ║
║  📍 Local URL: http://localhost:${PORT}              ║
║  📚 API Docs: http://localhost:${PORT}/             ║
║  🩺 Health Check: http://localhost:${PORT}/health    ║
║  ⚙️  Config Source: config.js                      ║
║  🐞 Debug Mode: ${config.debug ? 'ENABLED' : 'DISABLED'}          ║
╚═══════════════════════════════════════════════════╝
    `);
    
    if (config.debug) {
        console.log('\n🔧 Configuration:', config);
    }
});

export default app;