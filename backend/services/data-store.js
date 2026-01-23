// ============================================================
// Data Store - Local JSON-based Storage
// ============================================================
// Lightweight storage using JSON files
// Can be replaced with MongoDB/PostgreSQL in production
// ============================================================

const fs = require('fs').promises;
const path = require('path');

class DataStore {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.files = {
            signals: 'signals.json',
            predictions: 'predictions.json',
            feedback: 'feedback.json',
            analytics: 'analytics.json',
            destinations: 'destinations.json'
        };
        
        // In-memory cache
        this.cache = {
            signals: new Map(),
            predictions: new Map(),
            feedback: [],
            analytics: []
        };
        
        this.initialized = false;
    }

    // Initialize data store
    async init() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Load existing data
            await this.loadAllData();
            
            this.initialized = true;
            console.log('✅ Data store initialized');
            return true;
        } catch (error) {
            console.error('❌ Data store initialization failed:', error.message);
            return false;
        }
    }

    // Get file path
    getFilePath(filename) {
        return path.join(this.dataDir, filename);
    }

    // Load all data files
    async loadAllData() {
        // Load signals
        try {
            const signalsData = await fs.readFile(this.getFilePath(this.files.signals), 'utf8');
            const signals = JSON.parse(signalsData);
            Object.entries(signals).forEach(([key, value]) => {
                this.cache.signals.set(key, value);
            });
        } catch (error) {
            // File doesn't exist yet, that's okay
            console.log('  No existing signals data');
        }

        // Load predictions
        try {
            const predictionsData = await fs.readFile(this.getFilePath(this.files.predictions), 'utf8');
            const predictions = JSON.parse(predictionsData);
            Object.entries(predictions).forEach(([key, value]) => {
                this.cache.predictions.set(key, value);
            });
        } catch (error) {
            console.log('  No existing predictions data');
        }

        // Load feedback
        try {
            const feedbackData = await fs.readFile(this.getFilePath(this.files.feedback), 'utf8');
            this.cache.feedback = JSON.parse(feedbackData);
        } catch (error) {
            console.log('  No existing feedback data');
        }

        // Load analytics
        try {
            const analyticsData = await fs.readFile(this.getFilePath(this.files.analytics), 'utf8');
            this.cache.analytics = JSON.parse(analyticsData);
        } catch (error) {
            console.log('  No existing analytics data');
        }
    }

    // Save signals data
    async saveSignals(destination, data) {
        const key = destination.toLowerCase();
        this.cache.signals.set(key, {
            ...data,
            savedAt: new Date().toISOString()
        });
        
        await this.persistSignals();
        return true;
    }

    // Batch save signals
    async batchSaveSignals(results) {
        Object.entries(results).forEach(([dest, data]) => {
            this.cache.signals.set(dest.toLowerCase(), {
                ...data,
                savedAt: new Date().toISOString()
            });
        });
        
        await this.persistSignals();
        return true;
    }

    // Save specific signal types
    async saveWikipediaSignal(destination, data) {
        const key = destination.toLowerCase();
        const existing = this.cache.signals.get(key) || {};
        
        this.cache.signals.set(key, {
            ...existing,
            signals: {
                ...existing.signals,
                wikipedia: data
            },
            savedAt: new Date().toISOString()
        });
        
        await this.persistSignals();
    }

    async saveHotelSignal(destination, data) {
        const key = destination.toLowerCase();
        const existing = this.cache.signals.get(key) || {};
        
        this.cache.signals.set(key, {
            ...existing,
            signals: {
                ...existing.signals,
                hotel: data
            },
            savedAt: new Date().toISOString()
        });
        
        await this.persistSignals();
    }

    async saveSocialSignal(destination, data) {
        const key = destination.toLowerCase();
        const existing = this.cache.signals.get(key) || {};
        
        this.cache.signals.set(key, {
            ...existing,
            signals: {
                ...existing.signals,
                social: data
            },
            savedAt: new Date().toISOString()
        });
        
        await this.persistSignals();
    }

    // Get signals for destination
    getSignals(destination) {
        return this.cache.signals.get(destination.toLowerCase());
    }

    // Get all destinations
    getAllDestinations() {
        return Array.from(this.cache.signals.keys());
    }

    // Persist signals to file
    async persistSignals() {
        const data = Object.fromEntries(this.cache.signals);
        await fs.writeFile(
            this.getFilePath(this.files.signals),
            JSON.stringify(data, null, 2)
        );
    }

    // ========== PREDICTIONS ==========

    async savePrediction(destination, prediction) {
        const key = `${destination.toLowerCase()}_${prediction.date || new Date().toISOString().split('T')[0]}`;
        
        this.cache.predictions.set(key, {
            ...prediction,
            savedAt: new Date().toISOString()
        });
        
        await this.persistPredictions();
        return key;
    }

    getPrediction(destination, date) {
        const key = `${destination.toLowerCase()}_${date}`;
        return this.cache.predictions.get(key);
    }

    async persistPredictions() {
        const data = Object.fromEntries(this.cache.predictions);
        await fs.writeFile(
            this.getFilePath(this.files.predictions),
            JSON.stringify(data, null, 2)
        );
    }

    // ========== FEEDBACK ==========

    async saveFeedback(feedback) {
        const entry = {
            id: `fb_${Date.now()}`,
            ...feedback,
            timestamp: new Date().toISOString()
        };
        
        this.cache.feedback.push(entry);
        
        // Keep only last 1000 feedback entries
        if (this.cache.feedback.length > 1000) {
            this.cache.feedback = this.cache.feedback.slice(-1000);
        }
        
        await this.persistFeedback();
        return entry.id;
    }

    async getFeedback(destination = null, limit = 50) {
        let feedback = this.cache.feedback;
        
        if (destination) {
            feedback = feedback.filter(f => 
                f.destination?.toLowerCase() === destination.toLowerCase()
            );
        }
        
        return feedback.slice(-limit);
    }

    async getFeedbackStats() {
        const total = this.cache.feedback.length;
        const positive = this.cache.feedback.filter(f => f.isAccurate === true).length;
        const negative = this.cache.feedback.filter(f => f.isAccurate === false).length;
        
        return {
            total,
            positive,
            negative,
            accuracyRate: total > 0 ? Math.round((positive / total) * 100) : 0,
            byDestination: this.getFeedbackByDestination()
        };
    }

    getFeedbackByDestination() {
        const byDest = {};
        
        this.cache.feedback.forEach(f => {
            if (f.destination) {
                const key = f.destination.toLowerCase();
                if (!byDest[key]) {
                    byDest[key] = { total: 0, positive: 0 };
                }
                byDest[key].total++;
                if (f.isAccurate) byDest[key].positive++;
            }
        });
        
        return byDest;
    }

    async persistFeedback() {
        await fs.writeFile(
            this.getFilePath(this.files.feedback),
            JSON.stringify(this.cache.feedback, null, 2)
        );
    }

    // ========== ANALYTICS ==========

    async saveDailyAnalytics(analytics) {
        this.cache.analytics.push(analytics);
        
        // Keep only last 90 days
        if (this.cache.analytics.length > 90) {
            this.cache.analytics = this.cache.analytics.slice(-90);
        }
        
        await this.persistAnalytics();
    }

    async getAnalytics(days = 30) {
        return this.cache.analytics.slice(-days);
    }

    async persistAnalytics() {
        await fs.writeFile(
            this.getFilePath(this.files.analytics),
            JSON.stringify(this.cache.analytics, null, 2)
        );
    }

    // ========== UTILITY ==========

    async getStorageStats() {
        const stats = {
            signals: this.cache.signals.size,
            predictions: this.cache.predictions.size,
            feedback: this.cache.feedback.length,
            analytics: this.cache.analytics.length
        };

        // Get file sizes
        for (const [key, filename] of Object.entries(this.files)) {
            try {
                const fileStat = await fs.stat(this.getFilePath(filename));
                stats[`${key}FileSize`] = fileStat.size;
            } catch {
                stats[`${key}FileSize`] = 0;
            }
        }

        return stats;
    }

    async clearAll() {
        this.cache.signals.clear();
        this.cache.predictions.clear();
        this.cache.feedback = [];
        this.cache.analytics = [];
        
        // Delete files
        for (const filename of Object.values(this.files)) {
            try {
                await fs.unlink(this.getFilePath(filename));
            } catch {
                // File doesn't exist, that's okay
            }
        }
        
        console.log('🗑️ All data cleared');
    }
}

module.exports = DataStore;
