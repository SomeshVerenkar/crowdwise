// ============================================================
// CrowdWise Crowd Scoring Algorithm
// ============================================================
// Multi-signal crowd prediction using weighted formula
// No external paid APIs - uses pattern analysis + scraped signals
// ============================================================

class CrowdScoringAlgorithm {
    constructor() {
        // Signal weights (must sum to 1.0)
        this.weights = {
            timeOfDay: 0.20,      // Current time impact
            dayOfWeek: 0.15,      // Weekend vs weekday
            seasonal: 0.20,       // Month/season impact
            holiday: 0.15,        // Public holidays & festivals
            socialSignal: 0.10,   // Wikipedia + social media
            hotelDemand: 0.15,    // Hotel availability signals
            weather: 0.05         // Weather impact
        };

        // Time of day patterns (hourly multipliers)
        this.hourlyPatterns = {
            // Default pattern for most attractions
            default: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.15,
                6: 0.30, 7: 0.45, 8: 0.60, 9: 0.75, 10: 0.90, 11: 1.00,
                12: 0.95, 13: 0.85, 14: 0.80, 15: 0.85, 16: 0.90, 17: 0.95,
                18: 0.85, 19: 0.70, 20: 0.50, 21: 0.30, 22: 0.15, 23: 0.08
            },
            // Religious places (early morning peak)
            religious: {
                0: 0.10, 1: 0.05, 2: 0.05, 3: 0.10, 4: 0.30, 5: 0.60,
                6: 0.90, 7: 1.00, 8: 0.95, 9: 0.85, 10: 0.75, 11: 0.70,
                12: 0.60, 13: 0.50, 14: 0.45, 15: 0.50, 16: 0.60, 17: 0.75,
                18: 0.85, 19: 0.70, 20: 0.50, 21: 0.30, 22: 0.15, 23: 0.10
            },
            // Beaches (morning & evening peaks)
            beach: {
                0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.05, 5: 0.20,
                6: 0.50, 7: 0.70, 8: 0.60, 9: 0.40, 10: 0.25, 11: 0.15,
                12: 0.10, 13: 0.10, 14: 0.15, 15: 0.25, 16: 0.50, 17: 0.80,
                18: 1.00, 19: 0.90, 20: 0.60, 21: 0.40, 22: 0.20, 23: 0.05
            },
            // Hill stations (midday peak)
            hillstation: {
                0: 0.05, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.05, 5: 0.10,
                6: 0.25, 7: 0.40, 8: 0.55, 9: 0.70, 10: 0.85, 11: 0.95,
                12: 1.00, 13: 0.95, 14: 0.90, 15: 0.85, 16: 0.80, 17: 0.70,
                18: 0.55, 19: 0.40, 20: 0.25, 21: 0.15, 22: 0.08, 23: 0.05
            },
            // Wildlife (early morning only)
            wildlife: {
                0: 0.02, 1: 0.02, 2: 0.05, 3: 0.10, 4: 0.30, 5: 0.70,
                6: 1.00, 7: 0.95, 8: 0.80, 9: 0.60, 10: 0.30, 11: 0.15,
                12: 0.05, 13: 0.05, 14: 0.10, 15: 0.30, 16: 0.60, 17: 0.80,
                18: 0.70, 19: 0.40, 20: 0.15, 21: 0.05, 22: 0.02, 23: 0.02
            },
            // Nightlife destinations
            nightlife: {
                0: 0.50, 1: 0.30, 2: 0.15, 3: 0.05, 4: 0.02, 5: 0.02,
                6: 0.05, 7: 0.10, 8: 0.15, 9: 0.20, 10: 0.25, 11: 0.30,
                12: 0.35, 13: 0.40, 14: 0.45, 15: 0.50, 16: 0.55, 17: 0.65,
                18: 0.75, 19: 0.85, 20: 0.95, 21: 1.00, 22: 0.95, 23: 0.80
            }
        };

        // Day of week multipliers
        this.dayOfWeekPatterns = {
            0: 1.30,  // Sunday (peak)
            1: 0.70,  // Monday
            2: 0.65,  // Tuesday
            3: 0.68,  // Wednesday
            4: 0.75,  // Thursday
            5: 0.95,  // Friday (pre-weekend)
            6: 1.25   // Saturday (peak)
        };

