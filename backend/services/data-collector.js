// ============================================================
// Data Collection Orchestrator
// ============================================================
// Coordinates all data scrapers and maintains data freshness
// Handles caching, rate limiting, and error recovery
// ============================================================

const WikipediaScraper = require('../scrapers/wikipedia-scraper');
const SocialScraper = require('../scrapers/social-scraper');
const HotelScraper = require('../scrapers/hotel-scraper');

class DataCollector {
    constructor() {
        this.wikipedia = new WikipediaScraper();
        this.social = new SocialScraper();
        this.hotel = new HotelScraper();
        
        // Master data cache
        this.dataCache = new Map();
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour
        
        // Collection stats
        this.stats = {
            totalCollections: 0,
            successfulCollections: 0,
            failedCollections: 0,
            lastCollectionTime: null,
            averageCollectionTime: 0
        };
        
        // Data freshness tracking
        this.freshness = new Map();
    }

    // ========== SINGLE DESTINATION COLLECTION ==========

    async collectDestinationData(destinationName, options = {}) {
        const {
            includeWikipedia = true,
            includeSocial = true,
            includeHotel = true,
            forceRefresh = false
        } = options;

        const startTime = Date.now();
        const cacheKey = destinationName.toLowerCase();
        
        // Check cache unless force refresh
        if (!forceRefresh) {
            const cached = this.dataCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return { ...cached.data, fromCache: true };
            }
        }

        console.log(`📊 Collecting data for: ${destinationName}`);
        
        const results = {
            destination: destinationName,
            signals: {},
            aggregated: null,
            errors: [],
            collectionTime: null
        };

        // Collect from all sources in parallel
        const promises = [];
        
        if (includeWikipedia) {
            promises.push(
                this.wikipedia.getDestinationInterest(destinationName)
                    .then(data => { results.signals.wikipedia = data; })
                    .catch(err => { results.errors.push({ source: 'wikipedia', error: err.message }); })
            );
        }
        
        if (includeSocial) {
            promises.push(
                this.social.getAggregatedSocialSignal(destinationName)
                    .then(data => { results.signals.social = data; })
                    .catch(err => { results.errors.push({ source: 'social', error: err.message }); })
            );
        }
        
        if (includeHotel) {
            promises.push(
                this.hotel.getHotelAvailability(destinationName)
                    .then(data => { results.signals.hotel = data; })
                    .catch(err => { results.errors.push({ source: 'hotel', error: err.message }); })
            );
        }

        await Promise.all(promises);

        // Aggregate all signals
        results.aggregated = this.aggregateSignals(results.signals);
        results.collectionTime = Date.now() - startTime;
        results.timestamp = new Date().toISOString();

        // Update cache
        this.dataCache.set(cacheKey, { data: results, timestamp: Date.now() });
        
        // Update freshness tracking
        this.freshness.set(cacheKey, {
            lastUpdate: new Date(),
            sources: Object.keys(results.signals).filter(k => results.signals[k] !== null)
        });

        // Update stats
        this.updateStats(results);

