# AWS Database Hosting Setup Guide
## CrowdWise India - Complete Database Migration

---

## 📋 Overview

This guide will help you migrate from local file-based storage to AWS cloud database hosting.

**Current Setup:**
- Data stored in: `data.js`, `localStorage`, `backend/data/feedback.json`
- Backend: Node.js/Express (runs locally on port 3002)
- Frontend: Static files on Netlify

**Target Setup:**
- Database: AWS RDS (PostgreSQL) OR AWS DynamoDB
- Backend: Hosted on AWS EC2/Elastic Beanstalk/Railway/Render
- Frontend: Remains on Netlify (connects to hosted backend API)

---

## 🎯 Database Options Comparison

### Option 1: AWS RDS (PostgreSQL) - **RECOMMENDED**
✅ **Best for:** Structured data, complex queries, relationships  
✅ **Advantages:**
- Familiar SQL syntax
- ACID compliance (data integrity)
- Easy to backup and restore
- Good for reports and analytics
- Free tier: 750 hours/month for 12 months

### Option 2: AWS DynamoDB
✅ **Best for:** High-scale, simple queries, key-value access  
✅ **Advantages:**
- Serverless, auto-scaling
- Pay-per-use pricing
- Very fast reads/writes
- Free tier: 25GB storage, 25 read/write units

**For CrowdWise, we'll use RDS PostgreSQL** (better for your alert system, feedback, and reporting needs).

---

## 🚀 PART 1: AWS Account Setup

