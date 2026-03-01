// ============================================================
// CrowdWise India - Enhanced Backend API Server v2.0
// ============================================================
// Self-sufficient crowd prediction system
// No external paid APIs required
// ============================================================

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

// Import custom services
const CrowdScoringAlgorithm = require('./algorithms/crowd-scoring');
const PredictionEngine = require('./algorithms/prediction-engine');
const DataCollector = require('./services/data-collector');
const DataStore = require('./services/data-store');
const ValidationService = require('./services/validation-service');
const SchedulerService = require('./services/scheduler-service');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8080;

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
    // ⚠️ NEVER hardcode API keys — set OPENWEATHER_API_KEY in .env or EB environment
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
    OPENWEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Cache settings (in milliseconds)
    WEATHER_CACHE_TTL: 30 * 60 * 1000,  // 30 minutes
    CROWD_CACHE_TTL: 15 * 60 * 1000,    // 15 minutes
    PREDICTION_CACHE_TTL: 60 * 60 * 1000, // 1 hour
    
    // Email configuration (for alerts)
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'CrowdWise India <noreply@crowdwise.in>',
    
    // System settings
    ENABLE_SCHEDULER: process.env.ENABLE_SCHEDULER !== 'false',
    DATA_DIR: process.env.DATA_DIR || './data',
    
    // Alert check interval (ms)
    ALERT_CHECK_INTERVAL: 15 * 60 * 1000  // 15 minutes
};

// ==================== DESTINATION DATABASE ====================

// Hardcoded fallback (used if DB is unreachable)
const FALLBACK_DESTINATIONS = {
    1: { id: 1, name: 'Tirupati Balaji Temple', city: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lon: 79.4192, category: 'religious', baseCrowd: 95 },
    2: { id: 2, name: 'Araku Valley', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 18.3371, lon: 83.0076, category: 'nature', baseCrowd: 45 },
    3: { id: 3, name: 'Tawang Monastery', city: 'Tawang', state: 'Arunachal Pradesh', lat: 27.5859, lon: 91.8694, category: 'religious', baseCrowd: 35 },
    4: { id: 4, name: 'Kaziranga National Park', city: 'Golaghat', state: 'Assam', lat: 26.5775, lon: 93.1711, category: 'wildlife', baseCrowd: 60 },
    5: { id: 5, name: 'Bodh Gaya', city: 'Gaya', state: 'Bihar', lat: 24.6961, lon: 84.9869, category: 'religious', baseCrowd: 70 }
};

// Will be populated from database on startup
let DESTINATIONS = {};

// Load all destinations from RDS PostgreSQL
async function loadDestinationsFromDB() {
    try {
        console.log('⏳ Loading destinations from database...');
        const result = await db.query(
            'SELECT id, name, state, category, crowd_score, latitude, longitude FROM destinations ORDER BY id'
        );
        
        const dbDestinations = {};
        for (const row of result.rows) {
            dbDestinations[row.id] = {
                id: row.id,
                name: row.name,
                city: row.name.split(',')[0].split(' ').slice(-1)[0] || row.state, // derive city from name
                state: row.state,
                lat: parseFloat(row.latitude) || 0,
                lon: parseFloat(row.longitude) || 0,
                category: row.category || 'general',
                baseCrowd: parseInt(row.crowd_score) || 50
            };
        }
        
        console.log(`✅ Loaded ${Object.keys(dbDestinations).length} destinations from database`);
        return dbDestinations;
    } catch (error) {
        console.error('❌ Failed to load destinations from DB:', error.message);
        console.log('⚠️  Using fallback destinations (5 entries)');
        return FALLBACK_DESTINATIONS;
    }
}

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

// ==================== ALERTS STORAGE ====================

const alertsStore = [];
let emailTransporter = null;

