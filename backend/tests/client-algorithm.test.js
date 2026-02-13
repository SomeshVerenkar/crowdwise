// ============================================================
// Unit Tests: Client-Side Algorithm
// ============================================================
// Tests the browser-side fallback prediction algorithm
// We simulate the browser environment since it uses `window`

// Mock window object for browser-side class
global.window = {};

// Load the client algorithm (it attaches to window)
require('../../client-algorithm');

const ClientCrowdAlgorithm = window.clientCrowdAlgorithm.constructor;

describe('ClientCrowdAlgorithm', () => {
    let algorithm;

    beforeEach(() => {
        algorithm = new ClientCrowdAlgorithm();
    });

    // ========== CONSTRUCTOR ==========

    describe('Constructor & Initialization', () => {
        test('should have operating hours for all categories', () => {
            const categories = [
                'default', 'religious', 'temple', 'mosque', 'church',
                'monument', 'fort', 'palace', 'museum', 'beach',
                'nature', 'waterfall', 'hillstation', 'wildlife',
                'nationalpark', 'garden', 'market', 'nightlife',
                'resort', 'lake', 'dam', 'viewpoint'
            ];
            categories.forEach(cat => {
                expect(algorithm.operatingHours).toHaveProperty(cat);
            });
        });

        test('should have day-of-week patterns for all 7 days', () => {
            for (let d = 0; d < 7; d++) {
                expect(algorithm.dayOfWeekPatterns).toHaveProperty(String(d));
            }
        });

        test('should have seasonal patterns for all 12 months', () => {
            Object.values(algorithm.seasonalPatterns).forEach(pattern => {
                for (let m = 0; m < 12; m++) {
                    expect(pattern).toHaveProperty(String(m));
                }
            });
        });

        test('should have 2026 holidays defined', () => {
            expect(algorithm.holidays2026.length).toBeGreaterThan(0);
            algorithm.holidays2026.forEach(h => {
                expect(h).toHaveProperty('date');
                expect(h).toHaveProperty('name');
                expect(h).toHaveProperty('impact');
                expect(h.date).toMatch(/^2026-/);
            });
        });
    });

    // ========== OPERATING HOURS CONSISTENCY ==========

    describe('Operating Hours Consistency with Backend', () => {
        test('beach should be allDay in both client and backend', () => {
            expect(algorithm.operatingHours.beach.allDay).toBe(true);
        });

        test('museum should open at 10 and close at 17', () => {
            expect(algorithm.operatingHours.museum.open).toBe(10);
            expect(algorithm.operatingHours.museum.close).toBe(17);
        });

        test('nightlife should have overnight flag', () => {
            expect(algorithm.operatingHours.nightlife.overnight).toBe(true);
            expect(algorithm.operatingHours.nightlife.open).toBe(20);
            expect(algorithm.operatingHours.nightlife.close).toBe(4);
        });
    });

    // ========== CHECK IF OPEN ==========

    describe('checkIfOpen()', () => {
        test('should return open for beach at any hour', () => {
            for (let h = 0; h < 24; h++) {
                expect(algorithm.checkIfOpen(h, 'beach').isOpen).toBe(true);
            }
        });

        test('should return closed for fort at 7 AM (opens at 9)', () => {
            expect(algorithm.checkIfOpen(7, 'fort').isOpen).toBe(false);
        });

        test('should return open for fort at 10 AM', () => {
            expect(algorithm.checkIfOpen(10, 'fort').isOpen).toBe(true);
        });

        test('should handle nightlife overnight hours', () => {
            expect(algorithm.checkIfOpen(22, 'nightlife').isOpen).toBe(true);
            expect(algorithm.checkIfOpen(1, 'nightlife').isOpen).toBe(true);
            expect(algorithm.checkIfOpen(12, 'nightlife').isOpen).toBe(false);
        });

        test('should include a message', () => {
            const result = algorithm.checkIfOpen(10, 'museum');
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
        });
    });

    // ========== CALCULATE CROWD SCORE ==========

    describe('calculateCrowdScore()', () => {
        test('should return CLOSED when outside operating hours', () => {
            const result = algorithm.calculateCrowdScore({
                category: 'museum',
                hour: 22,
                baseCrowdLevel: 50
            });
            expect(result.crowdLabel).toBe('CLOSED');
            expect(result.score).toBe(0);
            expect(result.status).toBe('closed');
        });

        test('should return valid score between 0 and 1', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12,
                date: new Date('2026-02-15')
            });
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
        });

        test('should return percentageFull between 0 and 100', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12,
                date: new Date('2026-02-15')
            });
            expect(result.percentageFull).toBeGreaterThanOrEqual(0);
            expect(result.percentageFull).toBeLessThanOrEqual(100);
        });

        test('should include factors breakdown', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12,
                date: new Date('2026-02-15')
            });
            expect(result.factors).toBeDefined();
            expect(result.factors).toHaveProperty('timeOfDay');
            expect(result.factors).toHaveProperty('dayOfWeek');
            expect(result.factors).toHaveProperty('seasonal');
            expect(result.factors).toHaveProperty('holiday');
            expect(result.factors).toHaveProperty('isWeekend');
        });

        test('should set dataSource to client-algorithm', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12
            });
            expect(result.dataSource).toBe('client-algorithm');
        });

        test('should set confidence to pattern-based', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12
            });
            expect(result.confidence).toBe('pattern-based');
        });

        test('should return higher score for high baseCrowdLevel', () => {
            const fixed = { category: 'default', hour: 12, date: new Date('2026-02-15') };
            const high = algorithm.calculateCrowdScore({ ...fixed, baseCrowdLevel: 90 });
            const low = algorithm.calculateCrowdScore({ ...fixed, baseCrowdLevel: 10 });
            expect(high.score).toBeGreaterThan(low.score);
        });

        test('should increase score on weekends', () => {
            const sunday = new Date('2026-02-15'); // Sunday
            const tuesday = new Date('2026-02-17'); // Tuesday
            const params = { baseCrowdLevel: 50, category: 'default', hour: 12 };
            
            const sundayScore = algorithm.calculateCrowdScore({ ...params, date: sunday });
            const tuesdayScore = algorithm.calculateCrowdScore({ ...params, date: tuesday });
            expect(sundayScore.score).toBeGreaterThan(tuesdayScore.score);
        });

        test('should detect holidays and boost score', () => {
            const diwali = new Date('2026-11-10');
            const regularDay = new Date('2026-11-05');
            const params = { baseCrowdLevel: 50, category: 'default', hour: 12 };
            
            const diwaliScore = algorithm.calculateCrowdScore({ ...params, date: diwali });
            const regularScore = algorithm.calculateCrowdScore({ ...params, date: regularDay });
            
            expect(diwaliScore.factors.holiday).toBe('Diwali');
            expect(diwaliScore.score).toBeGreaterThan(regularScore.score);
        });

        test('should use default params when minimal input given', () => {
            const result = algorithm.calculateCrowdScore({});
            expect(result).toBeDefined();
            expect(typeof result.score).toBe('number');
        });

        test('should include timestamp', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'default',
                hour: 12
            });
            expect(result.timestamp).toBeDefined();
        });
    });

    // ========== CHECK HOLIDAY ==========

    describe('checkHoliday()', () => {
        test('should detect Republic Day', () => {
            const result = algorithm.checkHoliday(new Date('2026-01-26'));
            expect(result.isHoliday).toBe(true);
            expect(result.name).toBe('Republic Day');
            expect(result.impact).toBe(1.5);
        });

        test('should detect near-holiday (1 day before/after)', () => {
            const result = algorithm.checkHoliday(new Date('2026-01-27'));
            expect(result.isHoliday).toBe(true);
            expect(result.name).toContain('Near');
            expect(result.impact).toBeLessThan(1.5);
        });

        test('should return no holiday for regular day', () => {
            const result = algorithm.checkHoliday(new Date('2026-06-15'));
            expect(result.isHoliday).toBe(false);
            expect(result.impact).toBe(1.0);
        });
    });

    // ========== SCORE TO CROWD LEVEL ==========

    describe('scoreToCrowdLevel()', () => {
        test('should return low for score < 0.25', () => {
            expect(algorithm.scoreToCrowdLevel(0.15).level).toBe('low');
            expect(algorithm.scoreToCrowdLevel(0.15).emoji).toBe('🟢');
        });

        test('should return moderate for score 0.25-0.49', () => {
            expect(algorithm.scoreToCrowdLevel(0.35).level).toBe('moderate');
            expect(algorithm.scoreToCrowdLevel(0.35).emoji).toBe('🟡');
        });

        test('should return heavy for score 0.50-0.74', () => {
            expect(algorithm.scoreToCrowdLevel(0.60).level).toBe('heavy');
            expect(algorithm.scoreToCrowdLevel(0.60).emoji).toBe('🟠');
        });

        test('should return overcrowded for score >= 0.75', () => {
            expect(algorithm.scoreToCrowdLevel(0.80).level).toBe('overcrowded');
            expect(algorithm.scoreToCrowdLevel(0.80).emoji).toBe('🔴');
        });

        test('should include color property', () => {
            const result = algorithm.scoreToCrowdLevel(0.5);
            expect(result).toHaveProperty('color');
        });
    });

    // ========== GET BEST TIME TODAY ==========

    describe('getBestTimeToday()', () => {
        test('should return predictions for hours 6-21', () => {
            const result = algorithm.getBestTimeToday(50, 'default');
            expect(result.predictions.length).toBe(16); // 6 to 21 inclusive
        });

        test('should return bestTime string', () => {
            const result = algorithm.getBestTimeToday(50, 'default');
            expect(result.bestTime).toBeDefined();
            expect(typeof result.bestTime).toBe('string');
        });

        test('should mark past hours correctly', () => {
            const result = algorithm.getBestTimeToday(50, 'default');
            const currentHour = new Date().getHours();
            result.predictions.forEach(p => {
                if (p.hour < currentHour) {
                    expect(p.isPast).toBe(true);
                }
            });
        });

        test('each prediction should have required fields', () => {
            const result = algorithm.getBestTimeToday(50, 'default');
            result.predictions.forEach(p => {
                expect(p).toHaveProperty('hour');
                expect(p).toHaveProperty('time');
                expect(p).toHaveProperty('timeFormatted');
                expect(p).toHaveProperty('score');
            });
        });
    });

    // ========== EDGE CASES ==========

    describe('Edge Cases', () => {
        test('should handle baseCrowdLevel of 0', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 0,
                category: 'default',
                hour: 12
            });
            expect(result.score).toBe(0);
        });

        test('should handle baseCrowdLevel of 100', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 100,
                category: 'default',
                hour: 12,
                date: new Date('2026-02-15')
            });
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.score).toBeGreaterThan(0);
        });

        test('should handle midnight (hour 0) for beach', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'beach',
                hour: 0
            });
            expect(result.crowdLabel).not.toBe('CLOSED');
        });

        test('should handle unknown category gracefully', () => {
            const result = algorithm.calculateCrowdScore({
                baseCrowdLevel: 50,
                category: 'spaceship',
                hour: 12
            });
            expect(result).toBeDefined();
            expect(typeof result.score).toBe('number');
        });

        test('formatHour should handle edge hours', () => {
            expect(algorithm.formatHour(0)).toContain('12');
            expect(algorithm.formatHour(0)).toContain('AM');
            expect(algorithm.formatHour(12)).toContain('12');
            expect(algorithm.formatHour(12)).toContain('PM');
        });
    });

    // ========== CONSISTENCY WITH BACKEND ==========

    describe('Backend Consistency Checks', () => {
        test('day-of-week Sunday multiplier should match backend (1.30)', () => {
            expect(algorithm.dayOfWeekPatterns[0]).toBe(1.30);
        });

        test('day-of-week Saturday multiplier should match backend (1.25)', () => {
            expect(algorithm.dayOfWeekPatterns[6]).toBe(1.25);
        });

        test('default seasonal January should match backend (1.30)', () => {
            expect(algorithm.seasonalPatterns.default[0]).toBe(1.30);
        });

        test('beach seasonal December should match backend (1.45)', () => {
            expect(algorithm.seasonalPatterns.beach[11]).toBe(1.45);
        });

        test('hourly pattern peaks should match backend', () => {
            // Default peaks at 11
            expect(algorithm.hourlyPatterns.default[11]).toBe(1.00);
            // Religious peaks at 7
            expect(algorithm.hourlyPatterns.religious[7]).toBe(1.00);
            // Beach peaks at 18
            expect(algorithm.hourlyPatterns.beach[18]).toBe(1.00);
            // Wildlife peaks at 6
            expect(algorithm.hourlyPatterns.wildlife[6]).toBe(1.00);
        });
    });
});
