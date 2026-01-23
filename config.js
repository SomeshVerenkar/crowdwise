// ============================================================
// API Configuration for CrowdWise India
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Get FREE OpenWeatherMap API key: https://openweathermap.org/api
// 2. Replace 'YOUR_OPENWEATHER_API_KEY' below with your actual key
// 3. Set USE_REAL_WEATHER to true
// 4. Refresh the page - weather data will now be LIVE!
// ============================================================

const API_CONFIG = {
    // ==================== WEATHER APIs ====================
    // OpenWeatherMap API (Free tier: 1000 calls/day)
    // Sign up at: https://openweathermap.org/api
    // API key is now stored securely in backend/.env
    WEATHER_API_KEY: '',  // Not used - backend handles weather API calls
    WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Backup: WeatherAPI.com (Free tier: 1M calls/month)
    // Sign up at: https://www.weatherapi.com/
    WEATHERAPI_KEY: 'YOUR_WEATHERAPI_KEY',
    WEATHERAPI_URL: 'https://api.weatherapi.com/v1/current.json',
    
    // ==================== CROWD DATA APIs ====================
    // Google Places API (for popular times)
    // Get key at: https://console.cloud.google.com/
    GOOGLE_PLACES_API_KEY: 'YOUR_GOOGLE_PLACES_API_KEY',
    GOOGLE_PLACES_API_URL: 'https://maps.googleapis.com/maps/api/place',
    
    // Backend API URL (for aggregated crowd data)
    // Start the backend server: node backend/server.js
    BACKEND_API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3002/api'
        : 'https://api.crowdwise.in/api',  // Your production API domain
    USE_BACKEND_API: true, // Backend is now running
    
    // ==================== OTHER APIs ====================
    // Holiday API for India (Free, no key needed)
    HOLIDAY_API_URL: 'https://date.nager.at/api/v3/PublicHolidays/2026/IN',
    
    // ==================== REFRESH INTERVALS ====================
    WEATHER_REFRESH_INTERVAL: 600000,  // 10 minutes
    CROWD_REFRESH_INTERVAL: 300000,    // 5 minutes
    UI_REFRESH_INTERVAL: 60000,        // 1 minute (for UI clock updates)
    
    // ==================== FEATURE FLAGS ====================
    // Weather: Set to true after adding your OpenWeatherMap API key
    USE_REAL_WEATHER: true,
    
    // Crowd Data: Set to true when backend is running with real data sources
    USE_REAL_CROWD_DATA: true,
    
    // Mock Data: Simulates real-time changes based on time/day
    USE_MOCK_DATA: false,
    ENABLE_DYNAMIC_MOCK: false,
    
    // ==================== DATA SOURCE TRACKING ====================
    // These are set automatically - do not modify
    _weatherSource: 'mock',      // 'mock', 'openweathermap', 'weatherapi', 'backend'
    _crowdSource: 'mock',        // 'mock', 'google', 'backend', 'aggregated'
    _lastUpdate: null,
    _dataQuality: 'demo',        // 'demo', 'partial', 'live'
};