        return results;
    }

    // Aggregate all signals into unified format
    aggregateSignals(signals) {
        const weights = {
            wikipedia: 0.25,
            social: 0.35,
            hotel: 0.40
        };

        let totalWeight = 0;
        let weightedScore = 0;
        const sourceScores = {};

        // Wikipedia signal
        if (signals.wikipedia?.interestScore) {
            sourceScores.wikipedia = signals.wikipedia.interestScore;
            weightedScore += signals.wikipedia.interestScore * weights.wikipedia;
            totalWeight += weights.wikipedia;
        }

        // Social signal
        if (signals.social?.aggregatedScore) {
            sourceScores.social = signals.social.aggregatedScore;
            weightedScore += signals.social.aggregatedScore * weights.social;
            totalWeight += weights.social;
        }

        // Hotel signal
        if (signals.hotel?.demandLevel) {
            sourceScores.hotel = signals.hotel.demandLevel;
            weightedScore += signals.hotel.demandLevel * weights.hotel;
            totalWeight += weights.hotel;
        }

        if (totalWeight === 0) {
            return null;
        }

        const finalScore = weightedScore / totalWeight;

        return {
            score: Math.round(finalScore * 100) / 100,
            sourceScores,
            sourcesUsed: Object.keys(sourceScores),
            confidence: this.calculateConfidence(sourceScores),
            trend: this.calculateTrend(signals),
            details: {
                wikiViews: signals.wikipedia?.weeklyViews,
                socialBuzz: signals.social?.buzzLevel,
                hotelDemand: signals.hotel?.demandIndicator
            }
        };
    }

    calculateConfidence(sourceScores) {
        const count = Object.keys(sourceScores).length;
        if (count >= 3) return 'high';
        if (count >= 2) return 'medium';
        return 'low';
    }

    calculateTrend(signals) {
        const trends = [];
        
        if (signals.wikipedia?.trendDirection) {
            trends.push(signals.wikipedia.trendDirection);
        }
        
        // Count trend directions
        const rising = trends.filter(t => t === 'rising').length;
        const falling = trends.filter(t => t === 'falling').length;
        
        if (rising > falling) return 'increasing';
        if (falling > rising) return 'decreasing';
        return 'stable';
    }

    updateStats(results) {
        this.stats.totalCollections++;
        
        if (results.errors.length === 0) {
            this.stats.successfulCollections++;
        } else {
            this.stats.failedCollections++;
        }
        
        this.stats.lastCollectionTime = new Date().toISOString();
        
        // Update average collection time
        this.stats.averageCollectionTime = 
            ((this.stats.averageCollectionTime * (this.stats.totalCollections - 1)) + results.collectionTime) / 
            this.stats.totalCollections;
    }

    // ========== BATCH COLLECTION ==========

    async collectMultipleDestinations(destinations, options = {}) {
        const { concurrency = 3 } = options;
        const results = {};
        
        // Process in batches
        for (let i = 0; i < destinations.length; i += concurrency) {
            const batch = destinations.slice(i, i + concurrency);
            
            const batchResults = await Promise.all(
                batch.map(dest => this.collectDestinationData(dest, options))
            );
            
            batch.forEach((dest, idx) => {
                results[dest] = batchResults[idx];
            });

            // Rate limiting between batches
            if (i + concurrency < destinations.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return results;
    }

    // ========== DATA STATUS & HEALTH ==========

    getDataStatus() {
        const status = {};
        
        this.freshness.forEach((info, destination) => {
            const age = Date.now() - info.lastUpdate.getTime();
            const ageMinutes = Math.round(age / 60000);
            
            status[destination] = {
                lastUpdate: info.lastUpdate.toISOString(),
                ageMinutes,
                sources: info.sources,
                isStale: age > this.cacheExpiry,
                healthStatus: age < this.cacheExpiry / 2 ? 'fresh' : 
                             age < this.cacheExpiry ? 'aging' : 'stale'
            };
        });

        return status;
    }

    getCollectionStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalCollections > 0 
                ? Math.round((this.stats.successfulCollections / this.stats.totalCollections) * 100) 
                : 0,
            cacheSize: this.dataCache.size,
            trackedDestinations: this.freshness.size
        };
    }

    // Get stale destinations that need refresh
    getStaleDestinations() {
        const stale = [];
        
        this.freshness.forEach((info, destination) => {
            if (Date.now() - info.lastUpdate.getTime() > this.cacheExpiry) {
                stale.push(destination);
            }
        });

        return stale;
    }

    // ========== CACHE MANAGEMENT ==========

    clearCache() {
        this.dataCache.clear();
        this.freshness.clear();
        console.log('🗑️ Data cache cleared');
    }

    getCacheEntry(destination) {
        return this.dataCache.get(destination.toLowerCase());
    }

    // ========== FORECAST DATA ==========

    async getForecastData(destination) {
        // Get current signals
        const current = await this.collectDestinationData(destination);
        
        // Get hotel forecast
        const hotelForecast = await this.hotel.getAvailabilityForecast(destination);

        return {
            current: current.aggregated,
            signals: current.signals,
            forecast: hotelForecast,
            collectedAt: new Date().toISOString()
        };
    }
}

module.exports = DataCollector;
