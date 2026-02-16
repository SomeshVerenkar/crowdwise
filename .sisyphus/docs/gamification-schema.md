# Gamification Storage Schema

> Version: 1.0  
> Last Updated: February 14, 2026  
> Used By: `js/gamification/points-engine.js`, `js/gamification/badge-system.js`, `feedback-widget.js`

## Overview

This schema defines the localStorage structure for the CrowdWise gamification system. All data is stored client-side only - no server sync, no user accounts, no PII.

## localStorage Key

```javascript
const STORAGE_KEY = 'crowdwise_gamification';
```

## Full Schema Structure

```javascript
{
  // Schema version for migrations
  "version": "1.0",
  
  // Account creation timestamp
  "created": "2026-02-14T10:30:00.000Z",
  
  // Total accumulated points
  "points": 0,
  
  // Lifetime feedback count
  "totalFeedbacks": 0,
  
  // Current consecutive days streak
  "streakDays": 0,
  
  // Last feedback date (YYYY-MM-DD format)
  "lastFeedbackDate": null,
  
  // Longest streak ever achieved
  "longestStreak": 0,
  
  // Array of earned badge IDs
  "badges": [],
  
  // Badges earned but not yet shown to user
  "badgesPending": [],
  
  // Daily statistics keyed by date
  "dailyStats": {
    "2026-02-14": {
      "feedbacks": 3,
      "points": 35,
      "destinations": [4, 17, 52]
    }
  },
  
  // Recent feedback history (last 100 entries max)
  "feedbackHistory": [
    {
      "timestamp": "2026-02-14T10:30:00.000Z",
      "destinationId": 4,
      "predictedLevel": "heavy",
      "reportedLevel": "heavy",
      "accurate": true,
      "points": 15
    }
  ],
  
  // Unique destinations user has provided feedback for
  "uniqueDestinations": [],
  
  // Weekend feedback count (Sat/Sun)
  "weekendFeedbacks": 0,
  
  // Count of accurate predictions confirmed
  "accuracyConfirmed": 0,
  
  // User preferences
  "preferences": {
    "showBadges": true,
    "showPointsAnimation": true
  }
}
```

## Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | string | "1.0" | Schema version for migrations |
| `created` | string | ISO timestamp | When gamification was initialized |
| `points` | number | 0 | Total accumulated points |
| `totalFeedbacks` | number | 0 | Lifetime feedback submissions |
| `streakDays` | number | 0 | Current consecutive days with feedback |
| `lastFeedbackDate` | string\|null | null | Last feedback date (YYYY-MM-DD) |
| `longestStreak` | number | 0 | Best streak ever achieved |
| `badges` | string[] | [] | Array of earned badge IDs |
| `badgesPending` | string[] | [] | Newly earned badges not yet displayed |
| `dailyStats` | object | {} | Stats keyed by date string |
| `feedbackHistory` | array | [] | Last 100 feedback entries |
| `uniqueDestinations` | number[] | [] | Destination IDs with feedback |
| `weekendFeedbacks` | number | 0 | Sat/Sun feedback count |
| `accuracyConfirmed` | number | 0 | Predictions marked as accurate |
| `preferences` | object | {...} | User display preferences |

## Badge Definitions

CrowdWise has 8 badges to unlock:

| ID | Name | Criteria | Icon |
|----|------|----------|------|
| `first_report` | First Report | Submit 1 feedback | :beginner: |
| `crowd_reporter` | Crowd Reporter | Submit 5 feedbacks | :clipboard: |
| `weekend_warrior` | Weekend Warrior | Submit feedback on 3 weekends | :calendar: |
| `accuracy_ace` | Accuracy Ace | Confirm 5 predictions as correct | :dart: |
| `destination_expert` | Destination Expert | Feedback for 10 different destinations | :world_map: |
| `streak_master` | Streak Master | 7-day feedback streak | :fire: |
| `crowd_expert` | Crowd Expert | Submit 25 feedbacks | :star: |
| `prediction_guru` | Prediction Guru | 100 feedbacks with 80%+ accuracy rate | :trophy: |

### Badge Schema

```javascript
// Badge definition (hardcoded in badge-system.js)
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
```

## Points System

### Point Values

| Action | Points | Notes |
|--------|--------|-------|
| `QUICK_FEEDBACK` | 5 | Thumbs up/down on prediction |
| `DETAILED_FEEDBACK` | 15 | Full crowd level report |
| `ACCURACY_BONUS` | 10 | When user confirms prediction was correct |
| `STREAK_BONUS` | 5/day | +5 per consecutive day (max 25) |
| `FIRST_FEEDBACK_BONUS` | 20 | One-time bonus for first ever feedback |
| `DAILY_CAP` | 50 | Maximum points earnable per day |

### Points Calculation