        // Monthly seasonal patterns
        this.seasonalPatterns = {
            // General India tourism (October-March peak)
            default: {
                0: 1.30, 1: 1.25, 2: 1.10, 3: 0.85, 4: 0.70, 5: 0.55,
                6: 0.50, 7: 0.55, 8: 0.65, 9: 0.90, 10: 1.15, 11: 1.35
            },
            // Beach destinations (peak in winter)
            beach: {
                0: 1.40, 1: 1.30, 2: 1.00, 3: 0.60, 4: 0.40, 5: 0.25,
                6: 0.30, 7: 0.40, 8: 0.60, 9: 0.90, 10: 1.20, 11: 1.45
            },
            // Hill stations (summer peak)
            hillstation: {
                0: 0.80, 1: 0.75, 2: 0.90, 3: 1.10, 4: 1.40, 5: 1.35,
                6: 0.80, 7: 0.70, 8: 0.75, 9: 1.00, 10: 0.90, 11: 1.20
            },
            // Ladakh (summer only)
            highaltitude: {
                0: 0.15, 1: 0.15, 2: 0.30, 3: 0.50, 4: 0.80, 5: 1.20,
                6: 1.40, 7: 1.35, 8: 1.20, 9: 0.70, 10: 0.30, 11: 0.15
            }
        };

        // India public holidays 2026
        this.holidays2026 = [
            { date: '2026-01-26', name: 'Republic Day', impact: 1.5 },
            { date: '2026-03-10', name: 'Holi', impact: 1.6 },
            { date: '2026-04-02', name: 'Ram Navami', impact: 1.3 },
            { date: '2026-04-10', name: 'Good Friday', impact: 1.2 },
            { date: '2026-04-14', name: 'Ambedkar Jayanti', impact: 1.2 },
            { date: '2026-05-01', name: 'May Day', impact: 1.1 },
            { date: '2026-05-07', name: 'Buddha Purnima', impact: 1.4 },
            { date: '2026-06-17', name: 'Eid ul-Fitr', impact: 1.4 },
            { date: '2026-07-06', name: 'Rath Yatra', impact: 1.5 },
            { date: '2026-08-15', name: 'Independence Day', impact: 1.6 },
            { date: '2026-08-24', name: 'Eid ul-Adha', impact: 1.3 },
            { date: '2026-08-25', name: 'Janmashtami', impact: 1.5 },
            { date: '2026-10-02', name: 'Gandhi Jayanti', impact: 1.4 },
            { date: '2026-10-20', name: 'Dussehra', impact: 1.7 },
            { date: '2026-11-10', name: 'Diwali', impact: 2.0 },
            { date: '2026-11-12', name: 'Govardhan Puja', impact: 1.4 },
            { date: '2026-11-16', name: 'Guru Nanak Jayanti', impact: 1.3 },
            { date: '2026-12-25', name: 'Christmas', impact: 1.6 },
            { date: '2026-12-31', name: 'New Year Eve', impact: 1.8 }
        ];

        // School vacation periods (major crowd drivers)
        this.schoolVacations = [
            { start: '2026-04-15', end: '2026-06-10', name: 'Summer Vacation', impact: 1.4 },
            { start: '2026-10-15', end: '2026-10-25', name: 'Dussehra Break', impact: 1.5 },
            { start: '2026-11-05', end: '2026-11-20', name: 'Diwali Break', impact: 1.6 },
            { start: '2026-12-20', end: '2027-01-05', name: 'Winter Break', impact: 1.5 }
        ];

