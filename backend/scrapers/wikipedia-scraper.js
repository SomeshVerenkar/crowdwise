// ============================================================
// Wikipedia Page Views Scraper - FREE API, No Authentication
// ============================================================
// Uses Wikimedia REST API to get daily page views
// This is a LEGAL, FREE data source for crowd interest signals
// API Docs: https://wikimedia.org/api/rest_v1/
// ============================================================

const fetch = require('node-fetch');

class WikipediaScraper {
    constructor() {
        this.baseUrl = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
        this.cache = new Map();
        this.cacheExpiry = 4 * 60 * 60 * 1000; // 4 hours (updated for fresher data)
        
        // Map destinations to Wikipedia article titles
        this.destinationWikiMap = {
            'tirupati': ['Tirumala_Venkateswara_Temple', 'Tirupati'],
            'taj mahal': ['Taj_Mahal', 'Agra'],
            'goa': ['Goa', 'Beaches_of_Goa', 'North_Goa'],
            'manali': ['Manali,_Himachal_Pradesh', 'Rohtang_Pass'],
            'shimla': ['Shimla', 'Mall_Road,_Shimla'],
            'jaipur': ['Jaipur', 'Hawa_Mahal', 'Amber_Fort'],
            'varanasi': ['Varanasi', 'Ghats_in_Varanasi', 'Kashi_Vishwanath_Temple'],
            'kerala': ['Kerala', 'Backwaters_of_Kerala', 'Munnar'],
            'udaipur': ['Udaipur', 'Lake_Pichola', 'City_Palace,_Udaipur'],
            'rishikesh': ['Rishikesh', 'Lakshman_Jhula'],
            'dharamshala': ['Dharamshala', 'McLeod_Ganj'],
            'kaziranga': ['Kaziranga_National_Park'],
            'darjeeling': ['Darjeeling', 'Darjeeling_Himalayan_Railway'],
            'ooty': ['Ooty', 'Nilgiri_Mountain_Railway'],
            'mysore': ['Mysore', 'Mysore_Palace'],
            'hampi': ['Hampi', 'Group_of_Monuments_at_Hampi'],
            'khajuraho': ['Khajuraho_Group_of_Monuments'],
            'ajanta': ['Ajanta_Caves'],
            'ellora': ['Ellora_Caves'],
            'konark': ['Konark_Sun_Temple'],
            'ranthambore': ['Ranthambore_National_Park'],
            'ladakh': ['Ladakh', 'Leh', 'Pangong_Lake'],
            'andaman': ['Andaman_Islands', 'Havelock_Island'],
            'kodaikanal': ['Kodaikanal'],
            'coorg': ['Kodagu', 'Coorg'],
            'pushkar': ['Pushkar', 'Pushkar_Lake'],
            'jodhpur': ['Jodhpur', 'Mehrangarh'],
            'amritsar': ['Amritsar', 'Golden_Temple'],
            'bodh gaya': ['Bodh_Gaya', 'Mahabodhi_Temple'],
            'srinagar': ['Srinagar', 'Dal_Lake'],
            'nainital': ['Nainital', 'Naini_Lake'],
            'mount abu': ['Mount_Abu', 'Dilwara_Temples'],
            'kanyakumari': ['Kanyakumari'],
            'madurai': ['Madurai', 'Meenakshi_Temple'],
            'rameshwaram': ['Rameswaram', 'Ramanathaswamy_Temple'],
            'puri': ['Puri', 'Jagannath_Temple,_Puri'],
            'bhubaneswar': ['Bhubaneswar', 'Lingaraja_Temple'],
            'gangtok': ['Gangtok'],
            'tawang': ['Tawang', 'Tawang_Monastery'],
            'shillong': ['Shillong'],
            'cherrapunji': ['Cherrapunji', 'Mawsynram']
        };
    }

    // ============================================================
    // 7-DAY WINDOW ANALYSIS FUNCTIONS
    // ============================================================
    
