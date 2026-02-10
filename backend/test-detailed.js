require('dotenv').config();
const { Client } = require('pg');

console.log('🔍 Detailed Connection Test');
console.log('================================');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database: postgres (default)');
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET');
console.log('================================\n');

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
});

async function testConnection() {
    try {
        console.log('⏳ Connecting...');
        await client.connect();
        console.log('✅ Connected successfully!\n');
        
        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL Version:', result.rows[0].version);
        
        await client.end();
        console.log('\n✅ Connection test PASSED!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Connection FAILED');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('\nFull Error:', error);
        process.exit(1);
    }
}

testConnection();