        // Weather impact on crowds
        this.weatherImpact = {
            'sunny': 1.1,
            'clear': 1.1,
            'partly_cloudy': 1.0,
            'cloudy': 0.95,
            'light_rain': 0.75,
            'rain': 0.50,
            'heavy_rain': 0.30,
            'thunderstorm': 0.20,
            'snow': 1.2,  // Actually increases crowds at hill stations
            'fog': 0.80,
            'hot': 0.85,
            'pleasant': 1.15
        };
    }

    // ========== CORE SCORING FUNCTIONS ==========

    // Calculate time-of-day score
    getTimeOfDayScore(hour, category = 'default') {
        const pattern = this.hourlyPatterns[category] || this.hourlyPatterns.default;
        return pattern[hour] || 0.5;
    }

    // Calculate day-of-week score
    getDayOfWeekScore(date = new Date()) {
        const day = date.getDay();
        return this.dayOfWeekPatterns[day] || 1.0;
    }

    // Calculate seasonal score
    getSeasonalScore(date = new Date(), category = 'default') {
        const month = date.getMonth();
        const pattern = this.seasonalPatterns[category] || this.seasonalPatterns.default;
        return pattern[month] || 1.0;
    }

    // Check for holiday impact
    getHolidayImpact(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Check exact date match
        const exactHoliday = this.holidays2026.find(h => h.date === dateStr);
        if (exactHoliday) {
            return { isHoliday: true, name: exactHoliday.name, impact: exactHoliday.impact };
        }

        // Check day before/after holiday (extended impact)
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

        // Check school vacation periods
        for (const vacation of this.schoolVacations) {
            if (dateStr >= vacation.start && dateStr <= vacation.end) {
                return { isHoliday: true, name: vacation.name, impact: vacation.impact };
            }
        }

        return { isHoliday: false, name: null, impact: 1.0 };
    }

    // Check for long weekend
    isLongWeekend(date = new Date()) {
        const day = date.getDay();
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);

        // Check if Friday or Monday is a holiday making it a long weekend
        if (day === 5) { // Friday
            const mondayHoliday = this.getHolidayImpact(nextDay);
            if (mondayHoliday.isHoliday) return true;
        }
        if (day === 1) { // Monday
            const fridayHoliday = this.getHolidayImpact(prevDay);
            if (fridayHoliday.isHoliday) return true;
        }
        
        return false;
    }

    // Get weather impact score
    getWeatherScore(weatherCondition) {
        if (!weatherCondition) return 1.0;
        const condition = weatherCondition.toLowerCase().replace(/\s+/g, '_');
        return this.weatherImpact[condition] || 1.0;
    }

    // ========== MAIN SCORING FUNCTION ==========

    calculateCrowdScore(params) {
        const {
            destination,
            category = 'default',
            date = new Date(),
            hour = new Date().getHours(),
            baseCrowdLevel = 50,  // Base historical crowd level (0-100)
            socialSignal = null,
            hotelSignal = null,
            weatherCondition = null
        } = params;

        // 1. Time of Day Score (0-1)
        const timeScore = this.getTimeOfDayScore(hour, category);

        // 2. Day of Week Score (0.65-1.30)
        const dayScore = this.getDayOfWeekScore(date);
        const normalizedDayScore = (dayScore - 0.65) / 0.65; // Normalize to 0-1

        // 3. Seasonal Score (0.15-1.45)
        const seasonCategory = this.mapCategoryToSeason(category);
        const seasonScore = this.getSeasonalScore(date, seasonCategory);
        const normalizedSeasonScore = (seasonScore - 0.15) / 1.30; // Normalize to 0-1

        // 4. Holiday Impact (1.0-2.0)
        const holidayInfo = this.getHolidayImpact(date);
        const longWeekendBonus = this.isLongWeekend(date) ? 1.2 : 1.0;
        const holidayScore = (holidayInfo.impact * longWeekendBonus - 1.0); // Normalize to 0-1

        // 5. Social Signal Score (0-1)
        const socialScore = socialSignal?.aggregatedScore || 
                           socialSignal?.interestScore || 
                           (baseCrowdLevel / 100) * 0.5; // Fallback to base estimate

        // 6. Hotel Demand Score (0-1)
        const hotelScore = hotelSignal?.demandLevel || 
                          hotelSignal?.crowdSignal?.score ||
                          (baseCrowdLevel / 100) * 0.5; // Fallback to base estimate

        // 7. Weather Score (0.2-1.2)
        const weatherScore = this.getWeatherScore(weatherCondition);
        const normalizedWeatherScore = (weatherScore - 0.2) / 1.0; // Normalize to 0-1

        // ========== WEIGHTED CALCULATION ==========
        const weightedScore = (
            (timeScore * this.weights.timeOfDay) +
            (normalizedDayScore * this.weights.dayOfWeek) +
            (normalizedSeasonScore * this.weights.seasonal) +
            (holidayScore * this.weights.holiday) +
            (socialScore * this.weights.socialSignal) +
            (hotelScore * this.weights.hotelDemand) +
            (normalizedWeatherScore * this.weights.weather)
        );

        // Apply base crowd level influence
        const baseInfluence = baseCrowdLevel / 100;
        const finalScore = (weightedScore * 0.7) + (baseInfluence * 0.3);

        // Clamp to 0-1 range
        const clampedScore = Math.max(0, Math.min(1, finalScore));

        // ========== DETERMINE CROWD LEVEL ==========
        const crowdLevel = this.scoreToCrowdLevel(clampedScore);
        const confidence = this.calculateConfidence(socialSignal, hotelSignal);

        return {
            score: Math.round(clampedScore * 100) / 100,
            crowdLevel: crowdLevel.level,
            crowdLabel: crowdLevel.label,
            crowdEmoji: crowdLevel.emoji,
            percentageFull: Math.round(clampedScore * 100),
            
            // Breakdown for transparency
            breakdown: {
                timeOfDay: { score: Math.round(timeScore * 100) / 100, weight: this.weights.timeOfDay },
                dayOfWeek: { score: Math.round(normalizedDayScore * 100) / 100, weight: this.weights.dayOfWeek, day: this.getDayName(date) },
                seasonal: { score: Math.round(normalizedSeasonScore * 100) / 100, weight: this.weights.seasonal, month: this.getMonthName(date) },
                holiday: { score: Math.round(holidayScore * 100) / 100, weight: this.weights.holiday, info: holidayInfo },
                socialSignal: { score: Math.round(socialScore * 100) / 100, weight: this.weights.socialSignal },
                hotelDemand: { score: Math.round(hotelScore * 100) / 100, weight: this.weights.hotelDemand },
                weather: { score: Math.round(normalizedWeatherScore * 100) / 100, weight: this.weights.weather, condition: weatherCondition }
            },
            
            confidence,
            dataQuality: this.assessDataQuality(socialSignal, hotelSignal),
            timestamp: new Date().toISOString()
        };
    }

    // Convert score to crowd level
    scoreToCrowdLevel(score) {
        if (score < 0.20) return { level: 'very_low', label: 'Very Low', emoji: '🟢' };
        if (score < 0.40) return { level: 'low', label: 'Low', emoji: '🟢' };
        if (score < 0.55) return { level: 'moderate', label: 'Moderate', emoji: '🟡' };
        if (score < 0.70) return { level: 'heavy', label: 'Heavy', emoji: '🟠' };
        if (score < 0.85) return { level: 'very_heavy', label: 'Very Heavy', emoji: '🔴' };
        return { level: 'overcrowded', label: 'Overcrowded', emoji: '🔥' };
    }

    // Map destination category to seasonal pattern
    mapCategoryToSeason(category) {
        const mapping = {
            'beach': 'beach',
            'nature': 'hillstation',
            'hillstation': 'hillstation',
            'highaltitude': 'highaltitude',
            'wildlife': 'default',
            'religious': 'default',
            'heritage': 'default',
            'cultural': 'default'
        };
        return mapping[category] || 'default';
    }

    // Calculate confidence level
    calculateConfidence(socialSignal, hotelSignal) {
        let confidenceScore = 0.4; // Base confidence with patterns only
        
        if (socialSignal?.confidence === 'high') confidenceScore += 0.2;
        else if (socialSignal) confidenceScore += 0.1;
        
        if (hotelSignal?.crowdSignal?.confidence === 'high') confidenceScore += 0.2;
        else if (hotelSignal) confidenceScore += 0.1;

        if (confidenceScore >= 0.7) return 'high';
        if (confidenceScore >= 0.5) return 'medium';
        return 'low';
    }

    // Assess data quality
    assessDataQuality(socialSignal, hotelSignal) {
        const sources = [];
        if (socialSignal) sources.push('social_signals');
        if (hotelSignal) sources.push('hotel_demand');
        sources.push('time_patterns', 'seasonal_data', 'holiday_calendar');

        return {
            sources,
            sourceCount: sources.length,
            quality: sources.length >= 4 ? 'good' : sources.length >= 2 ? 'moderate' : 'basic',
            note: sources.length < 4 ? 'Enable more data sources for improved accuracy' : 'All signals active'
        };
    }

    // Helper functions
    getDayName(date) {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    }

    getMonthName(date) {
        return ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()];
    }

    // ========== PREDICTION FUNCTIONS ==========

    // Predict crowd for next N hours
    predictNextHours(params, hours = 12) {
        const predictions = [];
        const baseDate = new Date();

        for (let i = 0; i < hours; i++) {
            const futureDate = new Date(baseDate);
            futureDate.setHours(futureDate.getHours() + i);
            
            const prediction = this.calculateCrowdScore({
                ...params,
                date: futureDate,
                hour: futureDate.getHours()
            });

            predictions.push({
                time: futureDate.toISOString(),
                hour: futureDate.getHours(),
                ...prediction
            });
        }

        // Find best time to visit
        const sortedByScore = [...predictions].sort((a, b) => a.score - b.score);
        
        return {
            predictions,
            recommendation: {
                bestTime: sortedByScore[0]?.time,
                bestTimeScore: sortedByScore[0]?.score,
                worstTime: sortedByScore[sortedByScore.length - 1]?.time,
                worstTimeScore: sortedByScore[sortedByScore.length - 1]?.score
            }
        };
    }

    // Predict crowd for next N days
    predictNextDays(params, days = 7) {
        const predictions = [];
        const baseDate = new Date();
        baseDate.setHours(12, 0, 0, 0); // Use noon as reference

        for (let i = 0; i < days; i++) {
            const futureDate = new Date(baseDate);
            futureDate.setDate(futureDate.getDate() + i);
            
            const prediction = this.calculateCrowdScore({
                ...params,
                date: futureDate,
                hour: 12 // Peak hours estimate
            });

            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                dayName: this.getDayName(futureDate),
                ...prediction
            });
        }

        // Find best day to visit
        const sortedByScore = [...predictions].sort((a, b) => a.score - b.score);
        
        return {
            predictions,
            recommendation: {
                bestDay: sortedByScore[0]?.date,
                bestDayScore: sortedByScore[0]?.score,
                bestDayLabel: sortedByScore[0]?.crowdLabel,
                worstDay: sortedByScore[sortedByScore.length - 1]?.date,
                worstDayScore: sortedByScore[sortedByScore.length - 1]?.score
            }
        };
    }
}

module.exports = CrowdScoringAlgorithm;
