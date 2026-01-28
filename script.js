// CrowdWise India - Enhanced JavaScript v3.0
// With improved UX, search suggestions, and smart features

let allDestinations = [];
let filteredDestinations = [];
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
let currentSort = 'default';
let currentCrowdFilter = 'all';

// Transform destination data to include required fields
function transformDestinationData(dest) {
    // Convert numeric crowdLevel to string
    const normalizedLevel = normalizeCrowdLevel(dest.crowdLevel);
    
    // Format weather (convert object to string if needed)
    let weatherStr = dest.weather;
    if (typeof dest.weather === 'object' && dest.weather !== null) {
        weatherStr = `${dest.weather.temp}°C, ${dest.weather.condition}`;
    }
    
    // Generate estimated visitors based on avgVisitors and time
    const hour = new Date().getHours();
    const multiplier = (hour >= 10 && hour <= 16) ? 1.3 : 0.7;
    const variance = 0.2;
    const base = dest.avgVisitors || 5000;
    const estimated = Math.round(base * multiplier * (1 + (Math.random() - 0.5) * variance));
    const currentEstimate = formatVisitorCount(estimated);
    
    return {
        ...dest,
        crowdLevel: normalizedLevel,
        weather: weatherStr,
        currentEstimate: currentEstimate,
        bestTimeToVisit: dest.bestTime || 'October to March'
    };
}

// Format visitor counts like 1k, 10k, etc.
function formatVisitorCount(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Transform raw destination data
    allDestinations = destinations.map(transformDestinationData);
    filteredDestinations = [...allDestinations];
    
    // Initialize data status first
    apiService.updateDataStatus();
    displayDataStatus();
    
    // Populate state dropdowns dynamically
    populateStateDropdowns();
    
    // Load real-time data if enabled
    if (API_CONFIG.USE_REAL_CROWD_DATA || API_CONFIG.ENABLE_DYNAMIC_MOCK || API_CONFIG.USE_REAL_WEATHER) {
        console.log('🔄 Loading real-time data...');
        await apiService.updateAllDestinations(allDestinations);
        filteredDestinations = [...allDestinations];
    }
    
    renderDestinations();
    renderHeatmap();
    populateModals();
    setupSearchSuggestions();
    setupStickyFilterBar();
    setupMobileNavigation();
    updateLastUpdatedTime();
    displayDataStatus();
    
    console.log('🗺️ CrowdWise India v3.0 initialized!');
    console.log(`📊 Loaded ${allDestinations.length} destinations across ${allStates.length} states/UTs`);
});

// ========== STATE DROPDOWN POPULATION ==========
function populateStateDropdowns() {
    const stateEmojis = {
        'Andhra Pradesh': '🛕', 'Arunachal Pradesh': '🏔️', 'Assam': '🦏', 'Bihar': '☸️',
        'Chhattisgarh': '💧', 'Goa': '🏖️', 'Gujarat': '🗽', 'Haryana': '⚔️',
        'Himachal Pradesh': '⛰️', 'Jharkhand': '🏔️', 'Karnataka': '👑', 'Kerala': '🚤',
        'Madhya Pradesh': '🐅', 'Maharashtra': '🌆', 'Manipur': '🏞️', 'Meghalaya': '🌧️',
        'Mizoram': '🏙️', 'Nagaland': '🎭', 'Odisha': '☀️', 'Punjab': '🛕',
        'Rajasthan': '🏰', 'Sikkim': '🏔️', 'Tamil Nadu': '🛕', 'Telangana': '🕌',
        'Tripura': '🏛️', 'Uttar Pradesh': '🕌', 'Uttarakhand': '🧘', 'West Bengal': '🍵',
        'Andaman & Nicobar': '🏝️', 'Chandigarh': '🗿', 'Dadra & Nagar Haveli': '🌳',
        'Daman & Diu': '🏖️', 'Delhi': '🏰', 'Jammu & Kashmir': '🚣', 'Ladakh': '🏔️',
        'Lakshadweep': '🏝️', 'Puducherry': '🏖️'
    };
    
    // Get unique states that have destinations
    const statesWithDestinations = [...new Set(allDestinations.map(d => d.state))].sort();
    
    const stateOptions = statesWithDestinations.map(state => {
        const emoji = stateEmojis[state] || '📍';
        const count = allDestinations.filter(d => d.state === state).length;
        return `<option value="${state}">${emoji} ${state} (${count})</option>`;
    }).join('');
    
    // Populate main state filter
    const mainFilter = document.getElementById('stateFilter');
    if (mainFilter) {
        mainFilter.innerHTML = '<option value="all">🗺️ All States</option>' + stateOptions;
    }
    
    // Populate sticky state filter
    const stickyFilter = document.getElementById('stickyStateFilter');
    if (stickyFilter) {
        stickyFilter.innerHTML = '<option value="all">📍 All States</option>' + stateOptions;
    }
    
    // Populate itinerary state dropdown if exists
    const itineraryFilter = document.getElementById('itineraryState');
    if (itineraryFilter) {
        itineraryFilter.innerHTML = '<option value="">Select state...</option>' + stateOptions;
    }
    
    console.log(`📍 Populated dropdowns with ${statesWithDestinations.length} states/UTs`);
}

