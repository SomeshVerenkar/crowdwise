// ============================================================
// API Service for CrowdWise India - Real-time Data Integration
// ============================================================
// This service handles:
// 1. Weather data from OpenWeatherMap (free API)
// 2. Crowd estimation with dynamic algorithms
// 3. Backend API integration for aggregated data
// 4. Data source tracking for transparency
// ============================================================

class APIService {
    constructor() {
        this.weatherCache = {};
        this.crowdCache = {};
        this.holidayCache = null;
        this.lastWeatherUpdate = {};
        this.lastCrowdUpdate = {};
        
        // Data source tracking
        this.dataStatus = {
            weather: { source: 'initializing', lastUpdate: null, isLive: false },
            crowd: { source: 'initializing', lastUpdate: null, isLive: false },
            overall: 'demo' // 'demo', 'partial', 'live'
        };
        
        // Statistics
        this.stats = {
            weatherApiCalls: 0,
            crowdApiCalls: 0,
            cacheHits: 0,
            errors: 0
        };
    }

    // ==================== DATA STATUS TRACKING ====================
    
    getDataStatus() {
        return this.dataStatus;
    }
    
    updateDataStatus() {
        const weatherLive = this.dataStatus.weather.isLive;
        const crowdLive = this.dataStatus.crowd.isLive;
        
        if (weatherLive && crowdLive) {
            this.dataStatus.overall = 'live';
            API_CONFIG._dataQuality = 'live';
        } else if (weatherLive || crowdLive) {
            this.dataStatus.overall = 'partial';
            API_CONFIG._dataQuality = 'partial';
        } else {
            this.dataStatus.overall = 'demo';
            API_CONFIG._dataQuality = 'demo';
        }
        
        API_CONFIG._lastUpdate = new Date().toISOString();
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('dataStatusChanged', { 
            detail: this.dataStatus 
        }));
        
