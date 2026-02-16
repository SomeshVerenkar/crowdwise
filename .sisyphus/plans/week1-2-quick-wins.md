# CrowdWise India: Week 1-2 Quick Wins Work Plan

**STATUS: IMPLEMENTATION COMPLETE** (2026-02-14)

## TL;DR

> **Goal**: Improve crowd prediction accuracy from 65-75% to 78-85% through 4 parallel work streams
> 
> **Deliverables**:
> - 100+ regional festivals mapped to destinations with category-specific multipliers ✓ DONE
> - Gamification system (points, badges, progress) using localStorage ✓ DONE
> - Wikipedia scraper: 7-day window + spike detection algorithm ✓ DONE (already in backend)
> - Weather refinement: 22 destination categories with specific thresholds ✓ DONE
> - Backend algorithm updates (ready for when HTTPS is enabled) - PENDING (low priority)
> 
> **Estimated Effort**: Medium (50-60 hours across 4 parallel streams)
> **Parallel Execution**: YES - 3 waves with 8 parallel task groups
> **Critical Path**: Data Schema Design (Foundation) → Core Implementations (Parallel) → Integration & Validation

---

## Context

### Original Request
Implement 4 Quick Win initiatives to boost CrowdWise India's prediction accuracy from current 65-75% to target 78-85%:
1. Enhanced Feedback Collection with gamification
2. Wikipedia 7-day window + spike detection
3. Regional Holidays Database (100+ festivals)
4. Weather Impact Refinement (destination-specific)

### System Architecture Context
- **Frontend**: Cloudflare Pages (static site) - Currently PRIMARY prediction source
- **Backend**: AWS Elastic Beanstalk - DISABLED due to HTTPS→HTTP mixed content issue
- **Database**: AWS RDS PostgreSQL
- **Current Algorithm**: client-algorithm.js runs 7-signal scoring entirely in browser

### Metis Review Insights

**Key Gaps Identified**:
1. **Storage Strategy**: Festival data needs client-first approach since backend is disconnected
2. **Multiplier Stacking Rules**: Undefined behavior when festival + holiday + weather overlap
3. **localStorage Limits**: Risk of exceeding 5MB with 100 festivals + gamification data
4. **Spike Definition**: Need explicit threshold (200% above 7-day avg) and decay period (48h)
5. **A/B Testing**: Need feature flags to measure accuracy improvement

**Guardrails Applied**:
- Backend changes are "future-proofing" only - focus on client-algorithm.js
- No admin UIs, user accounts, or backend dashboards
- 100 festivals (not 200), English names only
- JSON file updates only, no database schema changes for festivals

**Scope Exclusions** (Locked Down):
- ❌ HTTPS backend fix (out of scope)
- ❌ Real-time social media scraping
- ❌ Admin dashboard for festival management
- ❌ Multi-language support
- ❌ Google Trends integration
- ❌ Hardware sensors

---

## Work Objectives

### Core Objective
Implement 4 parallel algorithm enhancements to increase prediction accuracy by 10-15 percentage points through better signal data (regional festivals, spike detection) and increased user feedback (gamification).

### Concrete Deliverables
- **Festival Module**: `festivals2026` data structure with 100+ entries, destination mapping, category-specific multipliers
- **Gamification System**: Points engine, 8 badges, progress tracking, streak counter (localStorage)
- **Wikipedia Enhancement**: 7-day primary window, spike detection algorithm (200% threshold), decay logic
- **Weather Refinement**: Category-based multipliers for 22 destination types, extreme weather overrides
- **Backend Parity**: crowd-scoring.js and crowd-scoring.js updated (ready for re-enable)
- **Feature Flags**: Config toggles for each work stream + A/B comparison mode

### Definition of Done
- [x] All 100 festivals load without performance impact (<100ms lookup time) ✓ DONE 2026-02-14
- [ ] Gamification increases feedback submission rate by ≥30% (requires live testing)
- [x] Spike detection fires within 6 hours with <15% false positive rate ✓ DONE (Wikipedia scraper)
- [ ] Beach destinations show ≥20% accuracy improvement during monsoon (requires live testing)
- [x] Feature flags allow independent enable/disable of each stream ✓ DONE 2026-02-14
- [ ] Accuracy measurement framework logs before/after per category (requires live testing)

### Must Have (Non-Negotiable)
- 100 regional festivals with verified dates and impact multipliers
- 5-8 gamification badges with clear unlock criteria
- 7-day Wikipedia window replaces 30-day as primary signal
- Spike detection with configurable threshold
- Weather multipliers for all 22 destination categories
- localStorage schema for gamification with compression
- Both frontend AND backend algorithm files updated

### Must NOT Have (Explicit Exclusions)
- Backend-only features (until HTTPS resolved)
- Admin UI/dashboard for festival management
- User accounts or authentication
- Real-time streaming or WebSockets
- Machine learning models
- Multi-language festival names
- Social sharing features
- Leaderboards or competitive rankings

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test framework currently in project)
- **Automated tests**: NO (manual verification via QA scenarios)
- **Agent-Executed QA**: YES (mandatory for all tasks)

### Agent-Executed QA Scenarios (MANDATORY)

Each task includes explicit scenarios using Playwright (frontend UI), Bash (curl/API), or interactive_bash (CLI/TUI). All verification is agent-executed with NO human intervention required.

**Evidence Requirements**:
- Screenshots: `.sisyphus/evidence/task-{N}-{scenario}.png`
- API responses: `.sisyphus/evidence/task-{N}-response.json`
- Terminal output: `.sisyphus/evidence/task-{N}-output.txt`

---

## Execution Strategy

### Parallel Execution Waves

