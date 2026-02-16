// ============================================================
// Client-Side Accuracy Tracker
// ============================================================
// Tracks prediction accuracy locally using localStorage
// Mirrors backend/services/validation-service.js functionality
// ============================================================

const AccuracyTracker = (function() {
    'use strict';

    const STORAGE_KEY = 'crowdwise_accuracy';
    const CONFIG = {
        minFeedbackForStats: 5,
        minFeedbackForTrend: 10,
        maxRecentErrors: 50,
        significantErrorThreshold: 0.25
    };

    // Level to score mapping (matches backend)
    const LEVEL_SCORES = {
        'very_low': 0.1,
        'low': 0.3,
        'moderate': 0.5,
        'heavy': 0.7,
        'very_heavy': 0.85,
        'overcrowded': 0.95
    };

    // ========== STORAGE ==========

    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('AccuracyTracker: Failed to load data', e);
        }
        return createEmptyData();
    }

    function saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('AccuracyTracker: Failed to save data', e);
            return false;
        }
    }

    function createEmptyData() {
        return {
            version: 1,
            createdAt: new Date().toISOString(),
            destinations: {},
            globalStats: {
                totalFeedback: 0,
                accurateFeedback: 0,
                totalError: 0
            },
            feedbackLog: []  // Last 100 feedback entries for analysis
        };
    }

    // ========== FEEDBACK RECORDING ==========

    /**
     * Record user feedback on a prediction
     * @param {Object} params - Feedback parameters
     * @param {string} params.destinationId - Destination ID
     * @param {string} params.destinationName - Destination name
     * @param {string} params.predictedLevel - Predicted crowd level
     * @param {number} params.predictedScore - Predicted crowd score (0-1)
     * @param {string} [params.userReportedLevel] - User's actual observation
     * @param {boolean} params.isAccurate - Quick feedback: was prediction accurate?
     * @param {string} params.feedbackType - 'quick' or 'detailed'
     */
    function recordFeedback(params) {
        const {
            destinationId,
            destinationName,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType = 'quick'
        } = params;

        const data = loadData();
        const now = new Date();
        const key = String(destinationId || destinationName || 'unknown').toLowerCase();

        // Initialize destination tracking if needed
        if (!data.destinations[key]) {
            data.destinations[key] = {
                name: destinationName || destinationId,
                totalFeedback: 0,
                accurateFeedback: 0,
                errorSum: 0,
                recentErrors: [],
                lastUpdate: null
            };
        }

        const dest = data.destinations[key];
        const entry = {
            destinationId: key,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType,
            timestamp: now.toISOString(),
            hour: now.getHours(),
            dayOfWeek: now.getDay()
        };

        // Calculate error for detailed feedback
        if (userReportedLevel && LEVEL_SCORES[userReportedLevel] !== undefined) {
            const actualScore = LEVEL_SCORES[userReportedLevel];
            entry.error = Math.abs(predictedScore - actualScore);
            entry.errorPercentage = Math.round(entry.error * 100);
        }

        // Update destination stats
        dest.totalFeedback++;
        if (isAccurate) {
            dest.accurateFeedback++;
        }
        if (entry.error !== undefined) {
            dest.errorSum += entry.error;
            dest.recentErrors.push(entry.error);
            if (dest.recentErrors.length > CONFIG.maxRecentErrors) {
                dest.recentErrors = dest.recentErrors.slice(-CONFIG.maxRecentErrors);
            }
        }
        dest.lastUpdate = now.toISOString();

        // Update global stats
        data.globalStats.totalFeedback++;
        if (isAccurate) {
            data.globalStats.accurateFeedback++;
        }
        if (entry.error !== undefined) {
            data.globalStats.totalError += entry.error;
        }

        // Add to feedback log (keep last 100)
        data.feedbackLog.push(entry);
        if (data.feedbackLog.length > 100) {
            data.feedbackLog = data.feedbackLog.slice(-100);
        }

        saveData(data);

        return {
            recorded: true,
            destinationAccuracy: getDestinationAccuracy(key),
            message: 'Thank you for your feedback!'
        };
    }

    // ========== ACCURACY CALCULATION ==========

    /**
     * Get accuracy stats for a specific destination
     * @param {string} destinationKey - Destination ID or name (lowercased)
     */
    function getDestinationAccuracy(destinationKey) {
        const data = loadData();
        const key = String(destinationKey || '').toLowerCase();
        const dest = data.destinations[key];

        if (!dest || dest.totalFeedback === 0) {
            return {
                accuracy: null,
                confidence: 'no_data',
                feedbackCount: 0,
                message: 'No feedback data yet'
            };
        }

        const accuracy = (dest.accurateFeedback / dest.totalFeedback) * 100;
        const avgError = dest.totalFeedback > 0 && dest.errorSum > 0 
            ? dest.errorSum / dest.totalFeedback 
            : null;

        return {
            accuracy: Math.round(accuracy * 10) / 10,
            avgError: avgError !== null ? Math.round(avgError * 100) / 100 : null,
            feedbackCount: dest.totalFeedback,
            confidence: dest.totalFeedback >= 30 ? 'high' :
                       dest.totalFeedback >= 10 ? 'medium' : 'low',
            trend: calculateTrend(dest.recentErrors),
            lastUpdate: dest.lastUpdate
        };
    }

    /**
     * Calculate if accuracy is improving, declining, or stable
     */
    function calculateTrend(recentErrors) {
        if (!recentErrors || recentErrors.length < CONFIG.minFeedbackForTrend) {
            return 'insufficient_data';
        }

        const midpoint = Math.floor(recentErrors.length / 2);
        const firstHalf = recentErrors.slice(0, midpoint);
        const secondHalf = recentErrors.slice(midpoint);

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg < firstAvg - 0.05) return 'improving';
        if (secondAvg > firstAvg + 0.05) return 'declining';
        return 'stable';
    }

    // ========== SYSTEM-WIDE STATS ==========

    /**
     * Get overall system accuracy stats
     */
    function getSystemStats() {
        const data = loadData();
        const stats = data.globalStats;

        if (stats.totalFeedback === 0) {
            return {
                overallAccuracy: null,
                totalFeedback: 0,
                status: { level: 'no_data', message: 'No feedback collected yet' },
                destinationCount: 0,
                topPerforming: [],
                needsImprovement: []
            };
        }

        const overallAccuracy = (stats.accurateFeedback / stats.totalFeedback) * 100;
        
        // Analyze destinations
        const destinations = [];
        Object.entries(data.destinations).forEach(([key, dest]) => {
            if (dest.totalFeedback >= CONFIG.minFeedbackForStats) {
                const accuracy = (dest.accurateFeedback / dest.totalFeedback) * 100;
                destinations.push({
                    id: key,
                    name: dest.name,
                    accuracy: Math.round(accuracy * 10) / 10,
                    feedbackCount: dest.totalFeedback
                });
            }
        });

        destinations.sort((a, b) => b.accuracy - a.accuracy);

        return {
            overallAccuracy: Math.round(overallAccuracy * 10) / 10,
            totalFeedback: stats.totalFeedback,
            avgError: stats.totalFeedback > 0 
                ? Math.round((stats.totalError / stats.totalFeedback) * 100) 
                : null,
            status: calculateSystemStatus(overallAccuracy),
            destinationCount: Object.keys(data.destinations).length,
            destinationsWithStats: destinations.length,
            topPerforming: destinations.filter(d => d.accuracy >= 70).slice(0, 5),
            needsImprovement: destinations.filter(d => d.accuracy < 50).slice(0, 5)
        };
    }

    function calculateSystemStatus(accuracyRate) {
        if (accuracyRate >= 80) return { level: 'excellent', message: 'System performing excellently', emoji: '🎯' };
        if (accuracyRate >= 70) return { level: 'good', message: 'System performing well', emoji: '✅' };
        if (accuracyRate >= 60) return { level: 'moderate', message: 'System needs some improvement', emoji: '📊' };
        if (accuracyRate >= 50) return { level: 'fair', message: 'System accuracy is fair', emoji: '📈' };
        return { level: 'needs_attention', message: 'System needs significant improvement', emoji: '⚠️' };
    }

    // ========== INSIGHTS & ANALYSIS ==========

    /**
     * Get insights from feedback patterns
     */
    function getInsights() {
        const data = loadData();
        const log = data.feedbackLog;

        if (log.length < 10) {
            return {
                hasEnoughData: false,
                message: 'Need at least 10 feedback entries for insights',
                currentCount: log.length
            };
        }

        // Analyze by hour
        const byHour = {};
        const byDay = {};

        log.forEach(entry => {
            // By hour
            const hour = entry.hour;
            if (!byHour[hour]) byHour[hour] = { total: 0, accurate: 0 };
            byHour[hour].total++;
            if (entry.isAccurate) byHour[hour].accurate++;

            // By day
            const day = entry.dayOfWeek;
            if (!byDay[day]) byDay[day] = { total: 0, accurate: 0 };
            byDay[day].total++;
            if (entry.isAccurate) byDay[day].accurate++;
        });

        const insights = [];

        // Find problem hours
        Object.entries(byHour).forEach(([hour, stats]) => {
            if (stats.total >= 3) {
                const rate = (stats.accurate / stats.total) * 100;
                if (rate < 50) {
                    insights.push({
                        type: 'hour',
                        severity: 'warning',
                        message: `Predictions at ${hour}:00 are only ${Math.round(rate)}% accurate`,
                        data: { hour: parseInt(hour), accuracy: Math.round(rate), samples: stats.total }
                    });
                }
            }
        });

        // Find problem days
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        Object.entries(byDay).forEach(([day, stats]) => {
            if (stats.total >= 3) {
                const rate = (stats.accurate / stats.total) * 100;
                if (rate < 50) {
                    insights.push({
                        type: 'day',
                        severity: 'warning',
                        message: `${dayNames[day]} predictions are only ${Math.round(rate)}% accurate`,
                        data: { day: dayNames[day], accuracy: Math.round(rate), samples: stats.total }
                    });
                }
            }
        });

        return {
            hasEnoughData: true,
            totalFeedback: log.length,
            insights,
            byHour: calculateRates(byHour),
            byDay: calculateRates(byDay, dayNames)
        };
    }

    function calculateRates(data, labels) {
        const result = {};
        Object.entries(data).forEach(([key, value]) => {
            const label = labels ? labels[key] : key;
            result[label] = {
                total: value.total,
                accurate: value.accurate,
                rate: value.total > 0 ? Math.round((value.accurate / value.total) * 100) : 0
            };
        });
        return result;
    }

    // ========== UTILITY ==========

    /**
     * Clear all accuracy data (for testing/reset)
     */
    function clearData() {
        localStorage.removeItem(STORAGE_KEY);
        return { cleared: true };
    }

    /**
     * Export all data for debugging
     */
    function exportData() {
        return loadData();
    }

    /**
     * Check if tracker is enabled (via feature flags)
     */
    function isEnabled() {
        if (typeof CrowdWiseConfig !== 'undefined' && CrowdWiseConfig.FEATURE_FLAGS) {
            return CrowdWiseConfig.FEATURE_FLAGS.GAMIFICATION_ENABLED !== false;
        }
        return true;
    }

    // ========== PUBLIC API ==========

    return {
        // Core
        recordFeedback,
        getDestinationAccuracy,
        getSystemStats,
        getInsights,

        // Utility
        isEnabled,
        clearData,
        exportData,

        // Constants
        LEVEL_SCORES,
        CONFIG
    };

})();

// Make available globally
if (typeof window !== 'undefined') {
    window.AccuracyTracker = AccuracyTracker;
}