### Step 1: Create/Login to AWS Account

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account" or "Sign In"
3. Complete registration (requires credit card, but we'll use free tier)
4. Enable MFA (Multi-Factor Authentication) for security

### Step 2: Access AWS Console

1. Login to AWS Console: https://console.aws.amazon.com
2. Select region: **Asia Pacific (Mumbai) - ap-south-1** (closest to India)
3. Search for "RDS" in the top search bar

---

## 🗄️ PART 2: RDS PostgreSQL Database Setup

### Step 3: Create RDS Database Instance

1. **Navigate to RDS Dashboard**
   - AWS Console → Search "RDS" → Click "RDS"
   - Click "Create database"

2. **Choose Database Creation Method**
   - Select: ✅ **Standard create**

3. **Engine Options**
   - Engine type: ✅ **PostgreSQL**
   - Version: **PostgreSQL 15.x** (latest stable)

4. **Templates**
   - Select: ✅ **Free tier** (db.t3.micro, 20GB storage)

5. **Settings**
   ```
   DB instance identifier: crowdwise-db
   Master username: crowdwise_admin
   Master password: [Create strong password - SAVE THIS!]
   Confirm password: [Same password]
   ```
   
   **⚠️ IMPORTANT:** Save these credentials securely!

6. **Instance Configuration**
   - DB instance class: **db.t3.micro** (free tier)
   - Storage type: **General Purpose SSD (gp2)**
   - Allocated storage: **20 GB**
   - ✅ Enable storage autoscaling (max: 100 GB)

7. **Connectivity**
   - Compute resource: **Don't connect to an EC2 compute resource**
   - VPC: **Default VPC**
   - Public access: ✅ **Yes** (to access from your backend)
   - VPC security group: **Create new**
     - Name: `crowdwise-db-sg`
   - Availability Zone: **No preference**
   - Database port: **5432** (default PostgreSQL port)

8. **Database Authentication**
   - Select: ✅ **Password authentication**

9. **Additional Configuration (EXPAND THIS SECTION)**
   - Initial database name: `crowdwise_production`
   - ✅ Enable automated backups (retention: 7 days)
   - Backup window: **Choose preferred time**
   - ✅ Enable Enhanced monitoring (if needed)
   - Maintenance window: **Choose preferred time**

10. **Encryption**
    - ✅ Enable encryption (free tier supports it)

11. **Click "Create database"**
    - Wait 5-10 minutes for creation ☕

### Step 4: Configure Security Group (Allow Access)

1. **Find Your Database**
   - RDS Dashboard → Databases → Click `crowdwise-db`

2. **Note the Endpoint**
   ```
   Endpoint: crowdwise-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com
   Port: 5432
   ```
   **⚠️ SAVE THIS ENDPOINT!**

3. **Edit Security Group**
   - Scroll to "Connectivity & security" tab
   - Under "Security", click the security group name (e.g., `crowdwise-db-sg`)
   - Click "Inbound rules" tab
   - Click "Edit inbound rules"

4. **Add Inbound Rules**
   
   **Rule 1: Your Development Machine**
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: My IP (your current IP will auto-fill)
   Description: My development machine
   ```

   **Rule 2: Your Backend Server (add later when deployed)**
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: [Backend server IP or 0.0.0.0/0 for testing]
   Description: Backend API server
   ```

   **⚠️ WARNING:** Using `0.0.0.0/0` allows all IPs (use only for testing, then restrict to your backend server IP)

5. **Click "Save rules"**

---

## 🔧 PART 3: Local Database Setup & Connection

### Step 5: Install PostgreSQL Client (on your machine)

**Windows (Using Chocolatey):**
```powershell
# Install Chocolatey if not installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install PostgreSQL client
choco install postgresql15 -y
```

**Alternative: Download PostgreSQL Installer**
- Download from: https://www.postgresql.org/download/windows/
- Install only "Command Line Tools"

### Step 6: Test Database Connection

```powershell
# Replace with YOUR endpoint and credentials
psql -h crowdwise-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com -p 5432 -U crowdwise_admin -d crowdwise_production
# Enter password when prompted
```

**Expected output:**
```
crowdwise_production=>
```

**If connection fails:**
- Check security group allows your IP
- Verify endpoint, username, database name
- Check your internet connection

### Step 7: Create Database Schema

**Connect to database, then run:**

```sql
-- Create destinations table
CREATE TABLE destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    crowd_level VARCHAR(50),
    crowd_score INTEGER,
    best_time VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    rating DECIMAL(3, 2),
    operating_hours JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    threshold VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    CONSTRAINT valid_threshold CHECK (threshold IN ('low', 'moderate', 'high'))
);

-- Create feedback table
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    user_email VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_feedback table (for general app feedback)
CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scraped_data table (for Wikipedia, hotels, social media)
CREATE TABLE scraped_data (
    id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    data_type VARCHAR(50),
    content JSONB,
    last_scraped TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_source CHECK (source IN ('wikipedia', 'hotel', 'social'))
);

-- Create indexes for better performance
CREATE INDEX idx_destinations_state ON destinations(state);
CREATE INDEX idx_destinations_category ON destinations(category);
CREATE INDEX idx_destinations_name ON destinations(name);
CREATE INDEX idx_alerts_email ON alerts(email);
CREATE INDEX idx_alerts_destination ON alerts(destination_name);
CREATE INDEX idx_feedback_destination ON feedback(destination_name);
CREATE INDEX idx_scraped_destination ON scraped_data(destination_name);

-- Create view for active alerts
CREATE VIEW active_alerts AS
SELECT * FROM alerts WHERE is_active = true;

-- Success message
SELECT 'Database schema created successfully!' AS status;
```

**Expected output:**
```
CREATE TABLE
CREATE TABLE
...
         status          
-------------------------
 Database schema created successfully!
```

---

## 💾 PART 4: Backend Code Integration

### Step 8: Install PostgreSQL Driver

```powershell
cd C:\WheelocityDashboards\tourist-crowd-tracker\backend
npm install pg dotenv
```

### Step 9: Create Database Connection Module

Create `backend/config/database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false // Required for AWS RDS
    },
    max: 20, // Maximum number of clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    transaction
};
```

### Step 10: Create Environment Variables File

Create `backend/.env`:

```env
# Database Configuration
DB_HOST=crowdwise-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=crowdwise_production
DB_USER=crowdwise_admin
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Server Configuration
PORT=3002
NODE_ENV=production

# API Keys (add your existing keys)
WEATHER_API_KEY=your_key_here
MAPS_API_KEY=your_key_here
```

**⚠️ IMPORTANT:** 
1. Replace `xxxxxxxxx` with your actual RDS endpoint
2. Replace password with your actual database password
3. Add `.env` to `.gitignore` (never commit credentials!)

### Step 11: Update .gitignore

Add to `.gitignore`:
```
backend/.env
backend/node_modules/
.env
*.env.local
*.env.production
```

---

## 🔌 PART 5: Update Backend API Endpoints

### Step 12: Create Database Service Layer

Create `backend/services/db-service.js`:

```javascript
const db = require('../config/database');

class DatabaseService {
    
    // ========== DESTINATIONS ==========
    async getAllDestinations() {
        const result = await db.query('SELECT * FROM destinations ORDER BY name');
        return result.rows;
    }

    async getDestinationByName(name) {
        const result = await db.query(
            'SELECT * FROM destinations WHERE name = $1',
            [name]
        );
        return result.rows[0];
    }

    async updateDestinationCrowdData(name, crowdData) {
        const result = await db.query(
            `UPDATE destinations 
             SET crowd_level = $2, crowd_score = $3, last_updated = CURRENT_TIMESTAMP 
             WHERE name = $1 
             RETURNING *`,
            [name, crowdData.crowdLevel, crowdData.crowdScore]
        );
        return result.rows[0];
    }

    // ========== ALERTS ==========
    async createAlert(alertData) {
        const { destinationName, threshold, email } = alertData;
        const result = await db.query(
            `INSERT INTO alerts (destination_name, threshold, email) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [destinationName, threshold, email]
        );
        return result.rows[0];
    }

    async getAlertsByEmail(email) {
        const result = await db.query(
            'SELECT * FROM alerts WHERE email = $1 AND is_active = true',
            [email]
        );
        return result.rows;
    }

    async getActiveAlerts() {
        const result = await db.query('SELECT * FROM active_alerts');
        return result.rows;
    }

    async deactivateAlert(alertId) {
        const result = await db.query(
            'UPDATE alerts SET is_active = false WHERE id = $1 RETURNING *',
            [alertId]
        );
        return result.rows[0];
    }

    async updateAlertLastTriggered(alertId) {
        const result = await db.query(
            'UPDATE alerts SET last_triggered = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [alertId]
        );
        return result.rows[0];
    }

    // ========== FEEDBACK ==========
    async createFeedback(feedbackData) {
        const { destinationName, rating, comment, userEmail } = feedbackData;
        const result = await db.query(
            `INSERT INTO feedback (destination_name, rating, comment, user_email) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [destinationName, rating, comment, userEmail]
        );
        return result.rows[0];
    }

    async getFeedbackByDestination(destinationName) {
        const result = await db.query(
            'SELECT * FROM feedback WHERE destination_name = $1 ORDER BY created_at DESC',
            [destinationName]
        );
        return result.rows;
    }

    async getAllFeedback(limit = 100) {
        const result = await db.query(
            'SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    }

    // ========== USER FEEDBACK (General App) ==========
    async createUserFeedback(feedbackData) {
        const { name, email, rating, feedbackType, message } = feedbackData;
        const result = await db.query(
            `INSERT INTO user_feedback (name, email, rating, feedback_type, message) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [name, email, rating, feedbackType, message]
        );
        return result.rows[0];
    }

    // ========== SCRAPED DATA ==========
    async saveScrapedData(scrapedData) {
        const { destinationName, source, dataType, content } = scrapedData;
        const result = await db.query(
            `INSERT INTO scraped_data (destination_name, source, data_type, content) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (destination_name, source) 
             DO UPDATE SET content = $4, last_scraped = CURRENT_TIMESTAMP
             RETURNING *`,
            [destinationName, source, dataType, JSON.stringify(content)]
        );
        return result.rows[0];
    }

    async getScrapedData(destinationName, source) {
        const result = await db.query(
            'SELECT * FROM scraped_data WHERE destination_name = $1 AND source = $2',
            [destinationName, source]
        );
        return result.rows[0];
    }

    // ========== ANALYTICS ==========
    async getDestinationStats() {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_destinations,
                COUNT(DISTINCT state) as total_states,
                AVG(crowd_score) as avg_crowd_score,
                COUNT(CASE WHEN crowd_level = 'low' THEN 1 END) as low_crowd_count,
                COUNT(CASE WHEN crowd_level = 'moderate' THEN 1 END) as moderate_crowd_count,
                COUNT(CASE WHEN crowd_level = 'high' THEN 1 END) as high_crowd_count
            FROM destinations
        `);
        return result.rows[0];
    }

    async getAlertStats() {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_alerts,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_alerts,
                COUNT(DISTINCT email) as unique_users
            FROM alerts
        `);
        return result.rows[0];
    }
}

