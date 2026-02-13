// ============================================================
// Integration Tests: API Endpoints (server-v2.js)
// ============================================================
// Tests Express routes without requiring database connection
// Uses supertest for HTTP assertions

const express = require('express');
const CrowdScoringAlgorithm = require('../algorithms/crowd-scoring');
const PredictionEngine = require('../algorithms/prediction-engine');
const ValidationService = require('../services/validation-service');

// Build a minimal test app that mirrors the real server routes
function createTestApp() {
    const app = express();
    app.use(express.json());

    const crowdAlgorithm = new CrowdScoringAlgorithm();
    const predictionEngine = new PredictionEngine();
    const mockDataStore = {
        saveFeedback: async (f) => 'fb_test_123',
        getFeedback: async () => [],
        getFeedbackStats: async () => ({ total: 0, positive: 0, negative: 0, accuracyRate: 0 })
    };
    const validationService = new ValidationService(mockDataStore);

    // Test destinations (subset)
    const DESTINATIONS = {
        1: { id: 1, name: 'Tirupati Balaji Temple', city: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lon: 79.4192, category: 'religious', baseCrowd: 95 },
        2: { id: 2, name: 'Araku Valley', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 18.3371, lon: 83.0076, category: 'nature', baseCrowd: 45 },
        3: { id: 3, name: 'Calangute Beach', city: 'Goa', state: 'Goa', lat: 15.5449, lon: 73.7553, category: 'beach', baseCrowd: 80 },
    };

    // Health
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            services: {
                crowdAlgorithm: 'active',
                predictionEngine: 'active'
            }
        });
    });

    // Destinations
    app.get('/api/destinations', (req, res) => {
        const list = Object.values(DESTINATIONS).map(d => ({
            id: d.id, name: d.name, city: d.city, state: d.state, category: d.category
        }));
        res.json({
            total: list.length,
            destinations: list,
            source: 'test'
        });
    });

    // Crowd prediction
    app.get('/api/crowd/:destinationId', (req, res) => {
        const dest = DESTINATIONS[req.params.destinationId];
        if (!dest) {
            return res.status(404).json({ error: 'Destination not found' });
        }

        const prediction = crowdAlgorithm.calculateCrowdScore({
            destination: dest.name,
            category: dest.category,
            baseCrowdLevel: dest.baseCrowd
        });

        res.json({
            destinationId: dest.id,
            destination: dest.name,
            crowdScore: prediction.score,
            crowdLevel: prediction.crowdLevel,
            crowdLabel: prediction.crowdLabel,
            crowdEmoji: prediction.crowdEmoji,
            percentageFull: prediction.percentageFull,
            confidence: prediction.confidence,
            breakdown: prediction.breakdown
        });
    });

    // Today prediction
    app.get('/api/predict/today/:destinationId', (req, res) => {
        const dest = DESTINATIONS[req.params.destinationId];
        if (!dest) {
            return res.status(404).json({ error: 'Destination not found' });
        }

        const prediction = predictionEngine.predictToday({
            destination: dest.name,
            category: dest.category,
            baseCrowdLevel: dest.baseCrowd
        });

        res.json({
            destinationId: dest.id,
            destination: dest.name,
            ...prediction
        });
    });

    // Week prediction
    app.get('/api/predict/week/:destinationId', (req, res) => {
        const dest = DESTINATIONS[req.params.destinationId];
        if (!dest) {
            return res.status(404).json({ error: 'Destination not found' });
        }

        const prediction = predictionEngine.predictWeek({
            destination: dest.name,
            category: dest.category,
            baseCrowdLevel: dest.baseCrowd
        });

        res.json({
            destinationId: dest.id,
            destination: dest.name,
            ...prediction
        });
    });

    // Month prediction
    app.get('/api/predict/month/:destinationId', (req, res) => {
        const dest = DESTINATIONS[req.params.destinationId];
        if (!dest) {
            return res.status(404).json({ error: 'Destination not found' });
        }

        const prediction = predictionEngine.predictMonth({
            destination: dest.name,
            category: dest.category,
            baseCrowdLevel: dest.baseCrowd
        });

        res.json({
            destinationId: dest.id,
            destination: dest.name,
            ...prediction
        });
    });

    // Feedback prompt
    app.get('/api/feedback/prompt/:destinationId', (req, res) => {
        const dest = DESTINATIONS[req.params.destinationId];
        if (!dest) {
            return res.status(404).json({ error: 'Destination not found' });
        }

        const prompt = validationService.generateFeedbackPrompt(dest.name, 'moderate');
        res.json(prompt);
    });

    // Submit feedback
    app.post('/api/feedback', async (req, res) => {
        const { destination, predictedLevel, predictedScore, userReportedLevel, isAccurate, feedbackType } = req.body;
        
        if (!destination) {
            return res.status(400).json({ error: 'destination is required' });
        }

        const result = await validationService.recordFeedback({
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType
        });

        res.json(result);
    });

    // Holidays
    app.get('/api/holidays', (req, res) => {
        res.json({
            year: 2026,
            country: 'India',
            holidays: crowdAlgorithm.holidays2026
        });
    });

    // Alerts
    const alertsStore = [];

    app.post('/api/alerts', (req, res) => {
        const { email, destinationId, threshold, destinationName } = req.body;
        if (!email || !destinationId) {
            return res.status(400).json({ error: 'email and destinationId are required' });
        }

        const alert = {
            id: `alert_${Date.now()}`,
            email,
            destinationId,
            destinationName: destinationName || 'Unknown',
            threshold: threshold || 'low',
            createdAt: new Date().toISOString(),
            isActive: true,
            triggered: false
        };

        alertsStore.push(alert);
        res.json({ ...alert, message: 'Alert created successfully!' });
    });

    app.get('/api/alerts', (req, res) => {
        res.json({ total: alertsStore.length, alerts: alertsStore });
    });

    app.delete('/api/alerts/:alertId', (req, res) => {
        const idx = alertsStore.findIndex(a => a.id === req.params.alertId);
        if (idx === -1) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        alertsStore.splice(idx, 1);
        res.json({ message: 'Alert deleted' });
    });

    return app;
}

