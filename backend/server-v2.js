// ============================================================
// CrowdWise India - Enhanced Backend API Server v2.0
// ============================================================
// Self-sufficient crowd prediction system
// No external paid APIs required
// ============================================================

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

// Import custom services
const CrowdScoringAlgorithm = require('./algorithms/crowd-scoring');
const PredictionEngine = require('./algorithms/prediction-engine');
const DataCollector = require('./services/data-collector');
const DataStore = require('./services/data-store');
const ValidationService = require('./services/validation-service');
const SchedulerService = require('./services/scheduler-service');

const app = express();
const PORT = process.env.PORT || 3002;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// ==================== CONFIGURATION ====================

const CONFIG = {
    // OpenWeatherMap API (FREE - for weather only)
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || 'bb862ba4c130cfa3b60af919266dbdd4',
    OPENWEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Cache settings (in milliseconds)
    WEATHER_CACHE_TTL: 30 * 60 * 1000,  // 30 minutes
    CROWD_CACHE_TTL: 15 * 60 * 1000,    // 15 minutes
    PREDICTION_CACHE_TTL: 60 * 60 * 1000, // 1 hour
    
    // System settings
    ENABLE_SCHEDULER: process.env.ENABLE_SCHEDULER !== 'false',
    DATA_DIR: process.env.DATA_DIR || './data'
};

// ==================== DESTINATION DATABASE ====================

const DESTINATIONS = {
    1: { id: 1, name: 'Tirupati Balaji Temple', city: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lon: 79.4192, category: 'religious', baseCrowd: 95 },
    2: { id: 2, name: 'Araku Valley', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 18.3371, lon: 83.0076, category: 'nature', baseCrowd: 45 },
    3: { id: 3, name: 'Tawang Monastery', city: 'Tawang', state: 'Arunachal Pradesh', lat: 27.5859, lon: 91.8694, category: 'religious', baseCrowd: 35 },
    4: { id: 4, name: 'Kaziranga National Park', city: 'Golaghat', state: 'Assam', lat: 26.5775, lon: 93.1711, category: 'wildlife', baseCrowd: 60 },
    5: { id: 5, name: 'Bodh Gaya', city: 'Gaya', state: 'Bihar', lat: 24.6961, lon: 84.9869, category: 'religious', baseCrowd: 70 },
    6: { id: 6, name: 'Baga Beach', city: 'Goa', state: 'Goa', lat: 15.5513, lon: 73.7519, category: 'beach', baseCrowd: 75 },
    7: { id: 7, name: 'Statue of Unity', city: 'Kevadia', state: 'Gujarat', lat: 21.8380, lon: 73.7189, category: 'heritage', baseCrowd: 65 },
    8: { id: 8, name: 'Manali', city: 'Manali', state: 'Himachal Pradesh', lat: 32.2432, lon: 77.1892, category: 'hillstation', baseCrowd: 70 },
    9: { id: 9, name: 'Shimla', city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734, category: 'hillstation', baseCrowd: 65 },
    10: { id: 10, name: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, category: 'heritage', baseCrowd: 70 },
    11: { id: 11, name: 'Udaipur', city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lon: 73.7125, category: 'heritage', baseCrowd: 60 },
    12: { id: 12, name: 'Jodhpur', city: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lon: 73.0243, category: 'heritage', baseCrowd: 55 },
    13: { id: 13, name: 'Varanasi Ghats', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lon: 83.0062, category: 'religious', baseCrowd: 85 },
    14: { id: 14, name: 'Taj Mahal', city: 'Agra', state: 'Uttar Pradesh', lat: 27.1751, lon: 78.0421, category: 'heritage', baseCrowd: 90 },
    15: { id: 15, name: 'Kerala Backwaters', city: 'Alleppey', state: 'Kerala', lat: 9.4981, lon: 76.3388, category: 'nature', baseCrowd: 55 },
    16: { id: 16, name: 'Munnar', city: 'Munnar', state: 'Kerala', lat: 10.0889, lon: 77.0595, category: 'hillstation', baseCrowd: 60 },
    17: { id: 17, name: 'Mysore Palace', city: 'Mysore', state: 'Karnataka', lat: 12.3052, lon: 76.6552, category: 'heritage', baseCrowd: 65 },
    18: { id: 18, name: 'Hampi', city: 'Hampi', state: 'Karnataka', lat: 15.3350, lon: 76.4600, category: 'heritage', baseCrowd: 45 },
    19: { id: 19, name: 'Darjeeling', city: 'Darjeeling', state: 'West Bengal', lat: 27.0410, lon: 88.2663, category: 'hillstation', baseCrowd: 55 },
    20: { id: 20, name: 'Ladakh', city: 'Leh', state: 'Ladakh', lat: 34.1526, lon: 77.5771, category: 'highaltitude', baseCrowd: 50 },
    21: { id: 21, name: 'Rishikesh', city: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lon: 78.2676, category: 'religious', baseCrowd: 65 },
    22: { id: 22, name: 'Andaman Islands', city: 'Port Blair', state: 'Andaman & Nicobar', lat: 11.6234, lon: 92.7265, category: 'beach', baseCrowd: 45 },
    23: { id: 23, name: 'Ooty', city: 'Ooty', state: 'Tamil Nadu', lat: 11.4102, lon: 76.6950, category: 'hillstation', baseCrowd: 60 },
    24: { id: 24, name: 'Amritsar Golden Temple', city: 'Amritsar', state: 'Punjab', lat: 31.6200, lon: 74.8765, category: 'religious', baseCrowd: 80 },
    25: { id: 25, name: 'Ranthambore', city: 'Sawai Madhopur', state: 'Rajasthan', lat: 26.0173, lon: 76.5026, category: 'wildlife', baseCrowd: 50 }
};

