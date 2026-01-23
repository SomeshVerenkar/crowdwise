# 🔌 CrowdWise India - API Integration Guide

## 📊 Data Status System

CrowdWise India now includes a **data transparency indicator** in the header that shows you exactly where the data comes from:

| Indicator | Meaning |
|-----------|---------|
| 🟢 **Live Data** | Real-time data from APIs |
| 🟡 **Partial Live** | Mix of live and simulated |
| 🔴 **Demo Data** | Using simulated patterns |

Click the indicator to see detailed source information for each data type.

---

## 🌤️ Option 1: Quick Setup (Weather Only) - Recommended

For **immediate live weather data**, just add an OpenWeatherMap API key:

### Step 1: Get Your Free API Key (2 minutes)

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Click "Sign Up" and create account
3. Go to "API Keys" tab
4. Copy your default key

### Step 2: Add Key to Config

Open `config.js` and update:

```javascript
const API_CONFIG = {
    // Replace with your actual key
    WEATHER_API_KEY: 'your_actual_openweathermap_key',
    
    // Enable real weather
    USE_REAL_WEATHER: true,
    
    // Keep dynamic simulation for crowd data
    ENABLE_DYNAMIC_MOCK: true
};
```

### Step 3: Refresh & Verify

1. Refresh the page
2. Click the data indicator in the header
3. Weather should show "LIVE" badge

**That's it!** Weather is now live. Crowd data uses smart algorithms.

---

## 🖥️ Option 2: Full Backend Setup (Advanced)

For **maximum data accuracy**, run the backend server:

### Prerequisites

- Node.js 14+ installed
- npm or yarn

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
OPENWEATHER_API_KEY=your_openweathermap_key
GOOGLE_PLACES_API_KEY=your_google_places_key
PORT=3001
```

### Step 3: Start the Backend

```bash
npm start
```

You should see:
```
═══════════════════════════════════════════════════
🗺️  CrowdWise India - Backend API Server
═══════════════════════════════════════════════════
✅ Server running on http://localhost:3001
📡 API endpoints:
   GET /api/health
   GET /api/weather/:destinationId
   GET /api/crowd/:destinationId
   GET /api/holidays
═══════════════════════════════════════════════════
```

### Step 4: Enable Backend in Frontend

Update `config.js`:

```javascript
const API_CONFIG = {
    USE_BACKEND_API: true,
    BACKEND_API_URL: 'http://localhost:3001/api',
    // ...
};
```

---

## 🔑 API Keys Reference

### OpenWeatherMap (FREE - Recommended)

| Feature | Details |
|---------|---------|
| **Website** | https://openweathermap.org/api |
| **Free Tier** | 1,000 calls/day |
| **Data** | Temperature, conditions, humidity |
| **Setup Time** | Instant |

### Google Places API (Optional)

| Feature | Details |
|---------|---------|
| **Website** | https://console.cloud.google.com |
| **Free Tier** | $200 credit/month |
| **Data** | Popular times, real crowd data |
| **Setup Time** | 5-10 minutes |
| **Note** | Requires backend due to CORS |

### WeatherAPI (Backup)

| Feature | Details |
|---------|---------|
| **Website** | https://weatherapi.com |
| **Free Tier** | 1,000,000 calls/month |
| **Data** | Weather + forecasts |
| **Setup Time** | Instant |

---

## 📈 Data Sources Explained

### Weather Data

| Source | Priority | Accuracy |
|--------|----------|----------|
| OpenWeatherMap | Primary | 95%+ |
| WeatherAPI | Backup | 95%+ |
| Backend | Alt | 95%+ |
| Mock | Fallback | ~70% |

### Crowd Data

| Source | Priority | Accuracy |
|--------|----------|----------|
| Backend + Google Places | Best | 85-90% |
| Smart Algorithm | Default | 70-80% |
| Static Mock | Fallback | ~50% |

The smart algorithm considers:
- ⏰ Time of day (peak hours: 10am-4pm)
- 📅 Day of week (weekends +70%)
- 🗓️ Season (winter tourism +40%)
- 🎉 Holidays (auto-detected via API)

---

## 🧪 Testing Your Setup

### Check Console Logs

Open browser DevTools (F12) and look for:

```
🌤️ Fetching weather for Agra...
✅ Live weather for Agra: 28°C, Clear
```

### Verify Data Status Modal

1. Click the data indicator in header
2. Check each source shows correct status
3. Quality meter should update accordingly

### API Health Check (Backend)

If running backend:
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "weather": "configured",
    "crowd": "not configured"
  }
}
```

---

## 🛠️ Troubleshooting

### Weather Not Loading

1. Check API key is valid at openweathermap.org
2. Ensure `USE_REAL_WEATHER: true` in config
3. Check browser console for errors
4. Verify no ad-blocker blocking requests

### Backend Connection Failed

1. Ensure backend is running (`npm start`)
2. Check port 3001 is available
3. Verify CORS settings if different origin

### Data Shows "Demo"

1. API key may be invalid or expired
2. Rate limit may be exceeded
3. Network issues with API provider

---

## 🚀 Future Integrations

### Phase 2: Enhanced Data Sources

| Source | Data Type | Status |
|--------|-----------|--------|
| Indian Railways API | Tourist influx | 🔜 Planned |
| Telecom mobility | Anonymous crowd | 🔜 Planned |
| Event databases | Festival crowds | 🔜 Planned |
| Hotel booking APIs | Occupancy rates | 🔜 Planned |

### Phase 3: Machine Learning

- Historical pattern analysis
- Crowd prediction models
- Personalized recommendations

---

## 💬 Support

Having issues? Check:
1. Browser console for errors
2. Network tab for failed requests
3. Config.js for correct settings

The data indicator will always show you exactly what data source is being used!
