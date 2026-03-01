# CrowdWise India — Agent & System Architecture

> **Project**: CrowdWise India — Tourist Crowd Tracker  
> **Version**: 4.0  
> **Last Updated**: March 1, 2026  
> **Repository**: [SomeshVerenkar/crowdwise](https://github.com/SomeshVerenkar/crowdwise)  
> **Live URL**: [https://crowdwise.in](https://crowdwise.in)

---

## 1. System Overview

CrowdWise India is a real-time tourist crowd prediction platform covering **359 destinations** across **38 Indian states/UTs**. The system uses a multi-agent architecture combining client-side algorithms, backend prediction services, data scrapers, and scheduled automation to deliver crowd level estimates with **65–75% accuracy**.

The frontend runs entirely as a static site on Cloudflare Pages. The backend (AWS Elastic Beanstalk) is operational but currently not connected to the frontend due to an HTTPS→HTTP mixed content restriction. All real-time predictions, alerts, and forecasts run client-side.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cloudflare Pages)               │
│                     https://crowdwise.in                     │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ script.js │  │ api-service  │  │ client-algorithm.js    │ │
│  │ (UI/UX)  │  │  .js         │  │ (Fallback Predictions) │ │
│  └──────────┘  └──────┬───────┘  └────────────────────────┘ │
│                       │                                      │
│  ┌──────────┐  ┌──────┴───────┐  ┌────────────────────────┐ │
│  │ data.js  │  │ config.js    │  │ feedback-widget.js     │ │
│  │(359 dest)│  │ (API config) │  │ (User feedback UI)     │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │js/        │  │js/gamifica-  │  │ js/accuracy-           │ │
│  │festival- │  │tion/         │  │ tracker.js             │ │
│  │service.js│  │badge+points  │  │ destination-photos.js  │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (AWS Elastic Beanstalk)                  │
│    crowdwise-api.eba-ymkfcnps.us-east-1.elasticbeanstalk.com│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              server-v2.js (Express API)               │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Crowd API  │  │ Weather API │  │ Predict API │  │   │
│  │  │ /api/crowd  │  │/api/weather │  │/api/predict │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  │         │                │                │          │   │
│  │  ┌──────┴──────┐  ┌─────┴──────┐  ┌──────┴──────┐  │   │
│  │  │  Alerts API │  │Feedback API│  │  Data API   │  │   │
│  │  │ /api/alerts │  │/api/feedback│ │/api/collect │  │   │
│  │  └─────────────┘  └────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌───────────┬───────────┼───────────┬───────────────────┐  │
│  │ALGORITHMS │ SCRAPERS  │ SERVICES  │    SCHEDULER      │  │
│  ├───────────┼───────────┼───────────┼───────────────────┤  │
│  │crowd-     │wikipedia- │data-      │scheduler-         │  │
│  │scoring.js │scraper.js │collector  │service.js         │  │
│  │           │           │.js        │                   │  │
│  │prediction-│social-    │data-      │ Cron Jobs:        │  │
│  │engine.js  │scraper.js │store.js   │ - Full: 6hr       │  │
│  │           │           │           │ - Wiki: 4hr       │  │
│  │           │hotel-     │validation-│ - Hotel: 2hr      │  │
│  │           │scraper.js │service.js │ - Cleanup: 1hr    │  │
│  └───────────┴───────────┴───────────┴───────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ PostgreSQL (port 5432)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (AWS RDS PostgreSQL)                │
│     database-1.cufke8wsyh3e.us-east-1.rds.amazonaws.com     │
│                                                              │
│  Tables: destinations (359), alerts, feedback,               │
│          user_feedback, scraped_data                          │
│  View:   active_alerts                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Agents

### 2.1 Crowd Scoring Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/algorithms/crowd-scoring.js`          |
| **Type**       | Core Algorithm / Prediction Agent              |
| **Runtime**    | Backend (Node.js) + Client fallback            |
| **Input**      | Destination metadata, time, signals            |
| **Output**     | Crowd score (0–1), level, label, emoji, % full |

**Purpose**: Multi-signal crowd prediction using a weighted scoring formula. Combines 7 signals without requiring any paid external APIs.

**Signal Weights**:

| Signal          | Weight | Source                              |
|-----------------|--------|-------------------------------------|
| Time of Day     | 0.20   | Current hour → hourly multiplier    |
| Day of Week     | 0.15   | Weekend/weekday patterns            |
| Seasonal        | 0.20   | Month-based tourism seasonality     |
| Holiday         | 0.15   | Indian public holidays & festivals  |
| Social Signal   | 0.10   | Wikipedia pageviews + social trends |
| Hotel Demand    | 0.15   | Hotel availability patterns         |
| Weather Impact  | 0.05   | Weather condition adjustments       |

**Crowd Level Mapping**:

| Score Range | Level        | Label              | Emoji |
|-------------|-------------|---------------------|-------|
| 0.00 – 0.30 | Low         | 🟢 Low Crowd        | 🟢    |
| 0.31 – 0.55 | Moderate    | 🟡 Moderate Crowd   | 🟡    |
| 0.56 – 0.80 | Heavy       | 🟠 Heavy Crowd      | 🟠    |
| 0.81 – 1.00 | Overcrowded | 🔴 Overcrowded      | 🔴    |

**Category-Specific Patterns**: Supports 22 destination categories with unique operating hours and hourly crowd curves: `religious`, `temple`, `beach`, `nature`, `hillstation`, `wildlife`, `heritage`, `monument`, `fort`, `palace`, `museum`, `garden`, `market`, `nightlife`, `resort`, `lake`, `dam`, `viewpoint`, `waterfall`, `nationalpark`, `church`, `mosque`.

---

### 2.2 Prediction Engine Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/algorithms/prediction-engine.js`      |
| **Type**       | Forecasting Agent                               |
| **Runtime**    | Backend (Node.js)                               |
| **Input**      | Destination, category, base crowd level         |
| **Output**     | Hourly/daily/weekly/monthly predictions         |

**Purpose**: Generates crowd forecasts for future time periods by running the Crowd Scoring Algorithm across projected time slots.

**Capabilities**:
- **Today Forecast**: Hour-by-hour prediction for remaining hours
- **Weekly Forecast**: Day-by-day prediction for 7 days ahead
- **Monthly Forecast**: Week-by-week prediction for 30 days ahead
- **Cache**: 30-minute expiry on prediction results
- **Accuracy Tracking**: Records prediction vs. actual for self-improvement

---

### 2.3 Client-Side Algorithm Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `client-algorithm.js`                           |
| **Type**       | Primary Prediction Agent                        |
| **Runtime**    | Browser (Client-side JavaScript)                |
| **Input**      | Destination data from `data.js`                 |
| **Output**     | Crowd score, level, visitor estimates            |

**Purpose**: Delivers real-time crowd predictions and hourly forecasts entirely in the browser. This is the **active primary prediction source** on production — the backend API is currently disabled due to HTTPS↔HTTP mixed content restrictions.

**Exposed API** (`window.clientCrowdAlgorithm`):

| Method | Returns |
|--------|---------|
| `calculateCrowdScore(params)` | `{ score, level, status, percentageFull }` |
| `getBestTimeToday(baseCrowdLevel, category, destId)` | `{ predictions[], bestTime, bestTimeScore, currentHour }` |

**Algorithm Factors**:
1. **Base crowd level** from destination data
2. **Time of day** — 24-hour hourly multipliers per category
3. **Day of week** — Weekend boost (1.3× Sat, 1.4× Sun)
4. **Month/season** — Peak (Oct–Feb) vs. off-season (Apr–Jul)
5. **Holiday detection** — Indian public holidays boost (1.3×–1.8×)
6. **Operating hours** — Returns `closed` status outside open hours
7. **Destination-specific closures** — e.g., Taj Mahal closed on Fridays

**Current Status**: **Active** — Primary prediction source on production site.

---

### 2.4 Best Time Finder Agent

| Property       | Value                                           |
|----------------|-------------------------------------------------|
| **File**       | `script.js` → `findBestTime()`                  |
| **Type**       | UI Prediction Feature                           |
| **Runtime**    | Browser                                         |
| **Input**      | Destination selected from dropdown              |
| **Output**     | Chronological hourly time-slot grid with ✦ BEST badge |

**Purpose**: Shows the full day’s predicted crowd pattern for any destination in a visual time-slot grid. Triggered **automatically on destination selection** — no button click required.

**Behaviour**:
- Calls `window.clientCrowdAlgorithm.getBestTimeToday()` with the selected destination’s `crowdLevel`, `category`, and `id`
- Combines hourly predictions into 2-hour bands (6–8 AM, 8–10 AM, … 8–10 PM)
- Displays all slots in **chronological order starting at 6 AM** — no sorting by crowd level
- No past-slot dimming — all time slots shown equally
- Lowest-crowd slot gets a `✦ BEST` badge regardless of whether it is past or future
- Closed destinations show an informational message instead of a grid
- Re-triggers automatically when the modal is re-opened with a previously selected destination
- Silently returns when no destination is selected (no alert shown)

---

### 2.5 Crowd Alerts Agent (Frontend)

| Property       | Value                                               |
|----------------|-----------------------------------------------------|
| **File**       | `script.js` → `submitAlert()`, `checkLocalAlerts()` |
| **Type**       | Notification Agent                                  |
| **Runtime**    | Browser (localStorage + Web Notification API)       |
| **Input**      | Destination, threshold level, email                 |
| **Output**     | Browser push notification when threshold is met     |

**Purpose**: Monitors crowd levels at user-chosen destinations and fires a browser notification when the crowd drops to the desired threshold. Operates fully client-side with no backend dependency.

**Flow**:
1. User sets destination + threshold + email in the Alert modal
2. Alert stored in `localStorage` under key `crowdwise_alerts`
3. `checkLocalAlerts()` runs on page load (after 1.2 s delay) and every 5 minutes
4. Each check calls `clientCrowdAlgorithm.calculateCrowdScore()` for the saved destination
5. If the live crowd level matches the threshold and hasn’t fired yet, `Notification` API fires a push notification
6. Fired alerts are marked `triggered: true` in localStorage to prevent re-firing

**Threshold Types**: `low`, `moderate`, `heavy`, `any`

**Note**: Email field is stored but email delivery is reserved for future backend integration once HTTPS is enabled.

---

### 2.6 Data Collector Agent (Orchestrator)

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/services/data-collector.js`            |
| **Type**       | Data Orchestration Agent                        |
| **Runtime**    | Backend (Node.js)                               |
| **Input**      | Destination name                                |
| **Output**     | Aggregated signals from all scrapers            |

**Purpose**: Coordinates all three data scrapers (Wikipedia, Social, Hotel), manages caching, rate limiting, and error recovery. Returns a unified signal package to the Crowd Scoring Agent.

**Sub-Agents Coordinated**:
- Wikipedia Scraper
- Social Media Scraper
- Hotel Availability Scraper

**Features**:
- 1-hour cache expiry per destination
- Force-refresh capability
- Stat tracking: success/failure counts, average collection time
- Data freshness monitoring

---

### 2.7 Wikipedia Scraper Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/scrapers/wikipedia-scraper.js`         |
| **Type**       | Data Collection Agent                           |
| **Runtime**    | Backend (Node.js)                               |
| **API**        | Wikimedia REST API (free, no auth)              |
| **Input**      | Destination name                                |
| **Output**     | Page view counts, trending indicator            |

**Purpose**: Fetches daily Wikipedia page view data as a proxy for tourist interest. Higher pageviews correlate with increased travel demand.

**Data Source**: `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article`

**Coverage**: 30+ destination mappings with multiple article titles per destination (e.g., "Taj Mahal" maps to `[Taj_Mahal, Agra]`).

**Cache**: 6-hour expiry.

---

### 2.8 Social Media Scraper Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/scrapers/social-scraper.js`            |
| **Type**       | Data Collection Agent                           |
| **Runtime**    | Backend (Node.js)                               |
| **Input**      | Destination name                                |
| **Output**     | Social buzz score, trending indicator            |

**Purpose**: Measures social media buzz around tourist destinations using hashtag volume patterns from Instagram, YouTube trends, and Reddit mentions.

**Hashtag Coverage**: 30+ destinations with 3–6 hashtags each (e.g., "Goa" → `#goa, #goabeaches, #goaindia, #goavibes, #northgoa, #southgoa`).

**Cache**: 2-hour expiry.

---

### 2.9 Hotel Availability Scraper Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/scrapers/hotel-scraper.js`             |
| **Type**       | Data Collection Agent                           |
| **Runtime**    | Backend (Node.js)                               |
| **Input**      | Destination name                                |
| **Output**     | Demand score, availability ratio, price trend    |

**Purpose**: Estimates crowd demand based on hotel availability patterns. Low hotel availability + high prices = high tourist demand.

**Coverage**: 27 destinations with slug mappings, average hotel counts, and peak multipliers.

**Seasonal Patterns**: Monthly multipliers (Jan: 1.3x peak → Jun: 0.6x low).

**Cache**: 4-hour expiry.

---

### 2.10 Validation & Feedback Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/services/validation-service.js`        |
| **Type**       | Self-Improvement Agent                          |
| **Runtime**    | Backend (Node.js)                               |
| **Input**      | User feedback (predicted vs. actual crowd)       |
| **Output**     | Weight adjustments, accuracy metrics             |

**Purpose**: Collects user feedback on prediction accuracy and auto-adjusts algorithm signal weights to improve future predictions.

**Self-Improvement Loop**:
1. User reports actual crowd level at a destination
2. Agent compares predicted vs. reported level
3. Calculates error and tracks per-destination accuracy
4. After 10+ feedback entries, adjusts signal weights (±5% per cycle)
5. Maximum adjustment cap: ±30% from base weights

**Feedback Types**:
- **Quick**: Thumbs up/down on accuracy
- **Detailed**: User reports specific crowd level

---

### 2.11 Scheduler Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/services/scheduler-service.js`         |
| **Type**       | Automation / Orchestration Agent                |
| **Runtime**    | Backend (Node.js, node-cron)                    |
| **Input**      | Cron schedules                                   |
| **Output**     | Triggers data collection jobs                    |

**Purpose**: Runs automated data collection jobs on defined schedules to maintain data freshness across all destinations.

**Scheduled Jobs**:

| Job               | Schedule        | Description                       |
|--------------------|----------------|-----------------------------------|
| Full Data Refresh  | Every 6 hours  | All scrapers for all destinations |
| Wikipedia Update   | Every 4 hours  | Wikipedia pageview data only       |
| Hotel Data Update  | Every 2 hours  | Hotel availability signals         |
| Stale Data Cleanup | Every 1 hour   | Refresh outdated cache entries     |
| Daily Analytics    | Midnight daily | Generate daily usage reports       |

**Status**: Ready (not auto-started; activate via `POST /api/scheduler/start`).

---

### 2.12 Backend Alert Agent (Standby)

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/server-v2.js` (inline)                |
| **Type**       | Notification Agent                              |
| **Runtime**    | Backend (Node.js, nodemailer)                   |
| **Input**      | User-defined alerts (email, destination, threshold) |
| **Output**     | Email notifications when conditions are met      |
| **Status**     | Standby — requires HTTPS on backend to activate  |

**Purpose**: Backend implementation for crowd alerts via email. Will supersede the client-side localStorage alert agent once HTTPS is enabled on the backend.

**Features**:
- Alert check interval: every 15 minutes
- Threshold types: `low`, `moderate`, `heavy`, `any`
- One-time trigger (doesn't re-fire for same alert)
- HTML email templates with crowd data
- SMTP via Gmail (configurable)

---

### 2.13 API Service Agent (Frontend)

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `api-service.js`                                |
| **Type**       | Data Integration Agent                          |
| **Runtime**    | Browser (Client-side JavaScript)                |
| **Input**      | Destination ID                                   |
| **Output**     | Weather data, crowd data, holiday data           |

**Purpose**: Manages all external API calls from the frontend, handles caching, fallbacks, and data source tracking for transparency.

**Data Flow Priority**:
1. Try backend API first (if enabled)
2. Fall back to client-side algorithm
3. Track and display data source to users

**External APIs Used**:

| API                | Purpose       | Auth    | Cost  |
|--------------------|--------------|---------|-------|
| OpenWeatherMap     | Live weather | API Key | Free  |
| Nager.Date Holiday | Indian holidays | None | Free  |

---

### 2.14 Festival Service Agent

| Property       | Value                                 |
|----------------|---------------------------------------|
| **File**       | `js/festival-service.js`              |
| **Type**       | Contextual Data Agent                 |
| **Runtime**    | Browser                               |
| **Input**      | Current date                          |
| **Output**     | Upcoming Indian festival information  |

**Purpose**: Provides festival and cultural event data to enrich crowd predictions with festival-season context. Reads from `data/festivals2026.json`.

---

### 2.15 Weather Service Agent

| Property       | Value                                      |
|----------------|--------------------------------------------|  
| **File**       | `js/weather-service.js`                    |
| **Type**       | Environmental Signal Agent                 |
| **Runtime**    | Browser                                    |
| **Input**      | Destination city/coordinates               |
| **Output**     | Temperature, condition, weather icon       |

**Purpose**: Fetches live weather data for destination pages and the main UI, passing weather condition as an optional modifier into crowd score calculations.

---

### 2.16 Accuracy Tracker Agent

| Property       | Value                                       |
|----------------|---------------------------------------------|
| **File**       | `js/accuracy-tracker.js`                    |
| **Type**       | Self-Improvement / Analytics Agent          |
| **Runtime**    | Browser                                     |
| **Input**      | User-reported crowd vs. algorithm prediction|
| **Output**     | Accuracy stats stored in localStorage       |

**Purpose**: Client-side companion to the backend Validation Agent. Tracks prediction accuracy locally, surfaces accuracy percentage to users, and feeds the feedback loop.

---

### 2.17 Gamification Agents

#### Points Engine

| Property       | Value                              |
|----------------|------------------------------------|  
| **File**       | `js/gamification/points-engine.js` |
| **Type**       | Engagement Agent                   |
| **Runtime**    | Browser (localStorage)             |
| **Input**      | User actions (visits, feedback, alerts set) |
| **Output**     | Points balance, level, XP          |

#### Badge System

| Property       | Value                              |
|----------------|------------------------------------|  
| **File**       | `js/gamification/badge-system.js`  |
| **Type**       | Engagement Agent                   |
| **Runtime**    | Browser (localStorage)             |
| **Input**      | Points milestones, action counts   |
| **Output**     | Earned badges, unlock notifications|

**Purpose**: Rewards users for contributing feedback and exploring destinations, improving data quality through voluntary participation.

---

### 2.18 Destination Photos Agent

| Property       | Value                              |
|----------------|------------------------------------|  
| **File**       | `js/destination-photos.js`         |
| **Type**       | Media Asset Agent                  |
| **Runtime**    | Browser                            |
| **Input**      | Destination ID / name              |
| **Output**     | Photo URL, attribution, lazy load  |

**Purpose**: Manages destination imagery for the destination detail page and card previews. Handles lazy loading and fallback placeholder logic.

---

## 3. Data Store Agent

| Property       | Value                                           |
|----------------|------------------------------------------------|
| **File**       | `backend/services/data-store.js`                |
| **Type**       | Persistence Agent                               |
| **Runtime**    | Backend (Node.js)                               |
| **Storage**    | JSON files (local) + PostgreSQL (RDS)            |

**Purpose**: Manages local JSON file storage for signals, predictions, feedback, and analytics. Acts as the persistence layer for all backend agents.

**JSON Files**:

| File               | Contents                              |
|--------------------|---------------------------------------|
| `signals.json`     | Scraped data signals from all sources |
| `predictions.json` | Cached prediction results              |
| `feedback.json`    | User accuracy feedback                 |
| `analytics.json`   | Usage and performance statistics       |
| `destinations.json`| Destination metadata cache             |
| `user-feedback.json`| General app feedback/suggestions      |

**Frontend Data Files**:

| File                       | Contents                          |
|----------------------------|-----------------------------------|
| `data/festivals2026.json`  | Indian festival calendar for 2026 |
| `data/user-feedbacks.json` | Persisted user feedback entries   |

---

## 4. Infrastructure

### 4.1 Frontend Hosting — Cloudflare Pages

| Property           | Value                                          |
|--------------------|-------------------------------------------------|
| **Provider**       | Cloudflare Pages (Workers)                      |
| **URL**            | https://crowdwise.in                            |
| **Workers URL**    | https://crowdwise.samverenkar.workers.dev        |
| **Deploy Method**  | Auto-deploy on `git push` to `main`             |
| **Build Command**  | None (static site)                               |
| **CDN**            | Cloudflare global network (300+ PoPs)            |
| **SSL**            | Automatic HTTPS (free)                           |
| **Bandwidth**      | Unlimited (free)                                 |
| **DNS**            | Cloudflare (nameservers: deb, mitchell)          |
| **Domain Registrar** | GoDaddy (crowdwise.in)                        |

### 4.2 Backend Hosting — AWS Elastic Beanstalk

| Property           | Value                                          |
|--------------------|-------------------------------------------------|
| **Provider**       | AWS Elastic Beanstalk                           |
| **URL**            | http://crowdwise-api.eba-ymkfcnps.us-east-1.elasticbeanstalk.com |
| **App Name**       | crowdwise-backend                                |
| **Environment**    | crowdwise-api                                    |
| **Platform**       | Node.js 22 on Amazon Linux 2023/6.7.3           |
| **Instance**       | t3.micro (free tier)                             |
| **Region**         | us-east-1 (N. Virginia)                          |
| **Port**           | 8080                                             |
| **Entry Point**    | `node server-v2.js` (via Procfile)               |
| **Status**         | Running (Green)                                  |

**Note**: Backend is currently **not connected to frontend** due to HTTPS→HTTP mixed content restriction. The frontend uses the client-side algorithm as the primary prediction source.

### 4.3 Database — AWS RDS PostgreSQL

| Property           | Value                                          |
|--------------------|-------------------------------------------------|
| **Provider**       | AWS RDS                                         |
| **Engine**         | PostgreSQL                                       |
| **Host**           | database-1.cufke8wsyh3e.us-east-1.rds.amazonaws.com |
| **Port**           | 5432                                             |
| **Database**       | crowdwise_production                             |
| **Instance**       | db.t3.micro (free tier)                          |
| **Region**         | us-east-1                                        |
| **SSL**            | Enabled (rejectUnauthorized: false)              |
| **Connection Pool**| Max 10 clients, 10s connect timeout              |

**Database Schema**:

| Table           | Rows  | Description                         |
|-----------------|-------|-------------------------------------|
| destinations    | 359   | All tourist destinations + metadata |
| alerts          | —     | User alert subscriptions            |
| feedback        | 8     | Crowd accuracy feedback             |
| user_feedback   | —     | General app feedback/suggestions    |
| scraped_data    | —     | Wikipedia, hotel, social data cache |
| active_alerts   | (view)| View of is_active=true alerts       |

---

## 5. API Endpoints

### Health & Status
| Method | Endpoint           | Description                |
|--------|-------------------|----------------------------|
| GET    | `/api/health`     | System health check         |
| GET    | `/api/status`     | Detailed status with accuracy |

### Core Data
| Method | Endpoint                      | Description                    |
|--------|------------------------------|--------------------------------|
| GET    | `/api/destinations`          | List all 359 destinations      |
| GET    | `/api/destinations/:id/full` | Full destination data package  |
| GET    | `/api/crowd/:id`             | Current crowd prediction       |
| GET    | `/api/weather/:id`           | Live weather data              |
| GET    | `/api/holidays`              | Indian holiday calendar        |

### Predictions
| Method | Endpoint                    | Description                |
|--------|----------------------------|----------------------------|
| GET    | `/api/predict/today/:id`   | Hourly forecast for today  |
| GET    | `/api/predict/week/:id`    | 7-day forecast             |
| GET    | `/api/predict/month/:id`   | 30-day forecast            |

### Feedback
| Method | Endpoint                      | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | `/api/feedback`              | Submit crowd accuracy feedback |
| GET    | `/api/feedback/prompt/:id`   | Get feedback prompt            |
| GET    | `/api/feedback/stats`        | System accuracy statistics     |
| POST   | `/api/user-feedback`         | Submit app feedback            |
| GET    | `/api/user-feedback`         | List all app feedback (admin)  |

### Alerts
| Method | Endpoint                | Description                |
|--------|------------------------|----------------------------|
| POST   | `/api/alerts`          | Create new crowd alert     |
| GET    | `/api/alerts`          | List all alerts (admin)    |
| DELETE | `/api/alerts/:alertId` | Delete an alert            |
| POST   | `/api/alerts/check`    | Manual alert trigger       |

### Data Collection
| Method | Endpoint                      | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | `/api/collect/:destination`  | Trigger manual data collection |
| GET    | `/api/data/status`           | Data freshness status          |

### Scheduler
| Method | Endpoint                 | Description              |
|--------|-------------------------|--------------------------|
| POST   | `/api/scheduler/start`  | Start automated jobs     |
| POST   | `/api/scheduler/stop`   | Stop automated jobs      |
| GET    | `/api/scheduler/status` | Current scheduler status |

---

## 6. Data Flow

### Crowd Prediction Flow (Current — Client-Side)

```
User visits crowdwise.in
        │
        ▼
  api-service.js checks USE_BACKEND_API flag
        │
        ▼ (flag = false — active path)
  client-algorithm.js
        │
        ├── Get destination from data.js (359 destinations)
        ├── Calculate time-of-day multiplier (category-specific curves)
        ├── Apply day-of-week factor (1.3× Sat, 1.4× Sun)
        ├── Apply seasonal (monthly) factor
        ├── Check Indian holidays (js/festival-service.js)
        ├── Check operating hours / destination-specific closures
        ├── Apply optional weather modifier (js/weather-service.js)
        │
        ▼
  { crowdLevel, crowdScore, percentageFull, currentEstimate }
        │
        ▼
  script.js renders crowd card + level indicator
  js/gamification/points-engine.js logs visit action
```

### Best Time Finder Flow

```
User opens Best Time Finder modal
        │
        ▼
  User selects destination from dropdown
        │ (change event fires automatically)
        ▼
  findBestTime() in script.js
        │
        ├── clientCrowdAlgorithm.getBestTimeToday(baseCrowdLevel, category, destId)
        │     └── Runs calculateCrowdScore() for each hour 6AM–9PM
        │
        ├── Build 2-hour bands chronologically (6–8, 8–10, … 20–22)
        ├── Mark lowest-crowd band as ✦ BEST
        │
        ▼
  Render all bands in 6AM→10PM order (no sorting, no past-dimming)
```

### Crowd Alert Flow (Active — Client-Side)

```
User creates alert (destination + threshold + email)
        │
        ▼
  submitAlert() saves to localStorage (crowdwise_alerts)
        │
        ▼
  checkLocalAlerts() runs on load + every 5 minutes
        │
        ├── For each saved alert:
        │     ├── clientCrowdAlgorithm.calculateCrowdScore()
        │     ├── Compare level to threshold
        │     └── If match & not triggered → Notification API fires push
        │
        ▼
  Alert marked triggered: true in localStorage
```

### Crowd Prediction Flow (Backend — Standby, Disabled)

```
User visits crowdwise.in
        │
        ▼
  api-service.js → GET /api/crowd/:id
        │
        ▼
  server-v2.js
        │
        ├── Load destination from DESTINATIONS (RDS)
        ├── Get scraped signals from DataCollector
        │     ├── WikipediaScraper → pageviews
        │     ├── SocialScraper → buzz score
        │     └── HotelScraper → demand score
        ├── CrowdScoringAlgorithm.calculateCrowdScore()
        │     └── Weighted formula across 7 signals
        ├── ValidationService.getWeightAdjustments()
        │     └── Apply feedback-based corrections
        │
        ▼
  Return: { crowdScore, crowdLevel, confidence, breakdown, ... }
```

---

## 7. Environment Variables

### Backend (`.env`)

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `PORT`                | Server port (default: 8080)              |
| `DB_HOST`             | AWS RDS PostgreSQL hostname              |
| `DB_PORT`             | Database port (default: 5432)            |
| `DB_NAME`             | Database name (crowdwise_production)     |
| `DB_USER`             | Database username                        |
| `DB_PASSWORD`         | Database password                        |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key (free tier)       |
| `EMAIL_HOST`          | SMTP host (default: smtp.gmail.com)      |
| `EMAIL_PORT`          | SMTP port (default: 587)                 |
| `EMAIL_USER`          | Email sender address                     |
| `EMAIL_PASS`          | Email app password                       |
| `EMAIL_FROM`          | Email From header                        |
| `ENABLE_SCHEDULER`    | Enable/disable scheduler (default: true) |
| `DATA_DIR`            | Local data directory (default: ./data)   |

### Frontend (`config.js`)

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `USE_BACKEND_API`      | Toggle backend vs. client-side algorithm (false) |
| `BACKEND_URL`          | Backend API base URL                             |
| `OPENWEATHER_API_KEY`  | OpenWeatherMap key for frontend weather calls    |

---

## 8. Deployment Pipeline

### Frontend (Cloudflare Pages)

```
git push origin main
        │
        ▼
  Cloudflare detects push (webhook)
        │
        ▼
  Wrangler v4.64 deploys assets
        │
        ▼
  Static files served via global CDN
        │
        ▼
  https://crowdwise.in (live in ~30s)
```

### Backend (AWS Elastic Beanstalk)

```
cd backend
eb deploy
        │
        ▼
  Creates versioned zip → uploads to S3
        │
        ▼
  EB deploys to EC2 instance (t3.micro)
        │
        ▼
  node server-v2.js starts on port 8080
        │
        ▼
  Loads 359 destinations from RDS
        │
        ▼
  http://crowdwise-api.eba-ymkfcnps... (live in ~30s)
```

---

## 9. Known Limitations & Future Work

### Current Limitations

| Issue                          | Impact                              | Workaround                        |
|--------------------------------|-------------------------------------|-----------------------------------|
| Backend HTTP only (no HTTPS)   | Cannot connect frontend to backend  | Client-side algorithm used        |
| Social scraper simulated       | Social signals are pattern-based    | Can integrate real scraping later |
| Hotel scraper simulated        | Hotel demand is pattern-based       | Can integrate real APIs later     |
| No real-time crowd sensors     | Predictions are algorithmic         | Feedback loop improves accuracy   |
| Alerts email not delivered     | Email stored but not sent           | Browser Notification API used     |

### Future Enhancements

- [ ] **Enable HTTPS on backend** — Add AWS ALB or Cloudflare Tunnel to proxy HTTPS→HTTP
- [ ] **Real social media scraping** — Use Puppeteer for Instagram/Twitter hashtag counts
- [ ] **Google Maps Popular Times** — Integrate Places API for real crowd data
- [ ] **Mobile app (PWA)** — Convert to Progressive Web App with push notifications
- [ ] **Multi-language support** — Hindi, Tamil, Telugu, etc.
- [ ] **User accounts** — Save preferences, alert history, visited destinations
- [ ] **Heatmap visualization** — India map with crowd density overlay
- [ ] **Alert email delivery** — Connect frontend alerts to backend SMTP once HTTPS is enabled

---

## 10. File Index

### Frontend Files

| File                                  | Purpose                                           | Lines |
|---------------------------------------|---------------------------------------------------|-------|
| `index.html`                          | Main HTML page (destinations, modals, UI)         | 1,005 |
| `destination.html`                    | Individual destination detail page                |   590 |
| `styles.css`                          | All CSS styling (v4 design system)                | 3,618 |
| `script.js`                           | Main UI logic, modals, search, sheet, features    | 2,885 |
| `config.js`                           | API configuration and feature flags               |   ~30 |
| `api-service.js`                      | API integration + fallback orchestration          |   668 |
| `client-algorithm.js`                 | Client-side crowd prediction engine               |   588 |
| `data.js`                             | 359 destination database                          | 5,536 |
| `feedback-widget.js`                  | User feedback UI component                        |   848 |
| `js/festival-service.js`              | Indian festival calendar service                  |   257 |
| `js/weather-service.js`               | Live weather data service                         |   204 |
| `js/accuracy-tracker.js`              | Client-side prediction accuracy tracking          |   422 |
| `js/destination-photos.js`            | Destination image management                      |   341 |
| `js/gamification/points-engine.js`    | User points and XP system                         |   344 |
| `js/gamification/badge-system.js`     | User badge and achievement system                 |   195 |
| `wrangler.toml`                       | Cloudflare Pages deployment configuration         |     — |
| `sitemap.xml`                         | SEO sitemap (359 destinations)                    |     — |
| `robots.txt`                          | SEO robots configuration                          |     — |
| `data/festivals2026.json`             | Festival calendar data for 2026                   |     — |
| `data/user-feedbacks.json`            | Persisted user feedback                           |     — |

### Backend Files

| File                                      | Purpose                               | Lines |
|-------------------------------------------|---------------------------------------|-------|
| `backend/server-v2.js`                    | Main Express API server               | 1,005 |
| `backend/algorithms/crowd-scoring.js`     | Crowd scoring algorithm               |   569 |
| `backend/algorithms/prediction-engine.js` | Forecast engine                       |   488 |
| `backend/scrapers/wikipedia-scraper.js`   | Wikipedia pageview scraper            |   484 |
| `backend/scrapers/social-scraper.js`      | Social media signal scraper           |   252 |
| `backend/scrapers/hotel-scraper.js`       | Hotel availability scraper            |   229 |
| `backend/services/data-collector.js`      | Data collection orchestrator          |   311 |
| `backend/services/data-store.js`          | JSON file persistence layer           |   354 |
| `backend/services/validation-service.js`  | Feedback & accuracy tracking          |   369 |
| `backend/services/scheduler-service.js`   | Cron job automation                   |   356 |
| `backend/config/database.js`              | PostgreSQL connection pool            |    63 |
| `backend/Procfile`                        | Elastic Beanstalk entry point         |     — |
| `backend/.ebextensions/`                  | Elastic Beanstalk environment config  |     — |
| `backend/scripts/setup-database.js`       | RDS schema initialisation script      |     — |
| `backend/scripts/migrate-data.js`         | Data migration utility                |     — |

---

## 11. Changelog

| Version | Date           | Summary |
|---------|----------------|-------------------------------------------------------------------------|
| 4.0     | Mar 1, 2026    | 359 destinations, 38 states. Gamification, festival service, weather service, accuracy tracker, destination photos added. Crowd alerts migrated to localStorage + Browser Notification API. Best Time Finder auto-triggers on destination selection, shows chronological 6 AM order with ✦ BEST badge. Client-side algorithm promoted to primary prediction source. |
| 3.0     | Feb 13, 2026   | 224 destinations. Client-side algorithm as primary. Bottom sheet UI, Discover filters, fuzzy search, destination detail page overhaul. |
| 2.0     | —              | Backend prediction engine, multi-scraper data collection, validation feedback loop. |
| 1.0     | —              | Initial launch with basic crowd scoring and static destination data. |