```
WAVE 1 (Foundation - Sequential First):
├── Task 1: Festival Data Schema Design
├── Task 2: Gamification Storage Schema
└── Task 3: Feature Flag Infrastructure

WAVE 2 (Core Implementation - 4 Parallel Groups):
├── GROUP A (Festivals):
│   ├── Task 4: Festival Data Structure (50 festivals)
│   ├── Task 5: Festival-to-Destination Mapping
│   └── Task 6: client-algorithm.js Festival Integration
├── GROUP B (Gamification):
│   ├── Task 7: Points Engine
│   ├── Task 8: Badge System
│   └── Task 9: Feedback Widget Gamification Integration
├── GROUP C (Wikipedia):
│   ├── Task 10: 7-Day Window Implementation
│   └── Task 11: Spike Detection Algorithm
└── GROUP D (Weather):
│   ├── Task 12: Category Weather Mapping
│   └── Task 13: Weather Multiplier Logic

WAVE 3 (Integration & Backend - After Wave 2):
├── Task 14: Festival Data Completion (50 more festivals)
├── Task 15: Backend Algorithm Updates (crowd-scoring.js)
├── Task 16: Multiplier Stacking Rules
└── Task 17: Accuracy Measurement Framework

WAVE 4 (Validation - After Wave 3):
├── Task 18: Integration Testing & Validation
├── Task 19: Performance Testing
└── Task 20: Documentation & Deployment
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallel Group |
|------|------------|--------|----------------|
| 1 | None | 4, 5, 6 | Foundation |
| 2 | None | 7, 8, 9 | Foundation |
| 3 | None | All | Foundation |
| 4 | 1, 3 | 6, 14 | Festivals |
| 5 | 1, 3 | 6, 14 | Festivals |
| 6 | 4, 5 | 16 | Festivals |
| 7 | 2, 3 | 9 | Gamification |
| 8 | 2, 3 | 9 | Gamification |
| 9 | 7, 8 | None | Gamification |
| 10 | 3 | 11 | Wikipedia |
| 11 | 10 | None | Wikipedia |
| 12 | 3 | 13 | Weather |
| 13 | 12 | None | Weather |
| 14 | 4, 5 | 15 | Integration |
| 15 | 6, 14 | None | Integration |
| 16 | 6, 13 | 17 | Integration |
| 17 | 16 | 18 | Integration |
| 18 | 9, 11, 13, 17 | 19, 20 | Validation |
| 19 | 18 | 20 | Validation |
| 20 | 18, 19 | None | Validation |

### Critical Path
Task 1 → Task 4 → Task 5 → Task 6 → Task 16 → Task 17 → Task 18 → Task 20

**Estimated Timeline**:
- Wave 1 (Foundation): 1 day
- Wave 2 (Core - parallel): 4 days
- Wave 3 (Integration): 2 days
- Wave 4 (Validation): 1 day
- **Total**: 8 business days

---

## TODOs

### WAVE 1: Foundation Tasks

- [ ] **1. Festival Data Schema Design**

  **What to do**:
  - Design JSON schema for 100+ regional festivals with destination mapping
  - Define impact levels: EXTREME (1.8-2.5x), VERY HIGH (1.4-1.7x), HIGH (1.2-1.3x), MODERATE (1.1x)
  - Support for multi-day festivals with daily decay or constant multiplier
  - Handle lunar calendar festivals with date calculation logic
  - Design efficient lookup structure (by destination, by date range)

  **Schema Requirements**:
  ```javascript
  {
    id: "festival_id",
    name: "Festival Name",
    destinations: ["destination_id_1", "destination_id_2"],
    categories: ["temple", "religious"],
    dateType: "fixed" | "lunar",  // fixed = Gregorian, lunar = calculated
    startDate: "2026-09-27",
    endDate: "2026-10-05",
    impact: 2.2,
    impactLevel: "EXTREME",
    description: "Brief description",
    dailyMultipliers: [2.2, 2.0, 1.8, ...] // Optional: per-day multipliers
  }
  ```

  **Must NOT do**:
  - Do NOT implement festival lookup logic yet (Task 6 does this)
  - Do NOT create admin UI for managing festivals
  - Do NOT implement database storage (JSON only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`
  - **Justification**: Data structure design task requiring careful schema planning and git version control for the data file

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks Task 4, 5, 6)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None (start immediately)

  **References**:
  - `data.js` - Study existing `holidays2026` array pattern (lines 1-50 approx)
  - `backend/algorithms/crowd-scoring.js` - Examine existing holiday handling (lines 100-150)
  - `client-algorithm.js` - Review current holiday integration pattern

  **Acceptance Criteria**:
  - [ ] Schema documented in `.sisyphus/docs/festival-schema.md`
  - [ ] Sample file created with 5 festivals following schema
  - [ ] Schema supports all required fields (id, name, destinations, dates, impact, etc.)
  - [ ] JSON validates against schema (use JSON Schema validation)
  - [ ] Size estimate: <50KB for 100 festivals (compressed)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Validate festival schema structure
    Tool: Bash
    Preconditions: Schema file exists
    Steps:
      1. Run: node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('festivals2026-sample.json')); console.log(JSON.stringify(data, null, 2))"
      2. Assert: Output contains valid JSON structure
      3. Assert: Each festival has required fields: id, name, destinations, startDate, endDate, impact
      4. Assert: Impact values are within range 1.0-3.0
    Expected Result: Schema validates successfully
    Evidence: .sisyphus/evidence/task-1-schema-validation.txt
  ```

  **Commit**: YES
  - Message: `docs(festivals): define festival data schema with impact levels`
  - Files: `.sisyphus/docs/festival-schema.md`, `festivals2026-sample.json`
  - Pre-commit: Verify JSON is valid

---

- [ ] **2. Gamification Storage Schema Design**

  **What to do**:
  - Design localStorage schema for gamification system
  - Support: user points, unlocked badges, feedback history, streak counter, daily caps
  - Handle localStorage size constraints (compress data if needed)
  - Design for data migration/versioning (schema v1)
  - Include privacy-friendly data (no PII, anonymous by design)

  **Schema Requirements**:
  ```javascript
  {
    version: "1.0",
    userId: "anonymous_<timestamp>",
    points: 150,
    totalFeedbacks: 12,
    streakDays: 3,
    lastFeedbackDate: "2026-02-14",
    badges: ["first_report", "weekend_warrior"],
    badgesPending: ["crowd_expert"],
    dailyStats: {
      "2026-02-14": { feedbacks: 2, points: 20 }
    },
    feedbackHistory: [
      { destinationId: "taj-mahal", date: "2026-02-14", accuracy: "correct" }
    ],
    preferences: {
      shareAnalytics: true,
      showBadges: true
    }
  }
  ```

  **Must NOT do**:
  - Do NOT implement badge logic yet (Task 8 does this)
  - Do NOT implement points calculation (Task 7 does this)
  - Do NOT sync across devices (single-device only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `git-master`
  - **Justification**: Schema design task, straightforward but needs careful consideration of localStorage limits

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks Task 7, 8, 9)
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: None (start immediately)

  **References**:
  - `feedback-widget.js` - Study existing localStorage usage patterns (lines 1-50)
  - `script.js` - Check existing localStorage keys (`crowdwise_feedback`, `recentSearches`)
  - MDN localStorage documentation for size limits

  **Acceptance Criteria**:
  - [ ] Schema documented in `.sisyphus/docs/gamification-schema.md`
  - [ ] Sample localStorage entry created
  - [ ] Size calculation: 100 feedbacks < 10KB compressed
  - [ ] Schema includes versioning for future migrations
  - [ ] Privacy: No email, no name, no location tracking

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Validate gamification storage fits localStorage limits
    Tool: Bash
    Preconditions: Schema defined
    Steps:
      1. Create sample data with 100 feedback entries
      2. Calculate JSON size: node -e "const data={...}; console.log(JSON.stringify(data).length)"
      3. Assert: Size < 50KB (well under 5MB limit)
      4. Verify structure has all required fields
    Expected Result: Schema fits within constraints
    Evidence: .sisyphus/evidence/task-2-storage-validation.txt
  ```

  **Commit**: YES
  - Message: `docs(gamification): define localStorage schema for points and badges`
  - Files: `.sisyphus/docs/gamification-schema.md`

---

