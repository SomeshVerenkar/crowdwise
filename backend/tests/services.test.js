// ============================================================
// Unit Tests: Services (ValidationService, DataStore)
// ============================================================

const ValidationService = require('../services/validation-service');
const DataStore = require('../services/data-store');
const path = require('path');
const fs = require('fs').promises;

// ==================== VALIDATION SERVICE ====================

describe('ValidationService', () => {
    let service;
    let mockDataStore;

    beforeEach(() => {
        // Create mock DataStore to avoid file I/O
        mockDataStore = {
            saveFeedback: jest.fn().mockResolvedValue('fb_123'),
            getFeedback: jest.fn().mockResolvedValue([]),
            getFeedbackStats: jest.fn().mockResolvedValue({
                total: 0, positive: 0, negative: 0, accuracyRate: 0
            })
        };
        service = new ValidationService(mockDataStore);
    });

    describe('Constructor', () => {
        test('should initialize with config thresholds', () => {
            expect(service.config.minFeedbackForAdjustment).toBe(10);
            expect(service.config.significantErrorThreshold).toBe(0.25);
            expect(service.config.adjustmentRate).toBe(0.05);
            expect(service.config.maxAdjustment).toBe(0.3);
        });

        test('should initialize empty accuracy tracking', () => {
            expect(service.accuracyTracking).toBeInstanceOf(Map);
            expect(service.accuracyTracking.size).toBe(0);
        });

        test('should initialize empty weight adjustments', () => {
            expect(service.weightAdjustments).toBeInstanceOf(Map);
            expect(service.weightAdjustments.size).toBe(0);
        });
    });

    describe('levelToScore()', () => {
        test('should map all crowd levels to scores', () => {
            expect(service.levelToScore('very_low')).toBe(0.1);
            expect(service.levelToScore('low')).toBe(0.3);
            expect(service.levelToScore('moderate')).toBe(0.5);
            expect(service.levelToScore('heavy')).toBe(0.7);
            expect(service.levelToScore('very_heavy')).toBe(0.85);
            expect(service.levelToScore('overcrowded')).toBe(0.95);
        });

        test('should return 0.5 for unknown level', () => {
            expect(service.levelToScore('unknown')).toBe(0.5);
        });
    });

    describe('recordFeedback()', () => {
        test('should save quick feedback', async () => {
            const result = await service.recordFeedback({
                destination: 'Goa',
                predictedLevel: 'moderate',
                predictedScore: 0.5,
                isAccurate: true,
                feedbackType: 'quick'
            });
            expect(result.recorded).toBe(true);
            expect(result.feedbackId).toBe('fb_123');
            expect(result.message).toContain('Thank you');
            expect(mockDataStore.saveFeedback).toHaveBeenCalled();
        });

        test('should calculate error for detailed feedback', async () => {
            const result = await service.recordFeedback({
                destination: 'Goa',
                predictedLevel: 'moderate',
                predictedScore: 0.5,
                userReportedLevel: 'heavy',
                isAccurate: false,
                feedbackType: 'detailed'
            });
            
            expect(result.recorded).toBe(true);
            // Check that feedback was saved with error calculated
            const savedFeedback = mockDataStore.saveFeedback.mock.calls[0][0];
            expect(savedFeedback.error).toBeDefined();
            expect(savedFeedback.errorPercentage).toBeDefined();
        });

        test('should update accuracy tracking', async () => {
            await service.recordFeedback({
                destination: 'Goa',
                predictedLevel: 'moderate',
                predictedScore: 0.5,
                isAccurate: true,
                feedbackType: 'quick'
            });
            
            const accuracy = service.getDestinationAccuracy('Goa');
            expect(accuracy.feedbackCount).toBe(1);
            expect(accuracy.accuracy).toBe(100);
        });
    });

    describe('updateAccuracyTracking()', () => {
        test('should create new tracking entry for new destination', () => {
            service.updateAccuracyTracking('Goa', { isAccurate: true });
            const tracking = service.accuracyTracking.get('goa');
            expect(tracking.totalFeedback).toBe(1);
            expect(tracking.accurateFeedback).toBe(1);
        });

        test('should increment existing tracking', () => {
            service.updateAccuracyTracking('Goa', { isAccurate: true });
            service.updateAccuracyTracking('Goa', { isAccurate: false });
            const tracking = service.accuracyTracking.get('goa');
            expect(tracking.totalFeedback).toBe(2);
            expect(tracking.accurateFeedback).toBe(1);
        });

        test('should track errors', () => {
            service.updateAccuracyTracking('Goa', { isAccurate: false, error: 0.3 });
            const tracking = service.accuracyTracking.get('goa');
            expect(tracking.errorSum).toBe(0.3);
            expect(tracking.recentErrors).toHaveLength(1);
        });

        test('should keep only last 50 errors', () => {
            for (let i = 0; i < 60; i++) {
                service.updateAccuracyTracking('Goa', { isAccurate: false, error: 0.1 });
            }
            const tracking = service.accuracyTracking.get('goa');
            expect(tracking.recentErrors.length).toBe(50);
        });
    });

    describe('getDestinationAccuracy()', () => {
        test('should return no_data for unknown destination', () => {
            const result = service.getDestinationAccuracy('UnknownPlace');
            expect(result.confidence).toBe('no_data');
            expect(result.accuracy).toBeNull();
            expect(result.feedbackCount).toBe(0);
        });

        test('should calculate accuracy correctly', () => {
            for (let i = 0; i < 8; i++) {
                service.updateAccuracyTracking('Goa', { isAccurate: true });
            }
            for (let i = 0; i < 2; i++) {
                service.updateAccuracyTracking('Goa', { isAccurate: false });
            }
            const result = service.getDestinationAccuracy('Goa');
            expect(result.accuracy).toBe(80);
            expect(result.feedbackCount).toBe(10);
            expect(result.confidence).toBe('medium');
        });

        test('should return high confidence with 30+ feedback', () => {
            for (let i = 0; i < 30; i++) {
                service.updateAccuracyTracking('Goa', { isAccurate: true });
            }
            const result = service.getDestinationAccuracy('Goa');
            expect(result.confidence).toBe('high');
        });
    });

    describe('calculateRecentTrend()', () => {
        test('should return insufficient_data for less than 10 errors', () => {
            expect(service.calculateRecentTrend([0.1, 0.2])).toBe('insufficient_data');
        });

        test('should detect improving trend', () => {
            const errors = [0.5, 0.5, 0.5, 0.5, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2];
            expect(service.calculateRecentTrend(errors)).toBe('improving');
        });

        test('should detect declining trend', () => {
            const errors = [0.2, 0.2, 0.2, 0.2, 0.2, 0.5, 0.5, 0.5, 0.5, 0.5];
            expect(service.calculateRecentTrend(errors)).toBe('declining');
        });

        test('should detect stable trend', () => {
            const errors = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
            expect(service.calculateRecentTrend(errors)).toBe('stable');
        });
    });

    describe('generateFeedbackPrompt()', () => {
        test('should return prompt with correct structure', () => {
            const prompt = service.generateFeedbackPrompt('Goa', 'moderate');
            expect(prompt.question).toContain('accurate');
            expect(prompt.destination).toBe('Goa');
            expect(prompt.predictedLevel).toBe('moderate');
            expect(prompt.options.quick).toHaveLength(2);
            expect(prompt.options.detailed).toHaveLength(6);
        });

        test('quick options should have thumbs up/down', () => {
            const prompt = service.generateFeedbackPrompt('Goa', 'moderate');
            expect(prompt.options.quick[0].value).toBe(true);
            expect(prompt.options.quick[1].value).toBe(false);
        });

        test('detailed options should cover all levels', () => {
            const prompt = service.generateFeedbackPrompt('Goa', 'moderate');
            const levels = prompt.options.detailed.map(o => o.value);
            expect(levels).toContain('very_low');
            expect(levels).toContain('low');
            expect(levels).toContain('moderate');
            expect(levels).toContain('heavy');
            expect(levels).toContain('very_heavy');
            expect(levels).toContain('overcrowded');
        });
    });

    describe('calculateSystemStatus()', () => {
        test('should return excellent for 80%+', () => {
            expect(service.calculateSystemStatus(85).level).toBe('excellent');
        });

        test('should return good for 70-79%', () => {
            expect(service.calculateSystemStatus(75).level).toBe('good');
        });

        test('should return moderate for 60-69%', () => {
            expect(service.calculateSystemStatus(65).level).toBe('moderate');
        });

        test('should return fair for 50-59%', () => {
            expect(service.calculateSystemStatus(55).level).toBe('fair');
        });

        test('should return needs_attention for below 50%', () => {
            expect(service.calculateSystemStatus(40).level).toBe('needs_attention');
        });
    });

    describe('getWeightAdjustments()', () => {
        test('should return null for destination with no adjustments', () => {
            expect(service.getWeightAdjustments('Unknown')).toBeNull();
        });
    });
});