```javascript
// points-engine.js will implement:
function calculatePoints(feedbackType, state) {
  let points = 0;
  
  // Base points
  if (feedbackType === 'quick') {
    points += POINTS.QUICK_FEEDBACK; // 5
  } else if (feedbackType === 'detailed') {
    points += POINTS.DETAILED_FEEDBACK; // 15
  }
  
  // First feedback bonus
  if (state.totalFeedbacks === 0) {
    points += POINTS.FIRST_FEEDBACK_BONUS; // 20
  }
  
  // Streak bonus (capped at 25)
  const streakBonus = Math.min(state.streakDays * POINTS.STREAK_BONUS, 25);
  points += streakBonus;
  
  // Check daily cap
  const todayPoints = state.dailyStats[today]?.points || 0;
  const remaining = POINTS.DAILY_CAP - todayPoints;
  
  return Math.min(points, remaining);
}
```

## Size Estimation

| Component | Size | Notes |
|-----------|------|-------|
| Base schema | ~200 bytes | Fixed fields |
| Per feedback history entry | ~150 bytes | Trimmed to 100 max |
| 100 feedback entries | ~15 KB | Maximum history size |
| Daily stats (30 days) | ~3 KB | Auto-pruned |
| Badges + prefs | ~500 bytes | Fixed |
| **Total Maximum** | **~20 KB** | Well under 5MB limit |

### Size Management

```javascript
// Prune old data to keep size manageable
function pruneOldData(state) {
  // Keep only last 100 feedback entries
  if (state.feedbackHistory.length > 100) {
    state.feedbackHistory = state.feedbackHistory.slice(-100);
  }
  
  // Keep only last 30 days of daily stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  Object.keys(state.dailyStats).forEach(date => {
    if (new Date(date) < thirtyDaysAgo) {
      delete state.dailyStats[date];
    }
  });
}
```

## Initialization

```javascript
// Default state for new users
function getInitialState() {
  return {
    version: "1.0",
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

// Load or initialize
function loadGamificationState() {
  const stored = localStorage.getItem('crowdwise_gamification');
  if (!stored) {
    const initial = getInitialState();
    saveGamificationState(initial);
    return initial;
  }
  
  const state = JSON.parse(stored);
  
  // Version migration
  if (state.version !== "1.0") {
    return migrateState(state);
  }
  
  return state;
}
```

## Streak Calculation

```javascript
function updateStreak(state) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (state.lastFeedbackDate === today) {
    // Already submitted today, no change
    return;
  }
  
  if (state.lastFeedbackDate === yesterdayStr) {
    // Consecutive day, increment streak
    state.streakDays += 1;
  } else if (state.lastFeedbackDate !== today) {
    // Streak broken, reset to 1
    state.streakDays = 1;
  }
  
  // Update longest streak
  state.longestStreak = Math.max(state.longestStreak, state.streakDays);
  state.lastFeedbackDate = today;
}
```

## Privacy Considerations

This schema stores **NO personally identifiable information (PII)**:

| NOT Stored | Reason |
|------------|--------|
| Email | No user accounts |
| Name | No user accounts |
| IP Address | Client-side only |
| Device ID | Not tracked |
| Location | Not tracked (destination is what they report ON, not where they ARE) |
| Browsing history | Not tracked |

**Data stays on device only. Clearing browser data deletes all gamification progress.**

## Migration Strategy

### Version 1.0 → 1.1 (Future)

```javascript
function migrateV1ToV1_1(state) {
  // Add new optional fields with defaults
  state.version = "1.1";
  state.newField = state.newField || defaultValue;
  return state;
}
```

### Breaking Changes (2.0)

Major version changes require explicit migration:

```javascript
function migrateState(state) {
  const version = parseFloat(state.version);
  
  if (version < 1.1) state = migrateV1ToV1_1(state);
  if (version < 2.0) state = migrateV1_1ToV2(state);
  
  return state;
}
```

## Integration with Existing Code

### feedback-widget.js Integration

```javascript
// After successful feedback submission:
import { PointsEngine } from './js/gamification/points-engine.js';
import { BadgeSystem } from './js/gamification/badge-system.js';

function onFeedbackSubmitted(feedbackData) {
  // Award points
  const pointsEarned = PointsEngine.awardPoints(feedbackData);
  
  // Check for new badges
  const newBadges = BadgeSystem.checkBadges();
  
  // Show UI feedback
  if (pointsEarned > 0) {
    showPointsAnimation(pointsEarned);
  }
  
  if (newBadges.length > 0) {
    showBadgeUnlocked(newBadges[0]);
  }
}
```

### Feature Flag Check

```javascript
// Only run gamification if enabled
if (window.CONFIG?.FEATURE_FLAGS?.GAMIFICATION_ENABLED) {
  initializeGamification();
}
```