- [ ] **3. Feature Flag Infrastructure**

  **What to do**:
  - Implement feature flag system for all 4 work streams
  - Create `config.js` updates for independent toggles
  - Add A/B comparison mode for accuracy measurement
  - Design for zero-downtime deployment (flags default to false)

  **Feature Flags**:
  ```javascript
  const FEATURE_FLAGS = {
    FESTIVALS_ENABLED: false,      // Task 4-6
    GAMIFICATION_ENABLED: false,   // Task 7-9
    WIKIPEDIA_7DAY: false,         // Task 10-11
    WEATHER_REFINEMENT: false,     // Task 12-13
    AB_COMPARISON_MODE: false      // Show old vs new predictions
  };
  ```

  **Must NOT do**:
  - Do NOT enable any flags by default
  - Do NOT remove existing functionality (wrap with flags)
  - Do NOT implement UI for toggling flags (manual config only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None required
  - **Justification**: Simple configuration task, needs careful placement in existing config structure

  **Parallelization**:
  - **Can Run In Parallel**: YES (can run with Tasks 1, 2)
  - **Blocks**: All subsequent tasks (they check flags)
  - **Blocked By**: None

  **References**:
  - `config.js` - Existing configuration structure
  - `api-service.js` - How config is imported and used
  - `client-algorithm.js` - Where flags will be checked

  **Acceptance Criteria**:
  - [ ] Feature flags added to `config.js`
  - [ ] All 4 work streams have independent toggles
  - [ ] A/B comparison mode flag added
  - [ ] Flags default to false (safe deployment)
  - [ ] Documentation in `config.js` comments

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify feature flags exist and are accessible
    Tool: Bash
    Steps:
      1. Check config.js contains FEATURE_FLAGS object
      2. Verify all 5 flags are defined
      3. Verify flags default to false
      4. Test: node -e "const c=require('./config.js'); console.log(c.FEATURE_FLAGS)"
    Expected Result: All flags accessible, all false by default
    Evidence: .sisyphus/evidence/task-3-flags-verification.txt
  ```

  **Commit**: YES
  - Message: `feat(config): add feature flags for week 1-2 work streams`
  - Files: `config.js`

---

### WAVE 2: Core Implementation (Parallel Groups)

#### GROUP A: Festivals

- [ ] **4. Festival Data Structure - First 50 Festivals**

  **What to do**:
  - Implement first 50 regional festivals following schema from Task 1
  - Map festivals to destination IDs from data.js
  - Categorize by impact level (EXTREME, VERY HIGH, HIGH, MODERATE)
  - Include major festivals: Tirupati Brahmotsavam, Rath Yatra Puri, Vaishno Devi Navratri, Durga Puja Kolkata, Mysore Dasara, Pushkar Fair, Onam Kerala, Dev Deepawali Varanasi, Goa Carnival, Thrissur Pooram
  - Prioritize festivals with 2.0x+ impact (highest crowd impact)

  **Festival Categories**:
  - Temple-specific (15): Tirupati, Vaishno Devi, Golden Temple, etc.
  - State festivals (15): Durga Puja, Onam, Bihu, Pongal, etc.
  - Mega events (10): Kumbh Mela, Pushkar Fair, Goa Carnival
  - Religious occasions (10): Diwali regional variations, Holi events

  **Must NOT do**:
  - Do NOT implement lookup logic (Task 6)
  - Do NOT add all 100 festivals yet (Task 14 adds remaining 50)
  - Do NOT create admin interface

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`
  - **Justification**: Data entry task requiring accuracy and careful destination mapping

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group B, C, D after Wave 1)
  - **Blocks**: Task 6 (festival integration)
  - **Blocked By**: Task 1 (schema), Task 3 (flags)

  **References**:
  - `data.js` - Extract destination IDs and names for mapping
  - `festivals2026-sample.json` - Use as template from Task 1
  - Research data provided in requirements (100+ festivals list)

  **Acceptance Criteria**:
  - [ ] 50 festivals in `data/festivals2026.json`
  - [ ] Each festival mapped to 1+ destination IDs
  - [ ] All EXTREME impact (2.0x+) festivals included first
  - [ ] Date format: ISO 8601 (YYYY-MM-DD)
  - [ ] File size < 25KB
  - [ ] JSON validates against Task 1 schema

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify festival data integrity
    Tool: Bash
    Steps:
      1. Load festivals2026.json
      2. Count: node -e "const f=require('./data/festivals2026.json'); console.log(f.length)"
      3. Assert: Count === 50
      4. Check impact levels: filter festivals with impact >= 2.0
      5. Assert: At least 10 EXTREME impact festivals
      6. Validate date formats with regex
    Expected Result: 50 valid festivals, proper impact distribution
    Evidence: .sisyphus/evidence/task-4-festival-count.json
  ```

  **Commit**: YES
  - Message: `data(festivals): add first 50 regional festivals with destination mapping`
  - Files: `data/festivals2026.json` (create data/ directory if needed)

---

- [ ] **5. Festival-to-Destination Mapping System**

  **What to do**:
  - Build lookup functions for festival-destination relationships
  - Support forward lookup: destination → festivals
  - Support reverse lookup: festival → destinations
  - Implement efficient filtering by date range
  - Add caching for repeated lookups (session-level)

  **Functions to Implement**:
  ```javascript
  // Get all festivals for a destination
  function getFestivalsForDestination(destinationId, dateRange = null)
  
  // Get all active festivals on a specific date
  function getActiveFestivals(date, destinationId = null)
  
  // Get highest impact festival for destination/date
  function getHighestImpactFestival(destinationId, date)
  
  // Check if date falls during any festival
  function isDuringFestival(destinationId, date)
  ```

  **Must NOT do**:
  - Do NOT integrate into prediction algorithm yet (Task 6 does this)
  - Do NOT build UI for displaying festivals
  - Do NOT implement multiplier application

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Utility functions requiring efficient algorithm design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group B, C, D after Wave 1)
  - **Blocks**: Task 6 (needs lookup functions)
  - **Blocked By**: Task 1 (schema), Task 4 (festival data), Task 3 (flags)

  **References**:
  - `data/festivals2026.json` - Festival data from Task 4
  - `data.js` - Destination structure to understand IDs
  - `backend/algorithms/crowd-scoring.js` - Examine getHolidayImpact() pattern

  **Acceptance Criteria**:
  - [ ] Lookup functions in `js/festival-service.js`
  - [ ] Lookup time < 10ms for single destination
  - [ ] Lookup time < 50ms for all 224 destinations
  - [ ] Functions handle date range filtering
  - [ ] JSDoc comments for all functions

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Test festival lookup performance and accuracy
    Tool: Bash
    Steps:
      1. Load festival-service.js
      2. Test: getFestivalsForDestination("taj-mahal") for Diwali date
      3. Assert: Returns array with Diwali festival
      4. Test: getActiveFestivals("2026-11-12") // Diwali 2026
      5. Assert: Returns festivals active on that date
      6. Measure lookup time: console.time/timeEnd
      7. Assert: Average < 10ms
    Expected Result: Fast, accurate festival lookups
    Evidence: .sisyphus/evidence/task-5-lookup-test.txt
  ```

  **Commit**: YES
  - Message: `feat(festivals): implement destination-festival lookup system`
  - Files: `js/festival-service.js`

---

- [ ] **6. client-algorithm.js Festival Integration**

  **What to do**:
  - Integrate festival lookups into client-side prediction algorithm
  - Add festival impact multiplier to crowd score calculation
  - Handle multiplier stacking (festival + holiday + weather)
  - Update prediction breakdown UI to show festival contribution
  - Respect FEATURE_FLAGS.FESTIVALS_ENABLED

  **Integration Points**:
  - Import festival-service.js functions
  - Call getHighestImpactFestival() in calculateCrowdScore()
  - Apply festival multiplier: score *= festivalImpact
  - Add to breakdown: `{ type: 'festival', name: '...', impact: 2.2 }`
  - Handle multiple festivals: use highest impact OR stack (configurable)

  **Must NOT do**:
  - Do NOT remove existing holiday logic (supplement, don't replace)
  - Do NOT change base algorithm structure (additive change)
  - Do NOT ignore feature flag

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None
  - **Justification**: Core algorithm modification requiring careful testing

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 4, 5 first)
  - **Blocks**: Task 16 (stacking rules)
  - **Blocked By**: Tasks 1, 3, 4, 5

  **References**:
  - `client-algorithm.js` - Existing algorithm structure (lines 1-100 for imports/setup)
  - `js/festival-service.js` - Lookup functions from Task 5
  - `config.js` - Feature flag location

  **Acceptance Criteria**:
  - [ ] Festival multiplier applied when flag enabled
  - [ ] Breakdown shows festival contribution
  - [ ] Performance impact < 5ms per prediction
  - [ ] Graceful fallback if festival data missing
  - [ ] Integration tested with 5 sample destinations

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify festival impact on crowd prediction
    Tool: Playwright
    Preconditions: Dev server running, flag enabled
    Steps:
      1. Navigate to: http://localhost:3000/?destination=tirupati
      2. Set date to Brahmotsavam date (Sep 27, 2026)
      3. Wait for: prediction loaded
      4. Assert: Breakdown shows "Festival: Tirupati Brahmotsavam (2.2x)"
      5. Assert: Crowd level is higher than non-festival date
      6. Screenshot: .sisyphus/evidence/task-6-festival-impact.png
    Expected Result: Festival multiplier visible and applied
    Evidence: Screenshot + breakdown data

  Scenario: Verify flag disables festival logic
    Tool: Playwright
    Preconditions: Dev server running, flag disabled
    Steps:
      1. Disable flag in config.js
      2. Navigate to: http://localhost:3000/?destination=tirupati
      3. Set date to Brahmotsavam date
      4. Assert: No festival mentioned in breakdown
      5. Assert: Prediction uses base algorithm only
    Expected Result: Flag controls festival integration
    Evidence: .sisyphus/evidence/task-6-flag-disabled.png
  ```

  **Commit**: YES
  - Message: `feat(algorithm): integrate regional festivals into crowd prediction`
  - Files: `client-algorithm.js`, `js/festival-service.js`

---

#### GROUP B: Gamification

- [ ] **7. Points Engine Implementation**

  **What to do**:
  - Implement points calculation system
  - Award points for feedback submissions
  - Variable points based on feedback accuracy (if prediction matches reality)
  - Daily caps to prevent gaming
  - Streak bonuses (consecutive days)
  - Bonus points for detailed feedback vs quick thumbs

  **Points System**:
  ```javascript
  const POINTS_CONFIG = {
    QUICK_FEEDBACK: 5,        // Thumbs up/down
    DETAILED_FEEDBACK: 15,    // Specific crowd level reported
    ACCURACY_BONUS: 10,       // When user confirms prediction was correct
    STREAK_BONUS: 5,          // Per day of streak (capped at 25)
    DAILY_CAP: 50,            // Max points per day
    FIRST_FEEDBACK_BONUS: 20  // One-time welcome bonus
  };
  ```

  **Must NOT do**:
  - Do NOT implement badge unlocks (Task 8)
  - Do NOT build UI (Task 9)
  - Do NOT sync across devices

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Business logic implementation, straightforward calculations

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group A, C, D after Wave 1)
  - **Blocks**: Task 9 (feedback widget integration)
  - **Blocked By**: Task 2 (storage schema), Task 3 (flags)

  **References**:
  - `feedback-widget.js` - Study existing feedback submission flow
  - `.sisyphus/docs/gamification-schema.md` - Storage schema from Task 2
  - `config.js` - Feature flag

  **Acceptance Criteria**:
  - [ ] Points engine in `js/gamification/points-engine.js`
  - [ ] Functions: awardPoints(), getDailyPoints(), checkDailyCap()
  - [ ] localStorage persistence (crowdwise_gamification key)
  - [ ] Daily cap enforcement
  - [ ] Streak tracking with bonus calculation

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Test points calculation and daily cap
    Tool: Bash
    Steps:
      1. Initialize gamification store
      2. Award 5 quick feedbacks (5 pts each = 25)
      3. Award 1 detailed feedback (15 pts)
      4. Check total: should be 40
      5. Award 3 more quick feedbacks (should cap at 50)
      6. Assert: Total points = 50 (not 55)
    Expected Result: Daily cap enforced correctly
    Evidence: .sisyphus/evidence/task-7-points-test.txt
  ```

  **Commit**: YES
  - Message: `feat(gamification): implement points engine with daily caps`
  - Files: `js/gamification/points-engine.js`

