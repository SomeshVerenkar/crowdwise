require('dotenv').config();
const db = require('../config/database');
const { destinations } = require('../../data.js');
const fs = require('fs');
const path = require('path');

console.log('📦 CrowdWise Data Migration to PostgreSQL\n');
console.log(`Found ${destinations.length} destinations to migrate\n`);

async function migrateDestinations() {
    console.log('⏳ Migrating destinations...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const dest of destinations) {
        try {
            await db.query(
                `INSERT INTO destinations 
                (name, state, category, crowd_level, crowd_score, best_time, 
                 latitude, longitude, rating, operating_hours) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (name) DO UPDATE SET
                    state = EXCLUDED.state,
                    category = EXCLUDED.category,
                    crowd_level = EXCLUDED.crowd_level,
                    crowd_score = EXCLUDED.crowd_score,
                    best_time = EXCLUDED.best_time,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    rating = EXCLUDED.rating,
                    operating_hours = EXCLUDED.operating_hours,
                    last_updated = CURRENT_TIMESTAMP`,
                [
                    dest.name,
                    dest.state,
                    dest.category,
                    dest.crowdLevel,
                    dest.crowdScore,
                    dest.bestTime,
                    dest.location?.lat || null,
                    dest.location?.lng || null,
                    dest.rating || null,
                    JSON.stringify(dest.operatingHours || {})
                ]
            );
            successCount++;
            if (successCount % 50 === 0) {
                console.log(`   ✓ Migrated ${successCount} destinations...`);
            }
        } catch (error) {
            errorCount++;
            console.error(`   ✗ Failed to migrate ${dest.name}:`, error.message);
        }
    }
    
    console.log(`\n✅ Destinations migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
}

async function migrateFeedback() {
    console.log('\n⏳ Migrating feedback...');
    
    const feedbackPath = path.join(__dirname, '../data/feedback.json');
    if (!fs.existsSync(feedbackPath)) {
        console.log('   ⚠️  No feedback.json found - skipping');
        return;
    }
    
    try {
        const feedbackData = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
        let count = 0;
        
        for (const fb of feedbackData) {
            try {
                await db.query(
                    `INSERT INTO feedback 
                    (destination_name, rating, comment, user_email, created_at) 
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        fb.destinationName || fb.destination, 
                        fb.rating, 
                        fb.comment || fb.message, 
                        fb.email || fb.userEmail,
                        fb.createdAt || new Date()
                    ]
                );
                count++;
            } catch (error) {
                console.error(`   ✗ Failed to migrate feedback:`, error.message);
            }
        }
        
        console.log(`✅ Migrated ${count} feedback entries`);
    } catch (error) {
        console.log('   ⚠️  Could not read feedback.json:', error.message);
    }
}

async function verifyMigration() {
    console.log('\n📊 Verifying migration...');
    
    const destCount = await db.query('SELECT COUNT(*) FROM destinations');
    const feedbackCount = await db.query('SELECT COUNT(*) FROM feedback');
    const alertCount = await db.query('SELECT COUNT(*) FROM alerts');
    
    console.log('\n✅ Database Summary:');
    console.log(`   Destinations: ${destCount.rows[0].count}`);
    console.log(`   Feedback: ${feedbackCount.rows[0].count}`);
    console.log(`   Alerts: ${alertCount.rows[0].count}`);
    
    // Show sample data
    const sampleDest = await db.query('SELECT name, state, crowd_level FROM destinations LIMIT 5');
    console.log('\n📍 Sample destinations:');
    sampleDest.rows.forEach(d => {
        console.log(`   • ${d.name}, ${d.state} - ${d.crowd_level}`);
    });
}

async function runMigration() {
    try {
        console.log('🚀 Starting migration...\n');
        
        await migrateDestinations();
        await migrateFeedback();
        await verifyMigration();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('✅ Your CrowdWise data is now in AWS RDS PostgreSQL!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

runMigration();
