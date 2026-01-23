// ============================================================
// Prediction Engine - Forecast Future Crowd Levels
// ============================================================
// Uses historical patterns + real-time signals to predict
// crowd levels for the next hours/days/weeks
// ============================================================

const CrowdScoringAlgorithm = require('./crowd-scoring');

class PredictionEngine {
    constructor() {
        this.crowdAlgorithm = new CrowdScoringAlgorithm();
        this.predictionCache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        
        // Historical pattern adjustments (learned over time)
        this.patternAdjustments = new Map();
        
        // Prediction accuracy tracking
        this.accuracyMetrics = {
            totalPredictions: 0,
            accuratePredictions: 0,
            averageError: 0,
            lastUpdated: null
        };
    }

    // ========== MAIN PREDICTION FUNCTIONS ==========

    // Get current crowd prediction
    predictCurrent(params) {
        const { destination, category, baseCrowdLevel, socialSignal, hotelSignal, weatherCondition } = params;
        
        const now = new Date();
        const cacheKey = `current_${destination}_${now.getHours()}`;
        
        // Check cache
        const cached = this.predictionCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        const prediction = this.crowdAlgorithm.calculateCrowdScore({
            destination,
            category,
            date: now,
            hour: now.getHours(),
            baseCrowdLevel,
            socialSignal,
            hotelSignal,
            weatherCondition
        });

        // Add prediction metadata
        const result = {
            ...prediction,
            predictionType: 'current',
            predictionTime: now.toISOString(),
            validUntil: new Date(Date.now() + this.cacheExpiry).toISOString()
        };

        this.predictionCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    }

    // Predict hourly breakdown for today
    predictToday(params) {
        const { destination, category, baseCrowdLevel, socialSignal, hotelSignal } = params;
        
        const now = new Date();
        const predictions = [];
        
        // Generate predictions for remaining hours today
        for (let hour = 0; hour < 24; hour++) {
            const targetTime = new Date(now);
            targetTime.setHours(hour, 0, 0, 0);
            
            const isPast = targetTime < now;
            
            const prediction = this.crowdAlgorithm.calculateCrowdScore({
                destination,
                category,
                date: targetTime,
                hour,
                baseCrowdLevel,
                socialSignal,
                hotelSignal
            });

            predictions.push({
                hour,
                time: targetTime.toISOString(),
                timeFormatted: this.formatHour(hour),
                isPast,
                score: prediction.score,
                crowdLevel: prediction.crowdLevel,
                crowdLabel: prediction.crowdLabel,
                crowdEmoji: prediction.crowdEmoji,
                percentageFull: prediction.percentageFull
            });
        }

        // Find optimal times
        const futurePredictions = predictions.filter(p => !p.isPast);
        const sortedByScore = [...futurePredictions].sort((a, b) => a.score - b.score);
        
        const peakHours = predictions
            .filter(p => p.score > 0.6)
            .map(p => p.timeFormatted)
            .join(', ') || 'None predicted';

        const quietHours = predictions
            .filter(p => p.score < 0.35 && !p.isPast)
            .map(p => p.timeFormatted)
            .join(', ') || 'None in remaining hours';

        return {
            destination,
            date: now.toISOString().split('T')[0],
            predictions,
            insights: {
                currentHour: now.getHours(),
                bestTimeToVisit: sortedByScore[0]?.timeFormatted || 'Now',
                bestTimeScore: sortedByScore[0]?.score,
                worstTimeToVisit: sortedByScore[sortedByScore.length - 1]?.timeFormatted,
                peakHours,
                quietHours,
                averageScore: Math.round((predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length) * 100) / 100
            },
            generatedAt: new Date().toISOString()
        };
    }

    // Predict for next 7 days
    predictWeek(params) {
        const { destination, category, baseCrowdLevel, socialSignal, hotelSignal } = params;
        
        const predictions = [];
        const now = new Date();
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + dayOffset);
            
            // Calculate scores for key times of the day
            const morningScore = this.crowdAlgorithm.calculateCrowdScore({
                destination, category, date: targetDate, hour: 9, baseCrowdLevel, socialSignal, hotelSignal
            });
            
