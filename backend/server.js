// ============================================================
// CrowdWise India - Backend API Server
// ============================================================
// This server provides aggregated real-time data for:
// - Weather data (with caching and multiple source fallback)
// - Crowd estimation (from multiple APIs)
// - Holiday information
// ============================================================

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CONFIGURATION ====================

const CONFIG = {
    // OpenWeatherMap API
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY',
    OPENWEATHER_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Google Places API (for crowd data)
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || 'YOUR_API_KEY',
    GOOGLE_PLACES_URL: 'https://maps.googleapis.com/maps/api/place/details/json',
    
    // Email configuration (for alerts)
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: process.env.EMAIL_PORT || 587,
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'CrowdWise India <noreply@crowdwise.in>',
    
    // Cache settings (in milliseconds)
    WEATHER_CACHE_TTL: 30 * 60 * 1000,  // 30 minutes
    CROWD_CACHE_TTL: 15 * 60 * 1000,    // 15 minutes
    
    // Rate limiting
    MAX_REQUESTS_PER_MINUTE: 60
};

// ==================== DESTINATION COORDINATES ====================

const DESTINATION_COORDINATES = {
    1: { lat: 27.1751, lon: 78.0421, city: "Agra", placeId: "ChIJbU60yXAYdDkR4-g1jMvjfGU" },
    2: { lat: 26.9124, lon: 75.7873, city: "Jaipur", placeId: "ChIJlZMoXN1HbTkRMGK6UaQZwOQ" },
    3: { lat: 27.1767, lon: 78.0081, city: "Agra Fort", placeId: "ChIJJxRX3KcYdDkR9L5cKzSE" },
    4: { lat: 19.0760, lon: 72.8777, city: "Mumbai", placeId: "ChIJzSHVFYu5wjsRmP3FkA-pq9U" },
    5: { lat: 15.4909, lon: 73.8278, city: "Goa", placeId: "ChIJQbc2YxC6vzsRwVcqPnpUC4Q" },
    6: { lat: 25.3176, lon: 83.0062, city: "Varanasi", placeId: "ChIJ1YD_JC_9dTkRvJVj7FpkaB0" },
    7: { lat: 9.9312, lon: 76.2673, city: "Kochi", placeId: "ChIJ-7sdMhoOzjsR2VI9-GZ7z9M" },
    8: { lat: 28.6562, lon: 77.2410, city: "Delhi", placeId: "ChIJL_P_CXMEDTkRw0ZdG-0GVvw" },
    9: { lat: 32.2396, lon: 77.1887, city: "Manali", placeId: "ChIJaYo10OPrAzgR-QU0aYi8" },
    10: { lat: 28.5245, lon: 77.1855, city: "Gurugram", placeId: "ChIJgTwKgJcZDTkRfFMhPS" }
};

// ==================== CACHE ====================

const cache = {
    weather: new Map(),
    crowd: new Map(),
    holidays: null,
    holidaysExpiry: null
};

// ==================== ALERTS STORAGE ====================

const alertsStore = [];

// ==================== EMAIL TRANSPORTER ====================

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
    } else {
        console.log('⚠️  Email credentials not configured - alerts will be logged only');
    }
}

// ==================== DESTINATION NAMES (for email) ====================

const DESTINATION_NAMES = {
    1: 'Taj Mahal', 2: 'Hawa Mahal', 3: 'Agra Fort', 4: 'Gateway of India',
    5: 'Calangute Beach', 6: 'Varanasi Ghats', 7: 'Kerala Backwaters',
    8: 'Red Fort', 9: 'Manali', 10: 'Qutub Minar'
};

// ==================== MIDDLEWARE ====================

app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            weather: CONFIG.OPENWEATHER_API_KEY !== 'YOUR_API_KEY' ? 'configured' : 'not configured',
            crowd: CONFIG.GOOGLE_PLACES_API_KEY !== 'YOUR_API_KEY' ? 'configured' : 'not configured'
        }
    });
});

// ==================== WEATHER API ====================

