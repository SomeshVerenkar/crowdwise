// ============================================================
// Frontend Self-Sufficient Crowd Algorithm
// ============================================================
// Client-side prediction when backend is unavailable
// Uses pattern-based estimation for immediate results
// 
// Week 1-2 Accuracy Improvements:
// - Festival impact integration (via FestivalService)
// - Weather-based category multipliers (via WeatherService)
// ============================================================

class ClientCrowdAlgorithm {
    constructor() {
        // Operating hours by category
        this.operatingHours = {
            default:     { open: 6,  close: 18 },
            religious:   { open: 4,  close: 22 },
            temple:      { open: 4,  close: 21 },
            mosque:      { open: 5,  close: 21 },
            church:      { open: 6,  close: 20 },
            monument:    { open: 8,  close: 18 },
            fort:        { open: 9,  close: 17 },
            palace:      { open: 9,  close: 17 },
            museum:      { open: 10, close: 17 },
            heritage:    { open: 8,  close: 18 }, // ASI & ticketed heritage sites
            beach:       { open: 0,  close: 24, allDay: true },
            nature:      { open: 6,  close: 18 }, // forests, valleys, rivers
            waterfall:   { open: 7,  close: 17 }, // most controlled falls close 5 PM
            hillstation: { open: 0,  close: 24, allDay: true },
            'hill-station': { open: 0, close: 24, allDay: true },
            wildlife:    { open: 7,  close: 17 }, // most Indian parks open 7 AM, close 5 PM
            nationalpark:{ open: 7,  close: 17 }, // same as wildlife
            garden:      { open: 5,  close: 20 },
            market:      { open: 10, close: 22 },
            nightlife:   { open: 20, close: 4, overnight: true },
            resort:      { open: 0,  close: 24, allDay: true },
            lake:        { open: 0,  close: 24, allDay: true },
            dam:         { open: 0,  close: 24, allDay: true },
            viewpoint:   { open: 0,  close: 24, allDay: true },
            urban:       { open: 0,  close: 24, allDay: true },
            cultural:    { open: 8,  close: 18 }, // cultural centres / villages
            adventure:   { open: 7,  close: 17 }, // treks/passes close early
            entertainment:{ open: 9, close: 22 }
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
            },
            // Urban/city destinations — morning & afternoon are best, 5-7 PM is peak rush hour
            urban: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.12,
                6: 0.25, 7: 0.40, 8: 0.70, 9: 0.85, 10: 0.80, 11: 0.75,
                12: 0.80, 13: 0.70, 14: 0.55, 15: 0.65, 16: 0.85, 17: 1.00,
                18: 0.90, 19: 0.65, 20: 0.60, 21: 0.20, 22: 0.10, 23: 0.06
            },
            // Hill stations — mornings are best, peak mid-morning to noon
            'hill-station': {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.15,
                6: 0.30, 7: 0.50, 8: 0.75, 9: 0.90, 10: 1.00, 11: 0.95,
                12: 0.85, 13: 0.80, 14: 0.75, 15: 0.70, 16: 0.65, 17: 0.60,
                18: 0.50, 19: 0.35, 20: 0.20, 21: 0.12, 22: 0.07, 23: 0.05
            },
            hillstation: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.15,
                6: 0.30, 7: 0.50, 8: 0.75, 9: 0.90, 10: 1.00, 11: 0.95,
                12: 0.85, 13: 0.80, 14: 0.75, 15: 0.70, 16: 0.65, 17: 0.60,
                18: 0.50, 19: 0.35, 20: 0.20, 21: 0.12, 22: 0.07, 23: 0.05
            },
            // Cultural sites — quieter mornings, busy late morning
            cultural: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.10,
                6: 0.20, 7: 0.35, 8: 0.55, 9: 0.75, 10: 0.90, 11: 1.00,
                12: 0.90, 13: 0.80, 14: 0.65, 15: 0.60, 16: 0.65, 17: 0.70,
                18: 0.55, 19: 0.35, 20: 0.20, 21: 0.10, 22: 0.05, 23: 0.05
            },
            // Adventure — early morning best (rafting, trekking, safaris)
            adventure: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.05, 4: 0.15, 5: 0.35,
                6: 0.70, 7: 0.90, 8: 1.00, 9: 0.95, 10: 0.85, 11: 0.75,
                12: 0.60, 13: 0.55, 14: 0.65, 15: 0.75, 16: 0.70, 17: 0.50,
                18: 0.30, 19: 0.15, 20: 0.08, 21: 0.05, 22: 0.02, 23: 0.02
            },
            // Monuments — morning visits best, busy mid-morning
            monument: {
                0: 0.02, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.10,
                6: 0.20, 7: 0.35, 8: 0.60, 9: 0.85, 10: 1.00, 11: 0.95,
                12: 0.85, 13: 0.75, 14: 0.65, 15: 0.70, 16: 0.75, 17: 0.70,
                18: 0.50, 19: 0.30, 20: 0.15, 21: 0.05, 22: 0.02, 23: 0.02
            },
            // Entertainment — busy afternoons and evenings
            entertainment: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.05,
                6: 0.05, 7: 0.10, 8: 0.20, 9: 0.50, 10: 0.75, 11: 0.90,
                12: 0.95, 13: 1.00, 14: 0.95, 15: 0.90, 16: 0.85, 17: 0.80,
                18: 0.70, 19: 0.55, 20: 0.35, 21: 0.20, 22: 0.10, 23: 0.05
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
            { date: '2026-03-04', name: 'Holi', impact: 1.6 },
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
            hour = new Date().getHours(),
            destinationId = null,
            weatherCondition = null
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

        // 4. Holiday check (national holidays)
        const holidayInfo = this.checkHoliday(date);
        const holidayMultiplier = holidayInfo.impact;

        // 5. Weekend check
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // 6. Festival impact (Week 1-2 enhancement)
        let festivalMultiplier = 1.0;
        let festivalInfo = { hasActiveFestival: false, festivals: [] };
        if (this._isFestivalsEnabled() && destinationId && typeof FestivalService !== 'undefined') {
            festivalInfo = FestivalService.getFestivalImpactDetails(destinationId, date);
            festivalMultiplier = festivalInfo.impact;
        }

        // 7. Weather impact (Week 1-2 enhancement)
        let weatherMultiplier = 1.0;
        if (this._isWeatherRefinementEnabled() && weatherCondition && typeof WeatherService !== 'undefined') {
            weatherMultiplier = WeatherService.getWeatherMultiplier(category, weatherCondition);
        }

        // Calculate final score with all multipliers
        const baseScore = baseCrowdLevel / 100;
        
        // Apply multipliers with stacking rules (cap at 3.0x, floor at 0.2x)
        let combinedMultiplier = timeScore * (dayScore / 1.0) * (seasonScore / 1.0) * holidayMultiplier * festivalMultiplier * weatherMultiplier;
        combinedMultiplier = Math.min(3.0, Math.max(0.2, combinedMultiplier));
        
        const multipliedScore = baseScore * combinedMultiplier;
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
                isWeekend,
                // Week 1-2 new factors
                festival: festivalInfo.hasActiveFestival ? {
                    name: festivalInfo.festivals[0]?.name || 'Festival',
                    impact: Math.round(festivalMultiplier * 100) / 100
                } : null,
                weather: weatherCondition ? {
                    condition: weatherCondition,
                    impact: Math.round(weatherMultiplier * 100) / 100
                } : null
            },
            confidence: 'pattern-based',
            dataSource: 'client-algorithm',
            timestamp: new Date().toISOString(),
            // New metadata for debugging/transparency
            _enhancedPrediction: this._isFestivalsEnabled() || this._isWeatherRefinementEnabled()
        };
    }
    
    // Check if festivals feature is enabled
    _isFestivalsEnabled() {
        return typeof API_CONFIG !== 'undefined' && 
               API_CONFIG.FEATURE_FLAGS && 
               API_CONFIG.FEATURE_FLAGS.FESTIVALS_ENABLED === true;
    }
    
    // Check if weather refinement feature is enabled
    _isWeatherRefinementEnabled() {
        return typeof API_CONFIG !== 'undefined' && 
               API_CONFIG.FEATURE_FLAGS && 
               API_CONFIG.FEATURE_FLAGS.WEATHER_REFINEMENT === true;
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
                    ? `Closed now \u2022 Opens at ${this.formatHour(hours.open)}`
                    : `Closed now \u2022 Opens tomorrow at ${this.formatHour(hours.open)}`
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

    // 30-day daily forecast
    predict30Days(params) {
        const {
            baseCrowdLevel = 50,
            category = 'default',
            destinationId = null,
            weatherCondition = null
        } = params;

        const predictions = [];
        const now = new Date();

        for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + dayOffset);

            // Score at three representative times
            const morningScore = this.calculateCrowdScore({ baseCrowdLevel, category, date: targetDate, hour: 9, destinationId, weatherCondition });
            const afternoonScore = this.calculateCrowdScore({ baseCrowdLevel, category, date: targetDate, hour: 14, destinationId, weatherCondition });
            const eveningScore = this.calculateCrowdScore({ baseCrowdLevel, category, date: targetDate, hour: 18, destinationId, weatherCondition });

            // Only use scores from open hours (skip CLOSED)
            const validScores = [morningScore, afternoonScore, eveningScore].filter(s => s.status !== 'closed');
            const avgScore = validScores.length > 0
                ? validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length
                : 0;
            const peakScore = validScores.length > 0
                ? Math.max(...validScores.map(s => s.score))
                : 0;

            // Find peak and best hours for the day
            const hourlyScores = [];
            for (let h = 6; h <= 20; h++) {
                const hs = this.calculateCrowdScore({ baseCrowdLevel, category, date: targetDate, hour: h, destinationId, weatherCondition });
                if (hs.status !== 'closed') {
                    hourlyScores.push({ hour: h, score: hs.score });
                }
            }
            const peakHour = hourlyScores.length > 0
                ? hourlyScores.reduce((max, h) => h.score > max.score ? h : max, hourlyScores[0])
                : { hour: 12, score: 0 };
            const bestHour = hourlyScores.length > 0
                ? hourlyScores.reduce((min, h) => h.score < min.score ? h : min, hourlyScores[0])
                : { hour: 6, score: 0 };

            // Holiday info
            const holidayInfo = this.checkHoliday(targetDate);

            // Crowd level from average score
            const crowdInfo = this.scoreToCrowdLevel(avgScore);

            predictions.push({
                date: targetDate.toISOString().split('T')[0],
                dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDate.getDay()],
                dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][targetDate.getDay()],
                dayOfMonth: targetDate.getDate(),
                month: targetDate.toLocaleString('en-US', { month: 'short' }),
                isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
                scores: {
                    morning: Math.round((morningScore.status === 'closed' ? 0 : morningScore.score) * 100) / 100,
                    afternoon: Math.round((afternoonScore.status === 'closed' ? 0 : afternoonScore.score) * 100) / 100,
                    evening: Math.round((eveningScore.status === 'closed' ? 0 : eveningScore.score) * 100) / 100,
                    average: Math.round(avgScore * 100) / 100,
                    peak: Math.round(peakScore * 100) / 100
                },
                crowdLevel: crowdInfo,
                percentageFull: Math.round(avgScore * 100),
                peakHour: this.formatHour(peakHour.hour),
                bestHour: this.formatHour(bestHour.hour),
                holiday: holidayInfo,
                recommendation: this._getDayRecommendation(avgScore, targetDate)
            });
        }

        // Group by weeks
        const weeks = [];
        for (let i = 0; i < predictions.length; i += 7) {
            const weekDays = predictions.slice(i, i + 7);
            const weekAvg = weekDays.reduce((sum, d) => sum + d.scores.average, 0) / weekDays.length;
            const weekCrowdInfo = this.scoreToCrowdLevel(weekAvg);
            weeks.push({
                weekNumber: Math.floor(i / 7) + 1,
                startDate: weekDays[0].date,
                endDate: weekDays[weekDays.length - 1].date,
                days: weekDays,
                averageScore: Math.round(weekAvg * 100) / 100,
                crowdLevel: weekCrowdInfo
            });
        }

        // Find best and worst days
        const sortedByAvg = [...predictions].sort((a, b) => a.scores.average - b.scores.average);
        const holidaysInPeriod = predictions.filter(p => p.holiday && p.holiday.isHoliday);

        return {
            forecastType: '30-day',
            predictions,
            weeks,
            highlights: {
                bestDay: sortedByAvg[0],
                worstDay: sortedByAvg[sortedByAvg.length - 1],
                holidaysInPeriod,
                lowCrowdDays: predictions.filter(p => p.scores.average < 0.35).length,
                highCrowdDays: predictions.filter(p => p.scores.average > 0.70).length,
                weekendDays: predictions.filter(p => p.isWeekend).length
            },
            dataSource: 'client-algorithm',
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate a 365-day crowd prediction for calendar view.
     * Returns a map: { 'YYYY-MM-DD': { score, level, emoji, percentFull, ... } }
     */
    predictYear(params) {
        const {
            baseCrowdLevel = 50,
            category = 'default',
            destinationId = null
        } = params;

        const dayMap = {};
        const now = new Date();

        for (let dayOffset = 0; dayOffset <= 365; dayOffset++) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + dayOffset);
            const dateKey = targetDate.toISOString().split('T')[0];

            // Representative scores at morning, afternoon, evening
            const scores = [9, 14, 18].map(h => {
                const s = this.calculateCrowdScore({ baseCrowdLevel, category, date: targetDate, hour: h, destinationId });
                return s.status === 'closed' ? null : s.score;
            }).filter(s => s !== null);

            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const crowdInfo = this.scoreToCrowdLevel(avg);
            const holidayInfo = this.checkHoliday(targetDate);

            dayMap[dateKey] = {
                score: Math.round(avg * 100) / 100,
                percentFull: Math.round(avg * 100),
                level: crowdInfo.level,
                label: crowdInfo.label,
                emoji: crowdInfo.emoji,
                color: crowdInfo.color,
                isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
                holiday: holidayInfo.isHoliday ? holidayInfo.name : null,
                dayOfWeek: targetDate.getDay()
            };
        }

        return dayMap;
    }

    // Day recommendation helper
    _getDayRecommendation(score, date) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (score < 0.35) {
            return { rating: 'excellent', text: 'Great day to visit! Low crowds expected.' };
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

    // Get best time to visit today
    getBestTimeToday(baseCrowdLevel, category, destinationId = null, weatherCondition = null) {
        const predictions = [];
        const now = new Date();

        for (let hour = 6; hour <= 21; hour++) {
            const testDate = new Date(now);
            testDate.setHours(hour, 0, 0, 0);
            
            const pred = this.calculateCrowdScore({
                baseCrowdLevel,
                category,
                date: testDate,
                hour,
                destinationId,
                weatherCondition
            });

            predictions.push({
                hour,
                time: `${hour}:00`,
                timeFormatted: this.formatHour(hour),
                score: pred.score,
                level: pred.level,
                status: pred.status || 'open',
                isPast: hour < now.getHours()
            });
        }

        // Find best future time — exclude closed hours and past hours
        const futurePredictions = predictions.filter(p => !p.isPast && p.status !== 'closed');

        // If all remaining hours are closed (or all past), check if any open slot exists today
        if (futurePredictions.length === 0) {
            const anyOpen = predictions.filter(p => p.status !== 'closed');
            if (anyOpen.length === 0) {
                return {
                    predictions,
                    bestTime: 'Closed today',
                    bestTimeScore: 0,
                    currentHour: now.getHours()
                };
            }
            // All open slots are in the past — find historically best slot for planning
            const best = anyOpen.reduce((min, p) => p.score < min.score ? p : min, anyOpen[0]);
            return {
                predictions,
                bestTime: best.timeFormatted,
                bestTimeScore: best.score,
                currentHour: now.getHours()
            };
        }

        const best = futurePredictions.reduce((min, p) => p.score < min.score ? p : min, futurePredictions[0]);

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
