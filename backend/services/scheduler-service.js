// ============================================================
// Scheduler Service - Automated Data Collection
// ============================================================
// Runs periodic data collection jobs
// Maintains data freshness across all destinations
// ============================================================

const cron = require('node-cron');
const DataCollector = require('./data-collector');

class SchedulerService {
    constructor(dataStore) {
        this.dataCollector = new DataCollector();
        this.dataStore = dataStore;
        this.jobs = new Map();
        this.isRunning = false;
        
        // Job configurations
        this.jobConfigs = {
            // Full data refresh every 6 hours
            fullRefresh: {
                schedule: '0 */6 * * *',
                name: 'Full Data Refresh',
                handler: () => this.runFullRefresh()
            },
            // Wikipedia updates every 4 hours
            wikiUpdate: {
                schedule: '0 */4 * * *',
                name: 'Wikipedia Update',
                handler: () => this.runWikipediaUpdate()
            },
            // Hotel data every 2 hours (changes more frequently)
            hotelUpdate: {
                schedule: '0 */2 * * *',
                name: 'Hotel Data Update',
                handler: () => this.runHotelUpdate()
            },
            // Stale data cleanup every hour
            staleCleanup: {
                schedule: '30 * * * *',
                name: 'Stale Data Refresh',
                handler: () => this.refreshStaleData()
            },
            // Daily analytics at midnight
            dailyAnalytics: {
                schedule: '0 0 * * *',
                name: 'Daily Analytics',
                handler: () => this.runDailyAnalytics()
            }
        };

        // Job history
        this.jobHistory = [];
        this.maxHistorySize = 100;
    }