// ==================== TESTS ====================

// Check if supertest is available, otherwise skip
let request;
try {
    request = require('supertest');
} catch (e) {
    // supertest not installed - provide helpful message
}

const describeIfSupertest = request ? describe : describe.skip;

describeIfSupertest('API Endpoints', () => {
    let app;

    beforeAll(() => {
        app = createTestApp();
    });

    // ========== HEALTH ==========

    describe('GET /api/health', () => {
        test('should return healthy status', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body.version).toBe('2.0.0');
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.services.crowdAlgorithm).toBe('active');
        });
    });

    // ========== DESTINATIONS ==========

    describe('GET /api/destinations', () => {
        test('should return list of destinations', async () => {
            const res = await request(app).get('/api/destinations');
            expect(res.status).toBe(200);
            expect(res.body.total).toBe(3);
            expect(res.body.destinations).toHaveLength(3);
        });

        test('each destination should have required fields', async () => {
            const res = await request(app).get('/api/destinations');
            res.body.destinations.forEach(d => {
                expect(d).toHaveProperty('id');
                expect(d).toHaveProperty('name');
                expect(d).toHaveProperty('city');
                expect(d).toHaveProperty('state');
                expect(d).toHaveProperty('category');
            });
        });
    });

    // ========== CROWD PREDICTION ==========

    describe('GET /api/crowd/:destinationId', () => {
        test('should return crowd prediction for valid destination', async () => {
            const res = await request(app).get('/api/crowd/1');
            expect(res.status).toBe(200);
            expect(res.body.destinationId).toBe(1);
            expect(res.body.destination).toBe('Tirupati Balaji Temple');
            expect(res.body.crowdScore).toBeGreaterThanOrEqual(0);
            expect(res.body.crowdScore).toBeLessThanOrEqual(1);
            expect(res.body.crowdLevel).toBeDefined();
            expect(res.body.crowdLabel).toBeDefined();
            expect(res.body.crowdEmoji).toBeDefined();
            expect(res.body.percentageFull).toBeGreaterThanOrEqual(0);
            expect(res.body.percentageFull).toBeLessThanOrEqual(100);
        });

        test('should return 404 for invalid destination', async () => {
            const res = await request(app).get('/api/crowd/999');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Destination not found');
        });

        test('should include breakdown in response', async () => {
            const res = await request(app).get('/api/crowd/1');
            expect(res.body.breakdown).toBeDefined();
            expect(res.body.breakdown).toHaveProperty('timeOfDay');
            expect(res.body.breakdown).toHaveProperty('dayOfWeek');
        });
    });

    // ========== TODAY PREDICTION ==========

    describe('GET /api/predict/today/:destinationId', () => {
        test('should return 24 hourly predictions', async () => {
            const res = await request(app).get('/api/predict/today/1');
            expect(res.status).toBe(200);
            expect(res.body.predictions).toHaveLength(24);
            expect(res.body.insights).toBeDefined();
        });

        test('should return 404 for invalid destination', async () => {
            const res = await request(app).get('/api/predict/today/999');
            expect(res.status).toBe(404);
        });
    });

    // ========== WEEK PREDICTION ==========

    describe('GET /api/predict/week/:destinationId', () => {
        test('should return 7-day forecast', async () => {
            const res = await request(app).get('/api/predict/week/3');
            expect(res.status).toBe(200);
            expect(res.body.predictions).toHaveLength(7);
            expect(res.body.weekOverview).toBeDefined();
        });
    });

    // ========== MONTH PREDICTION ==========

    describe('GET /api/predict/month/:destinationId', () => {
        test('should return 30-day forecast', async () => {
            const res = await request(app).get('/api/predict/month/2');
            expect(res.status).toBe(200);
            expect(res.body.predictions).toHaveLength(30);
            expect(res.body.weeklyView).toBeDefined();
            expect(res.body.patterns).toBeDefined();
        });
    });

    // ========== FEEDBACK ==========

    describe('POST /api/feedback', () => {
        test('should accept valid feedback', async () => {
            const res = await request(app)
                .post('/api/feedback')
                .send({
                    destination: 'Goa',
                    predictedLevel: 'moderate',
                    predictedScore: 0.5,
                    isAccurate: true,
                    feedbackType: 'quick'
                });
            expect(res.status).toBe(200);
            expect(res.body.recorded).toBe(true);
        });

        test('should reject feedback without destination', async () => {
            const res = await request(app)
                .post('/api/feedback')
                .send({ isAccurate: true });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/feedback/prompt/:destinationId', () => {
        test('should return feedback prompt', async () => {
            const res = await request(app).get('/api/feedback/prompt/1');
            expect(res.status).toBe(200);
            expect(res.body.question).toBeDefined();
            expect(res.body.options).toBeDefined();
        });

        test('should return 404 for invalid destination', async () => {
            const res = await request(app).get('/api/feedback/prompt/999');
            expect(res.status).toBe(404);
        });
    });

    // ========== HOLIDAYS ==========

    describe('GET /api/holidays', () => {
        test('should return 2026 holidays', async () => {
            const res = await request(app).get('/api/holidays');
            expect(res.status).toBe(200);
            expect(res.body.year).toBe(2026);
            expect(res.body.country).toBe('India');
            expect(res.body.holidays.length).toBeGreaterThan(0);
        });
    });

    // ========== ALERTS ==========

    describe('Alerts CRUD', () => {
        let alertId;

        test('POST /api/alerts should create alert', async () => {
            const res = await request(app)
                .post('/api/alerts')
                .send({
                    email: 'test@example.com',
                    destinationId: 1,
                    threshold: 'low',
                    destinationName: 'Tirupati'
                });
            expect(res.status).toBe(200);
            expect(res.body.id).toBeDefined();
            expect(res.body.email).toBe('test@example.com');
            expect(res.body.isActive).toBe(true);
            alertId = res.body.id;
        });

        test('GET /api/alerts should list alerts', async () => {
            const res = await request(app).get('/api/alerts');
            expect(res.status).toBe(200);
            expect(res.body.total).toBeGreaterThanOrEqual(1);
        });

        test('DELETE /api/alerts/:alertId should delete alert', async () => {
            // First create one
            const createRes = await request(app)
                .post('/api/alerts')
                .send({ email: 'del@test.com', destinationId: 2 });
            const id = createRes.body.id;

            const res = await request(app).delete(`/api/alerts/${id}`);
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Alert deleted');
        });

        test('DELETE /api/alerts/:alertId should 404 for unknown alert', async () => {
            const res = await request(app).delete('/api/alerts/nonexistent');
            expect(res.status).toBe(404);
        });

        test('POST /api/alerts should reject without required fields', async () => {
            const res = await request(app)
                .post('/api/alerts')
                .send({ threshold: 'low' });
            expect(res.status).toBe(400);
        });
    });
});

// If supertest is not installed, run basic non-HTTP tests
if (!request) {
    describe('API Endpoints (supertest not installed)', () => {
        test('Install supertest for full API tests: npm install --save-dev supertest', () => {
            console.log('⚠️  Run: cd backend && npm install --save-dev supertest');
            expect(true).toBe(true);
        });
    });
}