app.get('/api/weather/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const coords = DESTINATION_COORDINATES[destinationId];
    
    if (!coords) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Check cache
    const cacheKey = `weather_${destinationId}`;
    const cached = cache.weather.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.WEATHER_CACHE_TTL) {
        console.log(`✅ Weather cache hit for ${coords.city}`);
        return res.json({ ...cached.data, fromCache: true });
    }
    
    // Fetch from API
    if (CONFIG.OPENWEATHER_API_KEY === 'YOUR_API_KEY') {
        return res.json(generateMockWeather(coords.city));
    }
    
    try {
        const url = `${CONFIG.OPENWEATHER_URL}?lat=${coords.lat}&lon=${coords.lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }
        
        const data = await response.json();
        const weather = {
            temperature: Math.round(data.main.temp),
            condition: data.weather[0].main,
            description: data.weather[0].description,
            humidity: data.main.humidity,
            feelsLike: Math.round(data.main.feels_like),
            windSpeed: data.wind.speed,
            formatted: `${Math.round(data.main.temp)}°C, ${data.weather[0].main}`,
            icon: data.weather[0].icon,
            isLive: true,
            source: 'openweathermap'
        };
        
        // Update cache
        cache.weather.set(cacheKey, { data: weather, timestamp: Date.now() });
        console.log(`🌤️ Live weather fetched for ${coords.city}: ${weather.formatted}`);
        
        res.json(weather);
    } catch (error) {
        console.error(`❌ Weather API error for ${coords.city}:`, error.message);
        res.json(generateMockWeather(coords.city));
    }
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
        description: condition.toLowerCase(),
        humidity: 50 + (seed % 30),
        feelsLike: temp + (seed % 3),
        formatted: `${temp}°C, ${condition}`,
        isLive: false,
        source: 'mock'
    };
}

// ==================== CROWD DATA API ====================

app.get('/api/crowd/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    const coords = DESTINATION_COORDINATES[destinationId];
    
    if (!coords) {
        return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Check cache
    const cacheKey = `crowd_${destinationId}`;
    const cached = cache.crowd.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CROWD_CACHE_TTL) {
        console.log(`✅ Crowd cache hit for ${coords.city}`);
        return res.json({ ...cached.data, fromCache: true });
    }
    
    // Try Google Places API for popular times
    if (CONFIG.GOOGLE_PLACES_API_KEY !== 'YOUR_API_KEY' && coords.placeId) {
        try {
            const crowdData = await fetchGooglePlacesCrowdData(coords.placeId, coords.city);
            if (crowdData) {
                cache.crowd.set(cacheKey, { data: crowdData, timestamp: Date.now() });
                return res.json(crowdData);
            }
        } catch (error) {
            console.error(`❌ Google Places error for ${coords.city}:`, error.message);
        }
    }
    
    // Fallback to algorithm-based estimation
    const crowdData = estimateCrowdWithAlgorithm(destinationId, coords.city);
    cache.crowd.set(cacheKey, { data: crowdData, timestamp: Date.now() });
    res.json(crowdData);
});

async function fetchGooglePlacesCrowdData(placeId, city) {
    // Google Places API call for popular times
    // Note: Popular times data requires specific access and may not be available via standard API
    const url = `${CONFIG.GOOGLE_PLACES_URL}?place_id=${placeId}&key=${CONFIG.GOOGLE_PLACES_API_KEY}&fields=name,current_opening_hours`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    // Process Google Places data here
    // For now, return null to fall back to algorithm
    return null;
}

function estimateCrowdWithAlgorithm(destinationId, city) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const month = now.getMonth();
    
    let crowdMultiplier = 1.0;
    let factors = [];
    
    // Time of day factor
    if (hour >= 10 && hour <= 16) {
        crowdMultiplier *= 1.6;
        factors.push('Peak hours (+60%)');
    } else if (hour >= 6 && hour <= 9) {
        crowdMultiplier *= 0.6;
        factors.push('Early morning (-40%)');
    } else if (hour >= 17 && hour <= 19) {
        crowdMultiplier *= 1.2;
        factors.push('Evening rush (+20%)');
    } else {
        crowdMultiplier *= 0.4;
        factors.push('Off hours (-60%)');
    }
    
    // Weekend factor
    if (isWeekend) {
        crowdMultiplier *= 1.7;
        factors.push('Weekend (+70%)');
    }
    
    // Seasonal factor
    if (month === 11 || month === 0 || month === 1) {
        crowdMultiplier *= 1.4;
        factors.push('Peak season (+40%)');
    } else if (month >= 6 && month <= 8) {
        crowdMultiplier *= 0.7;
        factors.push('Monsoon (-30%)');
    }
    
    // Base estimates vary by destination
    const baseEstimates = {
        1: { min: 8000, max: 25000 },  // Taj Mahal
        2: { min: 3000, max: 12000 },  // Jaipur
        3: { min: 2000, max: 8000 },   // Agra Fort
        4: { min: 5000, max: 20000 },  // Gateway of India
        5: { min: 4000, max: 15000 },  // Goa Beaches
        6: { min: 6000, max: 18000 },  // Varanasi Ghats
        7: { min: 1500, max: 6000 },   // Kerala Backwaters
        8: { min: 4000, max: 15000 },  // Red Fort
        9: { min: 2000, max: 10000 },  // Manali
        10: { min: 3000, max: 12000 }  // Qutub Minar
    };
    
    const base = baseEstimates[destinationId] || { min: 3000, max: 10000 };
    const variance = 0.15;
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    
    const estimatedMin = Math.round(base.min * crowdMultiplier * randomFactor);
    const estimatedMax = Math.round(base.max * crowdMultiplier * randomFactor);
    
    // Determine crowd level
    const avgEstimate = (estimatedMin + estimatedMax) / 2;
    let crowdLevel, crowdLabel;
    
    if (avgEstimate <= 3000) {
        crowdLevel = 'low';
        crowdLabel = '🟢 Low';
    } else if (avgEstimate <= 10000) {
        crowdLevel = 'moderate';
        crowdLabel = '🟡 Moderate';
    } else if (avgEstimate <= 20000) {
        crowdLevel = 'heavy';
        crowdLabel = '🟠 Busy';
    } else {
        crowdLevel = 'overcrowded';
        crowdLabel = '🔴 Packed';
    }
    
    return {
        crowdLevel,
        crowdLabel,
        currentEstimate: `${formatNumber(estimatedMin)}-${formatNumber(estimatedMax)}`,
        rawEstimate: { min: estimatedMin, max: estimatedMax },
        multiplier: crowdMultiplier,
        factors,
        confidence: 75,
        calculatedAt: new Date().toISOString(),
        isLive: false,
        source: 'algorithm'
    };
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
}

// ==================== HOLIDAYS API ====================

app.get('/api/holidays', async (req, res) => {
    // Check cache
    if (cache.holidays && cache.holidaysExpiry && Date.now() < cache.holidaysExpiry) {
        return res.json(cache.holidays);
    }
    
    try {
        const year = new Date().getFullYear();
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
        
        if (!response.ok) {
            throw new Error('Holiday API error');
        }
        
        const holidays = await response.json();
        
        // Cache for 24 hours
        cache.holidays = holidays;
        cache.holidaysExpiry = Date.now() + (24 * 60 * 60 * 1000);
        
        res.json(holidays);
    } catch (error) {
        console.error('Holiday API error:', error.message);
        res.json([]);
    }
});

// ==================== AGGREGATED DATA ====================

app.get('/api/destinations/:destinationId', async (req, res) => {
    const { destinationId } = req.params;
    
    try {
        // Fetch weather and crowd data in parallel
        const [weatherRes, crowdRes] = await Promise.all([
            fetch(`http://localhost:${PORT}/api/weather/${destinationId}`),
            fetch(`http://localhost:${PORT}/api/crowd/${destinationId}`)
        ]);
        
        const weather = await weatherRes.json();
        const crowd = await crowdRes.json();
        
        res.json({
            destinationId,
            weather,
            crowd,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Aggregation error:', error.message);
        res.status(500).json({ error: 'Failed to aggregate data' });
    }
});

