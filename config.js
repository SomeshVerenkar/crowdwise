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
    // API key is now used for direct frontend calls since backend has HTTPS/HTTP mixed content issue
    WEATHER_API_KEY: '01d84178319315636aea1579e3bac3ef',  // Live API key - weather data is now real-time
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
    // Note: AWS Elastic Beanstalk only supports HTTP, which causes mixed content errors on HTTPS sites
    // Disabled for Cloudflare Pages deployment - using client-side algorithm instead
    BACKEND_API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/api'
        : 'http://crowdwise-api.eba-ymkfcnps.us-east-1.elasticbeanstalk.com/api',
    USE_BACKEND_API: false, // Disabled due to mixed content (HTTPS→HTTP blocked by browsers)
    
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
    
    // ==================== WEEK 1-2 ACCURACY IMPROVEMENT FLAGS ====================
    // Enable new accuracy improvement features independently for safe deployment and A/B testing
    // All features implemented and tested - enabled for production
    FEATURE_FLAGS: {
        FESTIVALS_ENABLED: true,         // Regional festivals impact on crowd prediction (Tasks 4-6) - 100 festivals
        GAMIFICATION_ENABLED: true,      // Points, badges, and leaderboard system (Tasks 7-9)
        WIKIPEDIA_7DAY: true,            // 7-day Wikipedia window + spike detection (Tasks 10-11)
        WEATHER_REFINEMENT: true,        // Category-specific weather impact adjustments (Tasks 12-13)
        AB_COMPARISON_MODE: false        // Show old vs new predictions side-by-side for comparison
    },
    
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
    106: { lat: 11.9416, lon: 79.8083, city: "Pondicherry" },
    
    // Additional Destinations (107-192) - Previously added
    107: { lat: 15.4837, lon: 77.6073, city: "Anantapur" }, // Lepakshi
    108: { lat: 16.0787, lon: 78.8695, city: "Kurnool" }, // Srisailam
    109: { lat: 17.7231, lon: 83.3013, city: "Visakhapatnam" }, // RK Beach
    110: { lat: 27.4324, lon: 96.5563, city: "Changlang" }, // Namdapha
    111: { lat: 27.2682, lon: 92.4026, city: "Bomdila" },
    112: { lat: 25.5941, lon: 85.1376, city: "Patna" }, // Patna Sahib
    113: { lat: 25.3425, lon: 87.3119, city: "Bhagalpur" }, // Vikramshila
    114: { lat: 22.1508, lon: 81.2467, city: "Kabirdham" }, // Bhoramdeo
    115: { lat: 21.1900, lon: 82.0200, city: "Raipur" }, // Barnawapara
    116: { lat: 22.7668, lon: 83.2000, city: "Surguja" }, // Mainpat
    117: { lat: 15.0100, lon: 74.0231, city: "Canacona" }, // Palolem
    118: { lat: 15.4909, lon: 73.7733, city: "Aguada" }, // Fort Aguada
    119: { lat: 22.2442, lon: 68.9685, city: "Dwarka" },
    120: { lat: 23.8593, lon: 72.1267, city: "Patan" }, // Rani ki Vav
    121: { lat: 30.7983, lon: 76.9089, city: "Panchkula" }, // Pinjore
    122: { lat: 30.6333, lon: 77.0833, city: "Morni" },
    123: { lat: 23.4000, lon: 85.5500, city: "Ranchi" }, // Hundru Falls
    124: { lat: 23.9667, lon: 86.1333, city: "Giridih" }, // Parasnath
    125: { lat: 25.1151, lon: 94.3714, city: "Ukhrul" }, // Shirui Peak
    126: { lat: 24.5000, lon: 93.7833, city: "Moirang" }, // INA Memorial
    127: { lat: 22.4983, lon: 92.5833, city: "Lawngtlai" }, // Phawngpui
    128: { lat: 23.4000, lon: 92.8500, city: "Serchhip" }, // Vantawng Falls
    129: { lat: 25.6667, lon: 94.1000, city: "Kohima" }, // Khonoma
    130: { lat: 25.7500, lon: 94.0833, city: "Kohima" }, // Tuophema
    131: { lat: 19.7200, lon: 85.4500, city: "Puri" }, // Chilika Lake
    132: { lat: 21.8300, lon: 86.3667, city: "Mayurbhanj" }, // Simlipal
    133: { lat: 31.2392, lon: 76.5128, city: "Rupnagar" }, // Anandpur Sahib
    134: { lat: 31.6200, lon: 74.8700, city: "Amritsar" }, // Gobindgarh Fort
    135: { lat: 28.0333, lon: 88.7000, city: "Lachen" }, // Gurudongmar
    136: { lat: 27.3000, lon: 88.3667, city: "Ravangla" },
    137: { lat: 24.3167, lon: 92.0167, city: "Kailashahar" }, // Unakoti
    138: { lat: 23.9167, lon: 92.2667, city: "Jampui" },
    139: { lat: 27.0594, lon: 88.4695, city: "Kalimpong" },
    140: { lat: 23.6814, lon: 87.6853, city: "Bolpur" }, // Shantiniketan
    141: { lat: 34.0161, lon: 75.3150, city: "Pahalgam" },
    142: { lat: 34.3033, lon: 75.2931, city: "Sonamarg" },
    143: { lat: 33.0833, lon: 75.2833, city: "Patnitop" },
    144: { lat: 28.5933, lon: 77.2507, city: "Delhi" }, // Humayun's Tomb
    145: { lat: 28.6127, lon: 77.2773, city: "Delhi" }, // Akshardham
    146: { lat: 11.8333, lon: 93.0500, city: "Neil Island" },
    147: { lat: 12.1167, lon: 92.7667, city: "Baratang" },
    148: { lat: 30.7408, lon: 76.7869, city: "Chandigarh" }, // Sukhna Lake
    149: { lat: 30.7600, lon: 76.8000, city: "Chandigarh" }, // Capitol Complex
    150: { lat: 12.0070, lon: 79.8107, city: "Auroville" },
    151: { lat: 11.9000, lon: 79.8167, city: "Chunnambar" }, // Paradise Beach
    152: { lat: 20.7144, lon: 70.9822, city: "Diu" }, // Diu Fort
    153: { lat: 20.7167, lon: 70.9333, city: "Diu" }, // Nagoa Beach
    154: { lat: 20.2833, lon: 73.0167, city: "Silvassa" },
    155: { lat: 10.9333, lon: 72.2833, city: "Bangaram" },
    156: { lat: 10.5593, lon: 72.6420, city: "Kavaratti" },
    157: { lat: 27.5000, lon: 92.1000, city: "Tawang" }, // Sela Pass
    158: { lat: 26.9833, lon: 94.6333, city: "Sivasagar" },
    159: { lat: 26.7500, lon: 90.9167, city: "Barpeta" }, // Manas
    160: { lat: 28.4167, lon: 77.3167, city: "Faridabad" }, // Surajkund
    161: { lat: 32.0100, lon: 77.3167, city: "Kullu" }, // Kasol
    162: { lat: 23.6333, lon: 85.4167, city: "Ramgarh" }, // Rajrappa
    163: { lat: 14.5500, lon: 74.3167, city: "Gokarna" },
    164: { lat: 9.5833, lon: 77.1833, city: "Thekkady" },
    165: { lat: 25.3500, lon: 78.6333, city: "Tikamgarh" }, // Orchha
    166: { lat: 17.9167, lon: 73.6500, city: "Satara" }, // Mahabaleshwar
    167: { lat: 24.4833, lon: 94.1000, city: "Thoubal" }, // Khongjom
    168: { lat: 25.1833, lon: 92.0167, city: "West Jaintia Hills" }, // Dawki
    169: { lat: 25.2000, lon: 91.9167, city: "East Khasi Hills" }, // Mawlynnong
    170: { lat: 23.7500, lon: 92.3833, city: "Reiek" },
    171: { lat: 23.7167, lon: 92.8833, city: "Saitual" }, // Tam Dil
    172: { lat: 25.6667, lon: 94.1167, city: "Kohima" }, // War Cemetery
    173: { lat: 31.6200, lon: 74.8800, city: "Amritsar" }, // Jallianwala Bagh
    174: { lat: 18.0000, lon: 79.5833, city: "Warangal" },
    175: { lat: 16.5167, lon: 79.3167, city: "Nalgonda" }, // Nagarjuna Sagar
    176: { lat: 23.6667, lon: 91.3167, city: "Sepahijala" },
    177: { lat: 11.6833, lon: 92.7500, city: "Port Blair" }, // Ross Island
    178: { lat: 30.7500, lon: 76.7833, city: "Chandigarh" }, // Rose Garden
    179: { lat: 30.7583, lon: 76.8000, city: "Chandigarh" }, // Le Corbusier
    180: { lat: 20.2667, lon: 73.0000, city: "Silvassa" }, // Vanganga
    181: { lat: 20.2500, lon: 73.0333, city: "Silvassa" }, // Dudhni Lake
    182: { lat: 20.2833, lon: 73.0167, city: "Silvassa" }, // Hirwa Van
    183: { lat: 20.2750, lon: 73.0083, city: "Silvassa" }, // Swaminarayan
    184: { lat: 20.4167, lon: 72.8333, city: "Daman" }, // Devka Beach
    185: { lat: 20.3917, lon: 72.8333, city: "Daman" }, // Moti Daman Fort
    186: { lat: 20.7333, lon: 70.9833, city: "Diu" }, // Ghogla Beach
    187: { lat: 33.9833, lon: 77.6667, city: "Leh" }, // Thiksey Monastery
    188: { lat: 34.2167, lon: 77.4000, city: "Leh" }, // Magnetic Hill
    189: { lat: 8.2833, lon: 73.0500, city: "Minicoy" },
    190: { lat: 10.0833, lon: 73.6333, city: "Kalpeni" },
    191: { lat: 11.9333, lon: 79.8333, city: "Pondicherry" }, // Sri Aurobindo
    192: { lat: 11.9667, lon: 79.8333, city: "Pondicherry" }, // Serenity Beach
    
    // New destinations from user list (193-224)
    193: { lat: 15.2495, lon: 78.2799, city: "Kadapa" }, // Gandikota
    194: { lat: 17.7833, lon: 83.3833, city: "Visakhapatnam" }, // Kailasagiri
    195: { lat: 25.9833, lon: 85.1333, city: "Vaishali" },
    196: { lat: 18.9333, lon: 81.9500, city: "Jagdalpur" }, // Kanger Valley
    197: { lat: 19.0833, lon: 81.9667, city: "Jagdalpur" }, // Tirathgarh Falls
    198: { lat: 15.5439, lon: 73.7553, city: "Calangute" },
    199: { lat: 15.5833, lon: 73.7333, city: "Anjuna" },
    200: { lat: 22.4631, lon: 78.4333, city: "Pachmarhi" },
    201: { lat: 22.3333, lon: 80.6167, city: "Mandla" }, // Kanha
    202: { lat: 26.2389, lon: 73.0243, city: "Jodhpur" },
    203: { lat: 27.3667, lon: 88.7500, city: "East Sikkim" }, // Tsomgo Lake
    204: { lat: 27.8500, lon: 88.7000, city: "Lachung" }, // Yumthang
    205: { lat: 13.0827, lon: 80.2707, city: "Chennai" },
    206: { lat: 10.2381, lon: 77.4892, city: "Kodaikanal" },
    207: { lat: 8.7379, lon: 76.7163, city: "Varkala" },
    208: { lat: 9.9312, lon: 76.2673, city: "Kochi" }, // Fort Kochi
    209: { lat: 25.9000, lon: 93.7333, city: "Dimapur" },
    210: { lat: 26.3167, lon: 94.5167, city: "Mokokchung" },
    211: { lat: 25.6333, lon: 94.1000, city: "Kohima" }, // Kisama
    212: { lat: 30.3398, lon: 76.3869, city: "Patiala" },
    213: { lat: 21.9497, lon: 88.8983, city: "South 24 Parganas" }, // Sundarbans
    214: { lat: 28.6127, lon: 77.2773, city: "Delhi" }, // Akshardham (duplicate but ok)
    215: { lat: 34.3033, lon: 75.2931, city: "Sonamarg" },
    216: { lat: 32.9167, lon: 78.3167, city: "Tso Moriri" },
    217: { lat: 11.9416, lon: 92.9546, city: "Havelock" },
    218: { lat: 11.6234, lon: 92.7265, city: "Port Blair" },
    219: { lat: 24.2333, lon: 94.3167, city: "Moreh" },
    220: { lat: 22.8833, lon: 92.7333, city: "Lunglei" },
    221: { lat: 23.4500, lon: 84.2833, city: "Netarhat" },
    222: { lat: 23.3441, lon: 85.3096, city: "Ranchi" },
    223: { lat: 9.9312, lon: 76.2673, city: "Kochi" },
    224: { lat: 29.3909, lon: 76.9635, city: "Panipat" }
};

