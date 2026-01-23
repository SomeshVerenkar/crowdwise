// ============================================================
// Validation & Feedback Service
// ============================================================
// Collects user feedback to improve prediction accuracy
// Tracks prediction vs actual and adjusts algorithm weights
// ============================================================

const DataStore = require('./data-store');

class ValidationService {
    constructor(dataStore) {
        this.dataStore = dataStore || new DataStore();
        
        // Accuracy tracking per destination
        this.accuracyTracking = new Map();
        
        // Weight adjustments based on feedback
        this.weightAdjustments = new Map();
        
        // Thresholds
        this.config = {
            minFeedbackForAdjustment: 10,
            significantErrorThreshold: 0.25,
            adjustmentRate: 0.05,
            maxAdjustment: 0.3
        };
    }

    // ========== FEEDBACK COLLECTION ==========

    // Record user feedback on prediction
    async recordFeedback(params) {
        const {
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType,  // 'quick' (thumbs up/down) or 'detailed'
            comments,
            timestamp = new Date().toISOString()
        } = params;

        const feedback = {
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel,
            isAccurate,
            feedbackType,
            comments,
            timestamp,
            date: new Date().toISOString().split('T')[0],
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay()
        };

        // Calculate error if detailed feedback
        if (userReportedLevel !== undefined) {
            feedback.error = Math.abs(predictedScore - this.levelToScore(userReportedLevel));
            feedback.errorPercentage = Math.round(feedback.error * 100);
        }

        // Save feedback
        const feedbackId = await this.dataStore.saveFeedback(feedback);

        // Update accuracy tracking
        this.updateAccuracyTracking(destination, feedback);

        // Check if weight adjustment needed
        await this.checkAndAdjustWeights(destination);

        return {
            feedbackId,
            recorded: true,
            message: 'Thank you for your feedback! This helps us improve.',
            currentAccuracy: this.getDestinationAccuracy(destination)
        };
    }

    // Convert crowd level to score
    levelToScore(level) {
        const mapping = {
            'very_low': 0.1,
            'low': 0.3,
            'moderate': 0.5,
            'heavy': 0.7,
            'very_heavy': 0.85,
            'overcrowded': 0.95
        };
        return mapping[level] || 0.5;
    }

    // Update accuracy tracking
    updateAccuracyTracking(destination, feedback) {
        const key = destination.toLowerCase();
        
        if (!this.accuracyTracking.has(key)) {
            this.accuracyTracking.set(key, {
                totalFeedback: 0,
                accurateFeedback: 0,
                errorSum: 0,
                recentErrors: [],
                lastUpdate: null
            });
        }

        const tracking = this.accuracyTracking.get(key);
        tracking.totalFeedback++;
        
        if (feedback.isAccurate) {
            tracking.accurateFeedback++;
        }
        
        if (feedback.error !== undefined) {
            tracking.errorSum += feedback.error;
            tracking.recentErrors.push(feedback.error);
            
            // Keep only last 50 errors
            if (tracking.recentErrors.length > 50) {
                tracking.recentErrors = tracking.recentErrors.slice(-50);
            }
        }
        
        tracking.lastUpdate = new Date().toISOString();
    }

    // Get accuracy for destination
    getDestinationAccuracy(destination) {
        const tracking = this.accuracyTracking.get(destination.toLowerCase());
        
        if (!tracking || tracking.totalFeedback === 0) {
            return {
                accuracy: null,
                confidence: 'no_data',
                feedbackCount: 0
            };
        }

        const accuracy = (tracking.accurateFeedback / tracking.totalFeedback) * 100;
        const avgError = tracking.errorSum / tracking.totalFeedback;

        return {
            accuracy: Math.round(accuracy * 10) / 10,
            avgError: Math.round(avgError * 100) / 100,
            feedbackCount: tracking.totalFeedback,
            confidence: tracking.totalFeedback >= 30 ? 'high' : 
                       tracking.totalFeedback >= 10 ? 'medium' : 'low',
            recentTrend: this.calculateRecentTrend(tracking.recentErrors)
        };
    }