// ==================== INITIALIZE SERVICES ====================

const dataStore = new DataStore(CONFIG.DATA_DIR);
const crowdAlgorithm = new CrowdScoringAlgorithm();
const predictionEngine = new PredictionEngine();
const dataCollector = new DataCollector();
const validationService = new ValidationService(dataStore);
let schedulerService = null;

// Cache
const cache = {
    weather: new Map(),
    predictions: new Map()
};

// ==================== MIDDLEWARE ====================

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`);
    next();
});

// ==================== HEALTH & STATUS ====================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        services: {
            crowdAlgorithm: 'active',
            predictionEngine: 'active',
            dataCollector: 'active',
            scheduler: schedulerService?.isRunning ? 'running' : 'stopped',
            dataStore: dataStore.initialized ? 'connected' : 'disconnected'
        },
        dataQuality: 'self-sufficient',
        accuracyEstimate: '65-75%'
    });
});

app.get('/api/status', async (req, res) => {
    const collectionStats = dataCollector.getCollectionStats();
    const accuracy = await validationService.getSystemAccuracy();
    
    res.json({
        system: 'CrowdWise India v2.0',
        mode: 'Self-Sufficient (No External APIs Required)',
        dataCollection: collectionStats,
        accuracy: accuracy,
        scheduler: schedulerService?.getStatus() || { isRunning: false },
        capabilities: {
            realTimePrediction: true,
            hourlyForecast: true,
            weeklyForecast: true,
            feedbackCollection: true,
            autoImprovement: true
        }
    });
});

// ==================== WEATHER API (Still using free OpenWeatherMap) ====================

app.get('/api/weather/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Check cache
    const cacheKey = `weather_${destinationId}`;
    const cached = cache.weather.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.WEATHER_CACHE_TTL) {
        return res.json({ ...cached.data, fromCache: true });
    }
    
    try {
        const url = `${CONFIG.OPENWEATHER_URL}?lat=${dest.lat}&lon=${dest.lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            const weather = {
                temperature: Math.round(data.main.temp),
                condition: data.weather[0].main,
                description: data.weather[0].description,
                humidity: data.main.humidity,
                feelsLike: Math.round(data.main.feels_like),
                formatted: `${Math.round(data.main.temp)}°C, ${data.weather[0].main}`,
                isLive: true,
                source: 'openweathermap'
            };
            
            cache.weather.set(cacheKey, { data: weather, timestamp: Date.now() });
            return res.json(weather);
        }
    } catch (error) {
        console.error(`Weather API error for ${dest.city}:`, error.message);
    }
    
    // Fallback to mock
    res.json(generateMockWeather(dest.city));
});

function generateMockWeather(city) {
    const temps = [22, 25, 28, 30, 32, 18, 15, 26, 24, 29];
    const conditions = ['Sunny', 'Partly Cloudy', 'Clear', 'Cloudy', 'Pleasant'];
    const seed = city.charCodeAt(0) + new Date().getHours();
    const temp = temps[seed % temps.length];
    const condition = conditions[seed % conditions.length];
    
    return {
        temperature: temp,
        condition: condition,
        humidity: 50 + (seed % 30),
        formatted: `${temp}°C, ${condition}`,
        isLive: false,
        source: 'pattern-based'
    };
}