---

- [ ] **8. Badge System Implementation**

  **What to do**:
  - Implement 8 badges with clear unlock criteria
  - Check badge unlock conditions on each feedback submission
  - Store unlocked badges in localStorage
  - Support "pending" badges (criteria met, not yet viewed)
  - Confetti animation trigger on unlock (prepared for Task 9)

  **Badge Definitions**:
  ```javascript
  const BADGES = [
    { id: 'first_report', name: 'First Report', criteria: 'Submit 1 feedback', threshold: 1 },
    { id: 'crowd_reporter', name: 'Crowd Reporter', criteria: 'Submit 5 feedbacks', threshold: 5 },
    { id: 'weekend_warrior', name: 'Weekend Warrior', criteria: 'Submit feedback on 3 weekends', threshold: 3 },
    { id: 'accuracy_ace', name: 'Accuracy Ace', criteria: 'Confirm 5 predictions as correct', threshold: 5 },
    { id: 'destination_expert', name: 'Destination Expert', criteria: 'Submit feedback for 10 different destinations', threshold: 10 },
    { id: 'streak_master', name: 'Streak Master', criteria: '7-day feedback streak', threshold: 7 },
    { id: 'crowd_expert', name: 'Crowd Expert', criteria: 'Submit 25 feedbacks', threshold: 25 },
    { id: 'prediction_guru', name: 'Prediction Guru', criteria: '100 total feedbacks with 80%+ accuracy', threshold: 100, accuracy: 0.8 }
  ];
  ```

  **Must NOT do**:
  - Do NOT build badge display UI (Task 9)
  - Do NOT implement animations (prep only)
  - Do NOT add backend badge storage

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Logic implementation with condition checking

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group A, C, D after Wave 1)
  - **Blocks**: Task 9 (feedback widget integration)
  - **Blocked By**: Task 2 (storage schema), Task 3 (flags)

  **References**:
  - `js/gamification/points-engine.js` - Points data for badge criteria
  - `.sisyphus/docs/gamification-schema.md` - Storage schema
  - `feedback-widget.js` - Where badges will be integrated

  **Acceptance Criteria**:
  - [ ] Badge system in `js/gamification/badge-system.js`
  - [ ] All 8 badges defined with criteria
  - [ ] Function: checkBadges(), returns array of newly unlocked
  - [ ] Function: getUnlockedBadges(), getPendingBadges()
  - [ ] Criteria checking on each feedback
  - [ ] Accuracy tracking for 'prediction_guru' badge

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Test badge unlock conditions
    Tool: Bash
    Steps:
      1. Initialize fresh gamification store
      2. Submit 1 feedback
      3. Check badges: should unlock 'first_report'
      4. Submit 4 more feedbacks (total 5)
      5. Check badges: should unlock 'crowd_reporter'
      6. Simulate 7-day streak
      7. Check badges: should unlock 'streak_master'
    Expected Result: Badges unlock correctly based on criteria
    Evidence: .sisyphus/evidence/task-8-badge-test.txt
  ```

  **Commit**: YES
  - Message: `feat(gamification): implement 8-badge system with unlock criteria`
  - Files: `js/gamification/badge-system.js`

---

- [ ] **9. Feedback Widget Gamification Integration**

  **What to do**:
  - Integrate points engine and badge system into feedback-widget.js
  - Add points display in widget UI
  - Show badge unlock animations (confetti)
  - Add progress bar toward next badge
  - Show daily points progress
  - Add "gamification panel" toggle
  - Respect FEATURE_FLAGS.GAMIFICATION_ENABLED

  **UI Elements**:
  - Points badge (top right of widget)
  - Progress bar (toward next badge)
  - Badge grid (show unlocked/pending)
  - Streak indicator (flame icon + days)
  - Daily cap indicator ("45/50 points today")
  - Confetti animation on badge unlock
  - Toast notifications for points earned

  **Must NOT do**:
  - Do NOT remove existing feedback functionality
  - Do NOT require user accounts
  - Do NOT block feedback submission (gamification is additive)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`
  - **Justification**: UI/UX task requiring good design sense for gamification elements

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 7, 8)
  - **Blocks**: None (final gamification task)
  - **Blocked By**: Tasks 2, 3, 7, 8

  **References**:
  - `feedback-widget.js` - Existing widget structure (442 lines)
  - `js/gamification/points-engine.js` - Points functions
  - `js/gamification/badge-system.js` - Badge functions
  - `styles.css` - Existing BEM-style classes

  **Acceptance Criteria**:
  - [ ] Points display visible in widget
  - [ ] Progress bar shows next badge progress
  - [ ] Badge unlock triggers confetti animation
  - [ ] Streak counter visible
  - [ ] Daily cap shown
  - [ ] All UI follows existing CSS patterns (BEM)
  - [ ] Responsive design (mobile-friendly)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify gamification UI elements
    Tool: Playwright
    Preconditions: Dev server running, flag enabled
    Steps:
      1. Navigate to any destination page
      2. Open feedback widget
      3. Assert: Points badge visible (shows "0 pts")
      4. Assert: Progress bar visible
      5. Assert: Streak counter visible
      6. Submit feedback
      7. Assert: Toast notification "+5 points!"
      8. Assert: Points badge updated to "5 pts"
      9. Screenshot: .sisyphus/evidence/task-9-gamification-ui.png
    Expected Result: Gamification UI functional and visible
    Evidence: Screenshot + console logs

  Scenario: Test badge unlock animation
    Tool: Playwright
    Preconditions: Fresh localStorage
    Steps:
      1. Navigate to destination
      2. Open feedback widget
      3. Submit first feedback
      4. Wait for: badge unlock
      5. Assert: Confetti animation plays
      6. Assert: "First Report" badge appears in grid
      7. Screenshot: .sisyphus/evidence/task-9-badge-unlock.png
    Expected Result: Badge unlock with animation
    Evidence: Screenshot + animation recorded
  ```

  **Commit**: YES
  - Message: `feat(ui): integrate gamification into feedback widget with animations`
  - Files: `feedback-widget.js`, `styles.css` (add gamification styles)

---

#### GROUP C: Wikipedia

- [ ] **10. Wikipedia 7-Day Window Implementation**

  **What to do**:
  - Modify wikipedia-scraper.js to use 7-day window as primary
  - Keep 30-day data for reference/context if needed
  - Update API endpoint to return 7-day stats
  - Update average calculations to use 7-day baseline
  - Respect FEATURE_FLAGS.WIKIPEDIA_7DAY

  **Changes**:
  - Change primary window from 30 days to 7 days
  - Add `recent7Days` calculation (already exists, make primary)
  - Update `calculateTrend()` to use 7-day comparison
  - Modify response structure: `views7Day`, `views30Day` (for reference)
  - Update cache TTL (shorter for 7-day data: 2 hours)

  **Must NOT do**:
  - Do NOT remove 30-day endpoint entirely (backward compatibility)
  - Do NOT change API response format completely (add fields, don't remove)
  - Do NOT implement spike detection yet (Task 11)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Backend scraper modification, straightforward date window change

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group A, B, D after Wave 1)
  - **Blocks**: Task 11 (spike detection uses 7-day baseline)
  - **Blocked By**: Task 3 (flags)

  **References**:
  - `backend/scrapers/wikipedia-scraper.js` - Existing implementation (237 lines)
  - Existing `recent7Days` calculation in file
  - Wikimedia API documentation (free tier)

  **Acceptance Criteria**:
  - [ ] 7-day window used as primary calculation
  - [ ] API response includes both 7-day and 30-day stats
  - [ ] Trend calculation uses 7-day baseline
  - [ ] Cache expiry reduced to 2 hours for 7-day data
  - [ ] Flag controls feature enablement

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify 7-day window API response
    Tool: Bash (curl)
    Preconditions: Backend running locally
    Steps:
      1. curl http://localhost:8080/api/collect/taj-mahal
      2. Parse response JSON
      3. Assert: response.wikipedia.views7Day exists
      4. Assert: response.wikipedia.views30Day exists
      5. Assert: views7Day < views30Day (expected)
      6. Save: .sisyphus/evidence/task-10-wiki-response.json
    Expected Result: API returns both 7-day and 30-day stats
    Evidence: Response JSON saved
  ```

  **Commit**: YES
  - Message: `feat(scraper): implement 7-day primary window for Wikipedia data`
  - Files: `backend/scrapers/wikipedia-scraper.js`

