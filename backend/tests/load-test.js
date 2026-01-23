/**
 * CrowdWise India - k6 Load Test Script
 * ============================================================
 * Alternative load testing using k6 (https://k6.io)
 * 
 * Prerequisites:
 *   - Install k6: https://k6.io/docs/getting-started/installation/
 *   - Windows: choco install k6
 *   - Mac: brew install k6
 *   - Linux: sudo apt-get install k6
 * 
 * Run tests:
 *   k6 run backend/tests/load-test.js
 * 
 * Run with options:
 *   k6 run --vus 100 --duration 5m backend/tests/load-test.js
 * 
 * Run with HTML report:
 *   k6 run --out json=results.json backend/tests/load-test.js
 * ============================================================
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const weatherRequests = new Counter('weather_requests');
const crowdRequests = new Counter('crowd_requests');
const alertRequests = new Counter('alert_requests');
const responseTime = new Trend('response_time_custom');

// Test configuration
export const options = {
    stages: [
        // Ramp-up
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        // Sustained load
        { duration: '3m', target: 100 },  // Stay at 100 users
        // Spike test
        { duration: '1m', target: 300 },  // Spike to 300 users
        // Recovery
        { duration: '1m', target: 100 },  // Back to 100
        // Ramp-down
        { duration: '1m', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
        http_req_failed: ['rate<0.01'],                  // Error rate < 1%
        error_rate: ['rate<0.01'],                       // Custom error rate < 1%
    },
};

const BASE_URL = 'http://localhost:3002';

// Helper function to generate random destination ID
function randomDestId() {
    return Math.floor(Math.random() * 10) + 1;
}

// Helper function to generate random email
function randomEmail() {
    return `loadtest-${Math.floor(Math.random() * 10000)}@test.com`;
}

export default function () {
    // Randomly select a scenario based on weight
    const scenario = Math.random();
    
    if (scenario < 0.1) {
        // 10% - Health check
        healthCheck();
    } else if (scenario < 0.4) {
        // 30% - Weather requests
        getWeather();
    } else if (scenario < 0.7) {
        // 30% - Crowd data requests
        getCrowdData();
    } else if (scenario < 0.85) {
        // 15% - Full destination data
        getDestination();
    } else if (scenario < 0.95) {
        // 10% - User journey
        userJourney();
    } else {
        // 5% - Create alert
        createAlert();
    }
    
    sleep(1); // Think time between requests
}

// Scenario: Health Check
function healthCheck() {
    group('Health Check', function () {
        const res = http.get(`${BASE_URL}/api/health`);
        
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'response has status': (r) => JSON.parse(r.body).status === 'healthy',
        });
        
        errorRate.add(!success);
        responseTime.add(res.timings.duration);
    });
}

// Scenario: Get Weather Data
function getWeather() {
    group('Weather API', function () {
        const destId = randomDestId();
        const res = http.get(`${BASE_URL}/api/weather/${destId}`);
        
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'has temperature': (r) => JSON.parse(r.body).temperature !== undefined,
            'has condition': (r) => JSON.parse(r.body).condition !== undefined,
        });
        
        weatherRequests.add(1);
        errorRate.add(!success);
        responseTime.add(res.timings.duration);
    });
}

// Scenario: Get Crowd Data
function getCrowdData() {
    group('Crowd API', function () {
        const destId = randomDestId();
        const res = http.get(`${BASE_URL}/api/crowd/${destId}`);
        
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'has crowdLevel': (r) => JSON.parse(r.body).crowdLevel !== undefined,
            'has currentEstimate': (r) => JSON.parse(r.body).currentEstimate !== undefined,
        });
        
        crowdRequests.add(1);
        errorRate.add(!success);
        responseTime.add(res.timings.duration);
    });
}

// Scenario: Get Full Destination Data
function getDestination() {
    group('Destination API', function () {
        const destId = randomDestId();
        const res = http.get(`${BASE_URL}/api/destinations/${destId}`);
        
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'has weather data': (r) => JSON.parse(r.body).weather !== undefined,
            'has crowd data': (r) => JSON.parse(r.body).crowd !== undefined,
        });
        
        errorRate.add(!success);
        responseTime.add(res.timings.duration);
    });
}

// Scenario: Create Alert
function createAlert() {
    group('Create Alert', function () {
        const payload = JSON.stringify({
            email: randomEmail(),
            destinationId: randomDestId(),
            threshold: ['low', 'moderate', 'heavy'][Math.floor(Math.random() * 3)],
            destinationName: 'Load Test Destination',
        });
        
        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const res = http.post(`${BASE_URL}/api/alerts`, payload, params);
        
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'alert created': (r) => JSON.parse(r.body).success === true,
        });
        
        alertRequests.add(1);
        errorRate.add(!success);
        responseTime.add(res.timings.duration);
    });
}

// Scenario: Full User Journey
function userJourney() {
    group('User Journey', function () {
        // 1. Check API health
        http.get(`${BASE_URL}/api/health`);
        sleep(0.5);
        
        // 2. Browse multiple destinations
        for (let i = 0; i < 3; i++) {
            const destId = randomDestId();
            
            // Get weather
            const weatherRes = http.get(`${BASE_URL}/api/weather/${destId}`);
            check(weatherRes, { 'weather ok': (r) => r.status === 200 });
            
            // Get crowd
            const crowdRes = http.get(`${BASE_URL}/api/crowd/${destId}`);
            check(crowdRes, { 'crowd ok': (r) => r.status === 200 });
            
            sleep(0.5);
        }
        
        // 3. Set an alert
        const alertPayload = JSON.stringify({
            email: randomEmail(),
            destinationId: randomDestId(),
            threshold: 'low',
            destinationName: 'User Journey Destination',
        });
        
        const alertRes = http.post(`${BASE_URL}/api/alerts`, alertPayload, {
            headers: { 'Content-Type': 'application/json' },
        });
        
        check(alertRes, {
            'alert created': (r) => r.status === 200 && JSON.parse(r.body).success,
        });
    });
}

// Summary output
export function handleSummary(data) {
    console.log('\n============================================================');
    console.log('CrowdWise India - Load Test Summary');
    console.log('============================================================');
    console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
    console.log(`Failed requests: ${data.metrics.http_req_failed.values.passes}`);
    console.log(`Avg response time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`95th percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`99th percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
    console.log('============================================================\n');
    
    return {
        stdout: JSON.stringify(data, null, 2),
    };
}
