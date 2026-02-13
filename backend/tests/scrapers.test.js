// ============================================================
// Unit Tests: Scrapers (Wikipedia, Social, Hotel)
// ============================================================

const WikipediaScraper = require('../scrapers/wikipedia-scraper');
const SocialScraper = require('../scrapers/social-scraper');
const HotelScraper = require('../scrapers/hotel-scraper');

// ==================== WIKIPEDIA SCRAPER ====================

describe('WikipediaScraper', () => {
    let scraper;

    beforeEach(() => {
        scraper = new WikipediaScraper();
    });

    describe('Constructor', () => {
        test('should initialize with correct base URL', () => {
            expect(scraper.baseUrl).toBe('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article');
        });

        test('should have 6-hour cache expiry', () => {
            expect(scraper.cacheExpiry).toBe(6 * 60 * 60 * 1000);
        });

        test('should have destination wiki mappings', () => {
            expect(Object.keys(scraper.destinationWikiMap).length).toBeGreaterThan(30);
        });

        test('should have wiki mappings for key destinations', () => {
            expect(scraper.destinationWikiMap).toHaveProperty('taj mahal');
            expect(scraper.destinationWikiMap).toHaveProperty('goa');
            expect(scraper.destinationWikiMap).toHaveProperty('varanasi');
            expect(scraper.destinationWikiMap).toHaveProperty('ladakh');
            expect(scraper.destinationWikiMap).toHaveProperty('jaipur');
        });

        test('each wiki mapping should be a non-empty array', () => {
            Object.values(scraper.destinationWikiMap).forEach(articles => {
                expect(Array.isArray(articles)).toBe(true);
                expect(articles.length).toBeGreaterThan(0);
            });
        });
    });

    describe('processPageViews()', () => {
        test('should return null for empty data', () => {
            expect(scraper.processPageViews({ items: [] })).toBeNull();
            expect(scraper.processPageViews({})).toBeNull();
        });

        test('should process valid page view data', () => {
            const mockData = {
                items: Array.from({ length: 30 }, (_, i) => ({
                    views: 100 + Math.floor(Math.random() * 50)
                }))
            };
            const result = scraper.processPageViews(mockData);
            expect(result).not.toBeNull();
            expect(result).toHaveProperty('totalViews');
            expect(result).toHaveProperty('dailyAverage');
            expect(result).toHaveProperty('recent7DayAvg');
            expect(result).toHaveProperty('trend');
            expect(result).toHaveProperty('trendDirection');
            expect(result).toHaveProperty('normalizedScore');
            expect(result).toHaveProperty('lastUpdated');
        });

        test('should calculate normalized score between 0 and 1', () => {
            const mockData = {
                items: Array.from({ length: 14 }, () => ({ views: 5000 }))
            };
            const result = scraper.processPageViews(mockData);
            expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
            expect(result.normalizedScore).toBeLessThanOrEqual(1);
        });

        test('should detect rising trend', () => {
            const items = [
                ...Array(7).fill({ views: 100 }),  // First 7 days: low
                ...Array(7).fill({ views: 200 })   // Recent 7 days: high
            ];
            const result = scraper.processPageViews({ items });
            expect(result.trendDirection).toBe('rising');
        });

        test('should detect falling trend', () => {
            const items = [
                ...Array(7).fill({ views: 200 }),  // First 7 days: high
                ...Array(7).fill({ views: 100 })   // Recent 7 days: low
            ];
            const result = scraper.processPageViews({ items });
            expect(result.trendDirection).toBe('falling');
        });

        test('should detect stable trend', () => {
            const items = Array(14).fill({ views: 100 });
            const result = scraper.processPageViews({ items });
            expect(result.trendDirection).toBe('stable');
        });
    });

    describe('getDestinationInterest() - cache & mapping', () => {
        test('should return null for unmapped destination', async () => {
            const result = await scraper.getDestinationInterest('nonexistent_place_xyz');
            expect(result).toBeNull();
        });
    });
});

// ==================== SOCIAL SCRAPER ====================