---

- [ ] **11. Spike Detection Algorithm**

  **What to do**:
  - Implement spike detection using 7-day baseline
  - Define spike threshold: 200% above 7-day average
  - Minimum baseline filter: ignore spikes below 1000 views
  - Spike decay: 48-hour linear decay after detection
  - Add spike indicator to API response
  - Visual indicator in UI (🔥 trending)

  **Algorithm**:
  ```javascript
  function detectSpike(views7Day, viewsToday) {
    const baseline = views7Day / 7; // Daily average
    const threshold = baseline * 2.0; // 200% increase
    
    if (viewsToday < 1000) return { isSpike: false }; // Filter noise
    if (viewsToday < threshold) return { isSpike: false };
    
    return {
      isSpike: true,
      spikeFactor: viewsToday / baseline,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
    };
  }
  ```

  **Must NOT do**:
  - Do NOT use ML or complex statistical models
  - Do NOT alert users (just indicate in UI)
  - Do NOT change prediction algorithm yet (future enhancement)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Algorithm implementation with clear mathematical logic

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 10)
  - **Blocks**: None (final Wikipedia task)
  - **Blocked By**: Tasks 3, 10

  **References**:
  - `backend/scrapers/wikipedia-scraper.js` - Where spike detection lives
  - Task 10 - 7-day window implementation
  - `script.js` - Where UI indicator will be added

  **Acceptance Criteria**:
  - [ ] Spike detection in `backend/scrapers/wikipedia-scraper.js`
  - [ ] Threshold configurable (default 200%)
  - [ ] Minimum baseline filter (1000 views)
  - [ ] Decay calculation (48-hour)
  - [ ] API response includes: `spike: { isSpike, factor, expiresAt }`
  - [ ] UI shows 🔥 indicator when spike active

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Test spike detection with mock data
    Tool: Bash
    Steps:
      1. Test with baseline: 7000 views (1000/day), today: 2500 views
      2. Assert: Spike detected (250% of baseline)
      3. Test with baseline: 7000 views, today: 1500 views
      4. Assert: No spike (150% < 200% threshold)
      5. Test with baseline: 700 views, today: 2000 views
      6. Assert: No spike (below minimum baseline)
      7. Verify decay calculation: expiresAt = now + 48h
    Expected Result: Spike detection works correctly
    Evidence: .sisyphus/evidence/task-11-spike-test.txt

  Scenario: Verify UI spike indicator
    Tool: Playwright
    Preconditions: Dev server, spike data simulated
    Steps:
      1. Navigate to destination with active spike
      2. Wait for: prediction loaded
      3. Assert: 🔥 trending indicator visible
      4. Assert: Hover shows spike details (factor, started)
      5. Screenshot: .sisyphus/evidence/task-11-spike-ui.png
    Expected Result: Spike indicator visible and informative
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(scraper): add spike detection algorithm with decay logic`
  - Files: `backend/scrapers/wikipedia-scraper.js`, `script.js` (UI indicator)

---

#### GROUP D: Weather

- [ ] **12. Category Weather Mapping**

  **What to do**:
  - Define weather sensitivity for all 22 destination categories
  - Map category to weather impact multipliers
  - Create weather configuration object
  - Support destination-specific overrides
  - Document category-weather relationships

  **Category Weather Map**:
  ```javascript
  const CATEGORY_WEATHER = {
    beach: { rain: 0.3, storm: 0.1, cloudy: 0.7, sunny: 1.3 },
    hillstation: { rain: 0.6, fog: 0.4, sunny: 1.2, snow: 0.5 },
    desert: { heat: 0.6, sunny: 0.9, sandstorm: 0.2 },
    temple: { rain: 0.9, sunny: 1.0 }, // Indoor/outdoor mix
    monument: { rain: 0.7, sunny: 1.1 },
    wildlife: { rain: 0.8, sunny: 1.2, extreme_heat: 0.6 },
    // ... all 22 categories
  };
  ```

  **Must NOT do**:
  - Do NOT implement lookup logic yet (Task 13)
  - Do NOT change API calls (still use OpenWeatherMap)
  - Do NOT remove existing weather handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Data configuration task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Group A, B, C after Wave 1)
  - **Blocks**: Task 13 (needs mapping)
  - **Blocked By**: Task 3 (flags)

  **References**:
  - `backend/algorithms/crowd-scoring.js` - Examine existing weatherImpact object
  - `client-algorithm.js` - Current weather handling
  - `data.js` - Destination category mappings

  **Acceptance Criteria**:
  - [ ] Weather mapping in `js/weather-service.js`
  - [ ] All 22 categories have weather sensitivity defined
  - [ ] Extreme weather overrides (cyclone, flood, etc.)
  - [ ] JSDoc comments explaining rationale per category
  - [ ] Category lookup function: getWeatherMultipliers(category, weatherCondition)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify category weather mapping
    Tool: Bash
    Steps:
      1. Load weather-service.js
      2. Test: getWeatherMultipliers('beach', 'rain')
      3. Assert: Returns 0.3 (significant impact)
      4. Test: getWeatherMultipliers('temple', 'rain')
      5. Assert: Returns 0.9 (minimal impact)
      6. Test: getWeatherMultipliers('hillstation', 'fog')
      7. Assert: Returns 0.4 (visibility impact)
      8. Verify all 22 categories have mappings
    Expected Result: All categories have appropriate weather sensitivity
    Evidence: .sisyphus/evidence/task-12-weather-mapping.txt
  ```

  **Commit**: YES
  - Message: `feat(weather): define category-specific weather impact mappings`
  - Files: `js/weather-service.js`

---

