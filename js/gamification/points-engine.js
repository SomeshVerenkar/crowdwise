// CrowdWise Points Engine v1.0
// Manages point calculation, awarding, and daily caps

const PointsEngine = (function() {
    const STORAGE_KEY = 'crowdwise_gamification';
    
    const POINTS = {
        QUICK_FEEDBACK: 5,
        DETAILED_FEEDBACK: 15,
        ACCURACY_BONUS: 10,
        STREAK_BONUS: 5,
        MAX_STREAK_BONUS: 25,
        FIRST_FEEDBACK_BONUS: 20,
        DAILY_CAP: 50
    };
    
    /**
     * Get today's date string in YYYY-MM-DD format
     */
    function getTodayString() {
        return new Date().toISOString().split('T')[0];
    }
    
    /**
     * Get yesterday's date string in YYYY-MM-DD format
     */
    function getYesterdayString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
    
    /**
     * Check if a date is a weekend (Saturday=6, Sunday=0)
     */
    function isWeekend(dateString) {
        const date = new Date(dateString + 'T00:00:00Z');
        const dayOfWeek = date.getUTCDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    }
    
    /**
     * Initialize or load state from localStorage
     */
    function loadState() {
        // Handle Node.js environment (for testing)
        if (typeof localStorage === 'undefined') {
            return getInitialState();
        }
        
        const stored = localStorage.getItem(STORAGE_KEY);
        
        if (!stored) {
            return getInitialState();
        }
        
        try {
            const state = JSON.parse(stored);
            // Ensure version compatibility
            if (!state.version) {
                state.version = '1.0';
            }
            return state;
        } catch (e) {
            console.error('Error parsing gamification state:', e);
            return getInitialState();
        }
    }
    
    /**
     * Get initial state for new users
     */
    function getInitialState() {
        return {
            version: '1.0',
            created: new Date().toISOString(),
            points: 0,
            totalFeedbacks: 0,
            streakDays: 0,
            lastFeedbackDate: null,
            longestStreak: 0,
            badges: [],
            badgesPending: [],
            dailyStats: {},
            feedbackHistory: [],
            uniqueDestinations: [],
            weekendFeedbacks: 0,
            accuracyConfirmed: 0,
            preferences: {
                showBadges: true,
                showPointsAnimation: true
            }
        };
    }
    
    /**
     * Save state to localStorage
     */
    function saveState(state) {
        // Handle Node.js environment (for testing)
        if (typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Error saving gamification state:', e);
        }
    }
    
    /**
     * Prune old data to keep storage efficient
     */
    function pruneOldData(state) {
        // Keep only last 100 feedback entries
        if (state.feedbackHistory && state.feedbackHistory.length > 100) {
            state.feedbackHistory = state.feedbackHistory.slice(-100);
        }
        
        // Keep only last 30 days of daily stats
        if (state.dailyStats) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            Object.keys(state.dailyStats).forEach(date => {
                try {
                    if (new Date(date) < thirtyDaysAgo) {
                        delete state.dailyStats[date];
                    }
                } catch (e) {
                    // Invalid date format, delete it
                    delete state.dailyStats[date];
                }
            });
        }
    }
    
    /**
     * Calculate points for a feedback submission
     * @param {string} feedbackType - 'quick' or 'detailed'
     * @param {boolean} isAccurate - Whether accuracy bonus applies
     * @param {object} state - Current gamification state
     * @returns {number} Points earned (after daily cap applied)
     */
    function calculatePoints(feedbackType, isAccurate, state) {
        let points = 0;
        const today = getTodayString();
        
        // Base points for feedback type
        if (feedbackType === 'quick') {
            points += POINTS.QUICK_FEEDBACK; // 5
        } else if (feedbackType === 'detailed') {
            points += POINTS.DETAILED_FEEDBACK; // 15
        }
        
        // First feedback bonus (only when totalFeedbacks === 0)
        if (state.totalFeedbacks === 0) {
            points += POINTS.FIRST_FEEDBACK_BONUS; // 20
        }
        
        // Accuracy bonus
        if (isAccurate) {
            points += POINTS.ACCURACY_BONUS; // 10
        }
        
        // Streak bonus (capped at 25)
        const streakBonus = Math.min(state.streakDays * POINTS.STREAK_BONUS, POINTS.MAX_STREAK_BONUS);
        points += streakBonus;
        
        // Apply daily cap
        const todayStats = state.dailyStats[today] || { points: 0, feedbacks: 0, destinations: [] };
        const currentDayPoints = todayStats.points || 0;
        const remaining = POINTS.DAILY_CAP - currentDayPoints;
        
        // Return capped amount
        return Math.max(0, Math.min(points, remaining));
    }
    
    /**
     * Update streak based on feedback dates
     */
    function updateStreak(state) {
        const today = getTodayString();
        const yesterday = getYesterdayString();
        
        if (state.lastFeedbackDate === today) {
            // Already submitted today, no change
            return;
        }
        
        if (state.lastFeedbackDate === yesterday) {
            // Consecutive day, increment streak
            state.streakDays += 1;
        } else if (state.lastFeedbackDate !== today) {
            // Streak broken or first feedback, reset to 1
            state.streakDays = 1;
        }
        
        // Update longest streak
        state.longestStreak = Math.max(state.longestStreak, state.streakDays);
        
        // Update last feedback date
        state.lastFeedbackDate = today;
    }
    
    /**
     * Award points for feedback submission
     * @param {object} feedbackData - Feedback data from widget
     *   {
     *     type: 'quick' or 'detailed',
     *     destinationId: number,
     *     predictedLevel: string,
     *     reportedLevel: string,
     *     accurate: boolean,
     *     timestamp: ISO string (optional)
     *   }
     * @returns {object} { points: number, streak: number, firstFeedback: boolean }
     */
    function awardPoints(feedbackData) {
        const state = loadState();
        const today = getTodayString();
        const feedbackType = feedbackData.type || 'quick';
        const isAccurate = feedbackData.accurate || false;
        
        const isFirstFeedback = state.totalFeedbacks === 0;
        
        // Update streak
        updateStreak(state);
        
        // Calculate points
        const earnedPoints = calculatePoints(feedbackType, isAccurate, state);
        
        // Update total points
        state.points += earnedPoints;
        
        // Update total feedbacks
        state.totalFeedbacks += 1;
        
        // Update daily stats
        if (!state.dailyStats[today]) {
            state.dailyStats[today] = {
                feedbacks: 0,
                points: 0,
                destinations: []
            };
        }
        state.dailyStats[today].feedbacks += 1;
        state.dailyStats[today].points += earnedPoints;
        
        // Track unique destinations
        if (feedbackData.destinationId !== undefined) {
            if (!state.dailyStats[today].destinations.includes(feedbackData.destinationId)) {
                state.dailyStats[today].destinations.push(feedbackData.destinationId);
            }
            
            if (!state.uniqueDestinations.includes(feedbackData.destinationId)) {
                state.uniqueDestinations.push(feedbackData.destinationId);
            }
        }
        
        // Track weekend feedbacks
        if (isWeekend(today)) {
            state.weekendFeedbacks += 1;
        }
        
        // Track accuracy confirmations
        if (isAccurate) {
            state.accuracyConfirmed += 1;
        }
        
        // Add to feedback history
        const historyEntry = {
            timestamp: feedbackData.timestamp || new Date().toISOString(),
            destinationId: feedbackData.destinationId,
            predictedLevel: feedbackData.predictedLevel,
            reportedLevel: feedbackData.reportedLevel,
            accurate: isAccurate,
            points: earnedPoints
        };
        
        if (!state.feedbackHistory) {
            state.feedbackHistory = [];
        }
        state.feedbackHistory.push(historyEntry);
        
        // Prune old data
        pruneOldData(state);
        
        // Save state
        saveState(state);
        
        return {
            points: earnedPoints,
            totalPoints: state.points,
            streak: state.streakDays,
            firstFeedback: isFirstFeedback
        };
    }
    
    /**
     * Get today's points earned
     */
    function getTodayPoints() {
        const state = loadState();
        const today = getTodayString();
        return state.dailyStats[today]?.points || 0;
    }
    
    /**
     * Get current streak
     */
    function getStreak() {
        const state = loadState();
        return {
            current: state.streakDays,
            longest: state.longestStreak
        };
    }
    
    /**
     * Get total points
     */
    function getTotalPoints() {
        const state = loadState();
        return state.points;
    }
    
    // Public API
    return {
        awardPoints,
        getState: loadState,
        getPointValues: () => ({ ...POINTS }),
        getTodayPoints,
        getStreak,
        getTotalPoints,
        saveState
    };
})();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsEngine;
}