describe('SocialScraper', () => {
    let scraper;

    beforeEach(() => {
        scraper = new SocialScraper();
    });

    describe('Constructor', () => {
        test('should have 2-hour cache expiry', () => {
            expect(scraper.cacheExpiry).toBe(2 * 60 * 60 * 1000);
        });

        test('should have hashtag mappings for key destinations', () => {
            expect(scraper.hashtagMap).toHaveProperty('taj mahal');
            expect(scraper.hashtagMap).toHaveProperty('goa');
            expect(scraper.hashtagMap).toHaveProperty('ladakh');
        });

        test('each hashtag mapping should have 3+ hashtags', () => {
            Object.values(scraper.hashtagMap).forEach(hashtags => {
                expect(hashtags.length).toBeGreaterThanOrEqual(3);
            });
        });
    });

    describe('getDestinationPopularityBase()', () => {
        test('should return highest for Taj Mahal', () => {
            const tajScore = scraper.getDestinationPopularityBase('taj mahal');
            const defaultScore = scraper.getDestinationPopularityBase('unknown');
            expect(tajScore).toBeGreaterThan(defaultScore);
            expect(tajScore).toBe(5000000);
        });

        test('should return default for unknown destination', () => {
            expect(scraper.getDestinationPopularityBase('unknown')).toBe(200000);
        });
    });

    describe('getRecentActivityLevel()', () => {
        test('should return valid activity level', () => {
            const validLevels = ['high', 'medium', 'low'];
            // Run multiple times to cover random branches
            for (let i = 0; i < 20; i++) {
                expect(validLevels).toContain(scraper.getRecentActivityLevel(1000000));
            }
        });
    });

    describe('getInstagramSignal()', () => {
        test('should return null for unmapped destination', async () => {
            const result = await scraper.getInstagramSignal('nonexistent');
            expect(result).toBeNull();
        });

        test('should return valid signal for mapped destination', async () => {
            const result = await scraper.getInstagramSignal('goa');
            expect(result).not.toBeNull();
            expect(result.destination).toBe('goa');
            expect(result.platform).toBe('instagram');
            expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
            expect(result.normalizedScore).toBeLessThanOrEqual(1);
            expect(result.dataType).toBe('estimated');
        });

        test('should include hashtag details', async () => {
            const result = await scraper.getInstagramSignal('goa');
            expect(result.hashtags.length).toBeGreaterThan(0);
            result.hashtags.forEach(h => {
                expect(h.hashtag).toMatch(/^#/);
                expect(h.estimatedPosts).toBeGreaterThan(0);
            });
        });
    });

    describe('getYouTubeSignal()', () => {
        test('should return valid signal', async () => {
            const result = await scraper.getYouTubeSignal('jaipur');
            expect(result.platform).toBe('youtube');
            expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
            expect(result.normalizedScore).toBeLessThanOrEqual(1);
        });
    });

    describe('getRedditSignal()', () => {
        test('should return valid signal', async () => {
            const result = await scraper.getRedditSignal('varanasi');
            expect(result.platform).toBe('reddit');
            expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
            expect(result.normalizedScore).toBeLessThanOrEqual(1);
            expect(['positive', 'neutral']).toContain(result.sentiment);
        });
    });

    describe('getAggregatedSocialSignal()', () => {
        test('should aggregate all 3 platforms', async () => {
            const result = await scraper.getAggregatedSocialSignal('goa');
            expect(result).not.toBeNull();
            expect(result.aggregatedScore).toBeGreaterThanOrEqual(0);
            expect(result.aggregatedScore).toBeLessThanOrEqual(1);
            expect(result.signals).toHaveProperty('instagram');
            expect(result.signals).toHaveProperty('youtube');
            expect(result.signals).toHaveProperty('reddit');
            expect(result.confidence).toBe('high'); // 3 platforms = high
        });

        test('should return valid buzz level', async () => {
            const result = await scraper.getAggregatedSocialSignal('goa');
            expect(['viral', 'high', 'moderate', 'low']).toContain(result.buzzLevel);
        });

        test('should cache results', async () => {
            const result1 = await scraper.getAggregatedSocialSignal('goa');
            const result2 = await scraper.getAggregatedSocialSignal('goa');
            expect(result1).toEqual(result2); // Should be cached
        });
    });
});

// ==================== HOTEL SCRAPER ====================

describe('HotelScraper', () => {
    let scraper;

    beforeEach(() => {
        scraper = new HotelScraper();
    });

    describe('Constructor', () => {
        test('should have 4-hour cache expiry', () => {
            expect(scraper.cacheExpiry).toBe(4 * 60 * 60 * 1000);
        });

        test('should have destination slugs for 27 destinations', () => {
            expect(Object.keys(scraper.destinationSlugs).length).toBe(27);
        });

        test('each destination should have slug, avgHotels, peakMultiplier', () => {
            Object.values(scraper.destinationSlugs).forEach(info => {
                expect(info).toHaveProperty('slug');
                expect(info).toHaveProperty('avgHotels');
                expect(info).toHaveProperty('peakMultiplier');
                expect(info.avgHotels).toBeGreaterThan(0);
                expect(info.peakMultiplier).toBeGreaterThan(1);
            });
        });

        test('should have 12 seasonal patterns', () => {
            expect(Object.keys(scraper.seasonalPatterns).length).toBe(12);
        });
    });

    describe('getCurrentMonthKey()', () => {
        test('should return a valid 3-letter month key', () => {
            const validMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            expect(validMonths).toContain(scraper.getCurrentMonthKey());
        });
    });

    describe('getSeasonalMultiplier()', () => {
        test('should return a number greater than 0', () => {
            const mult = scraper.getSeasonalMultiplier('goa');
            expect(mult).toBeGreaterThan(0);
        });

        test('should use destination-specific season if available', () => {
            // Goa has custom seasonal patterns
            const goaMult = scraper.getSeasonalMultiplier('goa');
            expect(typeof goaMult).toBe('number');
        });

        test('should use default season for unmapped destination', () => {
            const mult = scraper.getSeasonalMultiplier('unknown_place');
            expect(typeof mult).toBe('number');
        });
    });

    describe('isWeekend()', () => {
        test('should return boolean', () => {
            expect(typeof scraper.isWeekend()).toBe('boolean');
        });
    });

    describe('getBasePriceRange()', () => {
        test('should return budget/midRange/luxury for known destination', () => {
            const prices = scraper.getBasePriceRange('goa');
            expect(prices).toHaveProperty('budget');
            expect(prices).toHaveProperty('midRange');
            expect(prices).toHaveProperty('luxury');
            expect(prices.budget).toBeLessThan(prices.midRange);
            expect(prices.midRange).toBeLessThan(prices.luxury);
        });

        test('should return default prices for unknown destination', () => {
            const prices = scraper.getBasePriceRange('unknown');
            expect(prices.budget).toBe(1000);
        });
    });

    describe('calculateCrowdSignal()', () => {
        test('should return high crowd for high demand + low availability', () => {
            const result = scraper.calculateCrowdSignal(0.9, 0.2);
            expect(result.score).toBeGreaterThan(0.5);
            expect(['very_crowded', 'crowded']).toContain(result.level);
        });

        test('should return low crowd for low demand + high availability', () => {
            const result = scraper.calculateCrowdSignal(0.2, 0.9);
            expect(result.score).toBeLessThan(0.3);
            expect(['light', 'moderate']).toContain(result.level);
        });

        test('should always have medium confidence (simulated data)', () => {
            const result = scraper.calculateCrowdSignal(0.5, 0.5);
            expect(result.confidence).toBe('medium');
        });

        test('score should be between 0 and 1', () => {
            const result = scraper.calculateCrowdSignal(0.5, 0.5);
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
        });
    });

    describe('getHotelAvailability()', () => {
        test('should return null for unmapped destination', async () => {
            const result = await scraper.getHotelAvailability('nonexistent_place');
            expect(result).toBeNull();
        });

        test('should return valid data for mapped destination', async () => {
            const result = await scraper.getHotelAvailability('goa');
            expect(result).not.toBeNull();
            expect(result.destination).toBe('goa');
            expect(result.totalHotels).toBe(800);
            expect(result.availableHotels).toBeGreaterThan(0);
            expect(result.availableHotels).toBeLessThanOrEqual(800);
            expect(result.demandLevel).toBeGreaterThanOrEqual(0);
            expect(result.demandLevel).toBeLessThanOrEqual(1);
            expect(result.dataType).toBe('estimated');
        });

        test('should include price range', async () => {
            const result = await scraper.getHotelAvailability('jaipur');
            expect(result.priceRange).toHaveProperty('budget');
            expect(result.priceRange).toHaveProperty('midRange');
            expect(result.priceRange).toHaveProperty('luxury');
        });

        test('should include crowd signal', async () => {
            const result = await scraper.getHotelAvailability('goa');
            expect(result.crowdSignal).toBeDefined();
            expect(result.crowdSignal).toHaveProperty('score');
            expect(result.crowdSignal).toHaveProperty('level');
        });

        test('should cache results', async () => {
            const result1 = await scraper.getHotelAvailability('goa');
            const result2 = await scraper.getHotelAvailability('goa');
            expect(result1).toEqual(result2);
        });
    });
});