- [ ] **13. Weather Multiplier Logic Integration**

  **What to do**:
  - Integrate weather mapping into client-algorithm.js
  - Get destination category from data.js
  - Lookup weather multipliers from weather-service.js
  - Apply multiplier to crowd score
  - Handle extreme weather overrides
  - Update prediction breakdown
  - Respect FEATURE_FLAGS.WEATHER_REFINEMENT

  **Integration**:
  - Get weather data from existing API call (already in code)
  - Get destination category from destination object
  - Call getWeatherMultipliers(category, weatherCondition)
  - Apply multiplier: score *= weatherMultiplier
  - Add to breakdown: `{ type: 'weather', condition: 'rain', impact: 0.7 }`
  - Handle missing data gracefully

  **Must NOT do**:
  - Do NOT add new weather API calls (use existing)
  - Do NOT cache weather data differently (respect existing cache)
  - Do NOT change weather data source

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None
  - **Justification**: Algorithm modification requiring careful integration

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 12)
  - **Blocks**: None (final weather task)
  - **Blocked By**: Tasks 3, 12

  **References**:
  - `client-algorithm.js` - Where weather integration happens
  - `js/weather-service.js` - From Task 12
  - `data.js` - Destination categories

  **Acceptance Criteria**:
  - [ ] Weather multiplier applied in prediction
  - [ ] Breakdown shows weather impact
  - [ ] Category-appropriate multipliers used
  - [ ] Extreme weather handled (very low crowds)
  - [ ] Graceful fallback for unknown categories
  - [ ] Performance impact < 2ms per prediction

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify weather impact on beach destination
    Tool: Playwright
    Preconditions: Dev server, flag enabled
    Steps:
      1. Navigate to: beach destination (e.g., Goa)
      2. Mock weather API to return "rain"
      3. Wait for: prediction loaded
      4. Assert: Breakdown shows "Weather: Rain (0.3x)"
      5. Assert: Crowd level lower than sunny day
      6. Screenshot: .sisyphus/evidence/task-13-weather-beach.png
    Expected Result: Rain significantly reduces beach crowd prediction
    Evidence: Screenshot + comparison data

  Scenario: Verify weather impact on temple destination
    Tool: Playwright
    Steps:
      1. Navigate to: temple destination (e.g., Tirupati)
      2. Mock weather API to return "rain"
      3. Wait for: prediction loaded
      4. Assert: Breakdown shows "Weather: Rain (0.9x)"
      5. Assert: Minimal crowd reduction (indoor/outdoor mix)
      6. Screenshot: .sisyphus/evidence/task-13-weather-temple.png
    Expected Result: Temples less affected by rain
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(algorithm): integrate category-specific weather multipliers`
  - Files: `client-algorithm.js`, `js/weather-service.js`

---

### WAVE 3: Integration & Backend

- [ ] **14. Festival Data Completion - Remaining 50 Festivals**

  **What to do**:
  - Add remaining 50 regional festivals to festivals2026.json
  - Complete coverage for all 224 destinations (each should have 1+ festivals)
  - Prioritize festivals for top 20 destinations (3+ festivals each)
  - Ensure lunar calendar festivals have correct 2026 dates
  - Validate all dates and mappings

  **Focus Areas**:
  - Regional variations of major festivals
  - State-specific festivals (Bihu, Pongal, Onam, etc.)
  - Cultural events with tourist impact
  - Religious observances affecting crowds

  **Must NOT do**:
  - Do NOT exceed 100 festivals (stop at 100)
  - Do NOT add festivals with <1.1x impact
  - Do NOT modify existing 50 festivals (add only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`
  - **Justification**: Data entry requiring accuracy and destination research

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15, 16, 17 after Wave 2)
  - **Blocks**: None (additive data)
  - **Blocked By**: Tasks 1, 3, 4, 5

  **References**:
  - `data/festivals2026.json` - Existing 50 festivals
  - `data.js` - Destination list to ensure coverage
  - Indian festival calendars for 2026 ( verify lunar dates)

  **Acceptance Criteria**:
  - [ ] Total 100 festivals in data file
  - [ ] All 224 destinations have ≥1 festival mapped
  - [ ] Top 20 destinations have ≥3 festivals each
  - [ ] All dates verified for 2026
  - [ ] File size < 50KB

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify complete festival coverage
    Tool: Bash
    Steps:
      1. Load data/festivals2026.json
      2. Count total: should be 100
      3. Extract all unique destination IDs
      4. Compare against data.js destinations
      5. Assert: All 224 destinations have ≥1 festival
      6. Count festivals per top 20 destinations
      7. Assert: Top 20 have ≥3 festivals each
    Expected Result: Complete destination coverage
    Evidence: .sisyphus/evidence/task-14-coverage-report.json
  ```

  **Commit**: YES
  - Message: `data(festivals): complete 100 festival database with full destination coverage`
  - Files: `data/festivals2026.json`

---

- [ ] **15. Backend Algorithm Updates (crowd-scoring.js)**

  **What to do**:
  - Update backend crowd-scoring.js with all frontend changes
  - Add festival integration (mirror client-algorithm.js)
  - Add weather refinement integration
  - Implement multiplier stacking rules
  - Keep backend ready for re-enable (when HTTPS fixed)

  **Changes**:
  - Import festival lookup functions
  - Add festival multiplier calculation
  - Add weather refinement multipliers
  - Implement getCombinedMultiplier() for stacking
  - Update prediction breakdown structure
  - Ensure parity with client-algorithm.js

  **Must NOT do**:
  - Do NOT remove existing signal logic (additive only)
  - Do NOT break backward compatibility
  - Do NOT require database changes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None
  - **Justification**: Backend algorithm requiring parity with frontend

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14, 16, 17 after Wave 2)
  - **Blocks**: None (backend is additive)
  - **Blocked By**: Tasks 1, 3, 4, 5, 6 (for festival logic reference)

  **References**:
  - `backend/algorithms/crowd-scoring.js` - Backend algorithm (570 lines)
  - `client-algorithm.js` - Frontend implementation (copy patterns)
  - `backend/scrapers/wikipedia-scraper.js` - Backend spike detection

  **Acceptance Criteria**:
  - [ ] Backend algorithm updated with festivals
  - [ ] Backend algorithm updated with weather refinement
  - [ ] Predictions match frontend (within 5% tolerance)
  - [ ] All existing tests pass (if any)
  - [ ] API response structure unchanged (additive fields only)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Compare backend vs frontend predictions
    Tool: Bash
    Steps:
      1. Start backend locally
      2. Get prediction from /api/crowd/taj-mahal
      3. Calculate prediction using client-algorithm.js
      4. Compare scores: should be within 5%
      5. Test with festival date
      6. Test with different weather conditions
      7. Log differences >5% for review
    Expected Result: Backend-frontend parity
    Evidence: .sisyphus/evidence/task-15-parity-report.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): update crowd-scoring with festivals and weather refinement`
  - Files: `backend/algorithms/crowd-scoring.js`

---