// ==================== ALERTS API ====================

// Create a new alert
app.post('/api/alerts', (req, res) => {
    const { email, destinationId, threshold, destinationName } = req.body;
    
    // Validation
    if (!email || !destinationId || !threshold) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: email, destinationId, threshold' 
        });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid email address' 
        });
    }
    
    // Threshold validation
    const validThresholds = ['low', 'moderate', 'heavy', 'any'];
    if (!validThresholds.includes(threshold)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid threshold. Must be: low, moderate, heavy, or any' 
        });
    }
    
    // Check for duplicate alert
    const existingAlert = alertsStore.find(
        a => a.email === email && a.destinationId === parseInt(destinationId) && a.active
    );
    
    if (existingAlert) {
        // Update existing alert
        existingAlert.threshold = threshold;
        existingAlert.updatedAt = new Date().toISOString();
        console.log(`📝 Alert updated for ${email} - ${destinationName || destinationId}`);
        return res.json({ 
            success: true, 
            message: 'Alert updated successfully',
            alertId: existingAlert.id
        });
    }
    
    // Create new alert
    const alert = {
        id: Date.now().toString(),
        email,
        destinationId: parseInt(destinationId),
        destinationName: destinationName || DESTINATION_NAMES[destinationId] || `Destination #${destinationId}`,
        threshold,
        active: true,
        triggered: false,
        createdAt: new Date().toISOString(),
        lastChecked: null,
        lastTriggered: null
    };
    
    alertsStore.push(alert);
    console.log(`🔔 New alert created: ${email} wants ${threshold} crowd at ${alert.destinationName}`);
    
    res.json({ 
        success: true, 
        message: 'Alert created successfully',
        alertId: alert.id
    });
});

// Get all alerts (for debugging)
app.get('/api/alerts', (req, res) => {
    res.json({
        total: alertsStore.length,
        active: alertsStore.filter(a => a.active).length,
        alerts: alertsStore.map(a => ({
            id: a.id,
            email: a.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
            destinationName: a.destinationName,
            threshold: a.threshold,
            active: a.active,
            triggered: a.triggered,
            createdAt: a.createdAt
        }))
    });
});