    // Calculate if accuracy is improving or declining
    calculateRecentTrend(recentErrors) {
        if (recentErrors.length < 10) return 'insufficient_data';
        
        const firstHalf = recentErrors.slice(0, Math.floor(recentErrors.length / 2));
        const secondHalf = recentErrors.slice(Math.floor(recentErrors.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (secondAvg < firstAvg - 0.05) return 'improving';
        if (secondAvg > firstAvg + 0.05) return 'declining';
        return 'stable';
    }

    // ========== WEIGHT ADJUSTMENT ==========

    // Check if weights need adjustment
    async checkAndAdjustWeights(destination) {
        const tracking = this.accuracyTracking.get(destination.toLowerCase());
        
        if (!tracking || tracking.totalFeedback < this.config.minFeedbackForAdjustment) {
            return null;
        }

        const avgError = tracking.errorSum / tracking.totalFeedback;
        
        if (avgError > this.config.significantErrorThreshold) {
            // Need adjustment
            const adjustment = this.calculateWeightAdjustment(destination, tracking);
            this.weightAdjustments.set(destination.toLowerCase(), adjustment);
            
            console.log(`⚖️ Weight adjustment for ${destination}:`, adjustment);
            return adjustment;
        }

        return null;
    }

    // Calculate how to adjust weights
    calculateWeightAdjustment(destination, tracking) {
        // Analyze pattern of errors to determine which signal needs adjustment
        // This is a simplified version - production would analyze error patterns more deeply
        
        const currentAdjustment = this.weightAdjustments.get(destination.toLowerCase()) || {
            timeOfDay: 0,
            dayOfWeek: 0,
            seasonal: 0,
            socialSignal: 0,
            hotelDemand: 0
        };

        // Gradually adjust based on error
        const avgError = tracking.errorSum / tracking.totalFeedback;
        const adjustmentFactor = Math.min(this.config.adjustmentRate, avgError * 0.2);

        // Simple adjustment: if consistently overestimating, reduce weights
        // In production, this would be more sophisticated
        const recentErrors = tracking.recentErrors.slice(-10);
        const avgRecentError = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length;

        return {
            ...currentAdjustment,
            overall: -adjustmentFactor * (avgRecentError > 0 ? 1 : -1),
            lastAdjustment: new Date().toISOString(),
            basedOnFeedback: tracking.totalFeedback
        };
    }

    // Get weight adjustments for algorithm
    getWeightAdjustments(destination) {
        return this.weightAdjustments.get(destination.toLowerCase()) || null;
    }

    // ========== ANALYTICS ==========

    // Get overall system accuracy
    async getSystemAccuracy() {
        const stats = await this.dataStore.getFeedbackStats();
        
        const destinationAccuracies = [];
        this.accuracyTracking.forEach((tracking, dest) => {
            if (tracking.totalFeedback >= 5) {
                destinationAccuracies.push({
                    destination: dest,
                    accuracy: (tracking.accurateFeedback / tracking.totalFeedback) * 100,
                    feedbackCount: tracking.totalFeedback
                });
            }
        });

        return {
            overallAccuracy: stats.accuracyRate,
            totalFeedback: stats.total,
            positiveRatio: stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0,
            destinationBreakdown: destinationAccuracies.sort((a, b) => b.accuracy - a.accuracy),
            topPerforming: destinationAccuracies.filter(d => d.accuracy >= 70),
            needsImprovement: destinationAccuracies.filter(d => d.accuracy < 50),
            status: this.calculateSystemStatus(stats.accuracyRate)
        };
    }

    calculateSystemStatus(accuracyRate) {
        if (accuracyRate >= 80) return { level: 'excellent', message: 'System performing excellently' };
        if (accuracyRate >= 70) return { level: 'good', message: 'System performing well' };
        if (accuracyRate >= 60) return { level: 'moderate', message: 'System needs some improvement' };
        if (accuracyRate >= 50) return { level: 'fair', message: 'System accuracy is fair' };
        return { level: 'needs_attention', message: 'System needs significant improvement' };
    }

    // Get feedback insights
    async getFeedbackInsights() {
        const allFeedback = await this.dataStore.getFeedback(null, 200);
        
        // Analyze by time
        const byHour = {};
        const byDay = {};
        const byDestination = {};

        allFeedback.forEach(f => {
            // By hour
            const hour = f.hour;
            if (!byHour[hour]) byHour[hour] = { total: 0, accurate: 0 };
            byHour[hour].total++;
            if (f.isAccurate) byHour[hour].accurate++;

            // By day
            const day = f.dayOfWeek;
            if (!byDay[day]) byDay[day] = { total: 0, accurate: 0 };
            byDay[day].total++;
            if (f.isAccurate) byDay[day].accurate++;

            // By destination
            if (f.destination) {
                if (!byDestination[f.destination]) byDestination[f.destination] = { total: 0, accurate: 0 };
                byDestination[f.destination].total++;
                if (f.isAccurate) byDestination[f.destination].accurate++;
            }
        });

        return {
            totalFeedback: allFeedback.length,
            byHour: this.calculateAccuracyRates(byHour),
            byDay: this.calculateAccuracyRates(byDay),
            byDestination: this.calculateAccuracyRates(byDestination),
            recentFeedback: allFeedback.slice(-10),
            insights: this.generateInsights(byHour, byDay, byDestination)
        };
    }

    calculateAccuracyRates(data) {
        const result = {};
        Object.entries(data).forEach(([key, value]) => {
            result[key] = {
                ...value,
                accuracyRate: value.total > 0 ? Math.round((value.accurate / value.total) * 100) : 0
            };
        });
        return result;
    }

    generateInsights(byHour, byDay, byDestination) {
        const insights = [];

        // Find problem hours
        Object.entries(byHour).forEach(([hour, data]) => {
            if (data.total >= 5 && (data.accurate / data.total) < 0.5) {
                insights.push({
                    type: 'hour_accuracy',
                    message: `Predictions at ${hour}:00 need improvement`,
                    data: { hour, accuracy: Math.round((data.accurate / data.total) * 100) }
                });
            }
        });

        // Find problem destinations
        Object.entries(byDestination).forEach(([dest, data]) => {
            if (data.total >= 5 && (data.accurate / data.total) < 0.5) {
                insights.push({
                    type: 'destination_accuracy',
                    message: `Predictions for ${dest} need improvement`,
                    data: { destination: dest, accuracy: Math.round((data.accurate / data.total) * 100) }
                });
            }
        });

        return insights;
    }

    // ========== API RESPONSE HELPERS ==========

    // Generate feedback prompt for UI
    generateFeedbackPrompt(destination, predictedLevel) {
        return {
            question: 'Was this crowd prediction accurate?',
            destination,
            predictedLevel,
            options: {
                quick: [
                    { value: true, label: '👍 Yes, accurate' },
                    { value: false, label: '👎 Not accurate' }
                ],
                detailed: [
                    { value: 'very_low', label: '🟢 Very Low (almost empty)' },
                    { value: 'low', label: '🟢 Low (comfortable)' },
                    { value: 'moderate', label: '🟡 Moderate (some crowds)' },
                    { value: 'heavy', label: '🟠 Heavy (crowded)' },
                    { value: 'very_heavy', label: '🔴 Very Heavy (very crowded)' },
                    { value: 'overcrowded', label: '🔥 Overcrowded (packed)' }
                ]
            },
            note: 'Your feedback helps improve predictions for everyone!'
        };
    }
}

module.exports = ValidationService;