// City-level coordinate fallback for all destinations that lack an explicit ID entry.
// Used by searchNearMe() when DESTINATION_COORDINATES[dest.id] is undefined.
// Covers all 370 unique city values present in data.js.
const CITY_COORDINATES = {
    // A
    "Abhaneri":              { lat: 27.0422, lon: 76.5961 },
    "Agartala":              { lat: 23.8315, lon: 91.2868 },
    "Agatti":                { lat: 10.8505, lon: 72.1833 },
    "Agra":                  { lat: 27.1751, lon: 78.0421 },
    "Ahmedabad":             { lat: 23.0225, lon: 72.5714 },
    "Ahmednagar":            { lat: 19.0948, lon: 74.7480 },
    "Aizawl":                { lat: 23.7271, lon: 92.7176 },
    "Ajmer":                 { lat: 26.4499, lon: 74.6399 },
    "Alappuzha":             { lat: 9.4981,  lon: 76.3388 },
    "Alchi":                 { lat: 34.2225, lon: 77.1750 },
    "Alibag":                { lat: 18.6415, lon: 72.8722 },
    "Alipurduar":            { lat: 26.4889, lon: 89.5261 },
    "Alleppey":              { lat: 9.4981,  lon: 76.3388 },
    "Almora":                { lat: 29.5971, lon: 79.6591 },
    "Alwar":                 { lat: 27.5530, lon: 76.6346 },
    "Amritsar":              { lat: 31.6340, lon: 74.8723 },
    "Anandpur Sahib":        { lat: 31.2392, lon: 76.5128 },
    "Anantapur":             { lat: 14.6819, lon: 77.6006 },
    "Anantnag":              { lat: 33.7311, lon: 75.1487 },
    "Andaman":               { lat: 11.7401, lon: 92.6586 },
    "Angul":                 { lat: 20.8333, lon: 85.1000 },
    "Anuppur":               { lat: 23.1000, lon: 81.6833 },
    "Araku Valley":          { lat: 18.3271, lon: 83.0550 },
    "Auli":                  { lat: 30.5267, lon: 79.5621 },
    "Aurangabad":            { lat: 19.8762, lon: 75.3433 },
    "Auroville":             { lat: 12.0070, lon: 79.8107 },
    "Ayodhya":               { lat: 26.7922, lon: 82.1998 },
    // B
    "Bagalkot":              { lat: 16.1737, lon: 75.6966 },
    "Banaskantha":           { lat: 24.1759, lon: 72.4156 },
    "Bangalore":             { lat: 12.9716, lon: 77.5946 },
    "Bangaram":              { lat: 10.9333, lon: 72.2833 },
    "Baratang":              { lat: 12.1167, lon: 92.7667 },
    "Barpeta":               { lat: 26.3333, lon: 90.9833 },
    "Bastar":                { lat: 19.1200, lon: 81.9500 },
    "Belonia":               { lat: 23.2500, lon: 91.4500 },
    "Bhagalpur":             { lat: 25.2425, lon: 86.9691 },
    "Bharatpur":             { lat: 27.2152, lon: 77.4899 },
    "Bhopal":                { lat: 23.2599, lon: 77.4126 },
    "Bhubaneswar":           { lat: 20.2961, lon: 85.8245 },
    "Bhupalpally":           { lat: 18.4333, lon: 79.9333 },
    "Bidadi":                { lat: 12.8017, lon: 77.3978 },
    "Bijapur":               { lat: 16.8302, lon: 75.7100 },
    "Bikaner":               { lat: 28.0229, lon: 73.3119 },
    "Bir":                   { lat: 31.9928, lon: 76.7068 },
    "Bishalgarh":            { lat: 23.6833, lon: 91.4167 },
    "Bishnupur":             { lat: 23.0800, lon: 87.3200 },
    "Bodh Gaya":             { lat: 24.6961, lon: 84.9869 },
    "Bolpur":                { lat: 23.6814, lon: 87.6853 },
    "Bomdila":               { lat: 27.2682, lon: 92.4026 },
    "Budgam":                { lat: 33.9419, lon: 74.7186 },
    "Bundi":                 { lat: 25.4388, lon: 75.6494 },
    // C
    "Central Delhi":         { lat: 28.6562, lon: 77.2410 },
    "Chamba":                { lat: 32.5536, lon: 76.1212 },
    "Chamoli":               { lat: 30.3673, lon: 79.3233 },
    "Champaner":             { lat: 22.4871, lon: 73.5393 },
    "Champhai":              { lat: 23.4672, lon: 93.3266 },
    "Chandigarh":            { lat: 30.7333, lon: 76.7794 },
    "Chandrapur":            { lat: 19.9615, lon: 79.2961 },
    "Changlang":             { lat: 27.4324, lon: 96.5563 },
    "Chennai":               { lat: 13.0827, lon: 80.2707 },
    "Cherrapunji":           { lat: 25.2796, lon: 91.7006 },
    "Chhindwara":            { lat: 22.0574, lon: 78.9382 },
    "Chikkaballapur":        { lat: 13.4354, lon: 77.7286 },
    "Chikmagalur":           { lat: 13.3153, lon: 75.7754 },
    "Chilika Lake":          { lat: 19.7200, lon: 85.4500 },
    "Chitrakoot":            { lat: 25.1996, lon: 80.8679 },
    "Chittorgarh":           { lat: 24.8887, lon: 74.6247 },
    "Chunnambar":            { lat: 11.9000, lon: 79.8167 },
    "Churu":                 { lat: 28.2965, lon: 74.9661 },
    "Coimbatore":            { lat: 11.0168, lon: 76.9558 },
    "Coorg":                 { lat: 12.3375, lon: 75.8069 },
    // D
    "Dakshina Kannada":      { lat: 12.8640, lon: 75.0282 },
    "Dalhousie":             { lat: 32.5371, lon: 75.9740 },
    "Daman":                 { lat: 20.3974, lon: 72.8328 },
    "Dandeli":               { lat: 15.2675, lon: 74.6148 },
    "Dantewada":             { lat: 18.8950, lon: 81.3450 },
    "Darjeeling":            { lat: 27.0410, lon: 88.2663 },
    "Dawki":                 { lat: 25.2333, lon: 92.0333 },
    "Dehradun":              { lat: 30.3165, lon: 78.0322 },
    "Delhi":                 { lat: 28.6129, lon: 77.2295 },
    "Deoghar":               { lat: 24.4836, lon: 86.6967 },
    "Devbhumi Dwarka":       { lat: 22.2442, lon: 68.9685 },
    "Dharamshala":           { lat: 32.2190, lon: 76.3234 },
    "Dharmapuri":            { lat: 12.1211, lon: 78.1582 },
    "Dhenkanal":             { lat: 20.6511, lon: 85.5984 },
    "Dhule":                 { lat: 20.9042, lon: 74.7749 },
    "Dibang Valley":         { lat: 28.6295, lon: 95.5697 },
    "Dibrugarh":             { lat: 27.4728, lon: 94.9120 },
    "Digha":                 { lat: 21.6278, lon: 87.5046 },
    "Dimapur":               { lat: 25.9059, lon: 93.7247 },
    "Dindigul":              { lat: 10.3624, lon: 77.9695 },
    "Diskit":                { lat: 34.5630, lon: 77.5810 },
    "Diu":                   { lat: 20.7144, lon: 70.9822 },
    "Doddaballapur":         { lat: 13.2942, lon: 77.5357 },
    "Dwarka":                { lat: 22.2442, lon: 68.9685 },
    // E
    "East Champaran":        { lat: 26.6500, lon: 84.9167 },
    "East Kameng":           { lat: 27.1666, lon: 92.8000 },
    "East Khasi Hills":      { lat: 25.2552, lon: 91.7296 },
    "East Siang":            { lat: 28.1800, lon: 95.2000 },
    "East Sikkim":           { lat: 27.3314, lon: 88.6138 },
    "Ernakulam":             { lat: 9.9312,  lon: 76.2673 },
    // F
    "Faridabad":             { lat: 28.4082, lon: 77.3178 },
    // G
    "Gajapati":              { lat: 18.9817, lon: 84.1136 },
    "Ganderbal":             { lat: 34.2175, lon: 74.7783 },
    "Gangtok":               { lat: 27.3314, lon: 88.6138 },
    "Gaya":                  { lat: 24.7955, lon: 84.9994 },
    "Giridih":               { lat: 24.1861, lon: 86.3178 },
    "Gokarna":               { lat: 14.5500, lon: 74.3167 },
    "Golaghat":              { lat: 26.5240, lon: 93.9673 },
    "Gomati":                { lat: 23.9850, lon: 91.4154 },
    "Gulmarg":               { lat: 34.0484, lon: 74.3805 },
    "Gundlupet":             { lat: 11.8063, lon: 76.6867 },
    "Guntur":                { lat: 16.3008, lon: 80.4428 },
    "Gurgaon":               { lat: 28.4595, lon: 77.0266 },
    "Gurugram":              { lat: 28.4595, lon: 77.0266 },
    "Guruvayur":             { lat: 10.5942, lon: 76.0403 },
    "Guwahati":              { lat: 26.1445, lon: 91.7362 },
    "Gwalior":               { lat: 26.2183, lon: 78.1828 },
    // H
    "Haflong":               { lat: 25.1650, lon: 93.0167 },
    "Hampi":                 { lat: 15.3350, lon: 76.4600 },
    "Haridwar":              { lat: 29.9457, lon: 78.1642 },
    "Hassan":                { lat: 13.0068, lon: 76.1004 },
    "Havelock":              { lat: 11.9802, lon: 92.9992 },
    "Havelock Island":       { lat: 11.9802, lon: 92.9992 },
    "Hoshangabad":           { lat: 22.7478, lon: 77.7297 },
    "Hyderabad":             { lat: 17.3616, lon: 78.4747 },
    // I
    "Idukki":                { lat: 9.8500,  lon: 76.9667 },
    "Imphal":                { lat: 24.8170, lon: 93.9368 },
    "Imphal East":           { lat: 24.8560, lon: 93.9900 },
    "Indore":                { lat: 22.7196, lon: 75.8577 },
    // J
    "Jabalpur":              { lat: 23.1815, lon: 79.9864 },
    "Jagdalpur":             { lat: 19.0833, lon: 81.9667 },
    "Jaintia Hills":         { lat: 25.2796, lon: 91.9000 },
    "Jaipur":                { lat: 26.9124, lon: 75.7873 },
    "Jaisalmer":             { lat: 26.9157, lon: 70.9083 },
    "Jalpaiguri":            { lat: 26.5163, lon: 88.7182 },
    "Jodhpur":               { lat: 26.2389, lon: 73.0243 },
    "Jorhat":                { lat: 26.7509, lon: 94.2037 },
    "Junagadh":              { lat: 21.5222, lon: 70.4579 },
    // K
    "Kabini":                { lat: 11.9367, lon: 76.3842 },
    "Kabirdham":             { lat: 22.1808, lon: 81.2467 },
    "Kadapa":                { lat: 14.4674, lon: 78.8241 },
    "Kailashahar":           { lat: 24.3167, lon: 92.0167 },
    "Kalahandi":             { lat: 19.9095, lon: 83.1658 },
    "Kalimpong":             { lat: 27.0594, lon: 88.4695 },
    "Kalpeni":               { lat: 10.0833, lon: 73.6333 },
    "Kanakapura":            { lat: 12.5455, lon: 77.4192 },
    "Kangra":                { lat: 32.0998, lon: 76.2691 },
    "Kannur":                { lat: 11.8745, lon: 75.3704 },
    "Kanyakumari":           { lat: 8.0883,  lon: 77.5385 },
    "Karaikudi":             { lat: 10.0731, lon: 78.7867 },
    "Karimnagar":            { lat: 18.4386, lon: 79.1288 },
    "Kasaragod":             { lat: 12.4996, lon: 74.9869 },
    "Katra":                 { lat: 33.0318, lon: 74.9288 },
    "Kavaratti":             { lat: 10.5593, lon: 72.6420 },
    "Kaza":                  { lat: 32.2267, lon: 78.0718 },
    "Kaziranga":             { lat: 26.5775, lon: 93.1711 },
    "Kendrapara":            { lat: 20.5024, lon: 86.4229 },
    "Kevadia":               { lat: 21.8380, lon: 73.7189 },
    "Khajjiar":              { lat: 32.5403, lon: 76.0556 },
    "Khajuraho":             { lat: 24.8318, lon: 79.9199 },
    "Khammam":               { lat: 17.2473, lon: 80.1514 },
    "Kinnaur":               { lat: 31.5825, lon: 78.2695 },
    "Kochi":                 { lat: 9.9312,  lon: 76.2673 },
    "Kodagu":                { lat: 12.3375, lon: 75.8069 },
    "Kodaikanal":            { lat: 10.2381, lon: 77.4892 },
    "Kohima":                { lat: 25.6751, lon: 94.1086 },
    "Kolasib":               { lat: 24.2186, lon: 92.6764 },
    "Kolhapur":              { lat: 16.7050, lon: 74.2433 },
    "Kolkata":               { lat: 22.5726, lon: 88.3639 },
    "Kollam":                { lat: 8.8932,  lon: 76.6141 },
    "Konark":                { lat: 19.8876, lon: 86.0977 },
    "Koraput":               { lat: 18.8135, lon: 82.7119 },
    "Kottayam":              { lat: 9.5916,  lon: 76.5222 },
    "Kozhikode":             { lat: 11.2588, lon: 75.7804 },
    "Kullu":                 { lat: 31.9578, lon: 77.1094 },
    "Kumbhalgarh":           { lat: 25.1478, lon: 73.5866 },
    "Kurnool":               { lat: 15.8281, lon: 78.0373 },
    "Kurukshetra":           { lat: 29.9695, lon: 76.8783 },
    "Kutch":                 { lat: 23.7337, lon: 69.8597 },
    // L
    "Lahaul and Spiti":      { lat: 32.5680, lon: 77.5760 },
    "Lahaul-Spiti":          { lat: 32.5680, lon: 77.5760 },
    "Lakhimpur Kheri":       { lat: 27.9475, lon: 80.7814 },
    "Lamayuru":              { lat: 34.2727, lon: 76.7777 },
    "Lansdowne":             { lat: 29.8378, lon: 78.6850 },
    "Latehar":               { lat: 23.7450, lon: 84.4974 },
    "Lawngtlai":             { lat: 22.5000, lon: 92.8000 },
    "Leh":                   { lat: 34.1526, lon: 77.5771 },
    "Lonavala":              { lat: 18.7557, lon: 73.4091 },
    "Lothal":                { lat: 22.5228, lon: 72.2498 },
    "Lower Dibang Valley":   { lat: 28.0793, lon: 95.8432 },
    "Lower Subansiri":       { lat: 27.5695, lon: 93.8048 },
    "Lucknow":               { lat: 26.8467, lon: 80.9462 },
    "Lunglei":               { lat: 22.8853, lon: 92.7319 },
    // M
    "Madikeri":              { lat: 12.4244, lon: 75.7382 },
    "Madurai":               { lat: 9.9195,  lon: 78.1193 },
    "Magadi":                { lat: 12.9579, lon: 77.2254 },
    "Mahabalipuram":         { lat: 12.6172, lon: 80.1927 },
    "Mahad":                 { lat: 18.0712, lon: 73.4093 },
    "Mahasamund":            { lat: 21.1086, lon: 82.0986 },
    "Maheshwar":             { lat: 22.1782, lon: 75.5884 },
    "Majuli Island":         { lat: 26.9500, lon: 94.1667 },
    "Malappuram":            { lat: 11.0510, lon: 76.0711 },
    "Mamit":                 { lat: 23.9284, lon: 92.4817 },
    "Manali":                { lat: 32.2432, lon: 77.1892 },
    "Mancherial":            { lat: 18.8699, lon: 79.4579 },
    "Mandawa":               { lat: 28.0543, lon: 75.1477 },
    "Mandi":                 { lat: 31.7097, lon: 76.9297 },
    "Mandla":                { lat: 22.5986, lon: 80.3737 },
    "Mandu":                 { lat: 22.3567, lon: 75.3967 },
    "Mangalore":             { lat: 12.9141, lon: 74.8560 },
    "Matheran":              { lat: 18.9887, lon: 73.2727 },
    "Mathura":               { lat: 27.4924, lon: 77.6737 },
    "Mayurbhanj":            { lat: 21.9483, lon: 86.7291 },
    "Medak":                 { lat: 18.0510, lon: 78.2578 },
    "Melaghar":              { lat: 23.5142, lon: 91.2945 },
    "Minicoy":               { lat: 8.2833,  lon: 73.0500 },
    "Modhera":               { lat: 23.5835, lon: 72.1317 },
    "Moirang":               { lat: 24.5000, lon: 93.7667 },
    "Mokokchung":            { lat: 26.3167, lon: 94.5167 },
    "Mount Abu":             { lat: 24.5926, lon: 72.7156 },
    "Mulugu":                { lat: 18.2000, lon: 80.2500 },
    "Mumbai":                { lat: 18.9220, lon: 72.8347 },
    "Munnar":                { lat: 10.0889, lon: 77.0595 },
    "Murshidabad":           { lat: 24.1806, lon: 88.2718 },
    "Mussoorie":             { lat: 30.4598, lon: 78.0644 },
    "Mysore":                { lat: 12.3051, lon: 76.6553 },
    // N
    "Nagarjuna Sagar":       { lat: 16.5167, lon: 79.3167 },
    "Nagaur":                { lat: 27.2018, lon: 73.7344 },
    "Nagpur":                { lat: 21.1458, lon: 79.0882 },
    "Nainital":              { lat: 29.3919, lon: 79.4542 },
    "Nalanda":               { lat: 25.1368, lon: 85.4460 },
    "Nalgonda":              { lat: 17.0575, lon: 79.2661 },
    "Narmada":               { lat: 22.3297, lon: 73.1213 },
    "Nashik":                { lat: 19.9975, lon: 73.7898 },
    "Nathdwara":             { lat: 24.9350, lon: 73.8295 },
    "Neil Island":           { lat: 11.8333, lon: 93.0500 },
    "New Delhi":             { lat: 28.6139, lon: 77.2090 },
    "Nilgiris":              { lat: 11.4916, lon: 76.7306 },
    "Nizamabad":             { lat: 18.6726, lon: 78.0941 },
    "Nongriat":              { lat: 25.2552, lon: 91.7296 },
    "North Goa":             { lat: 15.5513, lon: 73.7519 },
    "North Sikkim":          { lat: 27.6678, lon: 88.5349 },
    "North Tripura":         { lat: 23.7500, lon: 92.1667 },
    "Nubra Valley":          { lat: 34.5894, lon: 77.5222 },
    // O
    "Old Goa":               { lat: 15.4909, lon: 73.8278 },
    "Omkareshwar":           { lat: 22.2350, lon: 76.1504 },
    "Ooty":                  { lat: 11.4102, lon: 76.6950 },
    // P
    "Padum":                 { lat: 33.4651, lon: 77.2693 },
    "Pahalgam":              { lat: 34.0161, lon: 75.3150 },
    "Palakkad":              { lat: 10.7867, lon: 76.6548 },
    "Pali":                  { lat: 25.7711, lon: 73.3234 },
    "Palitana":              { lat: 21.5184, lon: 71.8238 },
    "Panchkula":             { lat: 30.6942, lon: 76.8606 },
    "Pandharpur":            { lat: 17.6806, lon: 75.3278 },
    "Pangong":               { lat: 33.7595, lon: 78.6643 },
    "Panipat":               { lat: 29.3909, lon: 76.9635 },
    "Patan":                 { lat: 23.8593, lon: 72.1267 },
    "Patiala":               { lat: 30.3398, lon: 76.3869 },
    "Patna":                 { lat: 25.5941, lon: 85.1376 },
    "Pattadakal":            { lat: 15.9483, lon: 75.8195 },
    "Pauri Garhwal":         { lat: 30.1544, lon: 78.7811 },
    "Pelling":               { lat: 27.3116, lon: 88.2305 },
    "Phek":                  { lat: 26.2167, lon: 94.4667 },
    "Pithoragarh":           { lat: 29.5830, lon: 80.2186 },
    "Pondicherry":           { lat: 11.9416, lon: 79.8083 },
    "Port Blair":            { lat: 11.6234, lon: 92.7265 },
    "Prayagraj":             { lat: 25.4358, lon: 81.8463 },
    "Pune":                  { lat: 18.5204, lon: 73.8567 },
    "Puri":                  { lat: 19.8135, lon: 85.8312 },
    "Pushkar":               { lat: 26.4899, lon: 74.5510 },
    // R
    "Raigad":                { lat: 18.5126, lon: 73.1672 },
    "Raipur":                { lat: 21.2514, lon: 81.6296 },
    "Rajgir":                { lat: 25.0225, lon: 85.4167 },
    "Rajsamand":             { lat: 25.0540, lon: 73.9012 },
    "Ramanagara":            { lat: 12.7182, lon: 77.2823 },
    "Rameshwaram":           { lat: 9.2876,  lon: 79.3129 },
    "Ramgarh":               { lat: 23.6333, lon: 85.4167 },
    "Ramnagar":              { lat: 29.3940, lon: 79.1289 },
    "Ranakpur":              { lat: 25.1180, lon: 73.4845 },
    "Ranchi":                { lat: 23.3441, lon: 85.3096 },
    "Ranikhet":              { lat: 29.6458, lon: 79.4311 },
    "Ratnagiri":             { lat: 16.9902, lon: 73.3120 },
    "Ravangla":              { lat: 27.3000, lon: 88.3667 },
    "Rishikesh":             { lat: 30.0869, lon: 78.2676 },
    "Rohtas":                { lat: 24.5816, lon: 83.8696 },
    "Rudraprayag":           { lat: 30.2847, lon: 78.9815 },
    "Rupnagar":              { lat: 31.0319, lon: 76.5257 },
    // S
    "Sabarkantha":           { lat: 23.5000, lon: 73.0167 },
    "Sagara":                { lat: 14.1667, lon: 75.0333 },
    "Saitual":               { lat: 23.8174, lon: 92.9239 },
    "Salem":                 { lat: 11.6643, lon: 78.1460 },
    "Sambalpur":             { lat: 21.4669, lon: 83.9756 },
    "Sanchi":                { lat: 23.4793, lon: 77.7379 },
    "Sangla":                { lat: 31.4214, lon: 78.2467 },
    "Saputara":              { lat: 20.5784, lon: 73.7514 },
    "Sarnath":               { lat: 25.3812, lon: 83.0253 },
    "Satara":                { lat: 17.6805, lon: 73.9934 },
    "Sawai Madhopur":        { lat: 25.9997, lon: 76.5029 },
    "Senapati":              { lat: 25.2667, lon: 94.0167 },
    "Seoni":                 { lat: 22.0885, lon: 79.5454 },
    "Serchhip":              { lat: 23.3042, lon: 92.8511 },
    "Shillong":              { lat: 25.5788, lon: 91.8933 },
    "Shimla":                { lat: 31.1048, lon: 77.1734 },
    "Shimoga":               { lat: 13.9299, lon: 75.5681 },
    "Shirdi":                { lat: 19.7668, lon: 74.4763 },
    "Silvassa":              { lat: 20.2667, lon: 73.0167 },
    "Sindhudurg":            { lat: 16.0358, lon: 73.5069 },
    "Sivasagar":             { lat: 26.9833, lon: 94.6333 },
    "Somnath":               { lat: 20.9007, lon: 70.3787 },
    "South 24 Parganas":     { lat: 21.9497, lon: 88.8983 },
    "South Delhi":           { lat: 28.5352, lon: 77.2509 },
    "South Goa":             { lat: 15.3144, lon: 74.0951 },
    "South Sikkim":          { lat: 27.2800, lon: 88.3667 },
    "Spiti":                 { lat: 32.2267, lon: 78.0718 },
    "Srinagar":              { lat: 34.0837, lon: 74.7973 },
    "Sundarbans":            { lat: 21.9497, lon: 88.8983 },
    "Surendranagar":         { lat: 22.7269, lon: 71.6480 },
    "Surguja":               { lat: 23.1296, lon: 83.1965 },
    // T
    "Tamenglong":            { lat: 24.9750, lon: 93.4833 },
    "Tawang":                { lat: 27.5859, lon: 91.8694 },
    "Tehri Garhwal":         { lat: 30.3780, lon: 78.4803 },
    "Tengnoupal":            { lat: 24.0333, lon: 94.0500 },
    "Tezpur":                { lat: 26.6335, lon: 92.7926 },
    "Thanjavur":             { lat: 10.7870, lon: 79.1378 },
    "Theni":                 { lat: 10.0104, lon: 77.4767 },
    "Thiruvananthapuram":    { lat: 8.5241,  lon: 76.9366 },
    "Thoubal":               { lat: 24.6240, lon: 93.9950 },
    "Thrissur":              { lat: 10.5276, lon: 76.2144 },
    "Tikamgarh":             { lat: 24.7376, lon: 78.8312 },
    "Tirunelveli":           { lat: 8.7139,  lon: 77.7567 },
    "Tirupati":              { lat: 13.6288, lon: 79.4192 },
    "Tirupattur":            { lat: 12.4958, lon: 78.5612 },
    "Tirupur":               { lat: 11.1085, lon: 77.3411 },
    "Tiruvannamalai":        { lat: 12.2253, lon: 79.0747 },
    "Trivandrum":            { lat: 8.5241,  lon: 76.9366 },
    "Tumkur":                { lat: 13.3379, lon: 77.1273 },
    // U
    "Udaipur":               { lat: 24.5854, lon: 73.7125 },
    "Udhampur":              { lat: 32.9290, lon: 75.1429 },
    "Udupi":                 { lat: 13.3409, lon: 74.7421 },
    "Ujjain":                { lat: 23.1765, lon: 75.7885 },
    "Ukhrul":                { lat: 25.1151, lon: 94.3714 },
    "Umaria":                { lat: 23.5237, lon: 80.8374 },
    "Uttara Kannada":        { lat: 14.7800, lon: 74.6640 },
    "Uttarkashi":            { lat: 30.7268, lon: 78.4354 },
    // V
    "Vadodara":              { lat: 22.3072, lon: 73.1812 },
    "Vaishali":              { lat: 25.6947, lon: 85.0027 },
    "Valsad":                { lat: 20.5993, lon: 72.9342 },
    "Varanasi":              { lat: 25.3176, lon: 82.9739 },
    "Varkala":               { lat: 8.7379,  lon: 76.7163 },
    "Vellore":               { lat: 12.9165, lon: 79.1325 },
    "Vijayawada":            { lat: 16.5062, lon: 80.6480 },
    "Villupuram":            { lat: 11.9393, lon: 79.4925 },
    "Virudhunagar":          { lat: 9.5808,  lon: 77.9626 },
    "Visakhapatnam":         { lat: 17.7231, lon: 83.3013 },
    "Vizianagaram":          { lat: 18.1067, lon: 83.3956 },
    "Vrindavan":             { lat: 27.5800, lon: 77.7000 },
    // W
    "Warangal":              { lat: 17.9689, lon: 79.5941 },
    "Wayanad":               { lat: 11.6854, lon: 75.9913 },
    "West Godavari":         { lat: 16.7167, lon: 81.2667 },
    "West Jaintia Hills":    { lat: 25.2796, lon: 91.9000 },
    "West Kameng":           { lat: 27.1000, lon: 92.2333 },
    "West Khasi Hills":      { lat: 25.5000, lon: 91.3000 },
    "West Siang":            { lat: 28.0500, lon: 94.6000 },
    "West Sikkim":           { lat: 27.2667, lon: 88.2333 },
    "West Tripura":          { lat: 23.4667, lon: 91.2667 },
    "Wokha":                 { lat: 26.1006, lon: 94.2600 },
    // Y / Z
    "Yadadri Bhuvanagiri":   { lat: 17.2667, lon: 79.1667 },
    "Yercaud":               { lat: 11.7755, lon: 78.2122 },
    "Ziro":                  { lat: 27.5379, lon: 93.8251 }
};

// Google Place IDs for each destination (you'll need to find these)
const DESTINATION_PLACE_IDS = {
    1: "ChIJbf8C1yFxdDkR3n12P4DkKt0", // Taj Mahal
    2: "ChIJowMF8RH_vzsRED_GmvRLgQQ", // Goa
    // Add more place IDs as needed
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, DESTINATION_COORDINATES, CITY_COORDINATES, DESTINATION_PLACE_IDS };
}