        return this.dataStatus;
    }

    // ==================== WEATHER API ====================
    
    async getWeatherData(destinationId) {
        const coords = DESTINATION_COORDINATES[destinationId];
        if (!coords) {
            console.warn(`No coordinates for destination ${destinationId}`);
            // Don't update status to mock if we already have live data from other destinations
            return this.getMockWeather(destinationId);
        }

        // Check cache first
        const now = Date.now();
        if (this.weatherCache[destinationId] && 
            (now - this.lastWeatherUpdate[destinationId]) < API_CONFIG.WEATHER_REFRESH_INTERVAL) {
            this.stats.cacheHits++;
            return this.weatherCache[destinationId];
        }

        // Try backend API FIRST (preferred source)
        if (API_CONFIG.USE_BACKEND_API && API_CONFIG.USE_REAL_WEATHER) {
            try {
                console.log(`🌤️ Fetching weather from backend for ${coords.city}...`);
                const weather = await this.fetchWeatherFromBackend(destinationId);
                if (weather && weather.temperature) {
                    console.log(`✅ Live weather fetched from backend: ${weather.formatted}`);
                    this.weatherCache[destinationId] = weather;
                    this.lastWeatherUpdate[destinationId] = Date.now();
                    this.dataStatus.weather = {
                        source: 'backend',
                        lastUpdate: new Date(),
                        isLive: true
                    };
                    API_CONFIG._weatherSource = 'backend';
                    this.updateDataStatus();
                    return weather;
                }
            } catch (error) {
                console.error('❌ Backend weather error:', error);
            }
        }

        // Fallback: Try OpenWeatherMap directly if API key is configured
        if (API_CONFIG.USE_REAL_WEATHER && 
            API_CONFIG.WEATHER_API_KEY && 
            API_CONFIG.WEATHER_API_KEY !== 'YOUR_OPENWEATHER_API_KEY' &&
            API_CONFIG.WEATHER_API_KEY !== '') {
            
            console.log(`🌤️ Attempting direct OpenWeatherMap for ${coords.city}...`);
            
            try {
                const weather = await this.fetchOpenWeatherMap(coords, destinationId);
                if (weather) {
                    this.dataStatus.weather = {
                        source: 'openweathermap',
                        lastUpdate: new Date(),
                        isLive: true
                    };
                    API_CONFIG._weatherSource = 'openweathermap';
                    this.updateDataStatus();
                    console.log(`✅ Live weather fetched successfully for ${coords.city}`);
                    return weather;
                }
            } catch (error) {
                console.error(`❌ OpenWeatherMap error for ${coords.city}:`, error);
                this.stats.errors++;
            }
            
            // Try backup WeatherAPI
            if (API_CONFIG.WEATHERAPI_KEY !== 'YOUR_WEATHERAPI_KEY') {
                try {
                    const weather = await this.fetchWeatherAPI(coords, destinationId);
                    if (weather) {
                        this.dataStatus.weather = {
                            source: 'weatherapi',
                            lastUpdate: new Date(),
                            isLive: true
                        };
                        API_CONFIG._weatherSource = 'weatherapi';
                        this.updateDataStatus();
                        return weather;
                    }
                } catch (error) {
                    console.error('WeatherAPI error:', error);
                    this.stats.errors++;
                }
            }
        }

        // Fallback to mock data - only update status if not already live
        console.warn(`⚠️ Using mock weather for destination ${destinationId}`);
        if (!this.dataStatus.weather.isLive) {
            this.dataStatus.weather = {
                source: 'mock',
                lastUpdate: new Date(),
                isLive: false
            };
            API_CONFIG._weatherSource = 'mock';
            this.updateDataStatus();
        }
        return this.getMockWeather(destinationId);
    }
    
    async fetchOpenWeatherMap(coords, destinationId) {
        this.stats.weatherApiCalls++;
        const url = `${API_CONFIG.WEATHER_API_URL}?lat=${coords.lat}&lon=${coords.lon}&appid=${API_CONFIG.WEATHER_API_KEY}&units=metric`;
        
        console.log(`🌤️ Fetching weather for ${coords.city}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const weather = this.parseWeatherData(data);
        
        // Cache the result
        this.weatherCache[destinationId] = weather;
        this.lastWeatherUpdate[destinationId] = Date.now();
        
        console.log(`✅ Live weather for ${coords.city}: ${weather.formatted}`);
        return weather;
    }
    
    async fetchWeatherAPI(coords, destinationId) {
        this.stats.weatherApiCalls++;
        const url = `${API_CONFIG.WEATHERAPI_URL}?key=${API_CONFIG.WEATHERAPI_KEY}&q=${coords.lat},${coords.lon}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const weather = {
            temperature: Math.round(data.current.temp_c),
            condition: data.current.condition.text,
            description: data.current.condition.text.toLowerCase(),
            humidity: data.current.humidity,
            feelsLike: Math.round(data.current.feelslike_c),
            formatted: `${Math.round(data.current.temp_c)}°C, ${data.current.condition.text}`
        };
        
        this.weatherCache[destinationId] = weather;
        this.lastWeatherUpdate[destinationId] = Date.now();
        
        return weather;
    }
    
    async fetchWeatherFromBackend(destinationId) {
        const response = await fetch(`${API_CONFIG.BACKEND_API_URL}/weather/${destinationId}`);
        if (!response.ok) return null;
        const data = await response.json();
        // Ensure isLive is set based on backend response
        if (data && data.temperature) {
            data.isLive = data.isLive !== false; // Default to true if not explicitly false
        }
        return data;
    }

    parseWeatherData(data) {
        return {
            temperature: Math.round(data.main.temp),
            condition: data.weather[0].main,
            description: data.weather[0].description,
            humidity: data.main.humidity,
            feelsLike: Math.round(data.main.feels_like),
            windSpeed: data.wind.speed,
            formatted: `${Math.round(data.main.temp)}°C, ${data.weather[0].main}`,
            icon: data.weather[0].icon,
            isLive: true
        };
    }

    getMockWeather(destinationId) {
        // Generate consistent mock weather based on destination and time
        const seed = destinationId + new Date().getHours();
        const temps = [22, 25, 28, 30, 32, 18, 15, 26, 24, 29];
        const conditions = ['Sunny', 'Partly Cloudy', 'Clear', 'Cloudy', 'Pleasant'];
        const temp = temps[seed % temps.length];
        const condition = conditions[seed % conditions.length];
        
        return {
            temperature: temp,
            condition: condition,
            description: condition.toLowerCase(),
            humidity: 50 + (seed % 30),
            feelsLike: temp + (seed % 3),
            formatted: `${temp}°C, ${condition}`,
            isLive: false
        };
    }

    // ==================== CROWD ESTIMATION ====================
    
    async getCrowdData(destinationId) {
        // Try backend API first if configured
        if (API_CONFIG.USE_BACKEND_API && API_CONFIG.USE_REAL_CROWD_DATA) {
            try {
                console.log(`🔄 Fetching crowd data from backend for destination ${destinationId}...`);
                const crowdData = await this.fetchCrowdFromBackend(destinationId);
                if (crowdData && crowdData.crowdLevel) {
                    console.log(`✅ Live crowd data fetched: ${crowdData.crowdLevel}`);
                    this.dataStatus.crowd = {
                        source: 'backend',
                        lastUpdate: new Date(),
                        isLive: true
                    };
                    API_CONFIG._crowdSource = 'backend';
                    this.updateDataStatus();
                    return crowdData;
                }
            } catch (error) {
                console.error('❌ Backend crowd error:', error);
            }
        }
        
        // Fallback to algorithm - only log once
        if (!this.dataStatus.crowd.isLive) {
            console.log('📊 Using time-pattern algorithm for crowd predictions');
            this.dataStatus.crowd = {
                source: 'algorithm',
                lastUpdate: new Date(),
                isLive: false
            };
            API_CONFIG._crowdSource = 'algorithm';
            this.updateDataStatus();
        }
        
        return this.estimateCrowdWithAlgorithm(destinationId);
    }
    
    async fetchCrowdFromBackend(destinationId) {
        const response = await fetch(`${API_CONFIG.BACKEND_API_URL}/crowd/${destinationId}`);
        if (!response.ok) return null;
        const data = await response.json();
        
        // Calculate currentEstimate if not provided by backend
        if (!data.currentEstimate && data.percentageFull !== undefined) {
            // Get base visitor count from destination data
            const dest = destinations.find(d => d.id === parseInt(destinationId));
            const baseVisitors = dest?.avgVisitors || 5000;
            const crowdMultiplier = data.percentageFull / 100;
            const estimatedMin = Math.round(baseVisitors * crowdMultiplier * 0.8);
            const estimatedMax = Math.round(baseVisitors * crowdMultiplier * 1.2);
            data.currentEstimate = `${this.formatNumber(estimatedMin)}-${this.formatNumber(estimatedMax)}`;
        }
        
        return data;
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    estimateCrowdWithAlgorithm(destinationId) {
        const destination = destinations.find(d => d.id === destinationId);
        if (!destination) return null;

        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const month = now.getMonth();
        
        // Check if destination is closed today (e.g., Taj Mahal closed on Fridays)
        const isFriday = dayOfWeek === 5;
        if (destination.alerts && destination.alerts.some(a => a.toLowerCase().includes('closed on friday')) && isFriday) {
            return {
                crowdLevel: 'closed',
                crowdLabel: '⚫ Closed Today',
                currentEstimate: '0',
                rawEstimate: { min: 0, max: 0 },
                multiplier: 0,
                factors: ['Closed on Fridays'],
                confidence: 100,
                calculatedAt: new Date().toISOString()
            };
        }
        
        // Get the ORIGINAL numeric crowd level from data.js (not the normalized string)
        const originalCrowdLevel = destination.crowdLevel;
        let baseCrowdPercent;
        
        // If it's a number, use it directly as percentage
        if (typeof originalCrowdLevel === 'number') {
            baseCrowdPercent = originalCrowdLevel;
        } else {
            // If already string, convert back to approximate number
            const levelToPercent = { 'low': 25, 'moderate': 50, 'heavy': 70, 'overcrowded': 90 };
            baseCrowdPercent = levelToPercent[originalCrowdLevel] || 50;
        }
        
        // Base crowd multiplier starts at 1
        let crowdMultiplier = 1.0;
        let factors = [];
        
        // Time of day factor (affects the base level)
        if (hour >= 10 && hour <= 16) {
            crowdMultiplier *= 1.3;
            factors.push('Peak hours (+30%)');
        } else if (hour >= 6 && hour <= 9) {
            crowdMultiplier *= 0.7;
            factors.push('Early morning (-30%)');
        } else if (hour >= 17 && hour <= 19) {
            crowdMultiplier *= 1.1;
            factors.push('Evening (+10%)');
        } else {
            crowdMultiplier *= 0.5;
            factors.push('Off hours (-50%)');
        }
        
        // Weekend factor
        if (isWeekend) {
            crowdMultiplier *= 1.4;
            factors.push('Weekend (+40%)');
        }
        
        // Seasonal factor
        if (month === 11 || month === 0 || month === 1) {
            crowdMultiplier *= 1.2;
            factors.push('Peak tourist season (+20%)');
        } else if (month >= 6 && month <= 8) {
            crowdMultiplier *= 0.8;
            factors.push('Monsoon season (-20%)');
        }
        
        // Calculate final crowd percentage (capped at 100)
        const adjustedCrowdPercent = Math.min(100, Math.max(0, baseCrowdPercent * crowdMultiplier));
        
        // Determine crowd level based on adjusted percentage
        let newLevel, newLabel;
        if (adjustedCrowdPercent <= 35) {
            newLevel = 'low';
            newLabel = '🟢 Low';
        } else if (adjustedCrowdPercent <= 55) {
            newLevel = 'moderate';
            newLabel = '🟡 Moderate';
        } else if (adjustedCrowdPercent <= 75) {
            newLevel = 'heavy';
            newLabel = '🟠 Busy';
        } else {
            newLevel = 'overcrowded';
            newLabel = '🔴 Packed';
        }
        
        // Calculate visitor estimates based on avgVisitors
        const baseVisitors = destination.avgVisitors || 5000;
        const estimatedMin = Math.round(baseVisitors * (adjustedCrowdPercent / 100) * 0.8);
        const estimatedMax = Math.round(baseVisitors * (adjustedCrowdPercent / 100) * 1.2);
        
        return {
            crowdLevel: newLevel,
            crowdLabel: newLabel,
            currentEstimate: `${this.formatNumber(estimatedMin)}-${this.formatNumber(estimatedMax)}`,
            rawEstimate: { min: estimatedMin, max: estimatedMax },
            multiplier: crowdMultiplier,
            factors: factors,
            confidence: API_CONFIG.ENABLE_DYNAMIC_MOCK ? 75 : 50,
            calculatedAt: new Date().toISOString()
        };
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num.toString();
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 10 || month <= 1) return 'Winter (Peak Season)';
        if (month >= 2 && month <= 5) return 'Summer';
        if (month >= 6 && month <= 9) return 'Monsoon';
        return 'Pleasant Weather';
    }

    // ==================== HOLIDAY API ====================
    
    async getHolidays() {
        if (this.holidayCache) {
            return this.holidayCache;
        }

        try {
            const response = await fetch(API_CONFIG.HOLIDAY_API_URL);
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 2) {
                    const holidays = JSON.parse(text);
                    // Adjust year to current year for matching
                    this.holidayCache = holidays.map(h => ({
                        ...h,
                        date: h.date.replace(/^\d{4}/, new Date().getFullYear())
                    }));
                    return this.holidayCache;
                }
            }
        } catch (error) {
            console.warn('Holiday API unavailable, using built-in holidays');
        }

        // Fallback: Indian holidays
        const year = new Date().getFullYear();
        this.holidayCache = [
            { date: `${year}-01-26`, localName: 'Republic Day' },
            { date: `${year}-03-14`, localName: 'Holi' },
            { date: `${year}-04-14`, localName: 'Ambedkar Jayanti' },
            { date: `${year}-08-15`, localName: 'Independence Day' },
            { date: `${year}-10-02`, localName: 'Gandhi Jayanti' },
            { date: `${year}-10-20`, localName: 'Dussehra' },
            { date: `${year}-11-09`, localName: 'Diwali' },
            { date: `${year}-12-25`, localName: 'Christmas' }
        ];
        return this.holidayCache;
    }

    async isHolidayToday() {
        const holidays = await this.getHolidays();
        const today = new Date().toISOString().split('T')[0];
        return holidays.some(h => h.date === today);
    }

    async getUpcomingHolidays(count = 5) {
        const holidays = await this.getHolidays();
        const today = new Date();
        
        return holidays
            .filter(h => new Date(h.date) >= today)
            .slice(0, count)
            .map(h => ({
                name: h.localName,
                date: new Date(h.date).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long' 
                })
            }));
    }

    // ==================== DYNAMIC DATA UPDATES ====================
    
    async updateDestinationData(destination) {
        // Get real-time weather
        const weather = await this.getWeatherData(destination.id);
        destination.weather = weather.formatted;
        
        // Get real-time crowd estimate
        if (API_CONFIG.USE_REAL_CROWD_DATA || API_CONFIG.ENABLE_DYNAMIC_MOCK) {
            const crowdData = await this.getCrowdData(destination.id);
            if (crowdData) {
                destination.crowdLevel = crowdData.crowdLevel;
                destination.crowdLabel = crowdData.crowdLabel;
                destination.currentEstimate = crowdData.currentEstimate;
            }
        }
        
        // Check if it's a holiday
        const isHoliday = await this.isHolidayToday();
        if (isHoliday) {
            // Increase crowd estimates on holidays
            destination.crowdLabel = destination.crowdLabel.includes('🔵') ? 
                '🟡 Moderate' : destination.crowdLabel;
        }
        
        return destination;
    }

    async updateAllDestinations(destinations) {
        const promises = destinations.map(dest => this.updateDestinationData(dest));
        return Promise.all(promises);
    }

    // ==================== ANALYTICS & INSIGHTS ====================
    
    getBestTimeToVisit(destination) {
        const now = new Date();
        const hour = now.getHours();
        
        // Generate recommendations based on current time
        if (hour >= 6 && hour < 10) {
            return "Perfect time! Morning hours are less crowded.";
        } else if (hour >= 10 && hour < 16) {
            return "Currently peak hours. Consider visiting early morning or late evening.";
        } else if (hour >= 16 && hour < 19) {
            return "Good time to visit! Crowds are reducing.";
        } else {
            return "Currently closed or off-hours. Best time is early morning (6-9 AM).";
        }
    }

    getCrowdTrend(currentLevel) {
        const hour = new Date().getHours();
        
        if (hour < 10) {
            return "📈 Crowd expected to increase";
        } else if (hour >= 10 && hour < 16) {
            return "📊 Peak hours - Maximum crowd";
        } else if (hour >= 16) {
            return "📉 Crowd decreasing";
        }
        
        return "📊 Moderate activity";
    }
}

// Create global instance
const apiService = new APIService();

// Auto-refresh data every 5 minutes if real data is enabled
if (API_CONFIG.USE_REAL_CROWD_DATA || API_CONFIG.USE_REAL_WEATHER || API_CONFIG.ENABLE_DYNAMIC_MOCK) {
    setInterval(() => {
        console.log('🔄 Refreshing crowd data...');
        if (typeof filteredDestinations !== 'undefined') {
            apiService.updateAllDestinations(filteredDestinations).then(() => {
                renderDestinations();
                console.log('✅ Data refreshed at', new Date().toLocaleTimeString());
            });
        }
    }, API_CONFIG.CROWD_REFRESH_INTERVAL);
}