// Delete an alert
app.delete('/api/alerts/:alertId', (req, res) => {
    const { alertId } = req.params;
    const alertIndex = alertsStore.findIndex(a => a.id === alertId);
    
    if (alertIndex === -1) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    alertsStore[alertIndex].active = false;
    console.log(`🗑️ Alert ${alertId} deactivated`);
    
    res.json({ success: true, message: 'Alert deactivated' });
});

// ==================== ALERT CHECKING LOGIC ====================

async function checkAlerts() {
    const activeAlerts = alertsStore.filter(a => a.active);
    
    if (activeAlerts.length === 0) {
        return;
    }
    
    console.log(`\n🔍 Checking ${activeAlerts.length} active alerts...`);
    
    for (const alert of activeAlerts) {
        try {
            // Get current crowd level for the destination
            const crowdData = estimateCrowdWithAlgorithm(alert.destinationId, alert.destinationName);
            const currentLevel = crowdData.crowdLevel;
            
            alert.lastChecked = new Date().toISOString();
            
            // Check if crowd level matches the threshold
            const shouldTrigger = checkThresholdMatch(currentLevel, alert.threshold);
            
            if (shouldTrigger && !alert.triggered) {
                console.log(`🎯 Alert triggered! ${alert.destinationName} is now ${currentLevel}`);
                await sendAlertEmail(alert, currentLevel, crowdData);
                alert.triggered = true;
                alert.lastTriggered = new Date().toISOString();
            } else if (!shouldTrigger && alert.triggered) {
                // Reset trigger if crowd level changed
                alert.triggered = false;
            }
        } catch (error) {
            console.error(`❌ Error checking alert ${alert.id}:`, error.message);
        }
    }
}

function checkThresholdMatch(currentLevel, threshold) {
    const levelOrder = { low: 1, moderate: 2, heavy: 3, overcrowded: 4 };
    const thresholdOrder = { low: 1, moderate: 2, heavy: 3, any: 0 };
    
    if (threshold === 'any') {
        return true;
    }
    
    // Trigger when current level is at or below the desired threshold
    return levelOrder[currentLevel] <= thresholdOrder[threshold];
}

async function sendAlertEmail(alert, currentLevel, crowdData) {
    const crowdEmoji = {
        low: '🟢',
        moderate: '🟡',
        heavy: '🟠',
        overcrowded: '🔴'
    };
    
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
                            Estimated visitors: ${crowdData.currentEstimate}
                        </p>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        You set an alert to be notified when ${alert.destinationName} reaches 
                        <strong>${alert.threshold}</strong> crowd levels. Time to plan your visit!
                    </p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #0369a1;">
                            💡 <strong>Pro tip:</strong> Early mornings (6-8 AM) typically have the lowest crowds.
                        </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
                        This alert was sent by CrowdWise India.<br>
                        <a href="#" style="color: #6366f1;">Unsubscribe</a> from this alert.
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
            console.log(`📧 Alert email sent to ${alert.email}`);
        } catch (error) {
            console.error(`❌ Failed to send email to ${alert.email}:`, error.message);
        }
    } else {
        // Log the alert when email is not configured
        console.log(`📧 [MOCK] Would send email to ${alert.email}:`);
        console.log(`   Subject: ${emailContent.subject}`);
        console.log(`   Destination: ${alert.destinationName}, Level: ${currentLevel}`);
    }
}

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log('🗺️  CrowdWise India - Backend API Server');
    console.log('═'.repeat(50));
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/weather/:destinationId`);
    console.log(`   GET  /api/crowd/:destinationId`);
    console.log(`   GET  /api/holidays`);
    console.log(`   GET  /api/destinations/:destinationId`);
    console.log(`   POST /api/alerts`);
    console.log(`   GET  /api/alerts`);
    console.log(`   DELETE /api/alerts/:alertId`);
    console.log('═'.repeat(50));
    
    if (CONFIG.OPENWEATHER_API_KEY === 'YOUR_API_KEY') {
        console.log('⚠️  OpenWeatherMap API key not configured - using mock data');
    } else {
        console.log('✅ OpenWeatherMap API key configured');
    }
    
    if (CONFIG.GOOGLE_PLACES_API_KEY === 'YOUR_API_KEY') {
        console.log('⚠️  Google Places API key not configured - using algorithm');
    } else {
        console.log('✅ Google Places API key configured');
    }
    
    // Initialize email transporter
    initializeEmailTransporter();
    
    // Start cron job to check alerts every 15 minutes
    cron.schedule('*/15 * * * *', () => {
        console.log('\n⏰ Running scheduled alert check...');
        checkAlerts();
    });
    console.log('✅ Alert checker cron job started (runs every 15 minutes)');
    
    console.log('═'.repeat(50));
});

module.exports = app;