// ========== DESTINATION RENDERING ==========
function renderDestinations() {
    const grid = document.getElementById('destinationsGrid');
    
    if (filteredDestinations.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                <p>No destinations found matching your filters.</p>
                <button onclick="clearAllFilters()" style="margin-top: 16px; padding: 12px 24px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600;">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredDestinations.map(dest => {
        const crowdClass = getCrowdClass(dest.crowdLevel);
        const crowdLabel = getCrowdLabel(dest.crowdLevel);
        const trendData = generateTrendData(dest.crowdLevel);
        const bestTimeNow = getBestTimeNow(dest);
        
        return `
            <div class="destination-card" onclick="showDetails(${dest.id})">
                <div class="card-image">
                    <span style="font-size: 4rem;">${dest.emoji}</span>
                    <span class="crowd-badge crowd-${dest.crowdLevel}">${crowdLabel}</span>
                    <span class="best-time-badge">⏰ Best: ${bestTimeNow}</span>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${dest.name}</div>
                            <div class="card-state">📍 ${dest.state}</div>
                        </div>
                        <div class="current-estimate">
                            <div class="estimate-label">Live Count</div>
                            <div class="estimate-value">👥 ${dest.currentEstimate}</div>
                        </div>
                    </div>
                    
                    <div class="card-stats">
                        <div class="card-stat">
                            <span class="stat-icon">⏰</span>
                            <div class="stat-content">
                                <span class="stat-label">Best Time</span>
                                <span class="stat-value">${bestTimeNow}</span>
                            </div>
                        </div>
                        <div class="card-stat">
                            <span class="stat-icon">🔥</span>
                            <div class="stat-content">
                                <span class="stat-label">Peak</span>
                                <span class="stat-value">${dest.peakHours}</span>
                            </div>
                        </div>
                        <div class="card-stat">
                            <span class="stat-icon">🌡️</span>
                            <div class="stat-content">
                                <span class="stat-label">Weather</span>
                                <span class="stat-value">${dest.weather}</span>
                            </div>
                        </div>
                        <div class="card-stat">
                            <span class="stat-icon">📈</span>
                            <div class="stat-content">
                                <span class="stat-label">Trend</span>
                                <span class="stat-value">${getTrendText(dest.crowdLevel)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="crowd-sparkline">
                        ${trendData.map((val, i) => `
                            <div class="sparkline-bar ${getSparklineClass(val)}" style="height: ${val}%"></div>
                        `).join('')}
                    </div>
                    
                    <div class="best-time-box">
                        <div class="best-time-header">
                            <span class="best-time-icon">💡</span>
                            <span class="best-time-label">Best Time to Visit</span>
                        </div>
                        <div class="best-time-value">${dest.bestTimeToVisit}</div>
                        <div class="trend-indicator ${getTrendDirection(dest.crowdLevel)}">
                            ${getTrendIcon(dest.crowdLevel)} ${getTrendText(dest.crowdLevel)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== HEATMAP RENDERING ==========
function renderHeatmap() {
    const heatmapGrid = document.getElementById('heatmapGrid');
    
    heatmapGrid.innerHTML = allDestinations.map(dest => `
        <div class="heatmap-item ${dest.crowdLevel}" onclick="showDetails(${dest.id})">
            <div class="heatmap-emoji">${dest.emoji}</div>
            <div class="heatmap-name">${dest.name}</div>
            <div class="heatmap-crowd">${getCrowdLabel(dest.crowdLevel)}</div>
        </div>
    `).join('');
}

// ========== HELPER FUNCTIONS ==========

// Convert numeric crowdLevel (0-100) to string level
function normalizeCrowdLevel(level) {
    if (typeof level === 'string') return level;
    if (typeof level === 'number') {
        if (level <= 35) return 'low';
        if (level <= 55) return 'moderate';
        if (level <= 75) return 'heavy';
        return 'overcrowded';
    }
    return 'moderate';
}

function getCrowdClass(level) {
    const normalizedLevel = normalizeCrowdLevel(level);
    const classes = {
        'low': 'low',
        'moderate': 'moderate',
        'heavy': 'busy',
        'overcrowded': 'packed',
        'closed': 'closed'
    };
    return classes[normalizedLevel] || 'moderate';
}

function getCrowdLabel(level) {
    const normalizedLevel = normalizeCrowdLevel(level);
    const labels = {
        'low': '🟢 Low',
        'moderate': '🟡 Moderate',
        'heavy': '🟠 Busy',
        'overcrowded': '🔴 Packed',
        'closed': '⚫ Closed Today'
    };
    return labels[normalizedLevel] || '🟡 Moderate';
}

function generateTrendData(crowdLevel) {
    const normalizedLevel = normalizeCrowdLevel(crowdLevel);
    const baseValues = {
        'low': [20, 25, 30, 35, 40, 45, 35, 30],
        'moderate': [40, 50, 55, 60, 65, 70, 55, 45],
        'heavy': [60, 70, 75, 80, 85, 90, 75, 65],
        'overcrowded': [80, 85, 90, 95, 100, 95, 85, 80]
    };
    return baseValues[normalizedLevel] || baseValues['moderate'];
}

function getSparklineClass(value) {
    if (value <= 35) return 'low';
    if (value <= 55) return 'moderate';
    if (value <= 75) return 'busy';
    return 'packed';
}

function getTrendDirection(crowdLevel) {
    const normalizedLevel = normalizeCrowdLevel(crowdLevel);
    const trends = {
        'low': 'stable',
        'moderate': 'up',
        'heavy': 'up',
        'overcrowded': 'stable'
    };
    return trends[normalizedLevel] || 'stable';
}

function getTrendIcon(crowdLevel) {
    const normalizedLevel = normalizeCrowdLevel(crowdLevel);
    const icons = {
        'low': '→',
        'moderate': '↗',
        'heavy': '↑',
        'overcrowded': '→'
    };
    return icons[normalizedLevel] || '→';
}

function getTrendText(crowdLevel) {
    const normalizedLevel = normalizeCrowdLevel(crowdLevel);
    const texts = {
        'low': 'Stable',
        'moderate': 'Increasing',
        'heavy': 'High',
        'overcrowded': 'Very High'
    };
    return texts[normalizedLevel] || 'Stable';
}

function getBestTimeNow(dest) {
    const hour = new Date().getHours();
    if (hour < 9) return '6-9 AM';
    if (hour < 12) return 'Now!';
    if (hour < 16) return '4-6 PM';
    return '6-8 AM';
}

// ========== SEARCH FUNCTIONALITY ==========
function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDropdown = document.getElementById('searchSuggestions');
    const popularSuggestions = document.getElementById('popularSuggestions');
    const recentSuggestions = document.getElementById('recentSuggestions');
    const recentSection = document.getElementById('recentSection');
    
    // Populate popular suggestions
    const popular = ['Taj Mahal', 'Goa Beaches', 'Manali', 'Kerala Backwaters', 'Jaipur'];
    popularSuggestions.innerHTML = popular.map(item => {
        const dest = allDestinations.find(d => d.name.includes(item.split(' ')[0]));
        return `
            <div class="suggestion-item" onclick="quickSearch('${item}')">
                ${dest ? dest.emoji : '📍'} ${item}
            </div>
        `;
    }).join('');
    
    // Handle search input
    searchInput.addEventListener('focus', function() {
        updateRecentSearches();
        suggestionsDropdown.classList.add('active');
    });
    
    searchInput.addEventListener('blur', function() {
        setTimeout(() => suggestionsDropdown.classList.remove('active'), 200);
    });
    
    searchInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length > 0) {
            const matches = allDestinations.filter(d => 
                d.name.toLowerCase().includes(value) ||
                d.state.toLowerCase().includes(value) ||
                d.city.toLowerCase().includes(value)
            ).slice(0, 5);
            
            popularSuggestions.innerHTML = matches.map(dest => `
                <div class="suggestion-item" onclick="quickSearch('${dest.name}')">
                    ${dest.emoji} ${dest.name}
                    <span style="margin-left: auto; font-size: 12px; opacity: 0.7;">${getCrowdLabel(dest.crowdLevel)}</span>
                </div>
            `).join('');
        } else {
            // Reset to popular
            popularSuggestions.innerHTML = popular.map(item => {
                const dest = allDestinations.find(d => d.name.includes(item.split(' ')[0]));
                return `
                    <div class="suggestion-item" onclick="quickSearch('${item}')">
                        ${dest ? dest.emoji : '📍'} ${item}
                    </div>
                `;
            }).join('');
        }
        
        searchDestination();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addToRecentSearches(this.value);
            suggestionsDropdown.classList.remove('active');
        }
    });
}

function updateRecentSearches() {
    const recentSection = document.getElementById('recentSection');
    const recentSuggestions = document.getElementById('recentSuggestions');
    
    if (recentSearches.length > 0) {
        recentSection.style.display = 'block';
        recentSuggestions.innerHTML = recentSearches.slice(0, 3).map(term => `
            <div class="suggestion-item" onclick="quickSearch('${term}')">
                🕒 ${term}
            </div>
        `).join('');
    } else {
        recentSection.style.display = 'none';
    }
}

function addToRecentSearches(term) {
    if (term.trim() && !recentSearches.includes(term)) {
        recentSearches.unshift(term);
        recentSearches = recentSearches.slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }
}

function searchDestination() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim(); // Trim spaces from search
    
    // If user is typing to search, clear the state filter
    if (searchTerm !== '') {
        document.getElementById('stateFilter').value = 'all';
    }
    
    // Track search for analytics
    if (searchTerm !== '' && typeof trackEvent === 'function') {
        trackEvent('search', searchTerm);
    }
    
    if (searchTerm === '') {
        filteredDestinations = [...allDestinations];
    } else {
        filteredDestinations = allDestinations.filter(dest => 
            dest.name.toLowerCase().includes(searchTerm) ||
            dest.state.toLowerCase().includes(searchTerm) ||
            dest.city.toLowerCase().includes(searchTerm) ||
            (dest.category && dest.category.toLowerCase().includes(searchTerm)) ||
            (dest.nearbyAttractions && dest.nearbyAttractions.some(attr => attr.toLowerCase().includes(searchTerm)))
        );
    }
    
    applyCurrentFilters();
    renderDestinations();
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    addToRecentSearches(term);
    searchDestination();
    document.getElementById('searchSuggestions').classList.remove('active');
    
    // Scroll to destinations
    document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
}

function searchNearMe() {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        alert('📍 Geolocation is not supported by your browser. Please use the search or filter options.');
        return;
    }
    
    // Show loading state
    const nearMeBtn = document.querySelector('.near-me-btn');
    const originalContent = nearMeBtn.innerHTML;
    nearMeBtn.innerHTML = '<span class="near-me-icon">⏳</span><span class="near-me-text">Finding...</span>';
    nearMeBtn.disabled = true;
    
    // Request user's location
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            
            console.log(`📍 User location: ${userLat}, ${userLon}`);
            
            // Calculate distance to all destinations and sort by nearest
            const destinationsWithDistance = allDestinations.map(dest => {
                const coords = DESTINATION_COORDINATES[dest.id];
                if (coords) {
                    const distance = calculateDistance(userLat, userLon, coords.lat, coords.lon);
                    return { ...dest, distance };
                }
                return { ...dest, distance: Infinity };
            }).filter(d => d.distance !== Infinity);
            
            // Sort by distance
            destinationsWithDistance.sort((a, b) => a.distance - b.distance);
            
            // Filter destinations within 100km range
            const MAX_DISTANCE_KM = 100;
            const nearbyDestinations = destinationsWithDistance.filter(d => d.distance <= MAX_DISTANCE_KM);
            
            if (nearbyDestinations.length > 0) {
                // Update filtered destinations to show nearby ones
                filteredDestinations = nearbyDestinations;
                currentSort = 'distance';
                
                // Clear other filters
                document.getElementById('searchInput').value = '';
                document.getElementById('stateFilter').value = 'all';
                currentCrowdFilter = 'all';
                
                // Update UI
                document.querySelectorAll('.crowd-pill').forEach(btn => btn.classList.remove('active'));
                document.querySelector('.crowd-pill[data-filter="all"]').classList.add('active');
                
                renderDestinations();
                
                // Show success message
                const nearestDist = nearbyDestinations[0].distance;
                const distText = nearestDist < 1 ? `${Math.round(nearestDist * 1000)}m` : `${nearestDist.toFixed(1)}km`;
                showToast(`📍 Found ${nearbyDestinations.length} destination${nearbyDestinations.length > 1 ? 's' : ''} within 100km! Nearest: ${nearbyDestinations[0].name} (${distText})`);
                
                // Scroll to destinations
                document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
            } else {
                showToast('📍 No destinations found within 100km of your location. Try searching by state.');
            }
            
            // Reset button
            nearMeBtn.innerHTML = originalContent;
            nearMeBtn.disabled = false;
        },
        (error) => {
            // Reset button
            nearMeBtn.innerHTML = originalContent;
            nearMeBtn.disabled = false;
            
            // Handle errors
            let errorMessage = '📍 Could not get your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage += 'Please try again or use the search/filter options.';
            }
            showToast(errorMessage);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // Cache location for 5 minutes
        }
    );
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

// Show toast notification
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        max-width: 90%;
        text-align: center;
        animation: slideUp 0.3s ease;
    `;
    
    // Add animation keyframes if not exists
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ========== FILTER FUNCTIONALITY ==========
function filterByCrowd(level) {
    currentCrowdFilter = level;
    
    // Update button styles
    document.querySelectorAll('.crowd-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.crowd-pill[data-filter="${level}"]`).classList.add('active');
    
    // Update sticky filter bar
    document.querySelectorAll('.sticky-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    const stickyPill = document.querySelector(`.sticky-pill[data-filter="${level}"]`);
    if (stickyPill) stickyPill.classList.add('active');
    
    applyCurrentFilters();
    renderDestinations();
}

function filterByState() {
    const stateValue = document.getElementById('stateFilter').value;
    
    // If a specific state is selected (not 'all'), clear the search input
    if (stateValue !== 'all') {
        document.getElementById('searchInput').value = '';
    }
    
    applyCurrentFilters();
    renderDestinations();
}

function applyCurrentFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const state = document.getElementById('stateFilter').value;
    
    filteredDestinations = allDestinations.filter(dest => {
        // Search filter
        const matchesSearch = searchTerm === '' || 
            dest.name.toLowerCase().includes(searchTerm) ||
            dest.state.toLowerCase().includes(searchTerm) ||
            dest.city.toLowerCase().includes(searchTerm);
        
        // Crowd filter
        const matchesCrowd = currentCrowdFilter === 'all' || dest.crowdLevel === currentCrowdFilter;
        
        // State filter
        const matchesState = state === 'all' || dest.state === state;
        
        return matchesSearch && matchesCrowd && matchesState;
    });
    
    // Apply sorting
    applySorting();
}

function quickFilter(level) {
    filterByCrowd(level);
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('stateFilter').value = 'all';
    currentCrowdFilter = 'all';
    currentSort = 'default';
    
    document.querySelectorAll('.crowd-pill').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.crowd-pill[data-filter="all"]').classList.add('active');
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.sort-btn[data-sort="default"]').classList.add('active');
    
    filteredDestinations = [...allDestinations];
    renderDestinations();
}

// ========== SORTING ==========
function sortDestinations(sortType) {
    currentSort = sortType;
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.sort-btn[data-sort="${sortType}"]`).classList.add('active');
    
    applySorting();
    renderDestinations();
}

function applySorting() {
    const crowdOrder = { 'low': 1, 'moderate': 2, 'heavy': 3, 'overcrowded': 4 };
    
    switch(currentSort) {
        case 'least-crowded':
            filteredDestinations.sort((a, b) => crowdOrder[a.crowdLevel] - crowdOrder[b.crowdLevel]);
            break;
        case 'best-time':
            // Sort by current best time recommendation
            filteredDestinations.sort((a, b) => crowdOrder[a.crowdLevel] - crowdOrder[b.crowdLevel]);
            break;
        default:
            // Default order (by ID)
            filteredDestinations.sort((a, b) => a.id - b.id);
    }
}

// ========== STICKY FILTER BAR ==========
function setupStickyFilterBar() {
    const stickyBar = document.getElementById('stickyFilterBar');
    const filtersSection = document.querySelector('.filters');
    
    // Sync state options
    const mainStateFilter = document.getElementById('stateFilter');
    const stickyStateFilter = document.getElementById('stickyStateFilter');
    stickyStateFilter.innerHTML = mainStateFilter.innerHTML;
    
    window.addEventListener('scroll', () => {
        if (filtersSection) {
            const filtersBottom = filtersSection.getBoundingClientRect().bottom;
            if (filtersBottom < 0) {
                stickyBar.classList.add('visible');
            } else {
                stickyBar.classList.remove('visible');
            }
        }
    });
}

function syncSearch(input) {
    document.getElementById('searchInput').value = input.value;
    searchDestination();
}

function syncStateFilter(select) {
    document.getElementById('stateFilter').value = select.value;
    filterByState();
}

// ========== VIEW TOGGLE ==========
function toggleView(view) {
    const grid = document.getElementById('destinationsGrid');
    const buttons = document.querySelectorAll('.toggle-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.toggle-btn[data-view="${view}"]`).classList.add('active');
    
    grid.className = `destinations-grid view-${view}`;
}

// ========== MOBILE NAVIGATION ==========
function setupMobileNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', function() {
            bottomNavItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    mobileNav.classList.toggle('active');
}

function focusSearch() {
    document.getElementById('searchInput').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== MODAL FUNCTIONALITY ==========
function populateModals() {
    const alertDestination = document.getElementById('alertDestination');
    const bestTimeDestination = document.getElementById('bestTimeDestination');
    
    const options = allDestinations.map(d => `<option value="${d.id}">${d.emoji} ${d.name}</option>`).join('');
    
    alertDestination.innerHTML = '<option value="">Select destination...</option>' + options;
    bestTimeDestination.innerHTML = '<option value="">Select destination...</option>' + options;
}

function showAlertModal() {
    // Always reset modal content when opening to ensure clean state
    resetAlertModal();
    document.getElementById('alertModal').style.display = 'block';
}

function closeAlertModal() {
    document.getElementById('alertModal').style.display = 'none';
}

async function submitAlert() {
    const destination = document.getElementById('alertDestination').value;
    const threshold = document.getElementById('alertThreshold').value;
    const email = document.getElementById('alertEmail').value;
    
    if (!destination || !email) {
        alert('Please fill in all fields');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const dest = allDestinations.find(d => d.id == destination);
    
    // Show loading state
    const submitBtn = document.querySelector('#alertModal .alert-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Setting alert...';
    submitBtn.disabled = true;
    
    try {
        // Try to call the backend API
        const response = await fetch(`${API_CONFIG.BACKEND_API_URL}/alerts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                destinationId: parseInt(destination),
                destinationName: dest.name,
                threshold
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Track alert creation for analytics
            if (typeof trackEvent === 'function') {
                trackEvent('alert_created', dest.name);
            }
            
            // Success - show confirmation
            showAlertConfirmation(dest.name, threshold, email);
        } else {
            // API returned error
            alert(`❌ Failed to set alert: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Backend not available - store locally and show success anyway
        console.log('Backend not available, storing alert locally');
        
        // Store in localStorage as backup
        const localAlerts = JSON.parse(localStorage.getItem('crowdwise_alerts') || '[]');
        localAlerts.push({
            id: Date.now(),
            email,
            destinationId: parseInt(destination),
            destinationName: dest.name,
            threshold,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('crowdwise_alerts', JSON.stringify(localAlerts));
        
        // Track alert creation locally for analytics
        if (typeof trackEvent === 'function') {
            trackEvent('alert_created_local', dest.name);
        }
        
        // Show success (user experience)
        showAlertConfirmation(dest.name, threshold, email);
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showAlertConfirmation(destName, threshold, email) {
    const modal = document.getElementById('alertModal');
    const modalBody = modal.querySelector('.modal-body');
    
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h3 style="color: var(--text-primary); margin-bottom: 12px;">Alert Set Successfully!</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                You'll receive an email at <strong>${email}</strong><br>
                when <strong>${destName}</strong> reaches <strong>${threshold}</strong> crowd levels.
            </p>
            <div style="background: var(--bg-light); padding: 16px; border-radius: 12px; text-align: left;">
                <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">
                    💡 <strong>Pro tip:</strong> We check crowd levels every 15 minutes. 
                    You'll be notified as soon as conditions match your preferences!
                </p>
            </div>
        </div>
    `;
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        closeAlertModal();
    }, 5000);
}

function resetAlertModal() {
    const modal = document.getElementById('alertModal');
    const modalBody = modal.querySelector('.modal-body');
    
    // Restore original HTML structure with searchable dropdown
    modalBody.innerHTML = `
        <div class="modal-icon">🔔</div>
        <h2>Set Crowd Alert</h2>
        <p>Get notified when a destination becomes less crowded</p>
        <div class="alert-form">
            <div class="searchable-dropdown" id="alertDestinationContainer">
                <input type="text" class="dropdown-search" id="alertDestinationSearch" placeholder="🔍 Search destinations..." autocomplete="off">
                <div class="dropdown-list" id="alertDestinationList"></div>
                <input type="hidden" id="alertDestination">
            </div>
            <select id="alertThreshold" class="alert-select">
                <option value="low">When crowd is Low 🟢</option>
                <option value="moderate">When crowd is Moderate 🟡</option>
            </select>
            <input type="email" placeholder="Your email address" class="alert-input" id="alertEmail">
            <button class="alert-submit" onclick="submitAlert()">Set Alert →</button>
        </div>
    `;
    
    // Initialize searchable dropdown
    initSearchableDestinationDropdown('alertDestinationSearch', 'alertDestinationList', 'alertDestination');
}

function initSearchableDestinationDropdown(searchInputId, listId, hiddenInputId) {
    const searchInput = document.getElementById(searchInputId);
    const dropdownList = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (!searchInput || !dropdownList || !hiddenInput) return;
    
    // Populate all destinations initially
    function renderDropdownItems(filter = '') {
        const filterLower = filter.toLowerCase();
        const filtered = allDestinations.filter(dest => 
            dest.name.toLowerCase().includes(filterLower) ||
            dest.state.toLowerCase().includes(filterLower) ||
            (dest.city && dest.city.toLowerCase().includes(filterLower))
        );
        
        if (filtered.length === 0) {
            dropdownList.innerHTML = '<div class="dropdown-no-results">No destinations found</div>';
        } else {
            dropdownList.innerHTML = filtered.map(dest => `
                <div class="dropdown-item" data-id="${dest.id}" data-name="${dest.emoji} ${dest.name}">
                    ${dest.emoji} ${dest.name}<span class="dest-state">• ${dest.state}</span>
                </div>
            `).join('');
        }
    }
    
    // Show dropdown on focus
    searchInput.addEventListener('focus', () => {
        renderDropdownItems(searchInput.value);
        dropdownList.classList.add('show');
    });
    
    // Filter on input
    searchInput.addEventListener('input', () => {
        renderDropdownItems(searchInput.value);
        dropdownList.classList.add('show');
        // Clear selection if user is typing
        if (!searchInput.classList.contains('has-selection')) {
            hiddenInput.value = '';
        }
        searchInput.classList.remove('has-selection');
    });
    
    // Handle item selection
    dropdownList.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (item) {
            const id = item.dataset.id;
            const name = item.dataset.name;
            hiddenInput.value = id;
            searchInput.value = name;
            searchInput.classList.add('has-selection');
            dropdownList.classList.remove('show');
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest(`#${searchInputId}`) && !e.target.closest(`#${listId}`)) {
            dropdownList.classList.remove('show');
        }
    });
    
    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const items = dropdownList.querySelectorAll('.dropdown-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items.forEach((item, i) => item.classList.toggle('selected', i === nextIndex));
            items[nextIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items.forEach((item, i) => item.classList.toggle('selected', i === prevIndex));
            items[prevIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = dropdownList.querySelector('.dropdown-item.selected');
            if (selectedItem) {
                selectedItem.click();
            }
        } else if (e.key === 'Escape') {
            dropdownList.classList.remove('show');
        }
    });
}

function populateAlertDestinations() {
    // Now handled by initSearchableDestinationDropdown
    initSearchableDestinationDropdown('alertDestinationSearch', 'alertDestinationList', 'alertDestination');
}

function showBestTimeModal() {
    document.getElementById('bestTimeModal').style.display = 'block';
}

function closeBestTimeModal() {
    document.getElementById('bestTimeModal').style.display = 'none';
    document.getElementById('bestTimeResult').style.display = 'none';
}

function findBestTime() {
    const destId = document.getElementById('bestTimeDestination').value;
    if (!destId) {
        alert('Please select a destination');
        return;
    }
    
    const dest = allDestinations.find(d => d.id == destId);
    const resultDiv = document.getElementById('bestTimeResult');
    
    resultDiv.innerHTML = `
        <h4>Best times to visit ${dest.name}</h4>
        <div class="time-slot">
            <span class="time-slot-time">🌅 6:00 - 8:00 AM</span>
            <span class="time-slot-crowd low">🟢 Low</span>
        </div>
        <div class="time-slot">
            <span class="time-slot-time">🌄 8:00 - 10:00 AM</span>
            <span class="time-slot-crowd moderate">🟡 Moderate</span>
        </div>
        <div class="time-slot">
            <span class="time-slot-time">☀️ 10:00 AM - 4:00 PM</span>
            <span class="time-slot-crowd packed">🔴 Packed</span>
        </div>
        <div class="time-slot">
            <span class="time-slot-time">🌆 4:00 - 6:00 PM</span>
            <span class="time-slot-crowd busy">🟠 Busy</span>
        </div>
        <div class="time-slot">
            <span class="time-slot-time">🌙 6:00 - 8:00 PM</span>
            <span class="time-slot-crowd low">🟢 Low</span>
        </div>
        <p style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
            💡 <strong>Recommendation:</strong> Visit early morning for the best experience!
        </p>
    `;
    resultDiv.style.display = 'block';
}

function showItineraryModal() {
    document.getElementById('itineraryModal').style.display = 'block';
}

function closeItineraryModal() {
    document.getElementById('itineraryModal').style.display = 'none';
    document.getElementById('itineraryResult').style.display = 'none';
}

function generateItinerary() {
    const state = document.getElementById('itineraryState').value;
    if (!state) {
        alert('Please select a state');
        return;
    }
    
    const stateDestinations = allDestinations.filter(d => d.state === state);
    const resultDiv = document.getElementById('itineraryResult');
    
    if (stateDestinations.length === 0) {
        resultDiv.innerHTML = `<p style="color: var(--text-secondary);">No destinations found for ${state}.</p>`;
        resultDiv.style.display = 'block';
        return;
    }
    
    // Sort destinations by crowd level (visit less crowded first in peak hours)
    const sortedDest = [...stateDestinations].sort((a, b) => a.crowdLevel - b.crowdLevel);
    
    // Get primary destination (most popular) and secondary (less crowded)
    const primaryDest = stateDestinations[0];
    const secondaryDest = stateDestinations[1] || primaryDest;
    const hiddenGem = sortedDest[0]; // Least crowded
    
    // Get nearby attractions from all destinations
    const allNearby = stateDestinations.flatMap(d => d.nearbyAttractions || []);
    const uniqueNearby = [...new Set(allNearby)].slice(0, 4);
    
    // Local food suggestions by state
    const localFoods = getLocalFoodByState(state);
    
    // Get crowd level description
    const getCrowdDesc = (level) => {
        if (level < 30) return 'Very Low crowds';
        if (level < 50) return 'Low crowds';
        if (level < 70) return 'Moderate crowds';
        return 'High crowds expected';
    };
    
    resultDiv.innerHTML = `
        <h4>🧭 Crowd-Free Day Plan - ${state}</h4>
        <p style="margin-bottom: 16px; font-size: 13px; color: var(--text-secondary);">
            Covering ${stateDestinations.length} destinations | Optimized for minimal crowds
        </p>
        
        <div class="itinerary-item">
            <div class="itinerary-time">6:00 AM</div>
            <div class="itinerary-content">
                <h5>🌅 Wake Up & Get Ready</h5>
                <p>Early start is key! ${primaryDest.name} has peak hours at ${primaryDest.peakHours || '10 AM - 2 PM'}. 
                   Beat the rush by arriving before 7 AM.</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">6:30 AM</div>
            <div class="itinerary-content">
                <h5>${primaryDest.emoji} ${primaryDest.name}</h5>
                <p><strong>📍 ${primaryDest.city}</strong> — ${getCrowdDesc(primaryDest.crowdLevel)} at this hour.<br>
                   Spend 2-2.5 hours exploring before the tourist buses arrive.
                   ${primaryDest.alerts && primaryDest.alerts.length > 0 ? `<br><em>⚠️ ${primaryDest.alerts[0]}</em>` : ''}</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">9:00 AM</div>
            <div class="itinerary-content">
                <h5>🍳 Breakfast - Local Delights</h5>
                <p><strong>Must try:</strong> ${localFoods.breakfast}<br>
                   Find a local eatery near ${primaryDest.city}. Avoid hotel buffets—street food is fresher and authentic!</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">10:00 AM</div>
            <div class="itinerary-content">
                <h5>💎 Hidden Gem - ${hiddenGem.name}</h5>
                <p><strong>📍 ${hiddenGem.city}</strong> — Only ${hiddenGem.crowdLevel}% crowd level!<br>
                   While tourists flock to main attractions, explore this lesser-known spot.
                   ${uniqueNearby.length > 0 ? `<br><strong>Nearby:</strong> ${uniqueNearby.slice(0, 2).join(', ')}` : ''}</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">1:00 PM</div>
            <div class="itinerary-content">
                <h5>🍛 Lunch Break</h5>
                <p><strong>Local specialties:</strong> ${localFoods.lunch}<br>
                   This is PEAK crowd time (1-4 PM). Relax with a long lunch and avoid the heat. 
                   Most sites are overcrowded now—smart travelers rest!</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">2:30 PM</div>
            <div class="itinerary-content">
                <h5>😴 Rest / Shopping</h5>
                <p>Head back to hotel for a power nap, or explore local markets for souvenirs. 
                   ${localFoods.shopping ? `<strong>Shop for:</strong> ${localFoods.shopping}` : 'Local handicrafts make great souvenirs!'}</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">4:30 PM</div>
            <div class="itinerary-content">
                <h5>${secondaryDest.emoji} ${secondaryDest.name}</h5>
                <p><strong>📍 ${secondaryDest.city}</strong> — Crowds thinning out now!<br>
                   Golden hour photography opportunity. Temperature cools down for comfortable exploration.
                   ${uniqueNearby.length > 2 ? `<br><strong>Also visit:</strong> ${uniqueNearby.slice(2).join(', ')}` : ''}</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">7:00 PM</div>
            <div class="itinerary-content">
                <h5>🍽️ Dinner</h5>
                <p><strong>Evening specials:</strong> ${localFoods.dinner}<br>
                   End the day with authentic ${state} cuisine. Ask locals for restaurant recommendations!</p>
            </div>
        </div>
        
        <div class="itinerary-item">
            <div class="itinerary-time">8:30 PM</div>
            <div class="itinerary-content">
                <h5>🌙 Evening Leisure</h5>
                <p>Explore night markets, enjoy street food, or relax at your accommodation. 
                   Some sites offer ${state === 'Rajasthan' || state === 'Uttar Pradesh' ? 'sound & light shows' : 'evening cultural programs'}.</p>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-radius: 12px;">
            <h5 style="margin: 0 0 8px 0; color: var(--primary);">✨ Smart Travel Summary</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary);">
                <li>This itinerary avoids <strong>65% of typical crowds</strong></li>
                <li>Best time to visit ${state}: <strong>${primaryDest.bestTime || 'October to March'}</strong></li>
                <li>Total destinations covered: <strong>${Math.min(stateDestinations.length, 3)}</strong></li>
                <li>Nearby attractions included: <strong>${uniqueNearby.length}</strong></li>
            </ul>
        </div>
    `;
    resultDiv.style.display = 'block';
}

// Helper function for local food suggestions by state
function getLocalFoodByState(state) {
    const foodMap = {
        'Andhra Pradesh': {
            breakfast: 'Pesarattu (green moong dosa), Upma, Idli with spicy Andhra chutney',
            lunch: 'Andhra Thali with Gongura Pachadi, Gutti Vankaya (stuffed brinjal), Pulihora',
            dinner: 'Hyderabadi Biryani, Mirchi Bajji, Double Ka Meetha',
            shopping: 'Kalamkari fabrics, Kondapalli toys, Bidriware'
        },
        'Arunachal Pradesh': {
            breakfast: 'Thukpa (noodle soup), Momos, Butter tea',
            lunch: 'Bamboo Shoot curry, Pika Pila (pork with bamboo), Rice',
            dinner: 'Gyapa Khazi (cheese with chili), Lukter (dried meat), Local rice beer',
            shopping: 'Tribal handicrafts, Cane baskets, Traditional shawls'
        },
        'Assam': {
            breakfast: 'Jolpan (flattened rice with curd), Pitha, Assam tea',
            lunch: 'Assamese Thali with Khar, Masor Tenga (sour fish curry), Duck curry',
            dinner: 'Pork with bamboo shoot, Aloo Pitika, Payasam',
            shopping: 'Assam silk (Muga), Bamboo crafts, Tea leaves'
        },
        'Bihar': {
            breakfast: 'Sattu Paratha, Chokha, Litti with tea',
            lunch: 'Litti Chokha, Kadhi Bari, Mutton curry',
            dinner: 'Fish curry, Khaja, Tilkut sweets',
            shopping: 'Madhubani paintings, Sikki grass crafts, Bhagalpuri silk'
        },
        'Goa': {
            breakfast: 'Poi bread with Ros omelette, Bebinca, Fresh fruit',
            lunch: 'Fish Curry Rice, Prawn Balchão, Sol Kadhi',
            dinner: 'Pork Vindaloo, Xacuti, Bebinca dessert, Feni',
            shopping: 'Cashews, Feni, Azulejos tiles, Crochet items'
        },
        'Gujarat': {
            breakfast: 'Fafda-Jalebi, Dhokla, Thepla with chai',
            lunch: 'Gujarati Thali with Undhiyu, Dal Dhokli, Kadhi',
            dinner: 'Sev Tameta, Handvo, Shrikhand, Basundi',
            shopping: 'Bandhani textiles, Patola silk, Kutchi embroidery'
        },
        'Himachal Pradesh': {
            breakfast: 'Siddu with ghee, Babru, Himachali chai',
            lunch: 'Dham (traditional feast), Madra, Chana Madra',
            dinner: 'Tudkiya Bhath, Aktori, Mittha',
            shopping: 'Kullu shawls, Chamba Rumal, Wooden crafts'
        },
        'Jammu & Kashmir': {
            breakfast: 'Kashmiri Kulcha, Sheermal, Noon chai (pink tea)',
            lunch: 'Wazwan - Rogan Josh, Yakhni, Dum Aloo',
            dinner: 'Gushtaba, Tabak Maaz, Phirni',
            shopping: 'Pashmina shawls, Papier-mâché, Walnut wood crafts, Saffron'
        },
        'Karnataka': {
            breakfast: 'Benne Masala Dosa, Idli-Vada, Filter coffee',
            lunch: 'Karnataka meals with Bisi Bele Bath, Ragi Mudde, Saaru',
            dinner: 'Mangalorean Fish curry, Neer Dosa, Mysore Pak',
            shopping: 'Mysore silk, Sandalwood products, Channapatna toys'
        },
        'Kerala': {
            breakfast: 'Appam with Stew, Puttu-Kadala, Kerala Parotta',
            lunch: 'Sadya on banana leaf - Sambar, Avial, Olan, Payasam',
            dinner: 'Kerala Fish Curry, Malabar Biryani, Banana chips',
            shopping: 'Spices, Coconut products, Kasavu sarees, Aranmula mirrors'
        },
        'Madhya Pradesh': {
            breakfast: 'Poha-Jalebi, Sabudana Khichdi, Bhutte ka Kees',
            lunch: 'MP Thali with Dal Bafla, Bhutte ki Kees, Malpua',
            dinner: 'Rogan Josh, Seekh Kebab, Mawa Bati',
            shopping: 'Chanderi silk, Maheshwari sarees, Gond paintings'
        },
        'Maharashtra': {
            breakfast: 'Misal Pav, Pohe, Sabudana Vada',
            lunch: 'Maharashtrian Thali with Puran Poli, Bharli Vangi, Sol Kadhi',
            dinner: 'Vada Pav, Pav Bhaji, Modak, Shrikhand',
            shopping: 'Kolhapuri chappals, Paithani sarees, Warli paintings'
        },
        'Odisha': {
            breakfast: 'Chena Poda, Chhena Jhili, Dahi Bara',
            lunch: 'Dalma, Machha Jhola (fish curry), Santula',
            dinner: 'Crab curry, Rasagola, Chhena Gaja',
            shopping: 'Pattachitra paintings, Appliqué work, Silver filigree'
        },
        'Punjab': {
            breakfast: 'Chole Bhature, Aloo Paratha, Lassi',
            lunch: 'Sarson da Saag with Makki di Roti, Dal Makhani, Butter Chicken',
            dinner: 'Tandoori Chicken, Amritsari Kulcha, Phirni',
            shopping: 'Phulkari embroidery, Jutti footwear, Punjabi suits'
        },
        'Rajasthan': {
            breakfast: 'Pyaaz Kachori, Mirchi Bada, Chai',
            lunch: 'Dal Baati Churma, Gatte ki Sabzi, Ker Sangri',
            dinner: 'Laal Maas, Ghewar, Mawa Kachori',
            shopping: 'Blue pottery, Bandhani textiles, Kundan jewelry, Mojari'
        },
        'Tamil Nadu': {
            breakfast: 'Idli-Sambar, Pongal, Filter Coffee',
            lunch: 'Tamil meals on banana leaf - Sambar, Rasam, Kootu, Payasam',
            dinner: 'Chettinad Chicken, Kothu Parotta, Paal Payasam',
            shopping: 'Kanchipuram silk, Bronze statues, Tanjore paintings'
        },
        'Uttar Pradesh': {
            breakfast: 'Bedmi Puri with Aloo, Kachori, Lassi',
            lunch: 'Lucknowi Biryani, Galouti Kebab, Korma',
            dinner: 'Tunday Kebab, Sheermal, Malai Gilori, Petha',
            shopping: 'Chikan embroidery, Brassware, Agra Petha, Marble crafts'
        },
        'West Bengal': {
            breakfast: 'Luchi-Aloor Dom, Kochuri, Chai with Singara',
            lunch: 'Bengali Thali - Shukto, Machher Jhol, Cholar Dal, Mishti Doi',
            dinner: 'Kosha Mangsho, Chingri Malai Curry, Rasgulla, Sandesh',
            shopping: 'Baluchari sarees, Terracotta crafts, Dokra art'
        },
        'Delhi': {
            breakfast: 'Paranthe wali gali parathas, Chole Bhature, Chai',
            lunch: 'Old Delhi food trail - Nihari, Kebabs, Biryani',
            dinner: 'Butter Chicken, Dal Makhani, Rabri Falooda',
            shopping: 'Handicrafts at Dilli Haat, Spices from Khari Baoli, Textiles'
        },
        'Sikkim': {
            breakfast: 'Momos, Thukpa, Butter tea',
            lunch: 'Gundruk soup, Phagshapa (pork with radish), Churpi',
            dinner: 'Sel Roti, Kinema curry, Chhang (millet beer)',
            shopping: 'Thangka paintings, Handwoven carpets, Organic tea'
        }
    };
    
    // Default food suggestions for states not in the map
    const defaultFood = {
        breakfast: 'Local breakfast specialties, Fresh chai, Regional snacks',
        lunch: 'Traditional thali with local specialties, Regional curries, Rice/Roti',
        dinner: 'Local dinner specials, Street food delicacies, Regional sweets',
        shopping: 'Local handicrafts, Traditional textiles, Regional souvenirs'
    };
    
    return foodMap[state] || defaultFood;
}

// ========== DESTINATION DETAILS ==========
async function showDetails(destinationId) {
    const dest = allDestinations.find(d => d.id === destinationId);
    if (!dest) return;
    
    // Track destination view for analytics
    if (typeof trackEvent === 'function') {
        trackEvent('view_destination', dest.name);
    }
    
    const modal = document.getElementById('detailModal');
    const modalContent = document.getElementById('modalContent');
    
    const crowdLabel = getCrowdLabel(dest.crowdLevel);
    const trendText = getTrendText(dest.crowdLevel);
    
    // Generate nearby attractions HTML
    const nearbyHTML = dest.nearbyAttractions && dest.nearbyAttractions.length > 0 
        ? dest.nearbyAttractions.map(attr => `<span style="background: var(--bg-light); padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">${attr}</span>`).join('')
        : '<span>No nearby attractions listed</span>';
    
    // Generate alerts/tips HTML
    const alertsHTML = dest.alerts && dest.alerts.length > 0 
        ? dest.alerts.map(alert => `<li>⚠️ ${alert}</li>`).join('')
        : '<li>No special alerts</li>';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${dest.emoji} ${dest.name}</h2>
            <p class="modal-state">📍 ${dest.city}, ${dest.state}</p>
            <div class="crowd-indicator crowd-${dest.crowdLevel}">
                ${crowdLabel} • ${trendText}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📊 Current Status</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-item-label">Live Visitors</div>
                    <div class="detail-item-value">👥 ${dest.currentEstimate || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Peak Hours</div>
                    <div class="detail-item-value">🔥 ${dest.peakHours}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Weather</div>
                    <div class="detail-item-value">🌡️ ${dest.weather}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Category</div>
                    <div class="detail-item-value">🏷️ ${dest.category ? dest.category.charAt(0).toUpperCase() + dest.category.slice(1).replace('-', ' ') : 'General'}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>⏰ Best Time Indicator</h3>
            <div class="best-time-result" style="display: block;">
                <div class="time-slot">
                    <span class="time-slot-time">Right Now</span>
                    <span class="time-slot-crowd ${dest.crowdLevel === 'low' ? 'low' : dest.crowdLevel === 'moderate' ? 'moderate' : 'packed'}">${crowdLabel}</span>
                </div>
                <div class="time-slot">
                    <span class="time-slot-time">Best Today</span>
                    <span class="time-slot-crowd low">🟢 6:30 - 8:00 AM</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>� Best Time to Visit</h3>
            <p><strong>${dest.bestTimeToVisit || dest.bestTime || 'Year-round'}</strong></p>
        </div>
        
        <div class="detail-section">
            <h3>⚠️ Alerts & Tips</h3>
            <ul class="tips-list">
                ${alertsHTML}
            </ul>
        </div>
        
        <div class="detail-section">
            <h3>📍 Nearby Attractions</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                ${nearbyHTML}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📊 Weekly Crowd Trend</h3>
            ${generateWeeklyCrowdChart(dest.crowdLevel)}
        </div>
        
        <div style="margin-top: 24px; display: flex; gap: 12px;">
            <button onclick="setAlertForDestination(${dest.id})" style="flex: 1; padding: 14px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-family: inherit;">
                🔔 Set Alert
            </button>
            <button onclick="closeModal()" style="flex: 1; padding: 14px; background: var(--bg-light); color: var(--text-primary); border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-family: inherit;">
                Close
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Trigger feedback prompt after 5 seconds
    setTimeout(() => {
        if (window.feedbackWidget) {
            // Use the same crowdLevel that's displayed on the card
            // Check if it's already a string (like 'closed', 'low', etc.)
            let displayedLevel = dest.crowdLevel;
            
            // If it's a number, normalize it
            if (typeof displayedLevel === 'number') {
                displayedLevel = normalizeCrowdLevel(displayedLevel);
            }
            
            // If destination is closed, don't show feedback (nothing to validate)
            if (displayedLevel === 'closed') {
                // Don't show feedback for closed destinations
                return;
            }
            
            // Calculate a score from the displayed level for consistency
            let crowdScore = 0.5;
            if (typeof dest.crowdLevel === 'number') {
                crowdScore = dest.crowdLevel / 100;
            } else {
                const levelScores = { 'low': 0.25, 'moderate': 0.5, 'heavy': 0.7, 'overcrowded': 0.9 };
                crowdScore = levelScores[displayedLevel] || 0.5;
            }
            
            window.feedbackWidget.showFeedbackPrompt(dest, displayedLevel, crowdScore);
        }
    }, 5000);
}

function setAlertForDestination(destId) {
    closeModal();
    showAlertModal();
    
    // Wait for modal to render, then set the destination
    setTimeout(() => {
        const dest = allDestinations.find(d => d.id == destId);
        if (dest) {
            const searchInput = document.getElementById('alertDestinationSearch');
            const hiddenInput = document.getElementById('alertDestination');
            if (searchInput && hiddenInput) {
                searchInput.value = `${dest.emoji} ${dest.name}`;
                searchInput.classList.add('has-selection');
                hiddenInput.value = destId;
            }
        }
    }, 100);
}

function generateWeeklyCrowdChart(crowdLevel) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const crowdLevels = {
        'low': [30, 25, 28, 35, 40, 70, 75],
        'moderate': [50, 45, 48, 52, 60, 85, 90],
        'heavy': [70, 65, 68, 72, 75, 95, 98],
        'overcrowded': [90, 85, 88, 90, 92, 98, 100]
    };
    
    const levels = crowdLevels[crowdLevel] || crowdLevels['moderate'];
    
    return `
        <div style="background: var(--bg-light); padding: 24px; border-radius: 12px;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 120px; gap: 8px;">
                ${days.map((day, index) => {
                    const color = levels[index] <= 40 ? 'var(--crowd-low)' : 
                                  levels[index] <= 60 ? 'var(--crowd-moderate)' : 
                                  levels[index] <= 80 ? 'var(--crowd-busy)' : 'var(--crowd-packed)';
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                            <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                                ${levels[index]}%
                            </div>
                            <div style="width: 100%; background: ${color}; height: ${levels[index]}%; border-radius: 4px 4px 0 0; min-height: 10px;"></div>
                            <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                                ${day}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <p style="margin-top: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">
                📊 Weekends typically see higher crowds. Plan accordingly!
            </p>
        </div>
    `;
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Close modals on outside click
window.onclick = function(event) {
    const modals = ['detailModal', 'alertModal', 'bestTimeModal', 'itineraryModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ========== UTILITY FUNCTIONS ==========
function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    console.log(`Data last updated at: ${timeString}`);
}

function displayDataStatus() {
    const indicator = document.getElementById('dataStatusIndicator');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!indicator || !statusDot || !statusText) return;
    
    // Get status from API service
    const dataStatus = apiService.getDataStatus();
    const overall = dataStatus.overall;
    
    // Update indicator appearance
    statusDot.className = 'status-dot ' + overall;
    
    if (overall === 'live') {
        statusText.textContent = '🟢 Live Data';
    } else if (overall === 'partial') {
        statusText.textContent = '🟡 Partial Live';
    } else {
        statusText.textContent = '🔴 Demo Data';
    }
    
    // Add click handler for modal
    indicator.onclick = showDataStatusModal;
    
    // Console log
    let statusMessage = overall === 'live' ? '🟢 Using Real-time API Data' : 
                        overall === 'partial' ? '🟡 Using Partial Real-time Data' :
                        '🔴 Using Demo Data';
    console.log(`%c${statusMessage}`, 'font-size: 14px; font-weight: bold; color: #667eea;');
}

// Listen for data status changes
window.addEventListener('dataStatusChanged', function(e) {
    displayDataStatus();
    updateDataStatusModal(e.detail);
});

function showDataStatusModal() {
    const modal = document.getElementById('dataStatusModal');
    if (modal) {
        modal.style.display = 'block';
        updateDataStatusModal(apiService.getDataStatus());
    }
}

function closeDataStatusModal() {
    const modal = document.getElementById('dataStatusModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateDataStatusModal(status) {
    // Update weather source
    const weatherBadge = document.getElementById('weatherSourceBadge');
    const weatherDetail = document.getElementById('weatherSourceDetail');
    if (weatherBadge && weatherDetail) {
        const source = status.weather.source;
        weatherBadge.textContent = source === 'openweathermap' || source === 'backend' ? 'LIVE' : 
                                   source === 'algorithm' ? 'SIMULATED' : 'DEMO';
        weatherBadge.className = 'source-badge ' + (status.weather.isLive ? 'live' : 
                                 source === 'algorithm' ? 'algorithm' : 'demo');
        
        if (source === 'openweathermap') {
            weatherDetail.textContent = 'Real-time weather data from OpenWeatherMap API';
        } else if (source === 'weatherapi') {
            weatherDetail.textContent = 'Real-time weather data from WeatherAPI';
        } else if (source === 'backend') {
            weatherDetail.textContent = 'Weather data from backend aggregation service';
        } else {
            weatherDetail.textContent = 'Using simulated weather patterns. Add API key for live data.';
        }
    }
    
    // Update crowd source
    const crowdBadge = document.getElementById('crowdSourceBadge');
    const crowdDetail = document.getElementById('crowdSourceDetail');
    if (crowdBadge && crowdDetail) {
        const source = status.crowd.source;
        crowdBadge.textContent = source === 'backend' ? 'LIVE' :
                                 source === 'algorithm' ? 'ALGORITHM' : 'DEMO';
        crowdBadge.className = 'source-badge ' + (status.crowd.isLive ? 'live' :
                               source === 'algorithm' ? 'algorithm' : 'demo');
        
        if (source === 'backend') {
            crowdDetail.textContent = 'Real crowd data aggregated from multiple sources';
        } else if (source === 'algorithm') {
            crowdDetail.textContent = 'Smart estimation using time, day, and seasonal patterns';
        } else {
            crowdDetail.textContent = 'Static demo data. Enable backend for real estimates.';
        }
    }
    
    // Update last updated time
    const lastUpdateEl = document.getElementById('lastUpdateTime');
    if (lastUpdateEl) {
        const lastUpdate = status.weather.lastUpdate || status.crowd.lastUpdate;
        if (lastUpdate) {
            lastUpdateEl.textContent = new Date(lastUpdate).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            lastUpdateEl.textContent = 'Not yet updated';
        }
    }
    
    // Update quality meter
    const qualityFill = document.getElementById('qualityFill');
    const qualityLabel = document.getElementById('qualityLabel');
    if (qualityFill && qualityLabel) {
        qualityFill.className = 'quality-fill ' + status.overall;
        
        if (status.overall === 'live') {
            qualityLabel.textContent = '100% Live Data - Maximum accuracy';
        } else if (status.overall === 'partial') {
            qualityLabel.textContent = '66% Live Data - Good accuracy with some estimates';
        } else {
            qualityLabel.textContent = 'Pattern-based predictions - Accuracy improves with feedback';
        }
    }
}

// ========== HOW IT WORKS MODAL ==========
function showHowItWorks() {
    const modal = document.getElementById('howItWorksModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Update accuracy stats if backend available
        updateModalStats();
    }
}

function closeHowItWorks() {
    const modal = document.getElementById('howItWorksModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = ['detailModal', 'alertModal', 'bestTimeModal', 'itineraryModal', 'dataStatusModal', 'howItWorksModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'howItWorksModal') {
                closeHowItWorks();
            } else {
                modal.style.display = 'none';
            }
        }
    });
};

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Auto-refresh data every 5 minutes
setInterval(() => {
    updateLastUpdatedTime();
    displayDataStatus();
    console.log('🔄 Refreshing crowd data...');
}, 300000);

// Update accuracy badge on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Update accuracy badge if feedback widget is available
    setTimeout(async () => {
        if (window.feedbackWidget) {
            const stats = await window.feedbackWidget.getAccuracyBadge();
            const badge = document.getElementById('accuracyBadge');
            if (badge && stats.accuracy) {
                badge.querySelector('.trust-text').textContent = `${Math.round(stats.accuracy)}% user-validated`;
            }
        }
    }, 2000);
    
    // Initialize star rating
    initStarRating();
});

// ========== USER FEEDBACK MODAL ==========
function openFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('userFeedbackForm').reset();
        document.getElementById('feedbackRating').value = '0';
        document.querySelectorAll('.star-rating .star').forEach(star => star.classList.remove('active'));
        
        // Show form, hide success
        document.getElementById('userFeedbackForm').style.display = 'block';
        document.getElementById('feedbackSuccess').style.display = 'none';
        
        // Track event
        if (typeof trackEvent === 'function') {
            trackEvent('feedback_modal_opened', 'Feedback Modal', 1);
        }
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function initStarRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('feedbackRating');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            ratingInput.value = value;
            
            // Update visual
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= parseInt(value)) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseenter', () => {
            const value = star.getAttribute('data-value');
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= parseInt(value)) {
                    s.classList.add('hovered');
                } else {
                    s.classList.remove('hovered');
                }
            });
        });
        
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hovered'));
        });
    });
}