function initializeEmailTransporter() {
    if (CONFIG.EMAIL_USER && CONFIG.EMAIL_PASS) {
        emailTransporter = nodemailer.createTransport({
            host: CONFIG.EMAIL_HOST,
            port: CONFIG.EMAIL_PORT,
            secure: CONFIG.EMAIL_PORT === 465,
            auth: {
                user: CONFIG.EMAIL_USER,
                pass: CONFIG.EMAIL_PASS
            }
        });
        console.log('✅ Email transporter initialized');
        return true;
    } else {
        console.log('⚠️  Email credentials not configured - alerts will be logged only');
        return false;
    }
}

// ==================== MIDDLEWARE ====================

app.use(cors({
    origin: [
        'https://crowdwise.in',
        'https://www.crowdwise.in',
        'https://crowdwise.samverenkar.workers.dev',
        'http://localhost:8000',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// Rate limiting — 100 requests per 15 minutes per IP
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Admin auth middleware — protects admin-only endpoints
function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!process.env.ADMIN_TOKEN) {
        return res.status(503).json({ error: 'Admin access not configured on this server.' });
    }
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized — invalid or missing admin token.' });
    }
    next();
}

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

// Get 30-day daily forecast
app.get('/api/predict/30days/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const dest = DESTINATIONS[destinationId];
    
    if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    const prediction = predictionEngine.predict30Days({
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

// ==================== USER FEEDBACK API ====================

// Submit general user feedback (suggestions, bugs, etc.)
const FEEDBACK_NOTIFICATION_EMAIL = 'SAMVERENKAR@GMAIL.COM';

app.post('/api/user-feedback', async (req, res) => {
    const { message, rating, timestamp, userAgent, page } = req.body;
    
    if (!message || !rating) {
        return res.status(400).json({ error: 'Description and rating are required' });
    }
    
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const feedbackFile = path.join(CONFIG.DATA_DIR, 'user-feedback.json');
        
        // Read existing feedback
        let feedbackList = [];
        try {
            const data = await fs.readFile(feedbackFile, 'utf8');
            feedbackList = JSON.parse(data);
        } catch (err) {
            // File doesn't exist yet, start with empty array
            feedbackList = [];
        }
        
        // Create feedback entry
        const feedbackEntry = {
            id: `uf_${Date.now()}`,
            message,
            rating,
            timestamp: timestamp || new Date().toISOString(),
            userAgent: userAgent || null,
            page: page || null,
            status: 'new', // new, reviewed, addressed
            createdAt: new Date().toISOString()
        };
        
        // Add to list
        feedbackList.push(feedbackEntry);
        
        // Save to file
        await fs.writeFile(feedbackFile, JSON.stringify(feedbackList, null, 2));
        
        console.log(`📝 New user feedback received: ${rating}⭐ - "${message.substring(0, 50)}..."`);
        
        // Send email notification to configured email
        if (emailTransporter) {
            try {
                await emailTransporter.sendMail({
                    from: CONFIG.EMAIL_FROM,
                    to: FEEDBACK_NOTIFICATION_EMAIL,
                    subject: `[CrowdWise Feedback] New ${rating}⭐ Rating`,
                    html: `
                        <h2>🗺️ CrowdWise India - New Feedback</h2>
                        <hr>
                        <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
                        <p><strong>Description:</strong></p>
                        <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #6366f1;">${message}</blockquote>
                        <hr>
                        <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        <p><strong>Feedback ID:</strong> ${feedbackEntry.id}</p>
                    `
                });
                console.log('📧 Feedback notification email sent to', FEEDBACK_NOTIFICATION_EMAIL);
            } catch (emailErr) {
                console.log('⚠️ Could not send email notification:', emailErr.message);
            }
        }
        
        res.json({
            success: true,
            message: 'Feedback received successfully',
            id: feedbackEntry.id
        });
    } catch (error) {
        console.error('User feedback error:', error.message);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// Get all user feedback (for admin)
app.get('/api/user-feedback', adminAuth, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const feedbackFile = path.join(CONFIG.DATA_DIR, 'user-feedback.json');
        
        let feedbackList = [];
        try {
            const data = await fs.readFile(feedbackFile, 'utf8');
            feedbackList = JSON.parse(data);
        } catch (err) {
            feedbackList = [];
        }
        
        // Sort by newest first
        feedbackList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            total: feedbackList.length,
            feedback: feedbackList
        });
    } catch (error) {
        console.error('Get feedback error:', error.message);
        res.status(500).json({ error: 'Failed to retrieve feedback' });
    }
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

// ==================== ALERTS API ====================

// Create a new alert
app.post('/api/alerts', (req, res) => {
    const { email, destinationId, destinationName, threshold } = req.body;
    
    // Validate required fields
    if (!email || !destinationId || !threshold) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: email, destinationId, threshold'
        });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email format'
        });
    }
    
    // Check for duplicate alert
    const existingAlert = alertsStore.find(a =>
        a.email === email &&
        a.destinationId === parseInt(destinationId) &&
        a.threshold === threshold &&
        !a.triggered
    );
    
    if (existingAlert) {
        return res.json({
            success: true,
            message: 'Alert already exists',
            alert: existingAlert
        });
    }
    
    // Get destination name if not provided
    const dest = DESTINATIONS[destinationId];
    const finalDestName = destinationName || (dest ? dest.name : `Destination ${destinationId}`);
    
    // Create new alert
    const alert = {
        id: Date.now().toString(),
        email,
        destinationId: parseInt(destinationId),
        destinationName: finalDestName,
        threshold,
        createdAt: new Date().toISOString(),
        triggered: false,
        lastTriggered: null,
        lastChecked: null
    };
    
    alertsStore.push(alert);
    console.log(`🔔 New alert created: ${email} wants ${threshold} crowd at ${finalDestName}`);
    
    res.json({
        success: true,
        message: 'Alert created successfully',
        alert
    });
});

