require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...');
console.log('Host:', process.env.DB_HOST);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        console.log('\n⏳ Attempting to connect...');
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL!');
        
        const result = await client.query('SELECT NOW()');
        console.log('⏰ Database time:', result.rows[0].now);
        
        client.release();
        console.log('✅ Connection test passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('timeout')) {
            console.log('\n💡 Solution: Configure Security Group to allow your IP');
            console.log('   Follow the guide to add your IP to inbound rules');
        } else if (error.message.includes('password')) {
            console.log('\n💡 Solution: Check your password in .env file');
        } else if (error.message.includes('database')) {
            console.log('\n💡 Solution: Verify database name is correct');
        }
        
        process.exit(1);
    }
}

testConnection();
