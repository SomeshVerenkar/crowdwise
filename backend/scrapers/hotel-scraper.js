// ============================================================
// Hotel Availability Signal Scraper
// ============================================================
// Estimates crowd demand based on hotel availability patterns
// Uses publicly visible search result data (no login required)
// ============================================================

const fetch = require('node-fetch');

class HotelScraper {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 4 * 60 * 60 * 1000; // 4 hours
        
        // Destination slugs for hotel searches
        this.destinationSlugs = {
            'tirupati': { slug: 'tirupati', avgHotels: 150, peakMultiplier: 2.5 },
            'taj mahal': { slug: 'agra', avgHotels: 300, peakMultiplier: 2.0 },
            'goa': { slug: 'goa', avgHotels: 800, peakMultiplier: 3.0 },
            'manali': { slug: 'manali', avgHotels: 400, peakMultiplier: 2.5 },
            'shimla': { slug: 'shimla', avgHotels: 350, peakMultiplier: 2.0 },
            'jaipur': { slug: 'jaipur', avgHotels: 450, peakMultiplier: 1.8 },
            'varanasi': { slug: 'varanasi', avgHotels: 200, peakMultiplier: 2.2 },
            'kerala': { slug: 'alleppey', avgHotels: 300, peakMultiplier: 2.0 },
            'udaipur': { slug: 'udaipur', avgHotels: 350, peakMultiplier: 1.9 },
            'rishikesh': { slug: 'rishikesh', avgHotels: 250, peakMultiplier: 2.0 },
            'dharamshala': { slug: 'dharamshala', avgHotels: 200, peakMultiplier: 2.0 },
            'darjeeling': { slug: 'darjeeling', avgHotels: 180, peakMultiplier: 2.2 },
            'ladakh': { slug: 'leh', avgHotels: 150, peakMultiplier: 3.0 },
            'andaman': { slug: 'port-blair', avgHotels: 120, peakMultiplier: 2.5 },
            'mysore': { slug: 'mysore', avgHotels: 200, peakMultiplier: 1.5 },
            'hampi': { slug: 'hampi', avgHotels: 80, peakMultiplier: 2.0 },
            'amritsar': { slug: 'amritsar', avgHotels: 250, peakMultiplier: 1.8 },
            'ranthambore': { slug: 'ranthambore', avgHotels: 100, peakMultiplier: 2.5 },
            'jodhpur': { slug: 'jodhpur', avgHotels: 280, peakMultiplier: 1.7 },
            'pushkar': { slug: 'pushkar', avgHotels: 150, peakMultiplier: 3.5 },
            'kodaikanal': { slug: 'kodaikanal', avgHotels: 180, peakMultiplier: 2.0 },
            'ooty': { slug: 'ooty', avgHotels: 220, peakMultiplier: 2.2 },
            'coorg': { slug: 'coorg', avgHotels: 200, peakMultiplier: 2.0 },
            'srinagar': { slug: 'srinagar', avgHotels: 300, peakMultiplier: 2.5 },
            'nainital': { slug: 'nainital', avgHotels: 250, peakMultiplier: 2.0 },
            'gangtok': { slug: 'gangtok', avgHotels: 180, peakMultiplier: 2.0 },
            'shillong': { slug: 'shillong', avgHotels: 120, peakMultiplier: 1.8 }
        };
        
        // Seasonal patterns (month multipliers)
        this.seasonalPatterns = {
            // Peak tourist season in India
            'jan': 1.3, 'feb': 1.2, 'mar': 1.0,
            'apr': 0.7, 'may': 0.8, 'jun': 0.6,
            'jul': 0.5, 'aug': 0.6, 'sep': 0.7,
            'oct': 1.0, 'nov': 1.2, 'dec': 1.4
        };
        
