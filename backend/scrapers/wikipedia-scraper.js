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
        this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours
        
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

    // Get aggregated interest score for a destination
    async getDestinationInterest(destinationName) {
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
            return this.getDestinationInterest(matchedKey);
        }

        try {
            // Fetch all related articles in parallel
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
                lastUpdated: new Date().toISOString()
            };

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
