// CrowdWise Festival Service v1.0
// Festival lookup and crowd impact calculation
// Schema: .sisyphus/docs/festival-schema.md

const FestivalService = (function() {
    
    // Festival data - will be loaded from JSON
    let festivalsData = null;
    
    // Cache for active festivals by date (YYYY-MM-DD format)
    const activeCache = new Map();
    const CACHE_TTL = 60000; // 1 minute cache in milliseconds
    const cacheTimestamps = new Map();
    
    /**
     * Load festivals data from JSON or window variable
     * @returns {Promise<Object>} Festival data object
     */
    async function loadFestivals() {
        if (festivalsData) return festivalsData;
        
        try {
            // Try to load from window.FESTIVALS_DATA (inline) first
            if (typeof window !== 'undefined' && window.FESTIVALS_DATA) {
                festivalsData = window.FESTIVALS_DATA;
                return festivalsData;
            }
            
            // Otherwise load from file
            const response = await fetch('data/festivals2026.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            festivalsData = await response.json();
            return festivalsData;
        } catch (error) {
            console.warn('Failed to load festivals data:', error);
            festivalsData = { version: "1.0", festivals: [] };
            return festivalsData;
        }
    }
    
    /**
     * Normalize date to YYYY-MM-DD string format
     * @param {Date} date - Date object or string
     * @returns {string} Normalized date string in YYYY-MM-DD format
     */
    function normalizeDateString(date) {
        let dateObj = date;
        if (typeof date === 'string') {
            dateObj = new Date(date);
        }
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Check if cache is still valid
     * @param {string} key - Cache key
     * @returns {boolean} True if cache is valid
     */
    function isCacheValid(key) {
        const timestamp = cacheTimestamps.get(key);
        if (!timestamp) return false;
        return Date.now() - timestamp < CACHE_TTL;
    }
    
    /**
     * Get all festivals active on a given date
     * @param {Date|string} date - Date to check (default: today)
     * @returns {Array<Object>} Array of festival objects active on the date
     */
    function getActiveFestivals(date = new Date()) {
        if (!festivalsData) {
            return [];
        }
        
        const dateStr = normalizeDateString(date);
        
        // Check cache
        if (isCacheValid(dateStr) && activeCache.has(dateStr)) {
            return activeCache.get(dateStr);
        }
        
        // Filter festivals where startDate <= dateStr <= endDate
        const activeFestivals = (festivalsData.festivals || []).filter(festival => {
            return festival.startDate <= dateStr && dateStr <= festival.endDate;
        });
        
        // Update cache
        activeCache.set(dateStr, activeFestivals);
        cacheTimestamps.set(dateStr, Date.now());
        
        return activeFestivals;
    }
    
    /**
     * Get festivals affecting a specific destination
     * @param {number} destinationId - Destination ID (1-224)
     * @param {Date|string} date - Date to check (default: today)
     * @returns {Array<Object>} Array of festival objects affecting destination
     */
    function getFestivalsForDestination(destinationId, date = new Date()) {
        if (!festivalsData) {
            return [];
        }
        
        const activeFestivals = getActiveFestivals(date);
        
        // Filter festivals that include this destination
        return activeFestivals.filter(festival => {
            return festival.destinations && festival.destinations.includes(destinationId);
        });
    }
    
    /**
     * Get the highest impact multiplier for a destination on a date
     * Note: Impact is NOT additive. Returns the maximum impact value.
     * @param {number} destinationId - Destination ID (1-224)
     * @param {Date|string} date - Date to check (default: today)
     * @returns {number} Impact multiplier (1.0 if no festivals, up to 2.5)
     */
    function getFestivalImpact(destinationId, date = new Date()) {
        if (!festivalsData) {
            return 1.0;
        }
        
        const festivals = getFestivalsForDestination(destinationId, date);
        
        if (festivals.length === 0) {
            return 1.0;
        }
        
        // Return maximum impact (not additive)
        const maxImpact = Math.max(...festivals.map(f => f.impact || 1.0));
        
        // Cap at 2.5
        return Math.min(maxImpact, 2.5);
    }
    
    /**
     * Get festival impact with detailed metadata
     * @param {number} destinationId - Destination ID (1-224)
     * @param {Date|string} date - Date to check (default: today)
     * @returns {Object} { impact: number, festivals: Array, hasActiveFestival: boolean }
     */
    function getFestivalImpactDetails(destinationId, date = new Date()) {
        if (!festivalsData) {
            return {
                impact: 1.0,
                festivals: [],
                hasActiveFestival: false
            };
        }
        
        const festivals = getFestivalsForDestination(destinationId, date);
        const impact = getFestivalImpact(destinationId, date);
        
        return {
            impact: impact,
            festivals: festivals,
            hasActiveFestival: festivals.length > 0
        };
    }
    
    /**
     * Check if a date falls within a specific festival period
     * @param {Date|string} date - Date to check
     * @param {string} festivalId - Festival ID to check
     * @returns {boolean} True if date is during the festival
     */
    function isDateDuringFestival(date, festivalId) {
        if (!festivalsData) {
            return false;
        }
        
        const festival = (festivalsData.festivals || []).find(f => f.id === festivalId);
        if (!festival) {
            return false;
        }
        
        const dateStr = normalizeDateString(date);
        return festival.startDate <= dateStr && dateStr <= festival.endDate;
    }
    
    /**
     * Get upcoming festivals in the next N days
     * @param {number} days - Number of days to look ahead (default: 30)
     * @returns {Array<Object>} Array of upcoming festivals sorted by start date
     */
    function getUpcomingFestivals(days = 30) {
        if (!festivalsData || !festivalsData.festivals) {
            return [];
        }
        
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days);
        
        const todayStr = normalizeDateString(today);
        const endDateStr = normalizeDateString(endDate);
        
        // Filter festivals that start within the next N days or are ongoing
        const upcomingFestivals = (festivalsData.festivals || []).filter(festival => {
            // Festival starts before the end of the period
            // AND festival ends on or after today
            return festival.startDate <= endDateStr && festival.endDate >= todayStr;
        });
        
        // Sort by start date
        return upcomingFestivals.sort((a, b) => {
            return a.startDate.localeCompare(b.startDate);
        });
    }
    
    /**
     * Initialize the service - call this on page load
     * @returns {Promise<void>}
     */
    async function init() {
        await loadFestivals();
        const count = festivalsData.festivals ? festivalsData.festivals.length : 0;
        console.log(`FestivalService: Loaded ${count} festivals`);
    }
    
    // Public API
    return {
        init,
        loadFestivals,
        getActiveFestivals,
        getFestivalsForDestination,
        getFestivalImpact,
        getFestivalImpactDetails,
        getUpcomingFestivals,
        isDateDuringFestival,
        isLoaded: () => festivalsData !== null
    };
})();

// Auto-initialize when DOM is ready (browser environment)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FestivalService.init().catch(err => console.warn('FestivalService init failed:', err));
        });
    } else {
        // DOM already loaded
        FestivalService.init().catch(err => console.warn('FestivalService init failed:', err));
    }
}

// Export for Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FestivalService;
}