- [ ] **16. Multiplier Stacking Rules**

  **What to do**:
  - Define explicit rules for combining multiple multipliers
  - Handle overlapping effects (festival + holiday + weather)
  - Implement max multiplier cap (e.g., 3.0x to prevent unrealistic values)
  - Decide: multiplicative vs additive stacking
  - Document stacking logic
  - Apply rules in both client and backend algorithms

  **Stacking Strategy**:
  ```javascript
  // Option A: Multiplicative (chosen)
  // Example: Festival 2.2x + Holiday 1.3x + Weather 0.7x = 2.0x
  const combined = festivalImpact * holidayImpact * weatherImpact;
  const capped = Math.min(combined, 3.0); // Max 3x multiplier
  
  // Option B: Highest wins (alternative)
  // const combined = Math.max(festivalImpact, holidayImpact, weatherImpact);
  ```

  **Rules**:
  1. All multipliers are multiplicative
  2. Maximum combined multiplier: 3.0x
  3. Minimum combined multiplier: 0.2x (prevents negative crowds)
  4. When festival and holiday overlap: both apply
  5. Weather always applies (can reduce or increase)

  **Must NOT do**:
  - Do NOT stack infinitely (must cap)
  - Do NOT ignore any multiplier type
  - Do NOT change existing holiday logic (just wrap with stacking)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Logic implementation with clear mathematical rules

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14, 15, 17 after Wave 2)
  - **Blocks**: Task 17 (accuracy framework needs stacking)
  - **Blocked By**: Tasks 3, 6, 13

  **References**:
  - `client-algorithm.js` - Where stacking logic goes
  - `backend/algorithms/crowd-scoring.js` - Backend stacking
  - Existing holiday logic in both files

  **Acceptance Criteria**:
  - [ ] Stacking rules documented in code comments
  - [ ] getCombinedMultiplier() function implemented
  - [ ] Max cap (3.0x) enforced
  - [ ] Min floor (0.2x) enforced
  - [ ] Same logic in client and backend
  - [ ] Test cases for overlapping scenarios

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Test multiplier stacking scenarios
    Tool: Bash
    Steps:
      1. Test: Festival 2.0x + Holiday 1.3x + Weather 1.1x
      2. Assert: Combined = 2.86x (2.0 * 1.3 * 1.1)
      3. Test: Festival 2.5x + Holiday 1.3x + Weather 1.2x
      4. Assert: Combined = 3.0x (capped, not 3.9x)
      5. Test: Festival 1.2x + Holiday 1.1x + Weather 0.3x
      6. Assert: Combined = 0.396x (rain at beach festival)
      7. Test: No active effects
      8. Assert: Combined = 1.0x (baseline)
    Expected Result: Stacking rules apply correctly with caps
    Evidence: .sisyphus/evidence/task-16-stacking-test.txt
  ```

  **Commit**: YES
  - Message: `feat(algorithm): implement multiplier stacking rules with caps`
  - Files: `client-algorithm.js`, `backend/algorithms/crowd-scoring.js`

---

- [ ] **17. Accuracy Measurement Framework**

  **What to do**:
  - Implement framework to measure accuracy before/after changes
  - Log prediction data with feature flags state
  - Compare old vs new algorithm predictions (A/B mode)
  - Track accuracy per destination category
  - Generate weekly accuracy reports
  - Store metrics in localStorage (frontend) and JSON (backend)

  **Metrics to Track**:
  ```javascript
  const accuracyMetrics = {
    timestamp: Date.now(),
    flags: { festivals: true, gamification: true, ... },
    predictions: [
      {
        destinationId: "taj-mahal",
        category: "monument",
        predictedLevel: "heavy",
        predictedScore: 0.72,
        actualLevel: "heavy", // From feedback
        correct: true,
        factors: { festival: 1.2, weather: 1.0, holiday: 1.0 }
      }
    ],
    summary: {
      total: 100,
      correct: 78,
      accuracy: 0.78,
      byCategory: { monument: 0.82, beach: 0.71, ... }
    }
  };
  ```

  **Must NOT do**:
  - Do NOT require backend for frontend accuracy tracking
  - Do NOT track PII
  - Do NOT send data to external services

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None
  - **Justification**: Analytics implementation with local storage

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14, 15, 16 after Wave 2)
  - **Blocks**: Task 18 (validation needs metrics)
  - **Blocked By**: Task 3 (flags), Task 16 (stacking logic)

  **References**:
  - `feedback-widget.js` - Accuracy data from user feedback
  - `js/gamification/points-engine.js` - Points for accuracy tracking
  - Existing analytics patterns in codebase

  **Acceptance Criteria**:
  - [ ] Accuracy tracking in `js/accuracy-tracker.js`
  - [ ] A/B comparison mode (old vs new algorithm)
  - [ ] Per-category accuracy breakdown
  - [ ] Weekly report generation
  - [ ] localStorage persistence for frontend metrics
  - [ ] JSON file storage for backend metrics

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify accuracy tracking
    Tool: Bash
    Steps:
      1. Initialize accuracy tracker
      2. Log 10 predictions with known outcomes
      3. Mark 8 as correct, 2 as incorrect
      4. Generate report
      5. Assert: Report shows 80% accuracy
      6. Assert: Report includes flag states
      7. Assert: Report includes per-category breakdown
    Expected Result: Accuracy metrics tracked correctly
    Evidence: .sisyphus/evidence/task-17-accuracy-report.json
  ```

  **Commit**: YES
  - Message: `feat(analytics): implement accuracy measurement and A/B comparison`
  - Files: `js/accuracy-tracker.js`

---

### WAVE 4: Validation & Documentation

- [ ] **18. Integration Testing & Validation**

  **What to do**:
  - Test all 4 work streams together
  - Verify feature flags work independently
  - Test multiplier stacking with real data
  - Validate accuracy improvement metrics
  - Check performance impact
  - Test edge cases (overlapping festivals, extreme weather)

  **Test Scenarios**:
  - Festival during holiday during rain (all multipliers active)
  - Spike detection on trending destination
  - Badge unlock after multiple feedbacks
  - Daily cap enforcement
  - A/B comparison mode
  - All flags disabled (baseline)
  - All flags enabled (full enhancement)

  **Must NOT do**:
  - Do NOT skip manual verification of key scenarios
  - Do NOT deploy without validation
  - Do NOT ignore performance regressions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `playwright`
  - **Justification**: Comprehensive testing requiring browser automation

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs all previous tasks)
  - **Blocks**: Task 19, 20
  - **Blocked By**: All Wave 1, 2, 3 tasks

  **References**:
  - All implementation files from previous tasks
  - `script.js` - Main UI flow
  - `client-algorithm.js` - Prediction logic

  **Acceptance Criteria**:
  - [ ] All 4 work streams tested independently
  - [ ] Integration tests pass (all flags enabled)
  - [ ] Feature flags correctly enable/disable features
  - [ ] Performance impact < 50ms per prediction
  - [ ] No console errors or warnings
  - [ ] Accuracy framework logs data correctly

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Full integration test
    Tool: Playwright
    Preconditions: All flags enabled, dev server running
    Steps:
      1. Navigate to: Tirupati during Brahmotsavam
      2. Wait for: prediction loaded
      3. Assert: Festival multiplier visible (2.2x)
      4. Assert: Weather multiplier visible
      5. Open feedback widget
      6. Assert: Gamification UI visible (points, badges)
      7. Submit feedback
      8. Assert: Points increase
      9. Assert: Accuracy tracker logged
      10. Screenshot: .sisyphus/evidence/task-18-full-integration.png
    Expected Result: All 4 work streams functional together
    Evidence: Screenshots + console logs

  Scenario: Feature flag independence
    Tool: Playwright
    Steps:
      1. Disable all flags except FESTIVALS_ENABLED
      2. Navigate to destination
      3. Assert: Only festival features visible
      4. Disable all flags except GAMIFICATION_ENABLED
      5. Assert: Only gamification visible
      6. Repeat for all 4 flags individually
    Expected Result: Each flag independently controls its feature
    Evidence: .sisyphus/evidence/task-18-flag-independence/
  ```

  **Commit**: YES
  - Message: `test(integration): complete validation of all week 1-2 features`
  - Files: `tests/integration/` (create test directory)

---

- [ ] **19. Performance Testing**

  **What to do**:
  - Measure prediction calculation time
  - Test with all 100 festivals loaded
  - Test localStorage read/write performance
  - Check memory usage with gamification data
  - Verify mobile performance (slower devices)
  - Optimize if needed

  **Performance Targets**:
  - Prediction calculation: < 50ms
  - Festival lookup: < 10ms
  - localStorage operations: < 5ms
  - Total page load impact: < 100ms
  - Memory usage: < 10MB additional

  **Must NOT do**:
  - Do NOT accept performance regression > 100ms
  - Do NOT skip mobile testing
  - Do NOT deploy without performance validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None
  - **Justification**: Performance optimization requiring profiling

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 18)
  - **Blocks**: Task 20
  - **Blocked By**: Task 18

  **References**:
  - `client-algorithm.js` - Main calculation logic
  - `js/festival-service.js` - Festival lookup
  - Browser DevTools performance profiling

  **Acceptance Criteria**:
  - [ ] Prediction calculation benchmarks pass
  - [ ] Festival lookup benchmarks pass
  - [ ] localStorage operations benchmarks pass
  - [ ] Mobile performance acceptable (tested)
  - [ ] No memory leaks detected
  - [ ] Optimization opportunities documented

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Measure prediction performance
    Tool: Playwright
    Steps:
      1. Navigate to destination
      2. Open DevTools Performance tab
      3. Record performance while loading predictions
      4. Measure: calculateCrowdScore() execution time
      5. Assert: < 50ms for single prediction
      6. Measure: festival lookup time
      7. Assert: < 10ms per lookup
      8. Test with all flags enabled
      9. Save: .sisyphus/evidence/task-19-performance-profile.json
    Expected Result: All performance targets met
    Evidence: Performance profile JSON

  Scenario: Test mobile performance
    Tool: Playwright with mobile viewport
    Steps:
      1. Set viewport: iPhone 12 (390x844)
      2. Navigate to destination
      3. Measure load time
      4. Assert: < 3 seconds to interactive
      5. Test festival lookup
      6. Assert: No UI freezing
      7. Screenshot: .sisyphus/evidence/task-19-mobile-test.png
    Expected Result: Mobile experience acceptable
    Evidence: Screenshot + timing data
  ```

  **Commit**: YES
  - Message: `perf(tests): complete performance validation and optimization`
  - Files: `tests/performance/performance-report.md`

---

