require('dotenv').config();
const { Client } = require('pg');

console.log('🗄️  Creating CrowdWise Database Schema...\n');

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

const schema = `
-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
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
CREATE TABLE IF NOT EXISTS alerts (
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
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    user_email VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_feedback table (for general app feedback)
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scraped_data table (for Wikipedia, hotels, social media)
CREATE TABLE IF NOT EXISTS scraped_data (
    id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    data_type VARCHAR(50),
    content JSONB,
    last_scraped TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_source CHECK (source IN ('wikipedia', 'hotel', 'social')),
    UNIQUE(destination_name, source)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_destinations_state ON destinations(state);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);
CREATE INDEX IF NOT EXISTS idx_alerts_email ON alerts(email);
CREATE INDEX IF NOT EXISTS idx_alerts_destination ON alerts(destination_name);
CREATE INDEX IF NOT EXISTS idx_feedback_destination ON feedback(destination_name);
CREATE INDEX IF NOT EXISTS idx_scraped_destination ON scraped_data(destination_name);

-- Create view for active alerts
CREATE OR REPLACE VIEW active_alerts AS
SELECT * FROM alerts WHERE is_active = true;
`;

async function setupDatabase() {
    try {
        console.log('⏳ Connecting to database...');
        await client.connect();
        console.log('✅ Connected!\n');
        
        console.log('⏳ Creating tables and indexes...');
        await client.query(schema);
        console.log('✅ Schema created successfully!\n');
        
        // Verify tables
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Created tables:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });
        
        await client.end();
        console.log('\n✅ Database setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();