    // Format date as YYYYMMDD for Wikipedia API
    formatDate(date) {
        return date.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    // Get 7-day pageview data for spike detection and trend analysis
    async get7DayPageviews(articleTitle) {
        const cacheKey = `${articleTitle}_7day`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            
            const start = this.formatDate(startDate);
            const end = this.formatDate(endDate);
            
            const url = `${this.baseUrl}/en.wikipedia/all-access/all-agents/${encodeURIComponent(articleTitle)}/daily/${start}/${end}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'CrowdWise-India/2.0 (tourist-tracker; contact@crowdwise.in)'
                }
            });

            if (!response.ok) {
                throw new Error(`Wikipedia API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract daily view counts
            const dailyViews = data.items ? data.items.map(item => item.views) : [];
            
            // Calculate 7-day metrics
            const metrics = this.calculate7DayMetrics(dailyViews);
            
            const result = {
                articleTitle,
                dailyViews,
                metrics,
                dataPoints: dailyViews.length,
                dateRange: {
                    start: start,
                    end: end
                },
                lastUpdated: new Date().toISOString()
            };
            
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;

        } catch (error) {
            console.error(`Error fetching 7-day Wikipedia data for ${articleTitle}:`, error.message);
            return null;
        }
    }
    
    // Calculate average of array
    calculateAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    // Calculate sum of array
    calculateSum(values) {
        return values.reduce((sum, val) => sum + val, 0);
    }
    
    // Calculate spike ratio (how much current is above average)
    calculateSpikeRatio(dailyViews) {
        if (dailyViews.length < 2) return 1.0;
        const avg = this.calculateAverage(dailyViews.slice(0, -1)); // Average excluding latest
        const latest = dailyViews[dailyViews.length - 1];
        if (avg === 0) return 1.0;
        return latest / avg;
    }
    
    // Detect if there's a significant spike (>1.5x average)
    detectSpike(dailyViews) {
        if (dailyViews.length < 3) return false;
        const spikeRatio = this.calculateSpikeRatio(dailyViews);
        return spikeRatio > 1.5;
    }
    
    // Calculate trend direction
    calculateTrend(dailyViews) {
        if (dailyViews.length < 3) return "stable";
        
        // Handle partial data gracefully
        const minDays = Math.min(3, Math.floor(dailyViews.length / 2));
        
        const firstHalf = dailyViews.slice(0, minDays);
        const secondHalf = dailyViews.slice(-minDays);
        
        const firstAvg = this.calculateAverage(firstHalf);
        const secondAvg = this.calculateAverage(secondHalf);
        
        if (firstAvg === 0) return "stable";
        
        const changeRatio = secondAvg / firstAvg;
        
        if (changeRatio > 1.2) return "rising";
        if (changeRatio < 0.8) return "falling";
        return "stable";
    }
    
    // Calculate comprehensive 7-day metrics
    calculate7DayMetrics(dailyViews) {
        // Handle missing or partial data
        if (!dailyViews || dailyViews.length === 0) {
            return {
                average: 0,
                total: 0,
                trend: "stable",
                spike: false,
                spikeRatio: 1.0,
                days: 0,
                dataQuality: "no_data"
            };
        }
        
        const average = this.calculateAverage(dailyViews);
        const total = this.calculateSum(dailyViews);
        const trend = this.calculateTrend(dailyViews);
        const spike = this.detectSpike(dailyViews);
        const spikeRatio = this.calculateSpikeRatio(dailyViews);
        
        // Assess data quality
        let dataQuality = "good";
        if (dailyViews.length < 5) {
            dataQuality = "partial";
        } else if (dailyViews.length < 3) {
            dataQuality = "limited";
        }
        
        return {
            average: Math.round(average),
            total: total,
            trend: trend,
            spike: spike,
            spikeRatio: Math.round(spikeRatio * 100) / 100,
            days: dailyViews.length,
            dataQuality: dataQuality,
            // Additional insights
            min: Math.min(...dailyViews),
            max: Math.max(...dailyViews),
            volatility: this.calculateVolatility(dailyViews)
        };
    }
    
    // Calculate volatility (standard deviation / mean)
    calculateVolatility(values) {
        if (values.length < 2) return 0;
        
        const avg = this.calculateAverage(values);
        if (avg === 0) return 0;
        
        const variance = values.reduce((sum, val) => {
            const diff = val - avg;
            return sum + (diff * diff);
        }, 0) / values.length;
        
        const stdDev = Math.sqrt(variance);
        return Math.round((stdDev / avg) * 100) / 100;
    }
    
