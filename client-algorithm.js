// ============================================================
// Frontend Self-Sufficient Crowd Algorithm
// ============================================================
// Client-side prediction when backend is unavailable
// Uses pattern-based estimation for immediate results
// ============================================================

class ClientCrowdAlgorithm {
    constructor() {
        // Operating hours by category
        this.operatingHours = {
            default: { open: 6, close: 18 },
            religious: { open: 4, close: 22 },
            temple: { open: 4, close: 21 },
            mosque: { open: 5, close: 21 },
            church: { open: 6, close: 20 },
            monument: { open: 6, close: 18 },
            fort: { open: 9, close: 18 },
            palace: { open: 9, close: 17 },
            museum: { open: 10, close: 17 },
            beach: { open: 0, close: 24, allDay: true },
            nature: { open: 6, close: 18 },
            waterfall: { open: 6, close: 17 },
            hillstation: { open: 0, close: 24, allDay: true },
            wildlife: { open: 6, close: 18 },
            nationalpark: { open: 6, close: 18 },
            garden: { open: 5, close: 20 },
            market: { open: 10, close: 22 },
            nightlife: { open: 20, close: 4, overnight: true },
            resort: { open: 0, close: 24, allDay: true },
            lake: { open: 6, close: 19 },
            dam: { open: 8, close: 18 },
            viewpoint: { open: 5, close: 20 }
        };
        
        // Time of day patterns (hourly multipliers)
        this.hourlyPatterns = {
            default: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.15,
                6: 0.30, 7: 0.45, 8: 0.60, 9: 0.75, 10: 0.90, 11: 1.00,
                12: 0.95, 13: 0.85, 14: 0.80, 15: 0.85, 16: 0.90, 17: 0.95,
                18: 0.85, 19: 0.70, 20: 0.50, 21: 0.30, 22: 0.15, 23: 0.08
            },
            religious: {
                0: 0.10, 1: 0.05, 2: 0.05, 3: 0.10, 4: 0.30, 5: 0.60,
                6: 0.90, 7: 1.00, 8: 0.95, 9: 0.85, 10: 0.75, 11: 0.70,
                12: 0.60, 13: 0.50, 14: 0.45, 15: 0.50, 16: 0.60, 17: 0.75,
                18: 0.85, 19: 0.70, 20: 0.50, 21: 0.30, 22: 0.15, 23: 0.10
            },
            beach: {
                0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.05, 5: 0.20,
                6: 0.50, 7: 0.70, 8: 0.60, 9: 0.40, 10: 0.25, 11: 0.15,
                12: 0.10, 13: 0.10, 14: 0.15, 15: 0.25, 16: 0.50, 17: 0.80,
                18: 1.00, 19: 0.90, 20: 0.60, 21: 0.40, 22: 0.20, 23: 0.05
            },
            nature: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.10,
                6: 0.25, 7: 0.40, 8: 0.55, 9: 0.70, 10: 0.85, 11: 0.95,
                12: 1.00, 13: 0.95, 14: 0.90, 15: 0.85, 16: 0.80, 17: 0.70,
                18: 0.55, 19: 0.40, 20: 0.25, 21: 0.15, 22: 0.08, 23: 0.05
            },
            wildlife: {
                0: 0.02, 1: 0.02, 2: 0.05, 3: 0.10, 4: 0.30, 5: 0.70,
                6: 1.00, 7: 0.95, 8: 0.80, 9: 0.60, 10: 0.30, 11: 0.15,
                12: 0.05, 13: 0.05, 14: 0.10, 15: 0.30, 16: 0.60, 17: 0.80,
                18: 0.70, 19: 0.40, 20: 0.15, 21: 0.05, 22: 0.02, 23: 0.02
            }
        };

        // Day of week multipliers
        this.dayOfWeekPatterns = {
            0: 1.30,  // Sunday
            1: 0.70,  // Monday
            2: 0.65,  // Tuesday
            3: 0.68,  // Wednesday
            4: 0.75,  // Thursday
            5: 0.95,  // Friday
            6: 1.25   // Saturday
        };

        // Monthly seasonal patterns
        this.seasonalPatterns = {
            default: { 0: 1.30, 1: 1.25, 2: 1.10, 3: 0.85, 4: 0.70, 5: 0.55, 6: 0.50, 7: 0.55, 8: 0.65, 9: 0.90, 10: 1.15, 11: 1.35 },
            beach: { 0: 1.40, 1: 1.30, 2: 1.00, 3: 0.60, 4: 0.40, 5: 0.25, 6: 0.30, 7: 0.40, 8: 0.60, 9: 0.90, 10: 1.20, 11: 1.45 },
            nature: { 0: 0.80, 1: 0.75, 2: 0.90, 3: 1.10, 4: 1.40, 5: 1.35, 6: 0.80, 7: 0.70, 8: 0.75, 9: 1.00, 10: 0.90, 11: 1.20 }
        };

        // India holidays 2026
        this.holidays2026 = [
            { date: '2026-01-26', name: 'Republic Day', impact: 1.5 },
            { date: '2026-03-10', name: 'Holi', impact: 1.6 },
            { date: '2026-08-15', name: 'Independence Day', impact: 1.6 },
            { date: '2026-10-02', name: 'Gandhi Jayanti', impact: 1.4 },
            { date: '2026-10-20', name: 'Dussehra', impact: 1.7 },
            { date: '2026-11-10', name: 'Diwali', impact: 2.0 },
            { date: '2026-12-25', name: 'Christmas', impact: 1.6 },
            { date: '2026-12-31', name: 'New Year Eve', impact: 1.8 }
        ];
    }

    // Calculate crowd score
    calculateCrowdScore(params) {
        const {
            baseCrowdLevel = 50,
            category = 'default',
            date = new Date(),
            hour = new Date().getHours()
        } = params;

        // Check if place is open
        const openStatus = this.checkIfOpen(hour, category);
        if (!openStatus.isOpen) {
            return {
                score: 0,
                crowdLevel: 0,
                crowdLabel: 'CLOSED',
                crowdEmoji: '🔒',
                percentageFull: 0,
                estimatedCount: 0,
                status: 'closed',
                message: openStatus.message
            };
        }

        // 1. Time of day score
        const hourPattern = this.hourlyPatterns[category] || this.hourlyPatterns.default;
        const timeScore = hourPattern[hour] || 0.5;

        // 2. Day of week score
        const dayScore = this.dayOfWeekPatterns[date.getDay()] || 1.0;

        // 3. Seasonal score
        const seasonPattern = this.seasonalPatterns[category] || this.seasonalPatterns.default;
        const seasonScore = seasonPattern[date.getMonth()] || 1.0;

        // 4. Holiday check
        const holidayInfo = this.checkHoliday(date);
        const holidayMultiplier = holidayInfo.impact;

        // 5. Weekend check
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // Calculate final score
        const baseScore = baseCrowdLevel / 100;
        const multipliedScore = baseScore * timeScore * (dayScore / 1.0) * (seasonScore / 1.0) * holidayMultiplier;
        const finalScore = Math.min(1, Math.max(0, multipliedScore));

        // Convert to crowd level
        const crowdInfo = this.scoreToCrowdLevel(finalScore);

        return {
            score: Math.round(finalScore * 100) / 100,
            percentageFull: Math.round(finalScore * 100),
            ...crowdInfo,
            factors: {
                timeOfDay: Math.round(timeScore * 100) / 100,
                dayOfWeek: Math.round(dayScore * 100) / 100,
                seasonal: Math.round(seasonScore * 100) / 100,
                holiday: holidayInfo.name || 'None',
                isWeekend
            },
            confidence: 'pattern-based',
            dataSource: 'client-algorithm',
            timestamp: new Date().toISOString()
        };
    }

    checkHoliday(date) {
        const dateStr = date.toISOString().split('T')[0];
        const holiday = this.holidays2026.find(h => h.date === dateStr);
        
        if (holiday) {
            return { isHoliday: true, name: holiday.name, impact: holiday.impact };
        }

        // Check near holiday (1 day before/after)
        const dayBefore = new Date(date);
        dayBefore.setDate(dayBefore.getDate() + 1);
        const dayAfter = new Date(date);
        dayAfter.setDate(dayAfter.getDate() - 1);

        const nearHoliday = this.holidays2026.find(h =>
            h.date === dayBefore.toISOString().split('T')[0] ||
            h.date === dayAfter.toISOString().split('T')[0]
        );

        if (nearHoliday) {
            return { isHoliday: true, name: `Near ${nearHoliday.name}`, impact: nearHoliday.impact * 0.7 };
        }

        return { isHoliday: false, name: null, impact: 1.0 };
    }
    
    // Check if place is open at given hour
    checkIfOpen(hour, category) {
        const hours = this.operatingHours[category] || this.operatingHours.default;
        
        // Handle all-day places
        if (hours.allDay) {
            return {
                isOpen: true,
                message: 'Open 24 hours'
            };
        }
        
        // Handle overnight places
        if (hours.overnight) {
            const isOpen = hour >= hours.open || hour < hours.close;
            return {
                isOpen,
                message: isOpen ? `Open until ${this.formatHour(hours.close)} AM` : `Opens at ${this.formatHour(hours.open)} PM`
            };
        }
        
        // Normal hours
        const isOpen = hour >= hours.open && hour < hours.close;
        return {
            isOpen,
            message: isOpen 
                ? `Open until ${this.formatHour(hours.close)}` 
                : hour < hours.open
                    ? `Opens at ${this.formatHour(hours.open)}`
                    : `Closed (opens tomorrow at ${this.formatHour(hours.open)})`
        };
    }
    
    formatHour(hour) {
        if (hour === 0) return '12:00 AM';
        if (hour === 12) return '12:00 PM';
        if (hour < 12) return `${hour}:00 AM`;
        return `${hour - 12}:00 PM`;
    }

    scoreToCrowdLevel(score) {
        if (score < 0.25) return { level: 'low', label: 'Low', emoji: '🟢', color: '#4ade80' };
        if (score < 0.50) return { level: 'moderate', label: 'Moderate', emoji: '🟡', color: '#fbbf24' };
        if (score < 0.75) return { level: 'heavy', label: 'Busy', emoji: '🟠', color: '#fb923c' };
        return { level: 'overcrowded', label: 'Packed', emoji: '🔴', color: '#ef4444' };
    }

    // Get best time to visit today
    getBestTimeToday(baseCrowdLevel, category) {
        const predictions = [];
        const now = new Date();

        for (let hour = 6; hour <= 21; hour++) {
            const testDate = new Date(now);
            testDate.setHours(hour, 0, 0, 0);
            
            const pred = this.calculateCrowdScore({
                baseCrowdLevel,
                category,
                date: testDate,
                hour
            });

            predictions.push({
                hour,
                time: `${hour}:00`,
                timeFormatted: this.formatHour(hour),
                score: pred.score,
                level: pred.level,
                isPast: hour < now.getHours()
            });
        }

        // Find best future time
        const futurePredictions = predictions.filter(p => !p.isPast);
        const best = futurePredictions.reduce((min, p) => p.score < min.score ? p : min, futurePredictions[0] || predictions[0]);

        return {
            predictions,
            bestTime: best?.timeFormatted || 'Early Morning',
            bestTimeScore: best?.score,
            currentHour: now.getHours()
        };
    }

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    }
}

// Create global instance
window.clientCrowdAlgorithm = new ClientCrowdAlgorithm();