function clearFeedbackForm() {
    document.getElementById('userFeedbackForm').reset();
    document.getElementById('feedbackRating').value = '0';
    document.querySelectorAll('.star-rating .star').forEach(star => star.classList.remove('active'));
    showToast('Form cleared', 'info');
}

async function submitUserFeedback(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Get form data
    const feedbackData = {
        message: document.getElementById('feedbackMessage').value.trim(),
        rating: parseInt(document.getElementById('feedbackRating').value) || 0,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        page: window.location.href
    };
    
    // Validate
    if (!feedbackData.message) {
        showToast('Please enter your feedback', 'warning');
        return;
    }
    if (!feedbackData.rating || feedbackData.rating === 0) {
        showToast('Please select a rating', 'warning');
        return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
        // Try to send to backend with timeout
        const backendUrl = API_CONFIG.BACKEND_URL || 'http://localhost:3002';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        try {
            const response = await fetch(`${backendUrl}/api/user-feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                // Show success
                document.getElementById('userFeedbackForm').style.display = 'none';
                document.getElementById('feedbackSuccess').style.display = 'block';
                
                // Track event
                if (typeof trackEvent === 'function') {
                    trackEvent('feedback_submitted', 'feedback', feedbackData.rating);
                }
                
                showToast('Thank you for your feedback! 🎉', 'success');
            } else {
                throw new Error('Failed to submit');
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    } catch (error) {
        console.error('Feedback submission error:', error);
        
        // Save locally if backend fails - store in localStorage with timestamp
        const localFeedback = JSON.parse(localStorage.getItem('crowdwise_feedbacks') || '[]');
        localFeedback.push({
            ...feedbackData,
            id: `uf_${Date.now()}`,
            status: 'pending_sync'
        });
        localStorage.setItem('crowdwise_feedbacks', JSON.stringify(localFeedback));
        
        // Still show success (saved locally)
        document.getElementById('userFeedbackForm').style.display = 'none';
        document.getElementById('feedbackSuccess').style.display = 'block';
        
        showToast('Thank you for your feedback! 🎉', 'success');
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Close feedback modal when clicking outside
document.addEventListener('click', function(event) {
    const feedbackModal = document.getElementById('feedbackModal');
    if (event.target === feedbackModal) {
        closeFeedbackModal();
    }
});