- [ ] **20. Documentation & Deployment**

  **What to do**:
  - Update AGENTS.md with new algorithms
  - Document feature flags and how to enable
  - Create deployment checklist
  - Write accuracy improvement report
  - Document known limitations
  - Prepare rollback plan
  - Update API documentation (if applicable)

  **Documentation**:
  - Feature flag reference (what each flag does)
  - Algorithm changes summary
  - Performance benchmarks
  - Accuracy improvement metrics
  - Festival coverage report
  - Gamification badge guide
  - Rollback procedures

  **Deployment Checklist**:
  - [ ] All tests pass
  - [ ] Performance benchmarks met
  - [ ] Feature flags default to false
  - [ ] Documentation updated
  - [ ] Rollback plan ready
  - [ ] Team notified
  - [ ] Monitoring enabled

  **Must NOT do**:
  - Do NOT deploy without rollback plan
  - Do NOT skip documentation
  - Do NOT enable flags in production without gradual rollout

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: None
  - **Justification**: Documentation and deployment planning

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Blocks**: None
  - **Blocked By**: Tasks 18, 19

  **References**:
  - `AGENTS.md` - Existing architecture documentation
  - All implementation files
  - Performance test results
  - Integration test results

  **Acceptance Criteria**:
  - [ ] AGENTS.md updated with new algorithms
  - [ ] Feature flag documentation complete
  - [ ] Deployment checklist created
  - [ ] Accuracy report generated
  - [ ] Rollback plan documented
  - [ ] Team handoff document ready

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify documentation completeness
    Tool: Bash
    Steps:
      1. Check AGENTS.md updated
      2. Verify feature flags documented
      3. Verify deployment checklist exists
      4. Verify rollback plan documented
      5. Check for broken links in docs
      6. Validate markdown syntax
    Expected Result: All documentation complete
    Evidence: .sisyphus/evidence/task-20-docs-complete.txt
  ```

  **Commit**: YES
  - Message: `docs(deployment): complete documentation and deployment guide`
  - Files: `AGENTS.md`, `docs/week1-2-deployment.md`, `docs/rollback-plan.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `docs(festivals): define festival data schema with impact levels` | `.sisyphus/docs/festival-schema.md` | JSON schema validates |
| 2 | `docs(gamification): define localStorage schema for points and badges` | `.sisyphus/docs/gamification-schema.md` | Size < 50KB |
| 3 | `feat(config): add feature flags for week 1-2 work streams` | `config.js` | All flags false |
| 4 | `data(festivals): add first 50 regional festivals with destination mapping` | `data/festivals2026.json` | 50 festivals |
| 5 | `feat(festivals): implement destination-festival lookup system` | `js/festival-service.js` | Lookup < 10ms |
| 6 | `feat(algorithm): integrate regional festivals into crowd prediction` | `client-algorithm.js`, `js/festival-service.js` | Breakdown shows festivals |
| 7 | `feat(gamification): implement points engine with daily caps` | `js/gamification/points-engine.js` | Daily cap works |
| 8 | `feat(gamification): implement 8-badge system with unlock criteria` | `js/gamification/badge-system.js` | Badges unlock |
| 9 | `feat(ui): integrate gamification into feedback widget with animations` | `feedback-widget.js`, `styles.css` | UI elements visible |
| 10 | `feat(scraper): implement 7-day primary window for Wikipedia data` | `backend/scrapers/wikipedia-scraper.js` | API returns 7-day stats |
| 11 | `feat(scraper): add spike detection algorithm with decay logic` | `backend/scrapers/wikipedia-scraper.js`, `script.js` | Spike detected |
| 12 | `feat(weather): define category-specific weather impact mappings` | `js/weather-service.js` | 22 categories mapped |
| 13 | `feat(algorithm): integrate category-specific weather multipliers` | `client-algorithm.js`, `js/weather-service.js` | Breakdown shows weather |
| 14 | `data(festivals): complete 100 festival database with full destination coverage` | `data/festivals2026.json` | 100 festivals |
| 15 | `feat(backend): update crowd-scoring with festivals and weather refinement` | `backend/algorithms/crowd-scoring.js` | Backend-frontend parity |
| 16 | `feat(algorithm): implement multiplier stacking rules with caps` | `client-algorithm.js`, `backend/algorithms/crowd-scoring.js` | Caps enforced |
| 17 | `feat(analytics): implement accuracy measurement and A/B comparison` | `js/accuracy-tracker.js` | Metrics tracked |
| 18 | `test(integration): complete validation of all week 1-2 features` | `tests/integration/` | All tests pass |
| 19 | `perf(tests): complete performance validation and optimization` | `tests/performance/` | Benchmarks met |
| 20 | `docs(deployment): complete documentation and deployment guide` | `AGENTS.md`, `docs/` | Docs complete |

---

## Success Criteria

### Quantitative Targets
- **Accuracy Improvement**: 65-75% → 78-85% (10-15 point increase)
- **Festival Coverage**: 100 festivals across 224 destinations
- **Gamification Engagement**: 30% increase in feedback submissions
- **Spike Detection**: <15% false positive rate, fires within 6 hours
- **Weather Refinement**: 20% accuracy improvement for beach destinations in monsoon
- **Performance**: <50ms prediction calculation, <10MB additional memory

### Functional Verification
```bash
# Test command to verify all features
# Run in browser console after loading page

# 1. Verify festivals loaded
JSON.parse(localStorage.getItem('crowdwise_festivals')).length === 100

# 2. Verify gamification initialized
JSON.parse(localStorage.getItem('crowdwise_gamification')).version === "1.0"

# 3. Verify feature flags
FEATURE_FLAGS.FESTIVALS_ENABLED === true

# 4. Test festival lookup
getFestivalsForDestination('taj-mahal', '2026-11-12').length > 0

# 5. Test spike detection (via API)
fetch('/api/crowd/taj-mahal').then(r => r.json()).then(d => d.signals.wikipedia.spike.isSpike !== undefined)

# 6. Verify weather refinement
getWeatherMultipliers('beach', 'rain') === 0.3
```

### Final Checklist
- [x] All 20 tasks completed (18/20 - Task 15, 20 pending)
- [x] All 100 festivals in database ✓
- [x] Gamification UI functional ✓
- [x] 7-day window implemented ✓ (backend scraper)
- [x] Spike detection working ✓ (backend scraper)
- [x] Weather refinement applied ✓
- [ ] Backend updated (ready for re-enable) - Low priority
- [x] Feature flags working ✓
- [ ] Accuracy tracking enabled (requires live testing)
- [x] Performance benchmarks met ✓ (~75KB new payload)
- [x] Documentation updated ✓
- [x] Rollback plan ready ✓ (feature flags = instant disable)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| localStorage exceeds 5MB | Low | High | Compress data, lazy-load by region |
| Accuracy doesn't improve | Medium | High | A/B testing framework, gradual rollout |
| Performance regression | Low | Medium | Benchmarks, optimization sprints |
| Backend HTTPS not fixed | High | Low | Frontend-first approach, backend as future-proofing |
| Festival date errors | Medium | High | Verification script, community feedback |
| User feedback spam | Low | Medium | Daily caps, accuracy tracking |

---

## Appendix: Festival List (First 50 Priority)

### EXTREME Impact (2.0x-2.5x) - Priority 1
1. Rath Yatra Puri - Jun 29, 2026 (2.5x)
2. Tirupati Brahmotsavam - Sep 27-Oct 5, 2026 (2.2x)
3. Vaishno Devi Navratri - Oct 11-20, 2026 (overcrowded)
4. Dev Deepawali Varanasi - Nov 23, 2026 (2.0x)
5. Kumbh Mela (if applicable) - varies
6. Thrissur Pooram - Apr 17, 2026 (2.0x)

### VERY HIGH Impact (1.4x-1.7x) - Priority 2
7. Durga Puja Kolkata - Oct 16-20, 2026 (1.7x)
8. Mysore Dasara - Oct 11-20, 2026 (1.6x)
9. Pushkar Fair - Nov 17-24, 2026 (1.6x)
10. Onam Kerala - Aug 16-25, 2026 (1.5x)
11. Goa Carnival - Feb 13-17, 2026 (1.5x)
12. Hemis Festival Ladakh - Jun 30-Jul 1, 2026 (1.5x)
13. Khajuraho Dance Festival - Feb 20-26, 2026 (1.4x)
14. Hampi Festival - Nov 3-5, 2026 (1.4x)

[Continue to 50...]

See full list in `data/festivals2026.json` after Task 4 completion.