// ==================== DATA STORE ====================

describe('DataStore', () => {
    let store;
    const testDataDir = path.join(__dirname, 'test-data-' + Date.now());

    beforeEach(() => {
        store = new DataStore(testDataDir);
    });

    afterEach(async () => {
        // Cleanup test data directory
        try {
            await fs.rm(testDataDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('Constructor', () => {
        test('should set correct data directory', () => {
            expect(store.dataDir).toBe(testDataDir);
        });

        test('should define all file names', () => {
            expect(store.files).toHaveProperty('signals');
            expect(store.files).toHaveProperty('predictions');
            expect(store.files).toHaveProperty('feedback');
            expect(store.files).toHaveProperty('analytics');
            expect(store.files).toHaveProperty('destinations');
        });

        test('should initialize cache structures', () => {
            expect(store.cache.signals).toBeInstanceOf(Map);
            expect(store.cache.predictions).toBeInstanceOf(Map);
            expect(Array.isArray(store.cache.feedback)).toBe(true);
            expect(Array.isArray(store.cache.analytics)).toBe(true);
        });

        test('should start as not initialized', () => {
            expect(store.initialized).toBe(false);
        });
    });

    describe('init()', () => {
        test('should create data directory and initialize', async () => {
            const result = await store.init();
            expect(result).toBe(true);
            expect(store.initialized).toBe(true);
        });

        test('should create data directory if not exists', async () => {
            await store.init();
            const stat = await fs.stat(testDataDir);
            expect(stat.isDirectory()).toBe(true);
        });
    });

    describe('getFilePath()', () => {
        test('should return correct file path', () => {
            const filePath = store.getFilePath('signals.json');
            expect(filePath).toBe(path.join(testDataDir, 'signals.json'));
        });
    });

    describe('Signals', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should save and retrieve signals', async () => {
            await store.saveSignals('Goa', { score: 0.8, trend: 'rising' });
            const result = store.getSignals('goa');
            expect(result.score).toBe(0.8);
            expect(result.trend).toBe('rising');
            expect(result.savedAt).toBeDefined();
        });

        test('should normalize destination names to lowercase', async () => {
            await store.saveSignals('TAJ MAHAL', { score: 0.9 });
            const result = store.getSignals('taj mahal');
            expect(result.score).toBe(0.9);
        });

        test('should return undefined for unknown destination', () => {
            expect(store.getSignals('nonexistent')).toBeUndefined();
        });

        test('should batch save signals', async () => {
            await store.batchSaveSignals({
                'goa': { score: 0.8 },
                'jaipur': { score: 0.6 }
            });
            expect(store.getSignals('goa').score).toBe(0.8);
            expect(store.getSignals('jaipur').score).toBe(0.6);
        });

        test('should save specific signal types (Wikipedia)', async () => {
            await store.saveWikipediaSignal('Goa', { pageViews: 5000 });
            const result = store.getSignals('goa');
            expect(result.signals.wikipedia.pageViews).toBe(5000);
        });

        test('should save specific signal types (Hotel)', async () => {
            await store.saveHotelSignal('Goa', { demandLevel: 0.7 });
            const result = store.getSignals('goa');
            expect(result.signals.hotel.demandLevel).toBe(0.7);
        });

        test('should save specific signal types (Social)', async () => {
            await store.saveSocialSignal('Goa', { buzzLevel: 'high' });
            const result = store.getSignals('goa');
            expect(result.signals.social.buzzLevel).toBe('high');
        });

        test('getAllDestinations should return saved destinations', async () => {
            await store.saveSignals('Goa', {});
            await store.saveSignals('Jaipur', {});
            const dests = store.getAllDestinations();
            expect(dests).toContain('goa');
            expect(dests).toContain('jaipur');
        });
    });

    describe('Predictions', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should save and retrieve predictions', async () => {
            const key = await store.savePrediction('Goa', {
                date: '2026-02-15',
                score: 0.7
            });
            expect(key).toBeDefined();
            const result = store.getPrediction('Goa', '2026-02-15');
            expect(result.score).toBe(0.7);
        });

        test('should return undefined for missing prediction', () => {
            expect(store.getPrediction('Goa', '2025-01-01')).toBeUndefined();
        });
    });

    describe('Feedback', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should save and retrieve feedback', async () => {
            const id = await store.saveFeedback({
                destination: 'Goa',
                isAccurate: true
            });
            expect(id).toMatch(/^fb_/);
            const feedback = await store.getFeedback();
            expect(feedback.length).toBe(1);
            expect(feedback[0].destination).toBe('Goa');
        });

        test('should filter feedback by destination', async () => {
            await store.saveFeedback({ destination: 'Goa', isAccurate: true });
            await store.saveFeedback({ destination: 'Jaipur', isAccurate: false });
            
            const goaFeedback = await store.getFeedback('Goa');
            expect(goaFeedback.length).toBe(1);
            expect(goaFeedback[0].destination).toBe('Goa');
        });

        test('should limit feedback entries to 1000', async () => {
            // Save 1005 entries
            for (let i = 0; i < 1005; i++) {
                store.cache.feedback.push({ id: `fb_${i}`, destination: 'Test' });
            }
            await store.saveFeedback({ destination: 'Latest' });
            expect(store.cache.feedback.length).toBeLessThanOrEqual(1001);
        });

        test('should calculate feedback stats', async () => {
            await store.saveFeedback({ destination: 'Goa', isAccurate: true });
            await store.saveFeedback({ destination: 'Goa', isAccurate: true });
            await store.saveFeedback({ destination: 'Goa', isAccurate: false });
            
            const stats = await store.getFeedbackStats();
            expect(stats.total).toBe(3);
            expect(stats.positive).toBe(2);
            expect(stats.negative).toBe(1);
            expect(stats.accuracyRate).toBe(67);
        });
    });

    describe('Analytics', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should save and retrieve analytics', async () => {
            await store.saveDailyAnalytics({ date: '2026-02-15', requests: 100 });
            const analytics = await store.getAnalytics(7);
            expect(analytics.length).toBe(1);
            expect(analytics[0].date).toBe('2026-02-15');
        });

        test('should limit analytics to 90 days', async () => {
            for (let i = 0; i < 95; i++) {
                store.cache.analytics.push({ date: `day_${i}` });
            }
            await store.saveDailyAnalytics({ date: 'latest' });
            expect(store.cache.analytics.length).toBeLessThanOrEqual(91);
        });
    });

    describe('Storage Stats', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should return correct stats', async () => {
            await store.saveSignals('Goa', { score: 0.8 });
            await store.saveFeedback({ destination: 'Goa' });
            
            const stats = await store.getStorageStats();
            expect(stats.signals).toBe(1);
            expect(stats.feedback).toBe(1);
            expect(stats.predictions).toBe(0);
        });
    });

    describe('clearAll()', () => {
        beforeEach(async () => {
            await store.init();
        });

        test('should clear all data', async () => {
            await store.saveSignals('Goa', { score: 0.8 });
            await store.saveFeedback({ destination: 'Goa' });
            
            await store.clearAll();
            
            expect(store.cache.signals.size).toBe(0);
            expect(store.cache.predictions.size).toBe(0);
            expect(store.cache.feedback.length).toBe(0);
            expect(store.cache.analytics.length).toBe(0);
        });
    });
});
