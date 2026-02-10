require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing connection to default postgres database...');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Try default database
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        console.log('\n⏳ Attempting to connect to postgres database...');
        const client = await pool.connect();
        console.log('✅ Successfully connected!');
        
        // Check if our database exists
        const result = await client.query(
            "SELECT datname FROM pg_database WHERE datname = 'crowdwise_production'"
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Database "crowdwise_production" exists!');
        } else {
            console.log('⚠️  Database "crowdwise_production" does NOT exist');
            console.log('💡 Creating database...');
            
            await client.query('CREATE DATABASE crowdwise_production');
            console.log('✅ Database created successfully!');
        }
        
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('password')) {
            console.log('\n💡 The password in .env file does not match what you set in AWS');
            console.log('   Double-check your password (case-sensitive, exact characters)');
        }
        
        process.exit(1);
    }
}

testConnection();