    // Start all scheduled jobs
    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduler already running');
            return;
        }

        console.log('🚀 Starting scheduler service...');

        Object.entries(this.jobConfigs).forEach(([key, config]) => {
            const job = cron.schedule(config.schedule, async () => {
                await this.executeJob(key, config);
            });
            
            this.jobs.set(key, job);
            console.log(`  ✅ Scheduled: ${config.name} (${config.schedule})`);
        });

        this.isRunning = true;
        console.log('✨ Scheduler service started');

        // Run initial data collection
        this.runInitialCollection();
    }

    // Stop all scheduled jobs
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Scheduler not running');
            return;
        }

        console.log('🛑 Stopping scheduler service...');

        this.jobs.forEach((job, key) => {
            job.stop();
            console.log(`  ❌ Stopped: ${key}`);
        });

        this.jobs.clear();
        this.isRunning = false;
        console.log('✨ Scheduler service stopped');
    }

    // Execute a single job
    async executeJob(jobKey, config) {
        const startTime = Date.now();
        const jobRun = {
            jobKey,
            jobName: config.name,
            startTime: new Date().toISOString(),
            status: 'running',
            result: null,
            error: null,
            duration: null
        };

        console.log(`\n⏱️ [${new Date().toISOString()}] Running: ${config.name}`);

        try {
            const result = await config.handler();
            jobRun.status = 'completed';
            jobRun.result = result;
            console.log(`  ✅ Completed: ${config.name}`);
        } catch (error) {
            jobRun.status = 'failed';
            jobRun.error = error.message;
            console.error(`  ❌ Failed: ${config.name}`, error.message);
        }

        jobRun.duration = Date.now() - startTime;
        this.recordJobHistory(jobRun);

        return jobRun;
    }

    // Record job history
    recordJobHistory(jobRun) {
        this.jobHistory.unshift(jobRun);
        
        // Trim history if needed
        if (this.jobHistory.length > this.maxHistorySize) {
            this.jobHistory = this.jobHistory.slice(0, this.maxHistorySize);
        }
    }

    // ========== JOB HANDLERS ==========

    // Initial collection on startup
    async runInitialCollection() {
        console.log('\n🔄 Running initial data collection...');
        
        const topDestinations = [
            'taj mahal', 'goa', 'jaipur', 'manali', 'shimla',
            'kerala', 'varanasi', 'ladakh', 'udaipur', 'rishikesh'
        ];

        try {
            const results = await this.dataCollector.collectMultipleDestinations(
                topDestinations,
                { concurrency: 2 }
            );

            // Store results
            if (this.dataStore) {
                await this.dataStore.batchSaveSignals(results);
            }

            console.log(`✅ Initial collection complete: ${Object.keys(results).length} destinations`);
            return { success: true, count: Object.keys(results).length };
        } catch (error) {
            console.error('❌ Initial collection failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Full refresh of all tracked destinations
    async runFullRefresh() {
        console.log('🔄 Running full data refresh...');
        
        // Get all destinations from data store or use defaults
        const destinations = this.dataStore?.getAllDestinations() || [
            'taj mahal', 'goa', 'jaipur', 'manali', 'shimla',
            'kerala', 'varanasi', 'ladakh', 'udaipur', 'rishikesh',
            'amritsar', 'darjeeling', 'ooty', 'mysore', 'hampi'
        ];

        const results = await this.dataCollector.collectMultipleDestinations(
            destinations,
            { forceRefresh: true, concurrency: 2 }
        );

        if (this.dataStore) {
            await this.dataStore.batchSaveSignals(results);
        }

        return { 
            success: true, 
            refreshed: Object.keys(results).length,
            errors: Object.values(results).filter(r => r.errors?.length > 0).length
        };
    }

    // Wikipedia-only update
    async runWikipediaUpdate() {
        console.log('🔄 Running Wikipedia update...');
        
        const destinations = this.dataStore?.getAllDestinations() || [];
        let updated = 0;

        for (const dest of destinations.slice(0, 20)) { // Limit to top 20
            try {
                const wikiData = await this.dataCollector.wikipedia.getDestinationInterest(dest);
                if (wikiData && this.dataStore) {
                    await this.dataStore.saveWikipediaSignal(dest, wikiData);
                    updated++;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            } catch (error) {
                console.error(`  Wikipedia update failed for ${dest}:`, error.message);
            }
        }

        return { success: true, updated };
    }

    // Hotel data update
    async runHotelUpdate() {
        console.log('🔄 Running hotel data update...');
        
        const destinations = this.dataStore?.getAllDestinations() || [];
        let updated = 0;

        for (const dest of destinations.slice(0, 30)) {
            try {
                const hotelData = await this.dataCollector.hotel.getHotelAvailability(dest);
                if (hotelData && this.dataStore) {
                    await this.dataStore.saveHotelSignal(dest, hotelData);
                    updated++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`  Hotel update failed for ${dest}:`, error.message);
            }
        }

        return { success: true, updated };
    }

    // Refresh only stale data
    async refreshStaleData() {
        console.log('🔄 Refreshing stale data...');
        
        const staleDestinations = this.dataCollector.getStaleDestinations();
        
        if (staleDestinations.length === 0) {
            console.log('  No stale data found');
            return { success: true, refreshed: 0 };
        }

        console.log(`  Found ${staleDestinations.length} stale destinations`);
        
        const results = await this.dataCollector.collectMultipleDestinations(
            staleDestinations.slice(0, 10), // Limit per run
            { forceRefresh: true, concurrency: 2 }
        );

        if (this.dataStore) {
            await this.dataStore.batchSaveSignals(results);
        }

        return { success: true, refreshed: Object.keys(results).length };
    }

    // Daily analytics computation
    async runDailyAnalytics() {
        console.log('📊 Running daily analytics...');
        
        const stats = this.dataCollector.getCollectionStats();
        const dataStatus = this.dataCollector.getDataStatus();

        const analytics = {
            date: new Date().toISOString().split('T')[0],
            collectionStats: stats,
            dataFreshness: {
                total: Object.keys(dataStatus).length,
                fresh: Object.values(dataStatus).filter(s => s.healthStatus === 'fresh').length,
                aging: Object.values(dataStatus).filter(s => s.healthStatus === 'aging').length,
                stale: Object.values(dataStatus).filter(s => s.healthStatus === 'stale').length
            },
            jobStats: {
                totalJobs: this.jobHistory.length,
                successful: this.jobHistory.filter(j => j.status === 'completed').length,
                failed: this.jobHistory.filter(j => j.status === 'failed').length
            }
        };

        if (this.dataStore) {
            await this.dataStore.saveDailyAnalytics(analytics);
        }

        console.log('  Analytics:', JSON.stringify(analytics, null, 2));
        return analytics;
    }

    // ========== MANUAL TRIGGERS ==========

    // Manually trigger a specific job
    async triggerJob(jobKey) {
        const config = this.jobConfigs[jobKey];
        if (!config) {
            throw new Error(`Unknown job: ${jobKey}`);
        }
        
        return await this.executeJob(jobKey, config);
    }

    // Manually refresh a destination
    async refreshDestination(destination) {
        console.log(`🔄 Manual refresh: ${destination}`);
        
        const result = await this.dataCollector.collectDestinationData(destination, { 
            forceRefresh: true 
        });

        if (this.dataStore) {
            await this.dataStore.saveSignals(destination, result);
        }

        return result;
    }

    // ========== STATUS & MONITORING ==========

    getStatus() {
        return {
            isRunning: this.isRunning,
            scheduledJobs: Array.from(this.jobs.keys()),
            collectionStats: this.dataCollector.getCollectionStats(),
            recentJobs: this.jobHistory.slice(0, 10),
            nextRuns: this.getNextRuns()
        };
    }

    getNextRuns() {
        // Calculate next run times (simplified)
        const now = new Date();
        return Object.entries(this.jobConfigs).map(([key, config]) => ({
            job: key,
            name: config.name,
            schedule: config.schedule
        }));
    }

    getJobHistory(limit = 20) {
        return this.jobHistory.slice(0, limit);
    }
}

module.exports = SchedulerService;
