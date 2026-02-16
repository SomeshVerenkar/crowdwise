// CrowdWise Badge System v1.0
// Manages badge definitions and unlock checking

const BadgeSystem = (function() {
    const STORAGE_KEY = 'crowdwise_gamification';
    
    const BADGES = {
        first_report: {
            id: "first_report",
            name: "First Report",
            description: "Submit your first crowd feedback",
            icon: "🔰",
            criteria: { type: "total_feedbacks", threshold: 1 }
        },
        crowd_reporter: {
            id: "crowd_reporter",
            name: "Crowd Reporter",
            description: "Submit 5 crowd reports",
            icon: "📋",
            criteria: { type: "total_feedbacks", threshold: 5 }
        },
        weekend_warrior: {
            id: "weekend_warrior",
            name: "Weekend Warrior",
            description: "Report crowds on 3 different weekends",
            icon: "📅",
            criteria: { type: "weekend_feedbacks", threshold: 3 }
        },
        accuracy_ace: {
            id: "accuracy_ace",
            name: "Accuracy Ace",
            description: "Confirm 5 predictions as accurate",
            icon: "🎯",
            criteria: { type: "accuracy_confirmed", threshold: 5 }
        },
        destination_expert: {
            id: "destination_expert",
            name: "Destination Expert",
            description: "Report from 10 different destinations",
            icon: "🗺️",
            criteria: { type: "unique_destinations", threshold: 10 }
        },
        streak_master: {
            id: "streak_master",
            name: "Streak Master",
            description: "Maintain a 7-day feedback streak",
            icon: "🔥",
            criteria: { type: "streak_days", threshold: 7 }
        },
        crowd_expert: {
            id: "crowd_expert",
            name: "Crowd Expert",
            description: "Submit 25 crowd reports",
            icon: "⭐",
            criteria: { type: "total_feedbacks", threshold: 25 }
        },
        prediction_guru: {
            id: "prediction_guru",
            name: "Prediction Guru",
            description: "100 feedbacks with 80%+ accuracy",
            icon: "🏆",
            criteria: { type: "accuracy_rate", threshold: 80, minFeedbacks: 100 }
        }
    };
    
    // Load state from localStorage
    function loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return {
                badges: [],
                badgesPending: [],
                feedbacks: [],
                weekendFeedbacks: [],
                accuracyConfirmed: 0,
                uniqueDestinations: new Set(),
                streakDays: 0,
                accuracyStats: { confirmed: 0, total: 0 }
            };
        }
        const state = JSON.parse(stored);
        // Convert uniqueDestinations back to Set
        state.uniqueDestinations = new Set(state.uniqueDestinations || []);
        return state;
    }
    
    // Save state
    function saveState(state) {
        const toSave = {
            ...state,
            uniqueDestinations: Array.from(state.uniqueDestinations)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
    
    // Check if a badge criteria is met
    function checkCriteria(badge, state) {
        const criteria = badge.criteria;
        
        // Safely get array lengths with default of 0
        const feedbacksCount = (state.feedbacks || []).length;
        const weekendCount = (state.weekendFeedbacks || []).length;
        const accuracyConfirmed = state.accuracyConfirmed || 0;
        const streakDays = state.streakDays || 0;
        const accuracyStats = state.accuracyStats || { confirmed: 0, total: 0 };
        const uniqueDestinations = state.uniqueDestinations || new Set();
        
        switch (criteria.type) {
            case "total_feedbacks":
                return feedbacksCount >= criteria.threshold;
                
            case "weekend_feedbacks":
                return weekendCount >= criteria.threshold;
                
            case "accuracy_confirmed":
                return accuracyConfirmed >= criteria.threshold;
                
            case "unique_destinations":
                return (uniqueDestinations.size || 0) >= criteria.threshold;
                
            case "streak_days":
                return streakDays >= criteria.threshold;
                
            case "accuracy_rate":
                if (accuracyStats.total < criteria.minFeedbacks) {
                    return false;
                }
                const accuracy = (accuracyStats.confirmed / accuracyStats.total) * 100;
                return accuracy >= criteria.threshold;
                
            default:
                return false;
        }
    }
    
    // Check all badges and return newly unlocked ones
    function checkBadges() {
        const state = loadState();
        const newlyUnlocked = [];
        
        // Check each badge
        for (const badgeId in BADGES) {
            const badge = BADGES[badgeId];
            
            // Skip if already earned
            if (state.badges.includes(badgeId)) {
                continue;
            }
            
            // Check if criteria met
            if (checkCriteria(badge, state)) {
                state.badges.push(badgeId);
                state.badgesPending.push(badgeId);
                newlyUnlocked.push(badge);
            }
        }
        
        // Save updated state
        saveState(state);
        
        return newlyUnlocked;
    }
    
    // Get all earned badges with full info
    function getEarnedBadges() {
        const state = loadState();
        return state.badges.map(badgeId => BADGES[badgeId]).filter(b => b !== undefined);
    }
    
    // Get pending badges (earned but not yet shown)
    function getPendingBadges() {
        const state = loadState();
        return state.badgesPending.map(badgeId => BADGES[badgeId]).filter(b => b !== undefined);
    }
    
    // Mark badges as shown
    function clearPendingBadges() {
        const state = loadState();
        state.badgesPending = [];
        saveState(state);
    }
    
    // Public API
    return {
        checkBadges,
        getEarnedBadges,
        getPendingBadges,
        clearPendingBadges,
        getAllBadges: () => ({ ...BADGES }),
        getBadgeById: (id) => BADGES[id] || null
    };
})();

// Export for modules
if (typeof module !== 'undefined') module.exports = BadgeSystem;
