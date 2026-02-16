// CrowdWise Weather Service v1.0
// Category-specific weather impact multipliers
// Processes weather conditions and returns crowd impact multipliers by destination category

const WeatherService = (function() {
    
    // Weather condition codes (from OpenWeatherMap API)
    const CONDITIONS = {
        CLEAR: ['clear', 'sunny'],
        CLOUDY: ['clouds', 'cloudy', 'overcast'],
        RAIN: ['rain', 'drizzle', 'shower'],
        HEAVY_RAIN: ['thunderstorm', 'heavy rain', 'storm'],
        SNOW: ['snow', 'sleet'],
        EXTREME: ['extreme', 'tornado', 'hurricane']
    };
    
    // Category-specific multipliers by weather condition
    // multiplier < 1.0 = fewer crowds expected
    // multiplier > 1.0 = more crowds expected
    // multiplier = 1.0 = neutral weather impact
    const CATEGORY_WEATHER_IMPACT = {
        beach: {
            // Beach destinations thrive in clear weather, decline sharply in rain
            CLEAR: 1.3,       // Perfect beach weather drives higher crowds
            CLOUDY: 0.9,      // Acceptable but less ideal
            RAIN: 0.4,        // Significant drop - few visitors
            HEAVY_RAIN: 0.2,  // Heavy storm deters visitors
            SNOW: 0.1,        // N/A for tropical beaches
            EXTREME: 0.1      // Extreme weather closes beach access
        },
        'hill-station': {
            // Hill stations attract visitors in multiple weather conditions
            CLEAR: 1.2,       // Clear skies for scenic views
            CLOUDY: 1.0,      // Common in hill areas, neutral
            RAIN: 0.6,        // Monsoon season but still attracts some
            HEAVY_RAIN: 0.3,  // Heavy rains reduce visibility and accessibility
            SNOW: 1.4,        // Snow is major attraction in hill stations!
            EXTREME: 0.2      // Extreme weather unsafe for visitors
        },
        religious: {
            // Religious sites are less weather-dependent (covered structures)
            CLEAR: 1.0,       // Neutral - religious visits independent of weather
            CLOUDY: 1.0,      // Neutral - most sites have shelter
            RAIN: 0.8,        // Slight decline - some pilgrims postpone
            HEAVY_RAIN: 0.5,  // Heavy rain discourages visits
            SNOW: 0.6,        // Less common at religious sites
            EXTREME: 0.3      // Safety concerns for access routes
        },
        wildlife: {
            // Wildlife safaris highly weather-dependent
            CLEAR: 1.1,       // Clear weather increases sightings
            CLOUDY: 1.0,      // Neutral - animals still visible
            RAIN: 0.5,        // Safaris often cancelled during rain
            HEAVY_RAIN: 0.2,  // Operations suspended
            SNOW: 0.3,        // Rare in wildlife areas, reduces access
            EXTREME: 0.1      // Operations fully shut down
        },
        heritage: {
            // Heritage sites moderate weather impact
            CLEAR: 1.1,       // Clear weather popular for sightseeing
            CLOUDY: 1.0,      // Neutral - structures visible regardless
            RAIN: 0.7,        // Slight reduction - walking tours affected
            HEAVY_RAIN: 0.4,  // Significant drop - outdoor walking difficult
            SNOW: 0.5,        // Rare but reduces visitor comfort
            EXTREME: 0.2      // Access roads may be unsafe
        },
        nature: {
            // Nature trekking and parks very weather-dependent
            CLEAR: 1.2,       // Perfect for outdoor activities
            CLOUDY: 0.9,      // Acceptable for trekking
            RAIN: 0.5,        // Trails become muddy and slippery
            HEAVY_RAIN: 0.3,  // Significant reduction - flood risks
            SNOW: 0.8,        // Snow trekking attracts adventure enthusiasts
            EXTREME: 0.1      // Extreme weather closes trails
        },
        monument: {
            // Monuments similar to heritage sites
            CLEAR: 1.1,       // Clear weather ideal for photography
            CLOUDY: 1.0,      // Neutral - structures remain visible
            RAIN: 0.7,        // Slight reduction - outdoor touring difficult
            HEAVY_RAIN: 0.4,  // Significant decline
            SNOW: 0.5,        // Reduced visitor comfort
            EXTREME: 0.2      // Safety concerns
        },
        cultural: {
            // Cultural sites less weather-dependent (often indoors)
            CLEAR: 1.0,       // Neutral impact
            CLOUDY: 1.0,      // Neutral - indoor venues unaffected
            RAIN: 0.8,        // Slight decline - some outdoor components
            HEAVY_RAIN: 0.5,  // Reduced participation
            SNOW: 0.6,        // Less common impact
            EXTREME: 0.3      // May affect accessibility
        },
        adventure: {
            // Adventure activities highly weather-dependent and safety-critical
            CLEAR: 1.2,       // Perfect conditions
            CLOUDY: 0.9,      // Acceptable for most activities
            RAIN: 0.3,        // Very dangerous for trekking, rock climbing
            HEAVY_RAIN: 0.1,  // Extreme hazard - operations stopped
            SNOW: 0.7,        // Winter sports attraction
            EXTREME: 0.0      // No operations during extreme weather
        },
        urban: {
            // Urban attractions less weather-dependent
            CLEAR: 1.0,       // Neutral
            CLOUDY: 1.0,      // Neutral - shopping, markets unaffected
            RAIN: 0.8,        // Slight reduction - outdoor activities decline
            HEAVY_RAIN: 0.6,  // Moderate reduction - still accessible
            SNOW: 0.7,        // Reduced visitor comfort
            EXTREME: 0.4      // Some impact on accessibility
        }
    };
    
    // Default multipliers for unknown categories
    // Returns neutral (1.0) for most conditions except rain/extreme
    const DEFAULT_MULTIPLIERS = {
        CLEAR: 1.0,
        CLOUDY: 1.0,
        RAIN: 0.7,
        HEAVY_RAIN: 0.4,
        SNOW: 0.5,
        EXTREME: 0.2
    };
    
    /**
     * Map weather condition string to weather category
     * @param {string} condition - Raw weather condition from OpenWeatherMap or user input
     * @returns {string} - Normalized weather category (CLEAR, CLOUDY, RAIN, etc.)
     */
    function getWeatherCategory(condition) {
        if (!condition || typeof condition !== 'string') {
            return 'CLEAR'; // Default to clear if invalid input
        }
        
        const normalizedCondition = condition.toLowerCase().trim();
        
        // Check each weather category
        for (const [category, keywords] of Object.entries(CONDITIONS)) {
            for (const keyword of keywords) {
                if (normalizedCondition.includes(keyword)) {
                    return category;
                }
            }
        }
        
        // Return CLEAR as default if no match found
        return 'CLEAR';
    }
    
    /**
     * Get weather multiplier for a destination category
     * Applies category-specific weather impact on crowd estimates
     * @param {string} category - Destination category (beach, hill-station, religious, etc.)
     * @param {string} weatherCondition - Weather condition string
     * @returns {number} - Multiplier (typically 0.1 to 1.4)
     */
    function getWeatherMultiplier(category, weatherCondition) {
        // Normalize category
        const normalizedCategory = category ? category.toLowerCase().trim() : 'urban';
        
        // Get weather category
        const weatherCategory = getWeatherCategory(weatherCondition);
        
        // Get category multipliers or use defaults
        const multipliers = CATEGORY_WEATHER_IMPACT[normalizedCategory] || DEFAULT_MULTIPLIERS;
        
        // Return multiplier for this weather condition
        return multipliers[weatherCategory] || 1.0;
    }
    
    /**
     * Get all supported destination categories
     * @returns {Array<string>} - Array of supported category names
     */
    function getSupportedCategories() {
        return Object.keys(CATEGORY_WEATHER_IMPACT);
    }
    
    /**
     * Get all weather multipliers for a specific category
     * @param {string} category - Destination category
     * @returns {Object} - Object with all weather condition multipliers
     */
    function getCategoryMultipliers(category) {
        const normalizedCategory = category ? category.toLowerCase().trim() : 'urban';
        return CATEGORY_WEATHER_IMPACT[normalizedCategory] || DEFAULT_MULTIPLIERS;
    }
    
    // Public API
    return {
        getWeatherMultiplier,
        getWeatherCategory,
        getSupportedCategories,
        getCategoryMultipliers,
        CONDITIONS,
        CATEGORY_WEATHER_IMPACT,
        DEFAULT_MULTIPLIERS
    };
})();

// Export for modules (Node.js / CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherService;
}