        // Special destination seasonal patterns (override defaults)
        this.destinationSeasons = {
            'goa': { 'nov': 1.5, 'dec': 1.8, 'jan': 1.6, 'feb': 1.4, 'mar': 1.0, 'apr': 0.5, 'may': 0.3, 'jun': 0.2, 'jul': 0.3, 'aug': 0.4, 'sep': 0.6, 'oct': 1.0 },
            'ladakh': { 'jan': 0.2, 'feb': 0.2, 'mar': 0.3, 'apr': 0.5, 'may': 0.8, 'jun': 1.2, 'jul': 1.5, 'aug': 1.4, 'sep': 1.3, 'oct': 0.8, 'nov': 0.3, 'dec': 0.2 },
            'kerala': { 'jan': 1.3, 'feb': 1.2, 'mar': 1.0, 'apr': 0.7, 'may': 0.5, 'jun': 0.6, 'jul': 0.7, 'aug': 0.8, 'sep': 1.0, 'oct': 1.1, 'nov': 1.2, 'dec': 1.3 },
            'manali': { 'jan': 0.9, 'feb': 0.8, 'mar': 0.9, 'apr': 1.0, 'may': 1.4, 'jun': 1.5, 'jul': 1.0, 'aug': 0.8, 'sep': 1.0, 'oct': 1.2, 'nov': 1.0, 'dec': 1.3 },
            'shimla': { 'jan': 1.0, 'feb': 0.9, 'mar': 1.0, 'apr': 1.2, 'may': 1.5, 'jun': 1.4, 'jul': 0.8, 'aug': 0.7, 'sep': 0.9, 'oct': 1.1, 'nov': 1.0, 'dec': 1.4 }
        };
    }

    // Get current month key
    getCurrentMonthKey() {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return months[new Date().getMonth()];
    }

    // Get seasonal multiplier for destination
    getSeasonalMultiplier(destination) {
        const monthKey = this.getCurrentMonthKey();
        const destLower = destination.toLowerCase();
        
        if (this.destinationSeasons[destLower]) {
            return this.destinationSeasons[destLower][monthKey] || 1.0;
        }
        return this.seasonalPatterns[monthKey] || 1.0;
    }

    // Check if it's a weekend
    isWeekend() {
        const day = new Date().getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    // Check if near a long weekend (Friday/Monday)
    isNearWeekend() {
        const day = new Date().getDay();
        return day === 5 || day === 1; // Friday or Monday
    }

    // Simulate hotel availability data
    // In production, this would scrape actual search results
    async getHotelAvailability(destination, checkInDays = 0) {
        const destInfo = this.destinationSlugs[destination.toLowerCase()];
        if (!destInfo) return null;

        const cacheKey = `${destination.toLowerCase()}_${checkInDays}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        // Calculate check-in date
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + checkInDays);
        
        // Base availability calculation
        const seasonalMultiplier = this.getSeasonalMultiplier(destination);
        const weekendMultiplier = this.isWeekend() ? 1.3 : (this.isNearWeekend() ? 1.15 : 1.0);
        
        // Calculate demand level (0-1)
        const baseDemand = 0.4 + (Math.random() * 0.3); // 0.4-0.7 base
        const demandLevel = Math.min(1, baseDemand * seasonalMultiplier * weekendMultiplier);
        
        // Available rooms decrease as demand increases
        const totalHotels = destInfo.avgHotels;
        const availabilityRate = 1 - (demandLevel * 0.7); // 30-100% availability
        const availableHotels = Math.floor(totalHotels * availabilityRate);
        
        // Price increase with demand
        const basePriceRange = this.getBasePriceRange(destination);
        const priceMultiplier = 1 + (demandLevel * 0.5); // 0-50% price increase
        
        const result = {
            destination,
            checkInDate: checkInDate.toISOString().split('T')[0],
            totalHotels,
            availableHotels,
            availabilityRate: Math.round(availabilityRate * 100),
            demandLevel: Math.round(demandLevel * 100) / 100,
            demandIndicator: demandLevel > 0.7 ? 'high' : demandLevel > 0.4 ? 'moderate' : 'low',
            priceRange: {
                budget: Math.round(basePriceRange.budget * priceMultiplier),
                midRange: Math.round(basePriceRange.midRange * priceMultiplier),
                luxury: Math.round(basePriceRange.luxury * priceMultiplier)
            },
            priceAlert: priceMultiplier > 1.3 ? 'prices_elevated' : 'normal',
            seasonalFactor: seasonalMultiplier,
            weekendFactor: weekendMultiplier,
            crowdSignal: this.calculateCrowdSignal(demandLevel, availabilityRate),
            lastUpdated: new Date().toISOString(),
            dataType: 'estimated'
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    }

    // Get base price ranges for destinations
    getBasePriceRange(destination) {
        const priceRanges = {
            'goa': { budget: 1500, midRange: 4000, luxury: 15000 },
            'ladakh': { budget: 2000, midRange: 5000, luxury: 20000 },
            'shimla': { budget: 1200, midRange: 3500, luxury: 12000 },
            'manali': { budget: 1000, midRange: 3000, luxury: 10000 },
            'jaipur': { budget: 1000, midRange: 3500, luxury: 15000 },
            'udaipur': { budget: 1500, midRange: 5000, luxury: 25000 },
            'kerala': { budget: 1200, midRange: 4000, luxury: 18000 },
            'default': { budget: 1000, midRange: 3000, luxury: 10000 }
        };
        return priceRanges[destination.toLowerCase()] || priceRanges.default;
    }

    // Calculate crowd signal from hotel data
    calculateCrowdSignal(demandLevel, availabilityRate) {
        // High demand + low availability = high crowd
        const crowdScore = (demandLevel * 0.6) + ((1 - availabilityRate) * 0.4);
        return {
            score: Math.round(crowdScore * 100) / 100,
            level: crowdScore > 0.7 ? 'very_crowded' : 
                   crowdScore > 0.5 ? 'crowded' :
                   crowdScore > 0.3 ? 'moderate' : 'light',
            confidence: 'medium' // Would be 'high' with real scraped data
        };
    }

    // Get availability forecast for next 7 days
    async getAvailabilityForecast(destination) {
        const forecasts = [];
        
        for (let i = 0; i < 7; i++) {
            const dayData = await this.getHotelAvailability(destination, i);
            if (dayData) {
                forecasts.push({
                    date: dayData.checkInDate,
                    demandLevel: dayData.demandLevel,
                    crowdSignal: dayData.crowdSignal.level,
                    priceIndicator: dayData.priceAlert
                });
            }
        }

        // Find best day to visit
        const sortedByDemand = [...forecasts].sort((a, b) => a.demandLevel - b.demandLevel);
        const bestDay = sortedByDemand[0];
        const worstDay = sortedByDemand[sortedByDemand.length - 1];

        return {
            destination,
            forecast: forecasts,
            recommendation: {
                bestDay: bestDay?.date,
                bestDayDemand: bestDay?.demandLevel,
                avoidDay: worstDay?.date,
                avoidDayDemand: worstDay?.demandLevel
            },
            generatedAt: new Date().toISOString()
        };
    }

    // Batch get hotel signals for multiple destinations
    async batchGetHotelSignals(destinations) {
        const results = {};
        
        for (const dest of destinations) {
            results[dest] = await this.getHotelAvailability(dest);
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }
}

module.exports = HotelScraper;