    // ============================================================
    // END 7-DAY WINDOW ANALYSIS FUNCTIONS
    // ============================================================

    // Get page views for a specific article
    async getPageViews(articleTitle, days = 30) {
        const cacheKey = `${articleTitle}_${days}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
            
            const url = `${this.baseUrl}/en.wikipedia/all-access/all-agents/${encodeURIComponent(articleTitle)}/daily/${formatDate(startDate)}/${formatDate(endDate)}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'CrowdWise-India/1.0 (tourist-tracker; contact@crowdwise.in)'
                }
            });

            if (!response.ok) {
                throw new Error(`Wikipedia API error: ${response.status}`);
            }

            const data = await response.json();
            const result = this.processPageViews(data);
            
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;

        } catch (error) {
            console.error(`Error fetching Wikipedia data for ${articleTitle}:`, error.message);
            return null;
        }
    }

    // Process raw page view data
    processPageViews(data) {
        if (!data.items || data.items.length === 0) {
            return null;
        }

        const views = data.items.map(item => item.views);
        const total = views.reduce((a, b) => a + b, 0);
        const average = total / views.length;
        const recent7Days = views.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const previous7Days = views.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
        
        // Calculate trend (positive = increasing interest)
        const trend = previous7Days > 0 ? ((recent7Days - previous7Days) / previous7Days) * 100 : 0;
        
        // Calculate normalized score (0-1)
        // Using logarithmic scale since popular places can have millions of views
        const normalizedScore = Math.min(1, Math.log10(recent7Days + 1) / 5);

        return {
            totalViews: total,
            dailyAverage: Math.round(average),
            recent7DayAvg: Math.round(recent7Days),
            trend: Math.round(trend * 10) / 10, // Percentage change
            trendDirection: trend > 5 ? 'rising' : trend < -5 ? 'falling' : 'stable',
            normalizedScore: Math.round(normalizedScore * 100) / 100,
            lastUpdated: new Date().toISOString()
        };
    }

    // Get aggregated interest score for a destination (Enhanced with 7-day analysis)
    async getDestinationInterest(destinationName, use7DayAnalysis = true) {
        const normalizedName = destinationName.toLowerCase().trim();
        const wikiArticles = this.destinationWikiMap[normalizedName];
        
        if (!wikiArticles) {
            // Try partial match
            const matchedKey = Object.keys(this.destinationWikiMap).find(key => 
                normalizedName.includes(key) || key.includes(normalizedName)
            );
            
            if (!matchedKey) {
                console.log(`No Wikipedia mapping for: ${destinationName}`);
                return null;
            }
            return this.getDestinationInterest(matchedKey, use7DayAnalysis);
        }

        try {
            if (use7DayAnalysis) {
                // NEW: Fetch 7-day analysis for all related articles in parallel
                const results7Day = await Promise.all(
                    wikiArticles.map(article => this.get7DayPageviews(article))
                );

                const validResults7Day = results7Day.filter(r => r !== null && r.dataPoints > 0);
                
                if (validResults7Day.length === 0) {
                    // Fallback to legacy method if 7-day fails
                    return this.getDestinationInterest(destinationName, false);
                }

                // Aggregate 7-day metrics across all articles
                const avgViews = validResults7Day.reduce((sum, r) => sum + r.metrics.average, 0) / validResults7Day.length;
                const totalViews = validResults7Day.reduce((sum, r) => sum + r.metrics.total, 0);
                
                // Aggregate spikes (if ANY article shows spike, destination is spiking)
                const hasSpike = validResults7Day.some(r => r.metrics.spike);
                const avgSpikeRatio = validResults7Day.reduce((sum, r) => sum + r.metrics.spikeRatio, 0) / validResults7Day.length;
                
                // Aggregate trends (majority wins)
                const trendCounts = { rising: 0, falling: 0, stable: 0 };
                validResults7Day.forEach(r => {
                    trendCounts[r.metrics.trend] = (trendCounts[r.metrics.trend] || 0) + 1;
                });
                const dominantTrend = Object.keys(trendCounts).reduce((a, b) => 
                    trendCounts[a] > trendCounts[b] ? a : b
                );
                
                // Calculate normalized score (logarithmic scale)
                const normalizedScore = Math.min(1, Math.log10(avgViews + 1) / 5);

                return {
                    destination: destinationName,
                    // Legacy format (for backward compatibility)
                    interestScore: Math.round(normalizedScore * 100) / 100,
                    trend: 0, // Deprecated in favor of metrics.trend
                    trendDirection: dominantTrend,
                    weeklyViews: Math.round(avgViews * 7),
                    articlesAnalyzed: validResults7Day.length,
                    confidence: validResults7Day.length >= 2 ? 'high' : 'medium',
                    // NEW: Enhanced 7-day metrics
                    metrics: {
                        average: Math.round(avgViews),
                        total: totalViews,
                        trend: dominantTrend,
                        spike: hasSpike,
                        spikeRatio: Math.round(avgSpikeRatio * 100) / 100,
                        days: validResults7Day[0].dataPoints,
                        volatility: validResults7Day.reduce((sum, r) => sum + r.metrics.volatility, 0) / validResults7Day.length,
                        dataQuality: validResults7Day.every(r => r.metrics.dataQuality === 'good') ? 'good' : 'partial'
                    },
                    // Detailed breakdown per article
                    articleBreakdown: validResults7Day.map(r => ({
                        title: r.articleTitle,
                        average: r.metrics.average,
                        trend: r.metrics.trend,
                        spike: r.metrics.spike,
                        spikeRatio: r.metrics.spikeRatio
                    })),
                    lastUpdated: new Date().toISOString(),
                    analysisVersion: '2.0-7day'
                };
                
            } else {
                // LEGACY: Original 30-day analysis (backward compatibility)
                const results = await Promise.all(
                    wikiArticles.map(article => this.getPageViews(article))
                );

                const validResults = results.filter(r => r !== null);
                
                if (validResults.length === 0) {
                    return null;
                }

                // Aggregate scores
                const avgScore = validResults.reduce((sum, r) => sum + r.normalizedScore, 0) / validResults.length;
                const avgTrend = validResults.reduce((sum, r) => sum + r.trend, 0) / validResults.length;
                const totalViews = validResults.reduce((sum, r) => sum + r.recent7DayAvg, 0);

                return {
                    destination: destinationName,
                    interestScore: Math.round(avgScore * 100) / 100,
                    trend: Math.round(avgTrend * 10) / 10,
                    trendDirection: avgTrend > 5 ? 'rising' : avgTrend < -5 ? 'falling' : 'stable',
                    weeklyViews: totalViews,
                    articlesAnalyzed: validResults.length,
                    confidence: validResults.length >= 2 ? 'high' : 'medium',
                    lastUpdated: new Date().toISOString(),
                    analysisVersion: '1.0-legacy'
                };
            }

        } catch (error) {
            console.error(`Error getting destination interest for ${destinationName}:`, error);
            return null;
        }
    }

    // Batch process multiple destinations
    async batchGetInterest(destinationNames, concurrency = 3) {
        const results = {};
        const chunks = [];
        
        // Split into chunks for rate limiting
        for (let i = 0; i < destinationNames.length; i += concurrency) {
            chunks.push(destinationNames.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            const chunkResults = await Promise.all(
                chunk.map(name => this.getDestinationInterest(name))
            );
            
            chunk.forEach((name, idx) => {
                results[name] = chunkResults[idx];
            });

            // Rate limiting: wait 1 second between chunks
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }

    // Get trending destinations based on Wikipedia interest
    async getTrendingDestinations(limit = 10) {
        const allDestinations = Object.keys(this.destinationWikiMap);
        const interests = await this.batchGetInterest(allDestinations);
        
        const trending = Object.entries(interests)
            .filter(([_, data]) => data !== null)
            .sort((a, b) => {
                // Sort by trend first, then by score
                const trendDiff = (b[1].trend || 0) - (a[1].trend || 0);
                if (Math.abs(trendDiff) > 10) return trendDiff;
                return (b[1].interestScore || 0) - (a[1].interestScore || 0);
            })
            .slice(0, limit)
            .map(([name, data]) => ({
                name,
                ...data
            }));

        return trending;
    }
}

module.exports = WikipediaScraper;