// Get all alerts (for admin)
app.get('/api/alerts', adminAuth, (req, res) => {
    res.json({
        total: alertsStore.length,
        active: alertsStore.filter(a => !a.triggered).length,
        alerts: alertsStore
    });
});

// Delete an alert
app.delete('/api/alerts/:alertId', adminAuth, (req, res) => {
    const { alertId } = req.params;
    const index = alertsStore.findIndex(a => a.id === alertId);
    
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    alertsStore.splice(index, 1);
    res.json({ success: true, message: 'Alert deleted' });
});

// Check threshold match
function checkThresholdMatch(currentLevel, threshold) {
    const levelOrder = { low: 1, moderate: 2, heavy: 3, overcrowded: 4 };
    const thresholdOrder = { low: 1, moderate: 2, heavy: 3, any: 0 };
    
    if (threshold === 'any') return true;
    return levelOrder[currentLevel] <= thresholdOrder[threshold];
}

// Send alert email
async function sendAlertEmail(alert, currentLevel, crowdData) {
    const crowdEmoji = { low: '🟢', moderate: '🟡', heavy: '🟠', overcrowded: '🔴' };
    
    const emailContent = {
        to: alert.email,
        subject: `🎉 CrowdWise Alert: ${alert.destinationName} is now ${currentLevel}!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">🗺️ CrowdWise India</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your Travel Alert</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #333; margin-top: 0;">
                        ${crowdEmoji[currentLevel] || '📊'} ${alert.destinationName}
                    </h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 16px;">
                            <strong>Current Crowd Level:</strong> 
                            <span style="color: ${currentLevel === 'low' ? '#22c55e' : currentLevel === 'moderate' ? '#eab308' : '#ef4444'};">
                                ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
                            </span>
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                            Crowd Score: ${crowdData.percentageFull || crowdData.crowdScore * 100}%
                        </p>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        You set an alert to be notified when ${alert.destinationName} reaches 
                        <strong>${alert.threshold}</strong> crowd levels. Time to plan your visit!
                    </p>
                    
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="https://crowdwise.in" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Plan Your Visit →
                        </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #0369a1;">
                            💡 <strong>Pro tip:</strong> Early mornings (6-8 AM) typically have the lowest crowds.
                        </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
                        This alert was sent by CrowdWise India.<br>
                        You will not receive another alert for this destination unless you create a new one.
                    </p>
                </div>
            </div>
        `
    };
    
    if (emailTransporter) {
        try {
            await emailTransporter.sendMail({
                from: CONFIG.EMAIL_FROM,
                ...emailContent
            });
            console.log(`📧 Alert email sent to ${alert.email} for ${alert.destinationName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to send email to ${alert.email}:`, error.message);
            return false;
        }
    } else {
        // Log when email is not configured
        console.log(`📧 [MOCK EMAIL] Would send to ${alert.email}:`);
        console.log(`   Subject: ${emailContent.subject}`);
        console.log(`   Destination: ${alert.destinationName}, Level: ${currentLevel}`);
        return true; // Return true so alert is marked as triggered
    }
}