            const afternoonScore = this.crowdAlgorithm.calculateCrowdScore({
                destination, category, date: targetDate, hour: 14, baseCrowdLevel, socialSignal, hotelSignal
            });
            
            const eveningScore = this.crowdAlgorithm.calculateCrowdScore({
                destination, category, date: targetDate, hour: 18, baseCrowdLevel, socialSignal, hotelSignal
            });

            // Average for the day
            const avgScore = (morningScore.score + afternoonScore.score + eveningScore.score) / 3;
            const peakScore = Math.max(morningScore.score, afternoonScore.score, eveningScore.score);

            predictions.push({
                date: targetDate.toISOString().split('T')[0],
                dayName: this.getDayName(targetDate),
                isToday: dayOffset === 0,
                isTomorrow: dayOffset === 1,
                isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
                scores: {
                    morning: morningScore.score,
                    afternoon: afternoonScore.score,
                    evening: eveningScore.score,
                    average: Math.round(avgScore * 100) / 100,
                    peak: peakScore
                },
                crowdLevel: this.scoreToCrowdLevel(avgScore),
                holiday: morningScore.breakdown.holiday.info,
                recommendation: this.getDayRecommendation(avgScore, targetDate)
            });
        }

        // Find best day
        const sortedByAvg = [...predictions].sort((a, b) => a.scores.average - b.scores.average);
        
        return {
            destination,
            predictions,
            weekOverview: {
                bestDay: sortedByAvg[0],
                worstDay: sortedByAvg[sortedByAvg.length - 1],
                weekendStatus: this.getWeekendStatus(predictions),
                upcomingHolidays: predictions.filter(p => p.holiday.isHoliday).map(p => ({
                    date: p.date,
                    holiday: p.holiday.name
                }))
            },
            generatedAt: new Date().toISOString()
        };
    }

    // Predict for next 30 days (monthly view)
    predictMonth(params) {
        const { destination, category, baseCrowdLevel } = params;
        
        const predictions = [];
        const now = new Date();
        
        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + dayOffset);
            
            // Use noon as representative time
            const score = this.crowdAlgorithm.calculateCrowdScore({
                destination,
                category,
                date: targetDate,
                hour: 12,
                baseCrowdLevel
            });

            predictions.push({
                date: targetDate.toISOString().split('T')[0],
                dayOfMonth: targetDate.getDate(),
                dayName: this.getDayName(targetDate).substring(0, 3),
                weekNumber: this.getWeekNumber(targetDate),
                score: score.score,
                crowdLevel: score.crowdLevel,
                crowdEmoji: score.crowdEmoji,
                isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
                holiday: score.breakdown.holiday.info
            });
        }

        // Group by weeks
        const weeklyView = this.groupByWeek(predictions);

        // Find patterns
        const patterns = this.analyzePatterns(predictions);

        return {
            destination,
            predictions,
            weeklyView,
            patterns,
            summary: {
                bestDays: predictions.filter(p => p.score < 0.35).map(p => p.date),
                worstDays: predictions.filter(p => p.score > 0.75).map(p => p.date),
                averageScore: Math.round((predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length) * 100) / 100
            },
            generatedAt: new Date().toISOString()
        };
    }

    // ========== HELPER FUNCTIONS ==========

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    }

    getDayName(date) {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    }

    scoreToCrowdLevel(score) {
        if (score < 0.20) return { level: 'very_low', label: 'Very Low', emoji: '🟢' };
        if (score < 0.40) return { level: 'low', label: 'Low', emoji: '🟢' };
        if (score < 0.55) return { level: 'moderate', label: 'Moderate', emoji: '🟡' };
        if (score < 0.70) return { level: 'heavy', label: 'Heavy', emoji: '🟠' };
        if (score < 0.85) return { level: 'very_heavy', label: 'Very Heavy', emoji: '🔴' };
        return { level: 'overcrowded', label: 'Overcrowded', emoji: '🔥' };
    }

    getDayRecommendation(score, date) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        if (score < 0.35) {
            return { rating: 'excellent', text: 'Great day to visit! Expected light crowds.' };
        } else if (score < 0.50) {
            return { rating: 'good', text: 'Good day to visit with moderate crowds.' };
        } else if (score < 0.65) {
            return { rating: 'moderate', text: isWeekend ? 'Typical weekend crowds expected.' : 'Busier than usual. Visit early.' };
        } else if (score < 0.80) {
            return { rating: 'busy', text: 'Heavy crowds expected. Plan for wait times.' };
        } else {
            return { rating: 'avoid', text: 'Very crowded. Consider alternative dates.' };
        }
    }

    getWeekendStatus(predictions) {
        const weekendDays = predictions.filter(p => p.isWeekend);
        const avgWeekendScore = weekendDays.reduce((sum, p) => sum + p.scores.average, 0) / weekendDays.length;
        
        if (avgWeekendScore > 0.7) {
            return { status: 'very_busy', text: 'Weekend expected to be very busy' };
        } else if (avgWeekendScore > 0.5) {
            return { status: 'busy', text: 'Moderate weekend crowds expected' };
        } else {
            return { status: 'manageable', text: 'Weekend crowds should be manageable' };
        }
    }

    getWeekNumber(date) {
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const dayOfMonth = date.getDate();
        return Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
    }

    groupByWeek(predictions) {
        const weeks = {};
        
        predictions.forEach(p => {
            if (!weeks[p.weekNumber]) {
                weeks[p.weekNumber] = [];
            }
            weeks[p.weekNumber].push(p);
        });

        return Object.entries(weeks).map(([week, days]) => ({
            weekNumber: parseInt(week),
            days,
            avgScore: Math.round((days.reduce((sum, d) => sum + d.score, 0) / days.length) * 100) / 100
        }));
    }

    analyzePatterns(predictions) {
        // Analyze weekly patterns
        const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        
        predictions.forEach(p => {
            const date = new Date(p.date);
            dayScores[date.getDay()].push(p.score);
        });

        const dayAverages = Object.entries(dayScores).map(([day, scores]) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
            avgScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0
        }));

        const sortedDays = [...dayAverages].sort((a, b) => a.avgScore - b.avgScore);

        return {
            quietestDay: sortedDays[0]?.day,
            busiestDay: sortedDays[sortedDays.length - 1]?.day,
            weekdayVsWeekend: {
                weekdayAvg: Math.round((dayAverages.filter((_, i) => i > 0 && i < 6).reduce((sum, d) => sum + d.avgScore, 0) / 5) * 100) / 100,
                weekendAvg: Math.round(((dayAverages[0].avgScore + dayAverages[6].avgScore) / 2) * 100) / 100
            },
            dayBreakdown: dayAverages
        };
    }

    // ========== ACCURACY TRACKING ==========

    // Record actual vs predicted for learning
    recordActual(predictionId, actualScore) {
        // Store for pattern adjustment (would normally go to database)
        this.accuracyMetrics.totalPredictions++;
        
        // Consider "accurate" if within 15% of prediction
        const prediction = this.predictionCache.get(predictionId);
        if (prediction) {
            const error = Math.abs(prediction.data.score - actualScore);
            if (error < 0.15) {
                this.accuracyMetrics.accuratePredictions++;
            }
            
            // Update rolling average error
            this.accuracyMetrics.averageError = 
                ((this.accuracyMetrics.averageError * (this.accuracyMetrics.totalPredictions - 1)) + error) / 
                this.accuracyMetrics.totalPredictions;
        }
        
        this.accuracyMetrics.lastUpdated = new Date().toISOString();
    }

    // Get accuracy stats
    getAccuracyStats() {
        const accuracy = this.accuracyMetrics.totalPredictions > 0 
            ? (this.accuracyMetrics.accuratePredictions / this.accuracyMetrics.totalPredictions) * 100 
            : 0;

        return {
            totalPredictions: this.accuracyMetrics.totalPredictions,
            accuracyRate: Math.round(accuracy * 10) / 10,
            averageError: Math.round(this.accuracyMetrics.averageError * 100) / 100,
            lastUpdated: this.accuracyMetrics.lastUpdated,
            status: accuracy > 70 ? 'good' : accuracy > 50 ? 'moderate' : 'needs_improvement'
        };
    }
}

module.exports = PredictionEngine;