module.exports = new DatabaseService();
```

### Step 13: Update Server Routes

Update `backend/server-v2.js` (or create new `backend/server-db.js`):

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const dbService = require('./services/db-service');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== DESTINATIONS ENDPOINTS ==========
app.get('/api/destinations', async (req, res) => {
    try {
        const destinations = await dbService.getAllDestinations();
        res.json(destinations);
    } catch (error) {
        console.error('Error fetching destinations:', error);
        res.status(500).json({ error: 'Failed to fetch destinations' });
    }
});

app.get('/api/destinations/:name', async (req, res) => {
    try {
        const destination = await dbService.getDestinationByName(req.params.name);
        if (destination) {
            res.json(destination);
        } else {
            res.status(404).json({ error: 'Destination not found' });
        }
    } catch (error) {
        console.error('Error fetching destination:', error);
        res.status(500).json({ error: 'Failed to fetch destination' });
    }
});

// ========== ALERTS ENDPOINTS ==========
app.post('/api/alerts', async (req, res) => {
    try {
        const { destinationName, threshold, email } = req.body;
        
        if (!destinationName || !threshold || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const alert = await dbService.createAlert({ destinationName, threshold, email });
        res.status(201).json({ 
            success: true, 
            message: 'Alert created successfully',
            alert 
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

app.get('/api/alerts/:email', async (req, res) => {
    try {
        const alerts = await dbService.getAlertsByEmail(req.params.email);
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

app.delete('/api/alerts/:id', async (req, res) => {
    try {
        const alert = await dbService.deactivateAlert(req.params.id);
        res.json({ success: true, alert });
    } catch (error) {
        console.error('Error deactivating alert:', error);
        res.status(500).json({ error: 'Failed to deactivate alert' });
    }
});

// ========== FEEDBACK ENDPOINTS ==========
app.post('/api/feedback', async (req, res) => {
    try {
        const { destinationName, rating, comment, userEmail } = req.body;
        
        if (!destinationName || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const feedback = await dbService.createFeedback({ 
            destinationName, 
            rating, 
            comment, 
            userEmail 
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Feedback submitted successfully',
            feedback 
        });
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

app.get('/api/feedback/:destinationName', async (req, res) => {
    try {
        const feedback = await dbService.getFeedbackByDestination(req.params.destinationName);
        res.json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// ========== USER FEEDBACK (General App) ==========
app.post('/api/user-feedback', async (req, res) => {
    try {
        const { name, email, rating, feedbackType, message } = req.body;
        
        if (!email || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const feedback = await dbService.createUserFeedback({ 
            name, 
            email, 
            rating, 
            feedbackType, 
            message 
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Thank you for your feedback!',
            feedback 
        });
    } catch (error) {
        console.error('Error creating user feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// ========== ANALYTICS/STATS ==========
app.get('/api/stats', async (req, res) => {
    try {
        const destinationStats = await dbService.getDestinationStats();
        const alertStats = await dbService.getAlertStats();
        
        res.json({
            destinations: destinationStats,
            alerts: alertStats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CrowdWise API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: ${process.env.DB_HOST}`);
});
```

---

## 📤 PART 6: Data Migration

### Step 14: Create Migration Script

Create `backend/scripts/migrate-to-postgres.js`:

```javascript
const db = require('../config/database');
const destinations = require('../../data.js').destinations;
const fs = require('fs');