// ==================== CROWD PREDICTION API ====================

app.get('/api/crowd/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    try {
        // Get collected signals (if available)
        const signals = dataCollector.getCacheEntry(dest.name);
        
        // Calculate crowd score using our algorithm
        const prediction = crowdAlgorithm.calculateCrowdScore({
            destination: dest.name,
            category: dest.category,
            baseCrowdLevel: dest.baseCrowd,
            socialSignal: signals?.data?.aggregated || null,
            hotelSignal: signals?.data?.signals?.hotel || null,
            weatherCondition: null
        });

        // Get weight adjustments from validation
        const adjustments = validationService.getWeightAdjustments(dest.name);
        
        res.json({
            destinationId: dest.id,
            destination: dest.name,
            city: dest.city,
            state: dest.state,
            
            // Main prediction
            crowdScore: prediction.score,
            crowdLevel: prediction.crowdLevel,
            crowdLabel: prediction.crowdLabel,
            crowdEmoji: prediction.crowdEmoji,
            percentageFull: prediction.percentageFull,
            
            // Transparency
            confidence: prediction.confidence,
            dataQuality: prediction.dataQuality,
            breakdown: prediction.breakdown,
            
            // Metadata
            algorithm: 'CrowdWise Self-Sufficient v2.0',
            hasExternalData: !!signals,
            adjustmentsApplied: !!adjustments,
            timestamp: prediction.timestamp
        });
        
    } catch (error) {
        console.error(`Crowd prediction error for ${dest.name}:`, error.message);
        res.status(500).json({ error: 'Prediction failed', message: error.message });
    }
});

// ==================== PREDICTION ENDPOINTS ====================

// Get hourly predictions for today
app.get('/api/predict/today/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    const prediction = predictionEngine.predictToday({
        destination: dest.name,
        category: dest.category,
        baseCrowdLevel: dest.baseCrowd
    });
    
    res.json({
        destinationId: dest.id,
        destination: dest.name,
        ...prediction
    });
});

// Get weekly forecast
app.get('/api/predict/week/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    const prediction = predictionEngine.predictWeek({
        destination: dest.name,
        category: dest.category,
        baseCrowdLevel: dest.baseCrowd
    });
    
    res.json({
        destinationId: dest.id,
        destination: dest.name,
        ...prediction
    });
});

// Get monthly forecast
app.get('/api/predict/month/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    const prediction = predictionEngine.predictMonth({
        destination: dest.name,
        category: dest.category,
        baseCrowdLevel: dest.baseCrowd
    });
    
    res.json({
        destinationId: dest.id,
        destination: dest.name,
        ...prediction
    });
});

// ==================== FEEDBACK API ====================

