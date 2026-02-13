// ============================================================
// Unit Tests: Prediction Engine
// ============================================================

const PredictionEngine = require('../algorithms/prediction-engine');

describe('PredictionEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new PredictionEngine();
    });

    // ========== CONSTRUCTOR ==========

    describe('Constructor', () => {
        test('should initialize with CrowdScoringAlgorithm', () => {
            expect(engine.crowdAlgorithm).toBeDefined();
        });

        test('should initialize prediction cache as empty Map', () => {
            expect(engine.predictionCache).toBeInstanceOf(Map);
            expect(engine.predictionCache.size).toBe(0);
        });

        test('should set 30-minute cache expiry', () => {
            expect(engine.cacheExpiry).toBe(30 * 60 * 1000);
        });

        test('should initialize accuracy metrics', () => {
            expect(engine.accuracyMetrics).toEqual({
                totalPredictions: 0,
                accuratePredictions: 0,
                averageError: 0,
                lastUpdated: null
            });
        });
    });

    // ========== PREDICT CURRENT ==========

    describe('predictCurrent()', () => {
        test('should return prediction with correct structure', () => {
            const result = engine.predictCurrent({
                destination: 'Taj Mahal',
                category: 'monument',
                baseCrowdLevel: 80
            });
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('crowdLevel');
            expect(result).toHaveProperty('predictionType', 'current');
            expect(result).toHaveProperty('predictionTime');
            expect(result).toHaveProperty('validUntil');
        });

        test('should cache prediction result', () => {
            const result1 = engine.predictCurrent({
                destination: 'Taj Mahal',
                category: 'monument',
                baseCrowdLevel: 80
            });
            const result2 = engine.predictCurrent({
                destination: 'Taj Mahal',
                category: 'monument',
                baseCrowdLevel: 80
            });
            // Cached, so should be same object
            expect(result1).toEqual(result2);
        });

        test('should return score between 0 and 1', () => {
            const result = engine.predictCurrent({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
        });
    });

    // ========== PREDICT TODAY ==========

    describe('predictToday()', () => {
        test('should return 24 hourly predictions', () => {
            const result = engine.predictToday({
                destination: 'Jaipur',
                category: 'heritage',
                baseCrowdLevel: 60
            });
            expect(result.predictions).toHaveLength(24);
        });

        test('should include insights with best/worst times', () => {
            const result = engine.predictToday({
                destination: 'Jaipur',
                category: 'heritage',
                baseCrowdLevel: 60
            });
            expect(result.insights).toBeDefined();
            expect(result.insights.bestTimeToVisit).toBeDefined();
            expect(result.insights.averageScore).toBeDefined();
        });

        test('each prediction should have required fields', () => {
            const result = engine.predictToday({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            result.predictions.forEach(p => {
                expect(p).toHaveProperty('hour');
                expect(p).toHaveProperty('time');
                expect(p).toHaveProperty('timeFormatted');
                expect(p).toHaveProperty('score');
                expect(p).toHaveProperty('crowdLevel');
                expect(typeof p.isPast).toBe('boolean');
            });
        });

        test('should mark past hours correctly', () => {
            const result = engine.predictToday({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            const currentHour = new Date().getHours();
            // Hours before current should be past
            result.predictions.forEach(p => {
                if (p.hour < currentHour) {
                    expect(p.isPast).toBe(true);
                }
            });
        });

        test('average score should be between 0 and 1', () => {
            const result = engine.predictToday({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.insights.averageScore).toBeGreaterThanOrEqual(0);
            expect(result.insights.averageScore).toBeLessThanOrEqual(1);
        });
    });

    // ========== PREDICT WEEK ==========

    describe('predictWeek()', () => {
        test('should return 7 daily predictions', () => {
            const result = engine.predictWeek({
                destination: 'Goa',
                category: 'beach',
                baseCrowdLevel: 70
            });
            expect(result.predictions).toHaveLength(7);
        });

        test('should mark first day as today', () => {
            const result = engine.predictWeek({
                destination: 'Goa',
                category: 'beach',
                baseCrowdLevel: 70
            });
            expect(result.predictions[0].isToday).toBe(true);
            expect(result.predictions[1].isTomorrow).toBe(true);
        });

        test('should include morning/afternoon/evening scores', () => {
            const result = engine.predictWeek({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            result.predictions.forEach(p => {
                expect(p.scores).toHaveProperty('morning');
                expect(p.scores).toHaveProperty('afternoon');
                expect(p.scores).toHaveProperty('evening');
                expect(p.scores).toHaveProperty('average');
                expect(p.scores).toHaveProperty('peak');
            });
        });

        test('should include week overview with best/worst day', () => {
            const result = engine.predictWeek({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.weekOverview).toBeDefined();
            expect(result.weekOverview.bestDay).toBeDefined();
            expect(result.weekOverview.worstDay).toBeDefined();
            expect(result.weekOverview.weekendStatus).toBeDefined();
        });

        test('should include recommendation for each day', () => {
            const result = engine.predictWeek({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            result.predictions.forEach(p => {
                expect(p.recommendation).toBeDefined();
                expect(p.recommendation).toHaveProperty('rating');
                expect(p.recommendation).toHaveProperty('text');
            });
        });
    });

    // ========== PREDICT MONTH ==========

    describe('predictMonth()', () => {
        test('should return 30 daily predictions', () => {
            const result = engine.predictMonth({
                destination: 'Kerala',
                category: 'nature',
                baseCrowdLevel: 60
            });
            expect(result.predictions).toHaveLength(30);
        });

        test('should include weekly view grouping', () => {
            const result = engine.predictMonth({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.weeklyView).toBeDefined();
            expect(Array.isArray(result.weeklyView)).toBe(true);
            result.weeklyView.forEach(w => {
                expect(w).toHaveProperty('weekNumber');
                expect(w).toHaveProperty('days');
                expect(w).toHaveProperty('avgScore');
            });
        });

        test('should include pattern analysis', () => {
            const result = engine.predictMonth({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.patterns).toBeDefined();
            expect(result.patterns).toHaveProperty('quietestDay');
            expect(result.patterns).toHaveProperty('busiestDay');
            expect(result.patterns).toHaveProperty('weekdayVsWeekend');
        });

        test('should include summary with best/worst days', () => {
            const result = engine.predictMonth({
                destination: 'Test',
                category: 'default',
                baseCrowdLevel: 50
            });
            expect(result.summary).toBeDefined();
            expect(Array.isArray(result.summary.bestDays)).toBe(true);
            expect(Array.isArray(result.summary.worstDays)).toBe(true);
            expect(result.summary.averageScore).toBeDefined();
        });
    });

    // ========== ACCURACY TRACKING ==========

    describe('Accuracy Tracking', () => {
        test('recordActual should increment total predictions', () => {
            engine.recordActual('some_id', 0.5);
            expect(engine.accuracyMetrics.totalPredictions).toBe(1);
        });

        test('getAccuracyStats should return correct structure', () => {
            const stats = engine.getAccuracyStats();
            expect(stats).toHaveProperty('totalPredictions');
            expect(stats).toHaveProperty('accuracyRate');
            expect(stats).toHaveProperty('averageError');
            expect(stats).toHaveProperty('status');
        });

        test('should return 0% accuracy with no predictions', () => {
            const stats = engine.getAccuracyStats();
            expect(stats.accuracyRate).toBe(0);
            expect(stats.status).toBe('needs_improvement');
        });
    });

    // ========== HELPER FUNCTIONS ==========

    describe('Helper Functions', () => {
        test('formatHour should format correctly', () => {
            expect(engine.formatHour(0)).toBe('12:00 AM');
            expect(engine.formatHour(12)).toBe('12:00 PM');
            expect(engine.formatHour(9)).toBe('9:00 AM');
            expect(engine.formatHour(17)).toBe('5:00 PM');
        });

        test('getDayName should return correct names', () => {
            expect(engine.getDayName(new Date('2026-02-15'))).toBe('Sunday');
            expect(engine.getDayName(new Date('2026-02-16'))).toBe('Monday');
        });

        test('scoreToCrowdLevel should match CrowdScoringAlgorithm levels', () => {
            expect(engine.scoreToCrowdLevel(0.1).level).toBe('very_low');
            expect(engine.scoreToCrowdLevel(0.3).level).toBe('low');
            expect(engine.scoreToCrowdLevel(0.5).level).toBe('moderate');
            expect(engine.scoreToCrowdLevel(0.65).level).toBe('heavy');
            expect(engine.scoreToCrowdLevel(0.8).level).toBe('very_heavy');
            expect(engine.scoreToCrowdLevel(0.9).level).toBe('overcrowded');
        });

        test('getDayRecommendation should return valid ratings', () => {
            const validRatings = ['excellent', 'good', 'moderate', 'busy', 'avoid'];
            const date = new Date();
            
            [0.2, 0.4, 0.6, 0.75, 0.9].forEach(score => {
                const rec = engine.getDayRecommendation(score, date);
                expect(validRatings).toContain(rec.rating);
                expect(rec.text).toBeDefined();
                expect(rec.text.length).toBeGreaterThan(0);
            });
        });

        test('getWeekNumber should return positive number', () => {
            const date = new Date('2026-02-15');
            expect(engine.getWeekNumber(date)).toBeGreaterThan(0);
        });
    });

    // ========== EDGE CASES ==========

    describe('Edge Cases', () => {
        test('should handle prediction with minimal params', () => {
            const result = engine.predictCurrent({
                destination: 'Test',
                baseCrowdLevel: 50
            });
            expect(result).toBeDefined();
            expect(result.score).toBeDefined();
        });

        test('weekend status should handle all-weekday predictions', () => {
            // getWeekendStatus with a mix
            const predictions = [
                { isWeekend: true, scores: { average: 0.8 } },
                { isWeekend: true, scores: { average: 0.7 } },
                { isWeekend: false, scores: { average: 0.3 } }
            ];
            const status = engine.getWeekendStatus(predictions);
            expect(status).toHaveProperty('status');
            expect(status).toHaveProperty('text');
        });
    });
});