async function migrateDestinations() {
    console.log('📦 Migrating destinations...');
    
    for (const dest of destinations) {
        try {
            await db.query(
                `INSERT INTO destinations 
                (name, state, category, crowd_level, crowd_score, best_time, 
                 latitude, longitude, rating, operating_hours) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (name) DO NOTHING`,
                [
                    dest.name,
                    dest.state,
                    dest.category,
                    dest.crowdLevel,
                    dest.crowdScore,
                    dest.bestTime,
                    dest.location?.lat,
                    dest.location?.lng,
                    dest.rating,
                    JSON.stringify(dest.operatingHours || {})
                ]
            );
            console.log(`✅ Migrated: ${dest.name}`);
        } catch (error) {
            console.error(`❌ Failed to migrate ${dest.name}:`, error.message);
        }
    }
}

async function migrateFeedback() {
    console.log('📦 Migrating feedback...');
    
    const feedbackPath = './backend/data/feedback.json';
    if (fs.existsSync(feedbackPath)) {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
        
        for (const fb of feedbackData) {
            try {
                await db.query(
                    `INSERT INTO feedback 
                    (destination_name, rating, comment, user_email) 
                    VALUES ($1, $2, $3, $4)`,
                    [fb.destinationName, fb.rating, fb.comment, fb.email]
                );
                console.log(`✅ Migrated feedback for: ${fb.destinationName}`);
            } catch (error) {
                console.error(`❌ Failed to migrate feedback:`, error.message);
            }
        }
    }
}