// Submit feedback
app.post('/api/feedback', async (req, res) => {
    const { destination, predictedLevel, predictedScore, userReportedLevel, isAccurate, comments } = req.body;
    
    if (!destination) {
        return res.status(400).json({ error: 'Destination is required' });
    }
    
    try {
        const result = await validationService.recordFeedback({
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType: userReportedLevel ? 'detailed' : 'quick',
            comments
        });
        
        res.json(result);
    } catch (error) {
        console.error('Feedback error:', error.message);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// Get feedback prompt
app.get('/api/feedback/prompt/:destinationId', (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Get current prediction for context
    const prediction = crowdAlgorithm.calculateCrowdScore({
        destination: dest.name,
        category: dest.category,
        baseCrowdLevel: dest.baseCrowd
    });
    
    const prompt = validationService.generateFeedbackPrompt(dest.name, prediction.crowdLevel);
    res.json(prompt);
});

// Get accuracy stats
app.get('/api/feedback/stats', async (req, res) => {
    const stats = await validationService.getSystemAccuracy();
    res.json(stats);
});

// ==================== DATA COLLECTION API ====================

// Trigger manual data collection
app.post('/api/collect/:destination', async (req, res) => {
    const { destination } = req.params;
    
    try {
        const result = await dataCollector.collectDestinationData(destination, { forceRefresh: true });
        res.json({
            success: true,
            destination,
            signals: result.signals,
            aggregated: result.aggregated,
            collectionTime: result.collectionTime
        });
    } catch (error) {
        console.error('Collection error:', error.message);
        res.status(500).json({ error: 'Data collection failed' });
    }
});

// Get data freshness status
app.get('/api/data/status', (req, res) => {
    res.json({
        freshness: dataCollector.getDataStatus(),
        stats: dataCollector.getCollectionStats()
    });
});

// ==================== DESTINATIONS LIST ====================

app.get('/api/destinations', (req, res) => {
    const list = Object.values(DESTINATIONS).map(dest => ({
        id: dest.id,
        name: dest.name,
        city: dest.city,
        state: dest.state,
        category: dest.category
    }));
    
    res.json(list);
});

app.get('/api/destinations/:destinationId/full', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Get all data
    const [weather, crowd, todayPrediction] = await Promise.all([
        fetch(`http://localhost:${PORT}/api/weather/${destinationId}`).then(r => r.json()).catch(() => null),
        fetch(`http://localhost:${PORT}/api/crowd/${destinationId}`).then(r => r.json()).catch(() => null),
        fetch(`http://localhost:${PORT}/api/predict/today/${destinationId}`).then(r => r.json()).catch(() => null)
    ]);
    
    res.json({
        destination: dest,
        weather,
        crowd,
        todayPrediction,
        timestamp: new Date().toISOString()
    });
});

// ==================== HOLIDAYS ====================

app.get('/api/holidays', (req, res) => {
    // Return from algorithm's built-in holiday database
    res.json(crowdAlgorithm.holidays2026.map(h => ({
        date: h.date,
        name: h.name,
        impact: h.impact > 1.5 ? 'high' : h.impact > 1.2 ? 'medium' : 'low'
    })));
});

// ==================== INITIALIZE & START ====================

async function initialize() {
    console.log('═'.repeat(60));
    console.log('🗺️  CrowdWise India - Self-Sufficient Backend v2.0');
    console.log('═'.repeat(60));
    
    // Initialize data store
    await dataStore.init();
    
    // Start scheduler if enabled
    if (CONFIG.ENABLE_SCHEDULER) {
        schedulerService = new SchedulerService(dataStore);
        // Don't auto-start scheduler in development
        // schedulerService.start();
        console.log('📅 Scheduler service ready (call /api/scheduler/start to enable)');
    }
    
    console.log('✅ All services initialized');
}

// Scheduler control endpoints
app.post('/api/scheduler/start', (req, res) => {
    if (!schedulerService) {
        return res.status(400).json({ error: 'Scheduler not configured' });
    }
    schedulerService.start();
    res.json({ status: 'started', message: 'Scheduler started' });
});

app.post('/api/scheduler/stop', (req, res) => {
    if (!schedulerService) {
        return res.status(400).json({ error: 'Scheduler not configured' });
    }
    schedulerService.stop();
    res.json({ status: 'stopped', message: 'Scheduler stopped' });
});

app.get('/api/scheduler/status', (req, res) => {
    if (!schedulerService) {
        return res.json({ error: 'Scheduler not configured' });
    }
    res.json(schedulerService.getStatus());
});

// Start server
initialize().then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('═'.repeat(60));
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log('');
        console.log('📡 API Endpoints:');
        console.log('   GET  /api/health              - System health');
        console.log('   GET  /api/status              - Detailed status');
        console.log('   GET  /api/destinations        - List all destinations');
        console.log('   GET  /api/crowd/:id           - Current crowd prediction');
        console.log('   GET  /api/weather/:id         - Weather data');
        console.log('   GET  /api/predict/today/:id   - Hourly forecast');
        console.log('   GET  /api/predict/week/:id    - Weekly forecast');
        console.log('   POST /api/feedback            - Submit accuracy feedback');
        console.log('   GET  /api/feedback/stats      - Accuracy statistics');
        console.log('');
        console.log('🎯 Data Sources: Pattern-based + Wikipedia + Social signals');
        console.log('📊 Expected Accuracy: 65-75% (improves with feedback)');
        console.log('💰 Cost: $0 (no paid APIs required)');
        console.log('═'.repeat(60));
    });
    
    // Keep server reference to prevent garbage collection
    server.on('error', (err) => {
        console.error('Server error:', err);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        console.log('\nSIGINT received, shutting down...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}).catch(error => {
    console.error('Failed to initialize:', error);
    process.exit(1);
});

module.exports = app;