// Destination coordinates for weather API calls
// Comprehensive coordinates for all 106 destinations
const DESTINATION_COORDINATES = {
    // Andhra Pradesh
    1: { lat: 13.6288, lon: 79.4192, city: "Tirupati" },
    2: { lat: 18.3371, lon: 83.0076, city: "Visakhapatnam" },
    3: { lat: 16.5062, lon: 80.6480, city: "Vijayawada" },
    // Arunachal Pradesh
    4: { lat: 27.5859, lon: 91.8694, city: "Tawang" },
    5: { lat: 27.5379, lon: 93.8251, city: "Ziro" },
    // Assam
    6: { lat: 26.5775, lon: 93.1711, city: "Golaghat" },
    7: { lat: 26.1445, lon: 91.7362, city: "Guwahati" },
    8: { lat: 26.9458, lon: 94.2037, city: "Jorhat" },
    // Bihar
    9: { lat: 24.6961, lon: 84.9869, city: "Gaya" },
    10: { lat: 25.1368, lon: 85.4460, city: "Nalanda" },
    11: { lat: 25.0225, lon: 85.4167, city: "Rajgir" },
    // Chhattisgarh
    12: { lat: 19.2094, lon: 81.8798, city: "Bastar" },
    13: { lat: 21.2514, lon: 82.5407, city: "Mahasamund" },
    // Goa
    14: { lat: 15.5513, lon: 73.7519, city: "North Goa" },
    15: { lat: 15.4909, lon: 73.8278, city: "Old Goa" },
    16: { lat: 15.3144, lon: 74.0951, city: "South Goa" },
    // Gujarat
    17: { lat: 21.8380, lon: 73.7189, city: "Kevadia" },
    18: { lat: 23.7337, lon: 69.8597, city: "Kutch" },
    19: { lat: 20.9007, lon: 70.3787, city: "Somnath" },
    20: { lat: 21.1702, lon: 70.6263, city: "Junagadh" },
    // Haryana
    21: { lat: 29.9695, lon: 76.8783, city: "Kurukshetra" },
    22: { lat: 28.4595, lon: 77.0266, city: "Gurgaon" },
    // Himachal Pradesh
    23: { lat: 32.2432, lon: 77.1892, city: "Manali" },
    24: { lat: 31.1048, lon: 77.1734, city: "Shimla" },
    25: { lat: 32.2190, lon: 76.3234, city: "Dharamshala" },
    26: { lat: 32.0586, lon: 78.1310, city: "Kaza" },
    // Jharkhand
    27: { lat: 24.4836, lon: 86.6967, city: "Deoghar" },
    28: { lat: 23.8377, lon: 84.0618, city: "Latehar" },
    // Karnataka
    29: { lat: 15.3350, lon: 76.4600, city: "Hampi" },
    30: { lat: 12.3051, lon: 76.6553, city: "Mysore" },
    31: { lat: 12.3375, lon: 75.8069, city: "Madikeri" },
    32: { lat: 12.9716, lon: 77.5946, city: "Bangalore" },
    // Kerala
    33: { lat: 10.0889, lon: 77.0595, city: "Munnar" },
    34: { lat: 9.4981, lon: 76.3388, city: "Alleppey" },
    35: { lat: 8.4004, lon: 76.9787, city: "Trivandrum" },
    36: { lat: 11.6854, lon: 75.9913, city: "Wayanad" },
    // Madhya Pradesh
    37: { lat: 24.8318, lon: 79.9199, city: "Khajuraho" },
    38: { lat: 23.4793, lon: 77.7379, city: "Sanchi" },
    39: { lat: 23.4554, lon: 81.0333, city: "Umaria" },
    40: { lat: 23.1765, lon: 75.7885, city: "Ujjain" },
    // Maharashtra
    41: { lat: 18.9220, lon: 72.8347, city: "Mumbai" },
    42: { lat: 20.5519, lon: 75.7033, city: "Aurangabad" },
    43: { lat: 19.7668, lon: 74.4763, city: "Shirdi" },
    44: { lat: 18.7557, lon: 73.4091, city: "Lonavala" },
    // Manipur
    45: { lat: 24.5278, lon: 93.7523, city: "Bishnupur" },
    46: { lat: 24.8170, lon: 93.9368, city: "Imphal" },
    // Meghalaya
    47: { lat: 25.2796, lon: 91.7006, city: "Cherrapunji" },
    48: { lat: 25.2552, lon: 91.7296, city: "Nongriat" },
    49: { lat: 25.5788, lon: 91.8933, city: "Shillong" },
    // Mizoram
    50: { lat: 23.7271, lon: 92.7176, city: "Aizawl" },
    // Nagaland
    51: { lat: 25.6751, lon: 94.1086, city: "Kohima" },
    52: { lat: 25.9219, lon: 94.1029, city: "Dzukou" },
    // Odisha
    53: { lat: 19.8135, lon: 85.8312, city: "Puri" },
    54: { lat: 19.8876, lon: 86.0977, city: "Konark" },
    55: { lat: 20.2961, lon: 85.8245, city: "Bhubaneswar" },
    // Punjab
    56: { lat: 31.6340, lon: 74.8723, city: "Amritsar" },
    57: { lat: 31.6044, lon: 74.8820, city: "Wagah" },
    // Rajasthan
    58: { lat: 26.9124, lon: 75.7873, city: "Jaipur" },
    59: { lat: 24.5854, lon: 73.7125, city: "Udaipur" },
    60: { lat: 26.9157, lon: 70.9083, city: "Jaisalmer" },
    61: { lat: 26.4899, lon: 74.5510, city: "Pushkar" },
    62: { lat: 25.9997, lon: 76.5029, city: "Sawai Madhopur" },
    // Sikkim
    63: { lat: 27.3314, lon: 88.6138, city: "Gangtok" },
    64: { lat: 27.3869, lon: 88.8323, city: "Nathula" },
    65: { lat: 27.3116, lon: 88.2305, city: "Pelling" },
    // Tamil Nadu
    66: { lat: 9.9195, lon: 78.1193, city: "Madurai" },
    67: { lat: 12.6172, lon: 80.1927, city: "Mahabalipuram" },
    68: { lat: 11.4102, lon: 76.6950, city: "Ooty" },
    69: { lat: 9.2876, lon: 79.3129, city: "Rameshwaram" },
    70: { lat: 8.0883, lon: 77.5385, city: "Kanyakumari" },
    // Telangana
    71: { lat: 17.3616, lon: 78.4747, city: "Hyderabad" },
    72: { lat: 17.2543, lon: 78.6808, city: "Ramoji" },
    73: { lat: 17.3833, lon: 78.4011, city: "Golconda" },
    // Tripura
    74: { lat: 23.8315, lon: 91.2868, city: "Agartala" },
    75: { lat: 23.5142, lon: 91.2945, city: "Melaghar" },
    // Uttar Pradesh
    76: { lat: 27.1751, lon: 78.0421, city: "Agra" },
    77: { lat: 25.3176, lon: 82.9739, city: "Varanasi" },
    78: { lat: 26.8467, lon: 80.9462, city: "Lucknow" },
    79: { lat: 26.7922, lon: 82.1998, city: "Ayodhya" },
    80: { lat: 27.4924, lon: 77.6737, city: "Mathura" },
    // Uttarakhand
    81: { lat: 30.0869, lon: 78.2676, city: "Rishikesh" },
    82: { lat: 29.9457, lon: 78.1642, city: "Haridwar" },
    83: { lat: 29.3919, lon: 79.4542, city: "Nainital" },
    84: { lat: 30.4598, lon: 78.0644, city: "Mussoorie" },
    85: { lat: 30.7352, lon: 79.0669, city: "Kedarnath" },
    86: { lat: 30.7433, lon: 79.4938, city: "Badrinath" },
    87: { lat: 30.7280, lon: 79.6050, city: "Valley of Flowers" },
    // West Bengal
    88: { lat: 27.0410, lon: 88.2663, city: "Darjeeling" },
    89: { lat: 22.5726, lon: 88.3639, city: "Kolkata" },
    90: { lat: 21.9497, lon: 88.8983, city: "Sundarbans" },
    91: { lat: 21.6278, lon: 87.5046, city: "Digha" },
    // Andaman & Nicobar
    92: { lat: 11.9416, lon: 92.9546, city: "Havelock" },
    93: { lat: 11.6234, lon: 92.7265, city: "Port Blair" },
    // Chandigarh
    94: { lat: 30.7333, lon: 76.7794, city: "Chandigarh" },
    // Delhi
    95: { lat: 28.6562, lon: 77.2410, city: "Delhi" },
    96: { lat: 28.5244, lon: 77.1855, city: "Qutub Minar" },
    97: { lat: 28.6129, lon: 77.2295, city: "India Gate" },
    98: { lat: 28.5535, lon: 77.2588, city: "Lotus Temple" },
    // Jammu & Kashmir
    99: { lat: 34.0837, lon: 74.7973, city: "Srinagar" },
    100: { lat: 34.0484, lon: 74.3805, city: "Gulmarg" },
    101: { lat: 33.0318, lon: 74.9288, city: "Katra" },
    // Ladakh
    102: { lat: 33.7595, lon: 78.6643, city: "Pangong" },
    103: { lat: 34.1526, lon: 77.5771, city: "Leh" },
    104: { lat: 34.5894, lon: 77.5222, city: "Nubra" },
    // Lakshadweep
    105: { lat: 10.8505, lon: 72.1833, city: "Agatti" },
    // Puducherry
    106: { lat: 11.9416, lon: 79.8083, city: "Pondicherry" }
};

// Google Place IDs for each destination (you'll need to find these)
const DESTINATION_PLACE_IDS = {
    1: "ChIJbf8C1yFxdDkR3n12P4DkKt0", // Taj Mahal
    2: "ChIJowMF8RH_vzsRED_GmvRLgQQ", // Goa
    // Add more place IDs as needed
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, DESTINATION_COORDINATES, DESTINATION_PLACE_IDS };
}