async function runMigration() {
    try {
        console.log('🚀 Starting data migration to PostgreSQL...\n');
        
        await migrateDestinations();
        await migrateFeedback();
        
        console.log('\n✅ Migration completed successfully!');
        
        // Verify migration
        const destCount = await db.query('SELECT COUNT(*) FROM destinations');
        const feedbackCount = await db.query('SELECT COUNT(*) FROM feedback');
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   Destinations: ${destCount.rows[0].count}`);
        console.log(`   Feedback: ${feedbackCount.rows[0].count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
```

### Step 15: Run Migration

```powershell
cd C:\WheelocityDashboards\tourist-crowd-tracker\backend
node scripts/migrate-to-postgres.js
```

**Expected output:**
```
🚀 Starting data migration to PostgreSQL...
✅ Migrated: Taj Mahal
✅ Migrated: Jaipur City Palace
...
✅ Migration completed successfully!

📊 Migration Summary:
   Destinations: 224
   Feedback: 45
```

---

## 🌐 PART 7: Backend Hosting Options

Your backend needs to be hosted (currently runs on localhost:3002). Here are the best options:

### Option A: Railway (RECOMMENDED - Free Tier Available)

**Pros:** Easy deployment, PostgreSQL addon, free $5/month credit  
**Setup:**

1. Create account: https://railway.app
2. Connect GitHub repository
3. Add PostgreSQL service (or use AWS RDS endpoint)
4. Add environment variables from `.env`
5. Deploy automatically on git push

### Option B: Render (Good Free Tier)

**Pros:** Free tier includes PostgreSQL, auto-deploys  
**Setup:**

1. Create account: https://render.com
2. New Web Service → Connect GitHub repo
3. Build command: `cd backend && npm install`
4. Start command: `node backend/server-db.js`
5. Add environment variables

### Option C: AWS Elastic Beanstalk

**Pros:** Full AWS integration, scalable  
**Setup:** More complex, detailed guide available if needed

### Option D: Vercel/Netlify Functions (Serverless)

**Pros:** Serverless, auto-scaling  
**Cons:** Requires refactoring to serverless functions

**For quick setup, use Railway or Render.**

---

## 🔄 PART 8: Update Frontend to Use Hosted Backend

### Step 16: Update config.js

```javascript
const API_CONFIG = {
    // Update this with your hosted backend URL
    BACKEND_API_URL: 'https://crowdwise-api.railway.app/api', // Replace with your Railway/Render URL
    
    // Keep existing settings
    USE_REAL_CROWD_DATA: true,
    ENABLE_DYNAMIC_MOCK: false,
    USE_REAL_WEATHER: true,
    
    // Data sources
    CROWD_DATA_SOURCE: 'database', // Changed from 'local'
    UPDATE_INTERVAL: 300000, // 5 minutes
    
    // Feature flags
    ENABLE_ALERTS: true,
    ENABLE_FEEDBACK: true,
    ENABLE_SCRAPERS: true
};
```

### Step 17: Update script.js API calls

```javascript
// Update all API calls to use hosted backend
// Example:

async function submitAlert() {
    const destinationName = document.getElementById('alertDestination').value;
    const threshold = document.getElementById('alertThreshold').value;
    const email = document.getElementById('alertEmail').value;
    
    try {
        const response = await fetch(`${API_CONFIG.BACKEND_API_URL}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinationName, threshold, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlertConfirmation();
        } else {
            alert('Failed to create alert');
        }
    } catch (error) {
        console.error('Error creating alert:', error);
        // Fallback to localStorage if backend unavailable
        localStorage.setItem('alert_' + Date.now(), JSON.stringify({ 
            destinationName, threshold, email 
        }));
        showAlertConfirmation();
    }
}
```

---

## ✅ PART 9: Testing & Verification

### Step 18: Test Database Endpoints

```powershell
# Test health check
curl https://your-backend-url.com/api/health

# Test destinations endpoint
curl https://your-backend-url.com/api/destinations

# Test alert creation
curl -X POST https://your-backend-url.com/api/alerts `
  -H "Content-Type: application/json" `
  -d '{"destinationName":"Taj Mahal","threshold":"moderate","email":"test@example.com"}'
```

### Step 19: Test Frontend Integration

1. Open https://crowdwise.in
2. Test search functionality
3. Test "Set Alert" button
4. Verify alert is saved to database (check RDS via psql)
5. Test feedback submission
6. Check "Near Me" feature

### Step 20: Monitor Database

**Check database usage:**
```sql
-- Connect to database
psql -h crowdwise-db.xxx.rds.amazonaws.com -U crowdwise_admin -d crowdwise_production

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check recent alerts
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;

-- Check feedback count
SELECT destination_name, COUNT(*), AVG(rating) 
FROM feedback 
GROUP BY destination_name 
ORDER BY COUNT(*) DESC 
LIMIT 10;
```

---

## 🔒 PART 10: Security Best Practices

### Step 21: Secure Your Database

1. **Restrict Security Group**
   - Remove `0.0.0.0/0` rule
   - Add only your backend server IP

2. **Use Environment Variables**
   - Never commit `.env` file
   - Use Railway/Render environment variable settings

3. **Enable SSL**
   - Already configured in database.js (`ssl: { rejectUnauthorized: false }`)

4. **Rotate Credentials**
   - Change database password every 90 days
   - RDS Console → Modify → Master password

5. **Enable Backups**
   - RDS Console → Automated backups (already enabled)
   - Test restore process monthly

### Step 22: Set Up Monitoring

**AWS CloudWatch (Free Tier)**
1. RDS Dashboard → Select database → Monitoring tab
2. View CPU, connections, storage metrics
3. Set up alarms for high usage

**Database Connection Pooling**
- Already configured in database.js (`max: 20`)
- Monitor with CloudWatch

---

## 💰 Cost Estimate

**AWS RDS Free Tier (12 months):**
- ✅ 750 hours/month db.t3.micro
- ✅ 20GB storage
- ✅ 20GB backup storage
- ❌ After 12 months: ~$15-25/month

**Backend Hosting:**
- Railway: $5/month credit (free)
- Render: Free tier available
- After free tier: ~$7-10/month

**Total after free tier: ~$20-35/month**

---

## 📝 Maintenance Tasks

**Daily:**
- Monitor error logs (Railway/Render dashboard)
- Check API health endpoint

**Weekly:**
- Review database performance (CloudWatch)
- Check backup status
- Review alert deliveries

**Monthly:**
- Analyze database growth
- Optimize slow queries
- Review security group rules
- Test database restore process

**Quarterly:**
- Rotate database password
- Review AWS costs
- Update dependencies (`npm update`)

---

## 🆘 Troubleshooting

### Connection Timeout
```
Error: connect ETIMEDOUT
```
**Fix:** Check security group allows your IP

### Authentication Failed
```
Error: password authentication failed
```
**Fix:** Verify username/password in `.env`

### Too Many Connections
```
Error: remaining connection slots are reserved
```
**Fix:** Increase connection pool limit or upgrade instance

### Migration Failed
```
Error: relation "destinations" already exists
```
**Fix:** Drop table or use `ON CONFLICT DO NOTHING`

---

## 📚 Additional Resources

- AWS RDS Documentation: https://docs.aws.amazon.com/rds/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Railway Guide: https://docs.railway.app/
- Render Guide: https://render.com/docs

---

## ✅ Deployment Checklist

- [ ] AWS account created and verified
- [ ] RDS PostgreSQL database created
- [ ] Security group configured (allow backend IP)
- [ ] Database schema created (all tables)
- [ ] PostgreSQL client installed locally
- [ ] Connection tested from local machine
- [ ] `pg` and `dotenv` npm packages installed
- [ ] Database connection module created (`database.js`)
- [ ] Database service layer created (`db-service.js`)
- [ ] Server routes updated (`server-db.js`)
- [ ] `.env` file created with credentials
- [ ] `.gitignore` updated (exclude `.env`)
- [ ] Migration script created
- [ ] Data migrated to PostgreSQL
- [ ] Backend deployed to Railway/Render
- [ ] Backend URL obtained
- [ ] `config.js` updated with backend URL
- [ ] Frontend deployed to Netlify
- [ ] API endpoints tested
- [ ] Alert system tested end-to-end
- [ ] Feedback system tested
- [ ] CloudWatch monitoring enabled
- [ ] Database backups verified
- [ ] Documentation updated

---

**🎉 Congratulations! Your CrowdWise India app is now running on AWS database!**

**Next Steps:**
1. Start with Part 1 (AWS Account)
2. Follow each part sequentially
3. Test after each major section
4. Ask if you get stuck on any step

**Need help?** Let me know which part you need assistance with!