// Check all alerts
async function checkAllAlerts() {
    console.log(`🔍 Checking ${alertsStore.filter(a => !a.triggered).length} active alerts...`);
    
    for (const alert of alertsStore) {
        if (alert.triggered) continue;
        
        try {
            // Get current crowd data
            const dest = DESTINATIONS[alert.destinationId];
            if (!dest) continue;
            
            const prediction = crowdAlgorithm.calculateCrowdScore({
                destination: dest.name,
                category: dest.category,
                baseCrowdLevel: dest.baseCrowd
            });
            
            const currentLevel = prediction.crowdLevel;
            alert.lastChecked = new Date().toISOString();
            
            const shouldTrigger = checkThresholdMatch(currentLevel, alert.threshold);
            
            if (shouldTrigger) {
                console.log(`🎯 Alert triggered! ${alert.destinationName} is now ${currentLevel}`);
                const emailSent = await sendAlertEmail(alert, currentLevel, prediction);
                if (emailSent) {
                    alert.triggered = true;
                    alert.lastTriggered = new Date().toISOString();
                }
            }
        } catch (error) {
            console.error(`❌ Error checking alert for ${alert.destinationName}:`, error.message);
        }
    }
}

// Start alert checker cron job
let alertCheckerInterval = null;

function startAlertChecker() {
    if (alertCheckerInterval) return;
    
    // Check immediately
    checkAllAlerts();
    
    // Then check every 15 minutes
    alertCheckerInterval = setInterval(checkAllAlerts, CONFIG.ALERT_CHECK_INTERVAL);
    console.log('✅ Alert checker started (checking every 15 minutes)');
}

function stopAlertChecker() {
    if (alertCheckerInterval) {
        clearInterval(alertCheckerInterval);
        alertCheckerInterval = null;
        console.log('🛑 Alert checker stopped');
    }
}

// Manual trigger for testing
app.post('/api/alerts/check', async (req, res) => {
    await checkAllAlerts();
    res.json({
        success: true,
        message: 'Alert check completed',
        activeAlerts: alertsStore.filter(a => !a.triggered).length,
        triggeredAlerts: alertsStore.filter(a => a.triggered).length
    });
});

// ==================== INITIALIZE & START ====================

async function initialize() {
    console.log('═'.repeat(60));
    console.log('🗺️  CrowdWise India - Self-Sufficient Backend v2.0');
    console.log('═'.repeat(60));
    
    // Load destinations from database
    DESTINATIONS = await loadDestinationsFromDB();
    
    // Initialize data store
    await dataStore.init();
    
    // Start scheduler if enabled
    if (CONFIG.ENABLE_SCHEDULER) {
        schedulerService = new SchedulerService(dataStore);
        // Don't auto-start scheduler in development
        // schedulerService.start();
        console.log('📅 Scheduler service ready (call /api/scheduler/start to enable)');
    }
    
    // Initialize email transporter
    initializeEmailTransporter();
    
    // Start alert checker
    startAlertChecker();
    
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
        console.log('   GET  /api/predict/30days/:id  - 30-day daily forecast');
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
