// CrowdWise India - Enhanced JavaScript v3.0
// With improved UX, search suggestions, and smart features

let allDestinations = [];
let filteredDestinations = [];
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
let currentSort = 'default';
let currentCrowdFilter = 'all';
let currentCategoryFilter = 'all';
let currentDiscoverFilter = 'all';

// Transform destination data to include required fields
function transformDestinationData(dest) {
    // Preserve numeric base crowd level for algorithm use
    const baseCrowdLevel = typeof dest.crowdLevel === 'number'
        ? dest.crowdLevel
        : { 'low': 25, 'moderate': 50, 'heavy': 70, 'overcrowded': 90 }[dest.crowdLevel] || 50;

    // Use the prediction algorithm for a time/day/season-aware crowd level
    let normalizedLevel;
    let closedMessage = null;
    let confidence = 65; // default: matches documented 65% accuracy floor
    if (window.clientCrowdAlgorithm) {
        try {
            const predicted = window.clientCrowdAlgorithm.calculateCrowdScore({
                baseCrowdLevel,
                category: dest.category || 'default',
                destinationId: dest.id
            });
            if (predicted.status === 'closed') {
                normalizedLevel = 'closed';
                closedMessage = predicted.message || 'Currently closed';
            } else {
                normalizedLevel = predicted.level || 'moderate';
            }
            // Confidence = documented system accuracy (Agents.MD: 65–75% baseline)
            // Base 65% reflects the floor accuracy from time + day + seasonal signals.
            // Each additional active signal adds marginal accuracy, capped at 75%.
            const cat = dest.category || 'default';
            confidence = 65;
            if (predicted.factors) {
                // Holiday active (+0.15 weight signal) → +3%
                if (predicted.factors.holiday && predicted.factors.holiday !== 'None') confidence += 3;
                // Festival/social signal active → +2%
                if (predicted.factors.festival) confidence += 2;
                // Weather signal active (+0.05 weight, smallest) → +1%
                if (predicted.factors.weather) confidence += 1;
            }
            // Category-specific hourly curve = better time-of-day accuracy → +3%
            if (cat !== 'default') confidence += 3;
            // Known operating hours = deterministic closed/open logic → +2%
            if (dest.openTime || dest.closeTime) confidence += 2;
            // Known special-day closures (e.g. Taj Mahal on Friday) → +2%
            if (dest.closedOn) confidence += 2;
            // Cap at 75% — honest ceiling per Agents.MD system accuracy
            confidence = Math.min(confidence, 75);
        } catch (e) {
            normalizedLevel = normalizeCrowdLevel(dest.crowdLevel);
        }
    } else {
        normalizedLevel = normalizeCrowdLevel(dest.crowdLevel);
    }

    // Format weather (convert object to string if needed)
    let weatherStr = dest.weather;
    if (typeof dest.weather === 'object' && dest.weather !== null) {
        weatherStr = `${dest.weather.temp}°C, ${dest.weather.condition}`;
    }
    
    // Generate estimated visitors based on avgVisitors and time
    // Generate estimated visitors — deterministic per destination+hour to prevent
    // flickering when transformDestinationData is called twice (before & after API await)
    const hour = new Date().getHours();
    const multiplier = (hour >= 10 && hour <= 16) ? 1.3 : 0.7;
    // Seed variance with dest.id + hour so the number is stable across re-renders
    const seed = ((dest.id * 9301 + hour * 49297) % 233280) / 233280; // deterministic 0–1
    const variance = 0.2;
    const base = dest.avgVisitors || 5000;
    const estimated = Math.round(base * multiplier * (1 + (seed - 0.5) * variance));
    const currentEstimate = formatVisitorCount(estimated);
    
    return {
        ...dest,
        baseCrowdLevel,
        crowdLevel: normalizedLevel,
        closedMessage,
        confidence,
        weather: weatherStr,
        currentEstimate: normalizedLevel === 'closed' ? null : currentEstimate,
        bestTimeToVisit: dest.bestTime || 'October to March'
    };
}

// ========== BOOKMARK / SAVE FEATURE ==========
function getSavedDestinations() {
    try {
        return JSON.parse(localStorage.getItem('cw_saved') || '[]');
    } catch { return []; }
}

function isDestinationSaved(id) {
    return getSavedDestinations().includes(id);
}

function toggleSaveDestination(event, id) {
    event.stopPropagation();
    const saved = getSavedDestinations();
    const idx = saved.indexOf(id);
    if (idx > -1) {
        saved.splice(idx, 1);
    } else {
        saved.push(id);
    }
    localStorage.setItem('cw_saved', JSON.stringify(saved));
    // Update all bookmark icons for this destination
    document.querySelectorAll(`.bookmark-btn[data-id="${id}"]`).forEach(btn => {
        btn.classList.toggle('saved', saved.includes(id));
        btn.setAttribute('aria-label', saved.includes(id) ? 'Remove from saved' : 'Save destination');
    });
}

function bookmarkIconHTML(destId) {
    const saved = isDestinationSaved(destId);
    return `<button class="bookmark-btn ${saved ? 'saved' : ''}" data-id="${destId}" onclick="toggleSaveDestination(event, ${destId})" aria-label="${saved ? 'Remove from saved' : 'Save destination'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
    </button>`;
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

// ========== CROWD SPARKLINE (24-hr Timeline) ==========
// Generates a tiny SVG sparkline showing today's crowd curve with a "now" dot
function generateSparklineSVG(dest) {
    if (!window.clientCrowdAlgorithm || dest.crowdLevel === 'closed') return '';
    const cat = dest.category || 'default';
    const algo = window.clientCrowdAlgorithm;
    const hourly = algo.hourlyPatterns[cat] || algo.hourlyPatterns.default;
    const now = new Date().getHours();

    // Build points for hours 6–22 (useful visiting hours)
    const startH = 6, endH = 22;
    const W = 120, H = 28, pad = 2;
    const steps = endH - startH;
    const points = [];
    for (let h = startH; h <= endH; h++) {
        const x = pad + ((h - startH) / steps) * (W - pad * 2);
        const y = H - pad - (hourly[h] || 0) * (H - pad * 2);
        points.push({ x, y, h });
    }
    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // "Now" marker
    let nowDot = '';
    if (now >= startH && now <= endH) {
        const np = points[now - startH];
        if (np) {
            const crowdColor = dest.crowdLevel === 'low' ? '#22c55e' :
                               dest.crowdLevel === 'moderate' ? '#eab308' :
                               dest.crowdLevel === 'heavy' ? '#f97316' : '#ef4444';
            nowDot = `<circle cx="${np.x.toFixed(1)}" cy="${np.y.toFixed(1)}" r="3" fill="${crowdColor}" stroke="white" stroke-width="1.5"/>`;
        }
    }

    // Gradient fill under curve
    const fillPoints = `${points[0].x.toFixed(1)},${H} ${polyline} ${points[points.length-1].x.toFixed(1)},${H}`;

    // Time-axis tick labels every 3 hours, positioned at exact chart x%
    const tickHours = [6, 9, 12, 15, 18, 21];
    const fmtHour = h => h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`;
    const tickLabels = tickHours.map(h => {
        const leftPct = ((h - startH) / steps * 100).toFixed(1);
        const label = fmtHour(h);
        const align = h === startH ? 'left' : h === endH ? 'right' : 'center';
        const transform = align === 'left' ? 'none' : align === 'right' ? 'translateX(-100%)' : 'translateX(-50%)';
        return `<span style="left:${leftPct}%;transform:${transform}">${label}</span>`;
    }).join('');

    return `
        <svg viewBox="0 0 ${W} ${H}" class="sparkline-svg" preserveAspectRatio="none">
            <defs>
                <linearGradient id="sparkFill_${dest.id}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.15"/>
                    <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            <polygon points="${fillPoints}" fill="url(#sparkFill_${dest.id})"/>
            <polyline points="${polyline}" fill="none" stroke="var(--primary-light)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${nowDot}
        </svg>
        <div class="sparkline-labels">${tickLabels}</div>`;
}

// Show skeleton loading cards for the featured Top Picks section
function showFeaturedSkeletons() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 3 }, () => `
        <div class="destination-card skeleton-card-wrap">
            <div class="skeleton skeleton-card" style="height:200px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;"></div>
            <div style="padding:18px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                    <div>
                        <div class="skeleton skeleton-text" style="width:130px;height:18px;margin-bottom:8px;"></div>
                        <div class="skeleton skeleton-text" style="width:90px;height:13px;"></div>
                    </div>
                    <div class="skeleton" style="width:64px;height:40px;border-radius:8px;"></div>
                </div>
                <div class="skeleton" style="height:5px;border-radius:3px;margin-bottom:10px;"></div>
                <div class="skeleton" style="height:32px;border-radius:6px;"></div>
            </div>
        </div>
    `).join('');
}

// Show skeleton loading cards while data is being computed
function showSkeletonCards() {
    const grid = document.getElementById('destinationsGrid');
    if (!grid) return;
    const count = 8; // Show 8 skeleton placeholders inside the sheet
    grid.innerHTML = Array.from({ length: count }, () => `
        <div class="destination-card skeleton-card-wrap">
            <div class="skeleton skeleton-card" style="height:180px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;"></div>
            <div style="padding:18px 20px;">
                <div class="skeleton skeleton-text" style="width:65%;height:18px;margin-bottom:10px;"></div>
                <div class="skeleton skeleton-text short" style="width:40%;height:14px;margin-bottom:14px;"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="skeleton" style="height:44px;"></div>
                    <div class="skeleton" style="height:44px;"></div>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== FEATURED DESTINATIONS (TOP 3 SPOTLIGHT) ==========
// Deterministic: picks the most-visited destination from each crowd level
function renderFeaturedDestinations() {
    const grid = document.getElementById('featuredGrid');
    if (!grid || allDestinations.length === 0) return;

    // Deterministic selection: for each crowd level, pick the destination
    // with the highest avgVisitors. This ensures the same 3 always appear
    // for a given time/day/season (crowd levels are time-aware).
    const levels = ['low', 'moderate', 'heavy', 'overcrowded'];
    const picks = [];
    for (const level of levels) {
        if (picks.length >= 3) break;
        const candidates = allDestinations
            .filter(d => d.crowdLevel === level && !picks.includes(d))
            .sort((a, b) => (b.avgVisitors || 0) - (a.avgVisitors || 0));
        if (candidates.length > 0) picks.push(candidates[0]);
    }
    // Pad with highest-traffic remaining destinations if we don't have 3
    if (picks.length < 3) {
        const remaining = allDestinations
            .filter(d => !picks.includes(d))
            .sort((a, b) => (b.avgVisitors || 0) - (a.avgVisitors || 0));
        for (const d of remaining) {
            if (picks.length >= 3) break;
            picks.push(d);
        }
    }

    const labels = ['✨ Top Pick', '🔥 Trending', '🧭 Must Visit'];
    grid.innerHTML = picks.slice(0, 3).map((dest, idx) => {
        const crowdLabel = getCrowdLabel(dest.crowdLevel, dest.closedMessage);
        const isClosed = dest.crowdLevel === 'closed';
        const bestTimeBadge = isClosed
            ? `<span class="best-time-badge closed-badge">🔒 ${dest.closedMessage || 'Closed Now'}</span>`
            : `<span class="best-time-badge">⏰ Best: ${getBestTimeNow(dest)}</span>`;
        return `
            <div class="destination-card" onclick="navigateToDestination(${dest.id})">
                <div class="card-image" data-dest-id="${dest.id}">
                    <span class="featured-badge">${labels[idx]}</span>
                    <span class="card-emoji" style="font-size:4rem">${dest.emoji}</span>
                    <span class="crowd-badge crowd-${dest.crowdLevel}">${crowdLabel}</span>
                    ${bookmarkIconHTML(dest.id)}
                    ${bestTimeBadge}
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${dest.name}</div>
                            <div class="card-state">📍 ${dest.state}</div>
                        </div>
                        ${isClosed
                            ? `<div class="current-estimate closed-estimate">
                                <div class="estimate-label">Status</div>
                                <div class="estimate-value" style="font-size:11px;color:#6b7280;">⚫ ${dest.closedMessage || 'Closed Now'}</div>
                               </div>`
                            : `<div class="current-estimate">
                                <div class="estimate-label">Live Count</div>
                                <div class="estimate-value">👥 ${dest.currentEstimate}</div>
                               </div>`
                        }
                    </div>
                    ${!isClosed ? `<div class="confidence-meter">
                        <span class="confidence-label">Confidence</span>
                        <div class="confidence-bar"><div class="confidence-fill" style="width:${dest.confidence}%"></div></div>
                        <span class="confidence-value">${dest.confidence}%</span>
                    </div>` : ''}
                    <div class="card-sparkline">${generateSparklineSVG(dest)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Trigger photo loading for featured cards
    if (window.DestinationPhotos) window.DestinationPhotos.loadPhotosForVisibleCards();
}

// ========== SHEET COUNT BADGES ==========
function updateSheetCounts() {
    const count = filteredDestinations.length;
    const searchTerm = ((document.getElementById('searchInput') || {}).value || '').trim();

    // Update count badges
    const el1 = document.getElementById('viewAllCount');
    const el2 = document.getElementById('sheetCount');
    const el3 = document.getElementById('stickySheetCount');
    if (el1) el1.textContent = count;
    if (el2) el2.textContent = count;
    if (el3) el3.textContent = count;

    // Update sheet title to reflect active search
    const titleEl = document.querySelector('.sheet-title');
    if (titleEl) {
        const badgeEl = titleEl.querySelector('.sheet-count-badge');
        const textNode = titleEl.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = searchTerm ? `Results for "${searchTerm}" ` : 'All Destinations ';
        }
        if (badgeEl) badgeEl.textContent = count;
    }
}

// ========== BODY SCROLL LOCK (iOS-compatible) ==========
// iOS Safari ignores `overflow:hidden` on body — must use position:fixed trick
let _sheetScrollLockY = 0;
function lockBodyScroll() {
    _sheetScrollLockY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_sheetScrollLockY}px`;
    document.body.style.width = '100%';
}
function unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, _sheetScrollLockY);
}

// ========== BOTTOM SHEET OPEN / CLOSE ==========
function openDestinationsSheet() {
    const sheet = document.getElementById('destinationsSheet');
    const backdrop = document.getElementById('sheetBackdrop');
    if (!sheet) return;
    sheet.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    lockBodyScroll();
    // Mirror hero search text into the sheet search box so the user can see
    // and edit/clear what was searched from the home page
    const heroVal = (document.getElementById('searchInput') || {}).value || '';
    const sheetInput = document.getElementById('sheetSearchInput');
    if (sheetInput && sheetInput.value !== heroVal) {
        sheetInput.value = heroVal;
    }
    // Restore sheet scroll position if returning from destination page
    const savedSheetY = sessionStorage.getItem('cw_sheetScrollY');
    if (savedSheetY) {
        const body = document.getElementById('sheetBody');
        if (body) body.scrollTop = parseInt(savedSheetY, 10);
        sessionStorage.removeItem('cw_sheetScrollY');
    }
}

function closeDestinationsSheet() {
    const sheet = document.getElementById('destinationsSheet');
    const backdrop = document.getElementById('sheetBackdrop');
    if (!sheet) return;
    sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    unlockBodyScroll();
}

// ========== DRAG-TO-DISMISS FOR BOTTOM SHEET ==========
function setupSheetDragToDismiss() {
    const handle = document.getElementById('sheetDragHandle');
    const sheet = document.getElementById('destinationsSheet');
    const body = document.getElementById('sheetBody');
    if (!handle || !sheet) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function onDragStart(e) {
        // Only initiate drag from handle OR when sheet body is scrolled to top
        const fromHandle = e.target.closest('#sheetDragHandle');
        const bodyScrolled = body && body.scrollTop > 4;
        if (!fromHandle && bodyScrolled) return;
        isDragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        currentY = 0;
        sheet.classList.add('dragging');
    }

    function onDragMove(e) {
        if (!isDragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        currentY = Math.max(0, y - startY); // only allow downward drag
        sheet.style.transform = `translateY(${currentY}px)`;
        e.preventDefault();
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        sheet.classList.remove('dragging');
        sheet.style.transform = '';
        if (currentY > 130) {
            closeDestinationsSheet();
        }
        // else spring back via CSS transition
    }

    handle.addEventListener('touchstart', onDragStart, { passive: true });
    handle.addEventListener('mousedown', onDragStart);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchend', onDragEnd);
    window.addEventListener('mouseup', onDragEnd);

    // Close on Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDestinationsSheet();
    });
}

// Restore saved scroll position after rendering
function restoreScrollPosition() {
    const shouldRestore = sessionStorage.getItem('cw_returnTo');
    if (!shouldRestore) return;
    const savedY = parseInt(sessionStorage.getItem('cw_scrollY') || '0', 10);
    const sheetWasOpen = sessionStorage.getItem('cw_sheetOpen') === 'true';
    // Restore filters silently (they modify filteredDestinations)
    const savedCrowd = sessionStorage.getItem('cw_crowdFilter');
    const savedCategory = sessionStorage.getItem('cw_categoryFilter');
    const savedState = sessionStorage.getItem('cw_stateFilter');
    let filtersRestored = false;
    if (savedCrowd && savedCrowd !== 'all') {
        filterByCrowd(savedCrowd, true); // silent = true
        filtersRestored = true;
    }
    if (savedCategory && savedCategory !== 'all') {
        currentCategoryFilter = savedCategory;
        document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
        const catPill = document.querySelector(`.category-pill[data-category="${savedCategory}"]`);
        if (catPill) catPill.classList.add('active');
        filtersRestored = true;
    }
    if (savedState && savedState !== 'all') {
        const stateSelect = document.getElementById('stateFilter');
        if (stateSelect) { stateSelect.value = savedState; filterByState(true); }
        filtersRestored = true;
    }
    // Re-render with restored filters if any were applied
    if (filtersRestored) {
        renderDestinations();
    }
    // Only scroll main page if the sheet was NOT open (sheet opens separately via DOMContentLoaded)
    if (!sheetWasOpen) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scrollTo({ top: savedY, behavior: 'instant' });
            });
        });
    }
    // Clean up so normal visits behave normally
    sessionStorage.removeItem('cw_returnTo');
    sessionStorage.removeItem('cw_scrollY');
    sessionStorage.removeItem('cw_crowdFilter');
    sessionStorage.removeItem('cw_categoryFilter');
    sessionStorage.removeItem('cw_stateFilter');
    // Note: cw_sheetOpen and cw_sheetScrollY are cleaned up by openDestinationsSheet()
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Show skeletons immediately for both sections
    showSkeletonCards();
    showFeaturedSkeletons();

    // Transform raw destination data (synchronous — client algorithm, instant)
    allDestinations = destinations.map(transformDestinationData);
    filteredDestinations = [...allDestinations];
    
    // Initialize data status first
    apiService.updateDataStatus();
    displayDataStatus();
    
    // Populate state dropdowns dynamically
    populateStateDropdowns();

    // Render featured destinations immediately with client-algorithm data
    // (fully synchronous, no API needed — user sees real predictions right away)
    // Use rAF so the skeleton paints for one frame before being replaced
    requestAnimationFrame(() => renderFeaturedDestinations());
    
    // Load real-time data if enabled (background refresh)
    if (API_CONFIG.USE_REAL_CROWD_DATA || API_CONFIG.ENABLE_DYNAMIC_MOCK || API_CONFIG.USE_REAL_WEATHER) {
        console.log('🔄 Loading real-time data...');
        await apiService.updateAllDestinations(allDestinations);
        filteredDestinations = [...allDestinations];
        // Silently re-render featured with fresh API data
        renderFeaturedDestinations();
    }
    
    renderDestinations();
    // Featured already rendered above — no duplicate call needed
    restoreScrollPosition();
    renderHeatmap();
    populateModals();
    setupSearchSuggestions();
    setupStickyFilterBar();
    setupMobileNavigation();
    setupSheetDragToDismiss();
    updateLastUpdatedTime();
    displayDataStatus();
    // Check locally-saved crowd alerts against current data
    setTimeout(() => checkLocalAlerts(), 1200);
    // Auto-open sheet if user was in the sheet when they navigated to a destination
    if (sessionStorage.getItem('cw_sheetOpen') === 'true') {
        sessionStorage.removeItem('cw_sheetOpen');
        openDestinationsSheet();
    }
    
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
// ========== DESTINATION RENDERING (progressive / lazy) ==========
const CARDS_PER_BATCH = 20;
let _renderedCount = 0;
let _sheetScrollHandler = null;
const _bestTimeCache = new Map();

function getCachedBestTime(dest) {
    const cacheKey = dest.id;
    if (_bestTimeCache.has(cacheKey)) return _bestTimeCache.get(cacheKey);
    const val = getBestTimeNow(dest);
    _bestTimeCache.set(cacheKey, val);
    return val;
}

// Build HTML for a single destination card
function buildCardHTML(dest) {
    const crowdLabel = getCrowdLabel(dest.crowdLevel, dest.closedMessage);
    const isClosed = dest.crowdLevel === 'closed';
    const bestTimeBadge = isClosed
        ? `<span class="best-time-badge closed-badge">🔒 ${dest.closedMessage || 'Closed Now'}</span>`
        : `<span class="best-time-badge">⏰ Best: ${getCachedBestTime(dest)}</span>`;
    return `
        <div class="destination-card" onclick="navigateToDestination(${dest.id})">
            <div class="card-image" data-dest-id="${dest.id}">
                <span class="card-emoji" style="font-size: 4rem;">${dest.emoji}</span>
                <span class="crowd-badge crowd-${dest.crowdLevel}">${crowdLabel}</span>
                ${bookmarkIconHTML(dest.id)}
                ${bestTimeBadge}
            </div>
            <div class="card-content">
                <div class="card-header">
                    <div>
                        <div class="card-title">${dest.name}</div>
                        <div class="card-state">📍 ${dest.state}</div>
                    </div>
                    ${isClosed
                        ? `<div class="current-estimate closed-estimate">
                            <div class="estimate-label">Status</div>
                            <div class="estimate-value" style="font-size:11px;color:#6b7280;">⚫ ${dest.closedMessage || 'Closed Now'}</div>
                           </div>`
                        : `<div class="current-estimate">
                            <div class="estimate-label">Live Count</div>
                            <div class="estimate-value">👥 ${dest.currentEstimate}</div>
                           </div>`
                    }
                </div>
                ${!isClosed ? `<div class="confidence-meter">
                    <span class="confidence-label">Confidence</span>
                    <div class="confidence-bar"><div class="confidence-fill" style="width:${dest.confidence}%"></div></div>
                    <span class="confidence-value">${dest.confidence}%</span>
                </div>` : ''}
                <div class="card-sparkline">${generateSparklineSVG(dest)}</div>
            </div>
        </div>`;
}

// Append next batch of cards into the grid
function appendNextBatch() {
    const grid = document.getElementById('destinationsGrid');
    if (!grid || _renderedCount >= filteredDestinations.length) return;
    const end = Math.min(_renderedCount + CARDS_PER_BATCH, filteredDestinations.length);
    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    for (let i = _renderedCount; i < end; i++) {
        temp.innerHTML = buildCardHTML(filteredDestinations[i]);
        fragment.appendChild(temp.firstElementChild);
    }
    grid.appendChild(fragment);
    _renderedCount = end;
    // Load photos for newly visible cards
    if (window.DestinationPhotos) window.DestinationPhotos.loadPhotosForVisibleCards();
}

function renderDestinations() {
    const grid = document.getElementById('destinationsGrid');

    // Always scroll the sheet back to the top when results change due to a filter.
    const sheetBody = document.getElementById('sheetBody');
    if (sheetBody) sheetBody.scrollTop = 0;

    // Update count badges every render (including zero results)
    updateSheetCounts();

    // Tear down previous infinite-scroll listener
    if (_sheetScrollHandler && sheetBody) {
        sheetBody.removeEventListener('scroll', _sheetScrollHandler);
        _sheetScrollHandler = null;
    }

    if (filteredDestinations.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                <p>No destinations found matching your filters.</p>
                <button onclick="clearAllFilters()" style="margin-top: 16px; padding: 12px 24px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600;">Clear Filters</button>
            </div>
        `;
        _renderedCount = 0;
        return;
    }

    // Render first batch only
    _renderedCount = 0;
    grid.innerHTML = '';
    appendNextBatch();

    // Set up infinite scroll on the sheet body
    if (sheetBody) {
        _sheetScrollHandler = function() {
            if (_renderedCount >= filteredDestinations.length) return;
            const { scrollTop, scrollHeight, clientHeight } = sheetBody;
            if (scrollTop + clientHeight >= scrollHeight - 300) {
                appendNextBatch();
            }
        };
        sheetBody.addEventListener('scroll', _sheetScrollHandler, { passive: true });
    }
}

// ========== HEATMAP RENDERING (lazy — only when scrolled into view) ==========
let _heatmapRendered = false;
function renderHeatmap() {
    const heatmapGrid = document.getElementById('heatmapGrid');
    if (!heatmapGrid || _heatmapRendered) return;
    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries, self) => {
            if (entries[0].isIntersecting) {
                _heatmapRendered = true;
                heatmapGrid.innerHTML = allDestinations.map(dest => `
                    <div class="heatmap-item ${dest.crowdLevel}" onclick="navigateToDestination(${dest.id})">
                        <div class="heatmap-emoji">${dest.emoji}</div>
                        <div class="heatmap-name">${dest.name}</div>
                        <div class="heatmap-crowd">${getCrowdLabel(dest.crowdLevel)}</div>
                    </div>
                `).join('');
                self.disconnect();
            }
        }, { rootMargin: '200px' });
        obs.observe(heatmapGrid);
    } else {
        _heatmapRendered = true;
        heatmapGrid.innerHTML = allDestinations.map(dest => `
            <div class="heatmap-item ${dest.crowdLevel}" onclick="navigateToDestination(${dest.id})">
                <div class="heatmap-emoji">${dest.emoji}</div>
                <div class="heatmap-name">${dest.name}</div>
                <div class="heatmap-crowd">${getCrowdLabel(dest.crowdLevel)}</div>
            </div>
        `).join('');
    }
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

function getCrowdLabel(level, closedMsg) {
    const normalizedLevel = normalizeCrowdLevel(level);
    if (normalizedLevel === 'closed') {
        // Show specific message: "Opens at 8:00 AM" or "Closed Now" — never generic "Closed Today"
        // unless the place is truly closed all day
        if (closedMsg && !/closed today/i.test(closedMsg)) {
            return `🔒 ${closedMsg}`;
        }
        return '⚫ Closed Now';
    }
    const labels = {
        'low': '🟢 Low',
        'moderate': '🟡 Moderate',
        'heavy': '🟠 Busy',
        'overcrowded': '🔴 Packed'
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
    try {
        if (window.clientCrowdAlgorithm) {
            const result = window.clientCrowdAlgorithm.getBestTimeToday(
                dest.baseCrowdLevel || 50,
                dest.category || 'default',
                dest.id
            );
            if (result && result.bestTime) return result.bestTime;
        }
    } catch (e) {
        console.warn('getBestTimeNow fallback:', e);
    }
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return '6:00 AM - 9:00 AM';
    if (hour >= 9 && hour < 16) return '4:00 PM - 6:00 PM';
    return '6:00 AM - 9:00 AM';
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
            <div class="suggestion-item" onclick="fillSearch('${item}')">
                ${dest ? dest.emoji : '📍'} ${item}
            </div>
        `;
    }).join('');
    
    // Handle search input
    searchInput.addEventListener('focus', function() {
        updateRecentSearches();
        suggestionsDropdown.classList.add('active');
        // On mobile, position the dropdown correctly below the search input
        if (window.innerWidth <= 768) {
            const inputRect = searchInput.getBoundingClientRect();
            suggestionsDropdown.style.top = (inputRect.bottom + 4) + 'px';
        }
    });
    
    searchInput.addEventListener('blur', function() {
        setTimeout(() => suggestionsDropdown.classList.remove('active'), 200);
    });
    
    searchInput.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        if (value.length > 0) {
            // Use fuzzy scoring for suggestions so typos still show results
            const scored = allDestinations
                .map(d => ({ dest: d, score: searchScore(d, value) }))
                .filter(s => s.score < Infinity)
                .sort((a, b) => a.score !== b.score ? a.score - b.score : (b.dest.avgVisitors || 0) - (a.dest.avgVisitors || 0))
                .slice(0, 5);
            
            if (scored.length > 0) {
                popularSuggestions.innerHTML = scored.map(({ dest }) => `
                    <div class="suggestion-item" onclick="fillSearch('${dest.name}')">
                        ${dest.emoji} ${dest.name}
                        <span style="margin-left: auto; font-size: 12px; opacity: 0.7;">${getCrowdLabel(dest.crowdLevel)}</span>
                    </div>
                `).join('');
            } else {
                popularSuggestions.innerHTML = `<div class="suggestion-item" style="opacity:0.5;pointer-events:none;">No matches found</div>`;
            }
        } else {
            // Reset to popular
            popularSuggestions.innerHTML = popular.map(item => {
                const dest = allDestinations.find(d => d.name.includes(item.split(' ')[0]));
                return `
                    <div class="suggestion-item" onclick="fillSearch('${item}')">
                        ${dest ? dest.emoji : '📍'} ${item}
                    </div>
                `;
            }).join('');
        }
        // Live-filter as user types; clearing the input instantly restores all destinations
        searchDestination();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAndNavigate();
        }
    });
}

function updateRecentSearches() {
    const recentSection = document.getElementById('recentSection');
    const recentSuggestions = document.getElementById('recentSuggestions');
    
    if (recentSearches.length > 0) {
        recentSection.style.display = 'block';
        recentSuggestions.innerHTML = recentSearches.slice(0, 3).map(term => `
            <div class="suggestion-item" onclick="fillSearch('${term}')">
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

function searchAndNavigate() {
    searchDestination();
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm !== '') {
        addToRecentSearches(searchTerm);
        document.getElementById('searchSuggestions').classList.remove('active');
        document.getElementById('searchInput').blur();
        // Open the sheet so results are immediately visible
        openDestinationsSheet();
    }
}

// Fill the search box from a suggestion — pre-fills input ONLY, does NOT filter or navigate.
// User must click the Search button or press Enter to apply the search.
function fillSearch(term) {
    document.getElementById('searchInput').value = term;
    document.getElementById('searchSuggestions').classList.remove('active');
    searchDestination();
    addToRecentSearches(term);
    // Open the sheet so filtered results are immediately visible
    openDestinationsSheet();
}

// Build a flat searchable string for a destination (only core fields — no alerts/nearby)
function buildSearchText(dest) {
    return [
        dest.name,
        dest.state,
        dest.city,
        dest.category
    ].filter(Boolean).join(' ').toLowerCase();
}

// ========== FUZZY SEARCH ENGINE ==========

// Levenshtein edit distance — how many single-char edits to turn a → b
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[b.length][a.length];
}

// Max allowed edit distance based on word length
function maxTypoDistance(wordLen) {
    if (wordLen <= 3) return 0; // too short for typos — require exact
    if (wordLen <= 5) return 1;
    if (wordLen <= 8) return 2;
    return 3;
}

// Check if queryWord fuzzy-matches any word in the text
// Returns: 0 = exact/prefix match, 1 = fuzzy match score (lower = better), Infinity = no match
function fuzzyWordMatch(queryWord, textWords) {
    // 1. Exact prefix match (strongest signal)
    for (const tw of textWords) {
        if (tw.startsWith(queryWord) || queryWord.startsWith(tw)) return 0;
    }
    // 2. Substring containment
    const joined = textWords.join(' ');
    if (joined.includes(queryWord)) return 0;
    // 3. Fuzzy (Levenshtein) match against each word
    const maxDist = maxTypoDistance(queryWord.length);
    if (maxDist === 0) return Infinity;
    let bestDist = Infinity;
    for (const tw of textWords) {
        // Only compare words of similar length (skip wildly different lengths)
        if (Math.abs(tw.length - queryWord.length) > maxDist) continue;
        const dist = levenshtein(queryWord, tw);
        if (dist <= maxDist && dist < bestDist) bestDist = dist;
    }
    return bestDist;
}

// Compute a relevance score for a destination against a query (lower = better, Infinity = no match)
function searchScore(dest, rawQuery) {
    if (!rawQuery) return 0;
    const text = buildSearchText(dest);
    const textWords = text.split(/\s+/).filter(Boolean);
    const queryWords = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    let totalScore = 0;
    for (const qw of queryWords) {
        // Stem common plurals: beaches→beach, temples→temple, forts→fort
        const stems = [qw];
        if (qw.length > 4 && qw.endsWith('es')) stems.push(qw.slice(0, -2));
        if (qw.length > 3 && qw.endsWith('s')) stems.push(qw.slice(0, -1));
        
        let bestStemScore = Infinity;
        for (const stem of stems) {
            const score = fuzzyWordMatch(stem, textWords);
            if (score < bestStemScore) bestStemScore = score;
        }
        if (bestStemScore === Infinity) return Infinity; // one query word has zero match
        totalScore += bestStemScore;
    }
    return totalScore;
}

// Legacy exact-match check (used where boolean is needed)
function matchesQuery(dest, rawQuery) {
    return searchScore(dest, rawQuery) < Infinity;
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
        // Score all destinations and filter + sort by relevance
        const scored = allDestinations
            .map(dest => ({ dest, score: searchScore(dest, searchTerm) }))
            .filter(s => s.score < Infinity);
        // Sort: exact matches (score 0) first, then by score ascending, then by popularity
        scored.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return (b.dest.avgVisitors || 0) - (a.dest.avgVisitors || 0);
        });
        filteredDestinations = scored.map(s => s.dest);
    }
    
    applyCurrentFilters();
    renderDestinations();
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    addToRecentSearches(term);
    searchDestination();
    document.getElementById('searchSuggestions').classList.remove('active');
    // quickSearch is now only used for explicit navigation (near-me, etc.)
    // Suggestion items use fillSearch() instead — no auto-scroll
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
                
                // Open sheet so nearby results are immediately visible
                openDestinationsSheet();
                
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
function filterByCrowd(level, silent) {
    currentCrowdFilter = level;
    
    // Update button styles
    document.querySelectorAll('.crowd-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    const activePill = document.querySelector(`.crowd-pill[data-filter="${level}"]`);
    if (activePill) activePill.classList.add('active');
    
    // Update sticky filter bar
    document.querySelectorAll('.sticky-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    const stickyPill = document.querySelector(`.sticky-pill[data-filter="${level}"]`);
    if (stickyPill) stickyPill.classList.add('active');
    
    applyCurrentFilters();
    if (!silent) renderDestinations();
}

function filterByCategory(category) {
    currentCategoryFilter = category;
    document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
    const activePill = document.querySelector(`.category-pill[data-category="${category}"]`);
    if (activePill) activePill.classList.add('active');
    applyCurrentFilters();
    renderDestinations();
}

// ========== DISCOVER FILTER (Best Time / Hidden Gems / Weekend) ==========
function filterByDiscover(type) {
    currentDiscoverFilter = type;
    document.querySelectorAll('.discover-pill').forEach(btn => btn.classList.remove('active'));
    const activePill = document.querySelector(`.discover-pill[data-discover="${type}"]`);
    if (activePill) activePill.classList.add('active');
    applyCurrentFilters();
    renderDestinations();
}

// Check if current month falls within a destination's bestTime range
function isBestTimeNow(bestTimeStr) {
    if (!bestTimeStr) return false;
    const str = bestTimeStr.toLowerCase();
    if (str.includes('year-round') || str.includes('weekday')) return true;
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthAbbr = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const currentMonth = new Date().getMonth(); // 0-indexed
    // Parse patterns like "October to March", "March to June, September to November"
    const ranges = str.split(/[,&]/).map(s => s.trim());
    for (const range of ranges) {
        const match = range.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/gi);
        if (match && match.length >= 2) {
            const startIdx = monthNames.indexOf(match[0].toLowerCase());
            const endIdx = monthNames.indexOf(match[1].toLowerCase());
            if (startIdx === -1 || endIdx === -1) continue;
            // Handle wrap-around (e.g. Oct-Mar = 9..2)
            if (startIdx <= endIdx) {
                if (currentMonth >= startIdx && currentMonth <= endIdx) return true;
            } else {
                if (currentMonth >= startIdx || currentMonth <= endIdx) return true;
            }
        } else if (match && match.length === 1) {
            // Single month mention like "November (Camel Fair)"
            if (monthNames.indexOf(match[0].toLowerCase()) === currentMonth) return true;
        }
    }
    return false;
}

function matchesDiscoverFilter(dest) {
    if (currentDiscoverFilter === 'all') return true;
    if (currentDiscoverFilter === 'best-time') {
        return isBestTimeNow(dest.bestTime || dest.bestTimeToVisit);
    }
    if (currentDiscoverFilter === 'hidden-gems') {
        return (dest.avgVisitors || 5000) <= 4000 && dest.crowdLevel !== 'overcrowded';
    }
    if (currentDiscoverFilter === 'weekend') {
        const weekendCategories = ['beach', 'hill-station', 'nature', 'adventure', 'lake', 'waterfall', 'viewpoint'];
        return weekendCategories.includes(dest.category) && (dest.avgVisitors || 5000) <= 10000;
    }
    return true;
}

function filterByState(silent) {
    const stateValue = document.getElementById('stateFilter').value;
    
    // If a specific state is selected (not 'all'), clear the search inputs
    if (stateValue !== 'all') {
        document.getElementById('searchInput').value = '';
        const sheetSearch = document.getElementById('sheetSearchInput');
        if (sheetSearch) sheetSearch.value = '';
    }
    
    applyCurrentFilters();
    if (!silent) renderDestinations();
}

function applyCurrentFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const state = document.getElementById('stateFilter').value;
    
    filteredDestinations = allDestinations.filter(dest => {
        // Multi-word search across all fields
        const matchesSearch = matchesQuery(dest, searchTerm);
        
        // Crowd filter
        const matchesCrowd = currentCrowdFilter === 'all' || dest.crowdLevel === currentCrowdFilter;
        
        // Category filter
        const matchesCategory = currentCategoryFilter === 'all' || dest.category === currentCategoryFilter;
        
        // Discover filter
        const matchesDiscover = matchesDiscoverFilter(dest);
        
        // State filter
        const matchesState = state === 'all' || dest.state === state;
        
        return matchesSearch && matchesCrowd && matchesCategory && matchesDiscover && matchesState;
    });
    
    // Apply sorting
    applySorting();
}

function quickFilter(level) {
    filterByCrowd(level);
}

function toggleFilterPanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('filterPanel');
    const arrow = document.getElementById('filterArrow');
    if (!panel) return;
    const isOpen = panel.style.display === 'block';
    panel.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.textContent = isOpen ? '▾' : '▴';
    if (!isOpen) {
        // Close when clicking anywhere outside the dropdown
        document.addEventListener('click', function closeFn(evt) {
            const wrap = document.getElementById('filterDropWrap');
            if (wrap && !wrap.contains(evt.target)) {
                panel.style.display = 'none';
                if (arrow) arrow.textContent = '▾';
                document.removeEventListener('click', closeFn);
            }
        });
    }
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    const sheetSearch = document.getElementById('sheetSearchInput');
    if (sheetSearch) sheetSearch.value = '';
    const stateFilter = document.getElementById('stateFilter');
    if (stateFilter) stateFilter.value = 'all';
    currentCrowdFilter = 'all';
    currentCategoryFilter = 'all';
    currentDiscoverFilter = 'all';
    currentSort = 'default';
    
    document.querySelectorAll('.crowd-pill').forEach(btn => btn.classList.remove('active'));
    const allPill = document.querySelector('.crowd-pill[data-filter="all"]');
    if (allPill) allPill.classList.add('active');
    
    document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
    const allCatPill = document.querySelector('.category-pill[data-category="all"]');
    if (allCatPill) allCatPill.classList.add('active');
    
    document.querySelectorAll('.discover-pill').forEach(btn => btn.classList.remove('active'));
    const allDiscPill = document.querySelector('.discover-pill[data-discover="all"]');
    if (allDiscPill) allDiscPill.classList.add('active');
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    const defSort = document.querySelector('.sort-btn[data-sort="default"]');
    if (defSort) defSort.classList.add('active');
    
    const sortSel = document.getElementById('sortSelectMain');
    if (sortSel) sortSel.value = 'default';
    
    filteredDestinations = [...allDestinations];
    renderDestinations();
}

// ========== SORTING ==========
function sortDestinations(sortType) {
    currentSort = sortType;
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.sort-btn[data-sort="${sortType}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
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

// ========== STICKY VIEW-ALL BAR ==========
function setupStickyFilterBar() {
    const stickyBar = document.getElementById('stickyFilterBar');
    const hero = document.querySelector('.hero');
    if (!stickyBar) return;
    
    window.addEventListener('scroll', () => {
        const threshold = hero ? hero.getBoundingClientRect().bottom : 300;
        if (threshold < 0) {
            stickyBar.classList.add('visible');
        } else {
            stickyBar.classList.remove('visible');
        }
    });
}

function syncSearch(input) {
    document.getElementById('searchInput').value = input.value;
    // Keep sheet search in sync if another input is used
    const sheetInput = document.getElementById('sheetSearchInput');
    if (sheetInput && sheetInput !== input) sheetInput.value = input.value;
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
    const activeBtn = document.querySelector(`.toggle-btn[data-view="${view}"]`);
    if (activeBtn) activeBtn.classList.add('active');
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
    bestTimeDestination.addEventListener('change', findBestTime);
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
    if (!dest) return;
    
    // Show loading state
    const submitBtn = document.querySelector('#alertModal .alert-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving alert...';
    submitBtn.disabled = true;
    
    // Save alert locally (backend is HTTP-only, not reachable from HTTPS frontend)
    const localAlerts = JSON.parse(localStorage.getItem('cw_crowd_alerts') || '[]');
    // Replace any existing alert for the same destination
    const existingIdx = localAlerts.findIndex(a => a.destinationId == destination);
    if (existingIdx > -1) localAlerts.splice(existingIdx, 1);
    localAlerts.push({
        id: `alert_${Date.now()}`,
        email,
        destinationId: parseInt(destination),
        destinationName: dest.name,
        destinationEmoji: dest.emoji,
        threshold,
        createdAt: new Date().toISOString(),
        triggered: false
    });
    localStorage.setItem('cw_crowd_alerts', JSON.stringify(localAlerts));
    
    if (typeof trackEvent === 'function') trackEvent('alert_created', dest.name);
    
    // Request browser notification permission for real-time alerts
    let notifGranted = false;
    if ('Notification' in window && Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        notifGranted = perm === 'granted';
    }
    
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    showAlertConfirmation(dest.name, threshold, email, notifGranted);
    
    // Immediately check if this alert already matches current crowd level
    setTimeout(() => checkLocalAlerts(true), 400);
}

function showAlertConfirmation(destName, threshold, email, notifGranted) {
    const modal = document.getElementById('alertModal');
    const modalBody = modal.querySelector('.modal-body');
    
    const notifNote = notifGranted
        ? `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;padding:14px 16px;border-radius:12px;text-align:left;margin-top:16px;">
               <p style="margin:0;font-size:14px;color:#166534;"><strong>🔔 Browser notifications ON</strong><br>Keep this tab open (or return to it) — we’ll alert you the moment crowds drop.</p>
           </div>`
        : `<div style="background:#fefce8;border:1.5px solid #fde047;padding:14px 16px;border-radius:12px;text-align:left;margin-top:16px;">
               <p style="margin:0;font-size:14px;color:#854d0e;"><strong>⚠️ Notifications blocked</strong><br>Allow browser notifications so we can alert you instantly when crowds drop.</p>
           </div>`;
    
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h3 style="color: var(--text-primary); margin-bottom: 12px;">Alert Saved!</h3>
            <p style="color: var(--text-secondary); margin-bottom: 4px;">
                We’ll watch <strong>${destName}</strong> for you and alert you<br>when crowd drops to <strong>${threshold}</strong> or lower.
            </p>
            ${notifNote}
        </div>
    `;
    
    // Auto-close after 6 seconds
    setTimeout(() => closeAlertModal(), 6000);
}

function showAlertError(message) {
    const modal = document.getElementById('alertModal');
    const modalBody = modal.querySelector('.modal-body');
    
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="color: var(--text-primary); margin-bottom: 12px;">Alert Could Not Be Sent</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                ${message}
            </p>
            <button onclick="resetAlertModal()" style="padding: 12px 24px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-family: inherit;">Try Again</button>
        </div>
    `;
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
    
    // Use fixed positioning so the list escapes any overflow:hidden/auto ancestor (e.g. modal)
    dropdownList.style.position = 'fixed';
    dropdownList.style.zIndex = '99999';
    dropdownList.style.borderTop = '1.5px solid var(--primary)'; // restore all borders
    dropdownList.style.borderRadius = 'var(--radius)';
    
    function positionDropdown() {
        const rect = searchInput.getBoundingClientRect();
        dropdownList.style.top  = (rect.bottom + 2) + 'px';
        dropdownList.style.left = rect.left + 'px';
        dropdownList.style.width = rect.width + 'px';
    }
    
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
        positionDropdown();
        renderDropdownItems(searchInput.value);
        dropdownList.classList.add('show');
    });
    
    // Filter on input
    searchInput.addEventListener('input', () => {
        positionDropdown();
        renderDropdownItems(searchInput.value);
        dropdownList.classList.add('show');
        // Clear selection if user is typing
        if (!searchInput.classList.contains('has-selection')) {
            hiddenInput.value = '';
        }
        searchInput.classList.remove('has-selection');
    });
    
    // Reposition on modal scroll (in case modal body scrolls)
    const scrollParent = searchInput.closest('.modal-content') || searchInput.closest('.modal') || window;
    scrollParent.addEventListener('scroll', () => {
        if (dropdownList.classList.contains('show')) positionDropdown();
    }, { passive: true });
    window.addEventListener('resize', () => {
        if (dropdownList.classList.contains('show')) positionDropdown();
    }, { passive: true });
    
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

// ========== LOCAL CROWD ALERT CHECKER ==========
// Called on startup and whenever the user sets a new alert.
// Compares saved alerts against the current (client-algorithm) crowd levels
// and fires browser Notifications for matched conditions.
function checkLocalAlerts(immediate = false) {
    if (!allDestinations.length) return;
    const alerts = JSON.parse(localStorage.getItem('cw_crowd_alerts') || '[]');
    if (!alerts.length) return;
    
    const crowdOrder = { low: 1, moderate: 2, heavy: 3, overcrowded: 4 };
    let updated = false;
    
    alerts.forEach(alert => {
        // Skip already-triggered alerts unless we're doing an immediate check on creation
        if (alert.triggered && !immediate) return;
        const dest = allDestinations.find(d => d.id === alert.destinationId);
        if (!dest) return;
        
        const destOrder = crowdOrder[dest.crowdLevel] || 99;
        const threshOrder = crowdOrder[alert.threshold] || 99;
        
        // Condition met: current crowd is AT or BELOW the desired threshold
        if (destOrder <= threshOrder && dest.crowdLevel !== 'closed') {
            // Fire browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(
                    `${alert.destinationEmoji || '📍'} ${alert.destinationName} is now ${dest.crowdLevel}!`,
                    {
                        body: `Crowd level has dropped. Now a great time to visit ${alert.destinationName}!`,
                        icon: '/favicon.ico',
                        tag: `cw_alert_${alert.destinationId}` // deduplicate
                    }
                );
            }
            // Show on-page toast as fallback
            const levelEmoji = { low: '🟢', moderate: '🟡', heavy: '🟠', overcrowded: '🔴' }[dest.crowdLevel] || '📍';
            showToast(`🔔 ${alert.destinationEmoji || ''} ${alert.destinationName} crowd is now ${levelEmoji} ${dest.crowdLevel}!`);
            alert.triggered = true;
            updated = true;
        }
    });
    
    if (updated) localStorage.setItem('cw_crowd_alerts', JSON.stringify(alerts));
}

function showBestTimeModal() {
    document.getElementById('bestTimeModal').style.display = 'block';
    // Re-show results if a destination was already selected from a previous open
    const destId = document.getElementById('bestTimeDestination').value;
    if (destId) findBestTime();
}

function closeBestTimeModal() {
    document.getElementById('bestTimeModal').style.display = 'none';
    document.getElementById('bestTimeResult').style.display = 'none';
}

function findBestTime() {
    const destId = document.getElementById('bestTimeDestination').value;
    if (!destId) return;

    const dest = allDestinations.find(d => d.id == destId);
    const resultDiv = document.getElementById('bestTimeResult');

    // Use the real prediction algorithm — same one that powers the main cards
    if (!window.clientCrowdAlgorithm) {
        resultDiv.innerHTML = `<p style="color:var(--text-secondary)">Algorithm not loaded. Please refresh.</p>`;
        resultDiv.style.display = 'block';
        return;
    }

    const baseCrowdLevel = typeof dest.crowdLevel === 'number'
        ? dest.crowdLevel
        : { low: 25, moderate: 50, heavy: 70, overcrowded: 90 }[dest.crowdLevel] || 50;

    const result = window.clientCrowdAlgorithm.getBestTimeToday(
        baseCrowdLevel,
        dest.category || 'default',
        dest.id
    );

    if (result.bestTime === 'Closed today') {
        resultDiv.innerHTML = `
            <h4>🔒 ${dest.name} is closed today</h4>
            <p style="color:var(--text-secondary);font-size:13px;">Try checking a different day using the Crowd Calendar on the destination page.</p>
        `;
        resultDiv.style.display = 'block';
        return;
    }

    // Build time slots: show all open hours grouped into 2-hour bands, sorted best→worst
    const crowdColor = { low: '#22c55e', moderate: '#eab308', heavy: '#f97316', overcrowded: '#ef4444' };
    const crowdBg = { low: '#f0fdf4', moderate: '#fefce8', heavy: '#fff7ed', overcrowded: '#fef2f2' };
    const crowdEmoji = { low: '🟢', moderate: '🟡', heavy: '🟠', overcrowded: '🔴' };
    const crowdLabel = { low: 'Low', moderate: 'Moderate', heavy: 'Heavy', overcrowded: 'Packed' };

    // Combine hourly predictions into 2-hour windows (6-8, 8-10, ... 20-22)
    const bands = [];
    const preds = result.predictions; // hourly array for hours 6–21

    for (let i = 0; i < preds.length - 1; i += 2) {
        const a = preds[i], b = preds[i + 1] || preds[i];
        if (a.status === 'closed' && b.status === 'closed') continue;
        const avg = (a.score + (b.status !== 'closed' ? b.score : a.score)) / 2;
        const level = avg < 0.25 ? 'low' : avg < 0.50 ? 'moderate' : avg < 0.75 ? 'heavy' : 'overcrowded';
        const isBest = a.timeFormatted === result.bestTime || b.timeFormatted === result.bestTime;
        const isPast = a.isPast && b.isPast;
        bands.push({
            label: `${a.timeFormatted} – ${b.timeFormatted}`,
            level,
            avg,
            isBest,
            isPast
        });
    }

    const slotsHTML = bands.map(band => {
        const c = crowdColor[band.level];
        const bg = crowdBg[band.level];
        const bestBadge = band.isBest
            ? `<span style="font-size:10px;font-weight:700;background:${c};color:#fff;padding:2px 8px;border-radius:20px;margin-left:8px;">✦ BEST</span>`
            : '';
        const pastBadge = '';
        const timeEmoji = band.label.includes('6:00 AM') || band.label.includes('7:00 AM') ? '🌅'
            : band.label.includes('8:00 AM') || band.label.includes('9:00 AM') ? '🌄'
            : band.label.includes('10:00 AM') || band.label.includes('11:00 AM') || band.label.includes('12:00') ? '☀️'
            : band.label.includes('1:00 PM') || band.label.includes('2:00 PM') || band.label.includes('3:00 PM') ? '🌤️'
            : band.label.includes('4:00 PM') || band.label.includes('5:00 PM') ? '🌆'
            : '🌙';
        return `
            <div class="time-slot" style="background:${bg};border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                <span class="time-slot-time">${timeEmoji} ${band.label}${bestBadge}${pastBadge}</span>
                <span class="time-slot-crowd" style="color:${c};font-weight:700;">${crowdEmoji[band.level]} ${crowdLabel[band.level]}</span>
            </div>`;
    }).join('');

    // Best window summary
    const bestBand = bands.find(b => b.isBest) || bands[0];
    const recText = bestBand
        ? `Visit around <strong>${bestBand.label}</strong> today for the lowest crowds at ${dest.name}.`
        : `All remaining slots are moderately busy. Try early morning visits on weekdays.`;

    resultDiv.innerHTML = `
        <h4>Best times to visit ${dest.emoji || ''} ${dest.name}</h4>
        <p style="font-size:12px;color:var(--text-muted);margin:-4px 0 12px;">Based on category (${dest.category || 'general'}), today's day & season</p>
        ${slotsHTML}
        <p style="margin-top:12px;font-size:13px;color:var(--text-secondary);">
            💡 <strong>Recommendation:</strong> ${recText}
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
    
    // Get crowd level description — accepts string or numeric level
    const getCrowdDesc = (level) => {
        const n = typeof level === 'number' ? level
            : { low: 25, moderate: 50, heavy: 70, overcrowded: 90 }[level] ?? 50;
        if (n < 30) return 'Very Low crowds';
        if (n < 50) return 'Low crowds';
        if (n < 70) return 'Moderate crowds';
        return 'High crowds expected';
    };
    const crowdLevelLabel = (level) => {
        const labels = { low: '🟢 Low', moderate: '🟡 Moderate', heavy: '🟠 Heavy', overcrowded: '🔴 Overcrowded' };
        return labels[level] || level;
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
                <p><strong>📍 ${hiddenGem.city}</strong> — ${crowdLevelLabel(hiddenGem.crowdLevel)} crowd right now!<br>
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
function navigateToDestination(destinationId) {
    // Track destination view for analytics
    const dest = allDestinations.find(d => d.id === destinationId);
    if (dest && typeof trackEvent === 'function') {
        trackEvent('view_destination', dest.name);
    }
    // Save scroll position & active filters so we can restore on back
    sessionStorage.setItem('cw_scrollY', String(window.scrollY));
    sessionStorage.setItem('cw_crowdFilter', currentCrowdFilter || 'all');
    sessionStorage.setItem('cw_categoryFilter', currentCategoryFilter || 'all');
    const stateFilterEl = document.getElementById('stateFilter');
    if (stateFilterEl) sessionStorage.setItem('cw_stateFilter', stateFilterEl.value);
    sessionStorage.setItem('cw_returnTo', 'true');
    // Save sheet state (open or closed + scroll position)
    const sheet = document.getElementById('destinationsSheet');
    const sheetBody = document.getElementById('sheetBody');
    if (sheet && sheet.classList.contains('open')) {
        sessionStorage.setItem('cw_sheetOpen', 'true');
        if (sheetBody) sessionStorage.setItem('cw_sheetScrollY', String(sheetBody.scrollTop));
    }
    window.location.href = `destination.html?id=${destinationId}`;
}

async function showDetails(destinationId) {
    navigateToDestination(destinationId);
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

// ========== 30-DAY FORECAST ==========

let _forecast30Cache = {};

function switchForecastTab(tab, destinationId) {
    // Update tab buttons
    document.querySelectorAll('.forecast-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Show/hide content
    const todayContent = document.getElementById('forecastTabToday');
    const thirtyDayContent = document.getElementById('forecastTab30Days');

    if (tab === 'today') {
        todayContent.classList.add('active');
        thirtyDayContent.classList.remove('active');
    } else {
        todayContent.classList.remove('active');
        thirtyDayContent.classList.add('active');
        // Load 30-day forecast if not already loaded
        if (thirtyDayContent.querySelector('.forecast-loading')) {
            load30DayForecast(destinationId);
        }
    }
}

async function load30DayForecast(destinationId) {
    const container = document.getElementById('forecastTab30Days');
    try {
        const forecast = await apiService.get30DayForecast(destinationId);
        if (forecast && forecast.predictions && forecast.predictions.length > 0) {
            container.innerHTML = render30DayForecast(forecast);
        } else {
            container.innerHTML = '<div class="forecast-loading"><p>Unable to load forecast data.</p></div>';
        }
    } catch (error) {
        console.error('Error loading 30-day forecast:', error);
        container.innerHTML = '<div class="forecast-loading"><p>Error loading forecast. Please try again.</p></div>';
    }
}

function render30DayForecast(forecast) {
    const { predictions, highlights } = forecast;

    // Summary strip
    const summaryHTML = `
        <div class="fc-summary">
            <div class="fc-summary-item">
                <span class="fc-summary-emoji">🟢</span>
                <div>
                    <div class="fc-summary-label">Best Day</div>
                    <div class="fc-summary-val">${highlights.bestDay.dayShort}, ${highlights.bestDay.month} ${highlights.bestDay.dayOfMonth}</div>
                </div>
            </div>
            <div class="fc-summary-divider"></div>
            <div class="fc-summary-item">
                <span class="fc-summary-emoji">🔴</span>
                <div>
                    <div class="fc-summary-label">Busiest</div>
                    <div class="fc-summary-val">${highlights.worstDay.dayShort}, ${highlights.worstDay.month} ${highlights.worstDay.dayOfMonth}</div>
                </div>
            </div>
            <div class="fc-summary-divider"></div>
            <div class="fc-summary-item">
                <span class="fc-summary-emoji">📊</span>
                <div>
                    <div class="fc-summary-label">Low Crowd</div>
                    <div class="fc-summary-val">${highlights.lowCrowdDays} days</div>
                </div>
            </div>
        </div>
    `;

    // Holiday banner
    let holidayHTML = '';
    if (highlights.holidaysInPeriod && highlights.holidaysInPeriod.length > 0) {
        holidayHTML = `
            <div class="fc-holiday-banner">
                🎉 <strong>Upcoming:</strong> ${highlights.holidaysInPeriod.slice(0, 3).map(h => `${h.holiday.name} (${h.dayShort} ${h.dayOfMonth} ${h.month})`).join(' · ')}
            </div>
        `;
    }

    // Day cards
    const cardsHTML = predictions.map((day, idx) => {
        const scoreColor = getScoreColor(day.scores.average);
        const holidayBadge = day.holiday && day.holiday.isHoliday
            ? `<div class="fc-card-holiday">🎉 ${day.holiday.name}</div>` : '';
        const weekendBadge = day.isWeekend
            ? `<span class="fc-card-weekend-badge">Weekend</span>` : '';
        const meterHeight = Math.max(day.percentageFull, 8);

        return `
            <div class="fc-card" data-index="${idx}" style="--card-color: ${scoreColor};">
                <div class="fc-card-header">
                    <span class="fc-card-day-name">${day.dayShort}</span>
                    ${weekendBadge}
                </div>
                <div class="fc-card-date">${day.dayOfMonth} ${day.month}</div>
                <div class="fc-card-meter">
                    <div class="fc-card-meter-fill" style="height: ${meterHeight}%; background: ${scoreColor};"></div>
                </div>
                <div class="fc-card-pct">${day.percentageFull}%</div>
                <div class="fc-card-level">${day.crowdLevel.emoji} ${day.crowdLevel.label}</div>
                <div class="fc-card-times">
                    <div class="fc-card-time-item">
                        <span class="fc-card-time-label">Best</span>
                        <span class="fc-card-time-val">⏰ ${day.bestHour}</span>
                    </div>
                    <div class="fc-card-time-item">
                        <span class="fc-card-time-label">Peak</span>
                        <span class="fc-card-time-val">🔥 ${day.peakHour}</span>
                    </div>
                </div>
                ${holidayBadge}
            </div>
        `;
    }).join('');

    return `
        <div class="fc-container">
            ${summaryHTML}
            ${holidayHTML}
            <div class="fc-scroll-hint">← Swipe to explore all 30 days →</div>
            <div class="fc-cards-wrapper">
                <button class="fc-nav-btn fc-nav-prev" onclick="scrollForecastCards(-1)" aria-label="Previous">&#8249;</button>
                <div class="fc-cards-track" id="fcCardsTrack">${cardsHTML}</div>
                <button class="fc-nav-btn fc-nav-next" onclick="scrollForecastCards(1)" aria-label="Next">&#8250;</button>
            </div>
        </div>
    `;
}

function scrollForecastCards(direction) {
    const track = document.getElementById('fcCardsTrack');
    if (!track) return;
    const card = track.querySelector('.fc-card');
    const cardWidth = card ? (card.offsetWidth + 12) : 174;
    track.scrollBy({ left: direction * cardWidth * 3, behavior: 'smooth' });
}

function getScoreColor(score) {
    if (score < 0.25) return '#4ade80';
    if (score < 0.50) return '#fbbf24';
    if (score < 0.75) return '#fb923c';
    return '#ef4444';
}

function formatForecastDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// ========== UTILITY FUNCTIONS ===========
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
        statusText.textContent = '🔵 Algorithm-Based';
    }
    
    // Add click handler for modal
    indicator.onclick = showDataStatusModal;
    
    // Console log
    let statusMessage = overall === 'live' ? '🟢 Using Real-time API Data' : 
                        overall === 'partial' ? '🟡 Using Partial Real-time Data' :
                        '🟠 Using Time-Pattern Algorithm';
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
        weatherBadge.textContent = source === 'openweathermap' || source === 'backend' || source === 'weatherapi' ? 'LIVE' : 'SIMULATED';
        weatherBadge.className = 'source-badge ' + (status.weather.isLive ? 'live' : 'algorithm');
        
        if (source === 'openweathermap') {
            weatherDetail.textContent = 'Real-time weather data from OpenWeatherMap API';
        } else if (source === 'weatherapi') {
            weatherDetail.textContent = 'Real-time weather data from WeatherAPI';
        } else if (source === 'backend') {
            weatherDetail.textContent = 'Weather data from backend aggregation service';
        } else {
            weatherDetail.textContent = 'Pattern-based weather simulation for this location';
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
            qualityLabel.textContent = '100% Live Data - Maximum accuracy from real-time sources';
        } else if (status.overall === 'partial') {
            qualityLabel.textContent = 'Live weather + Smart algorithm predictions - High accuracy';
        } else {
            qualityLabel.textContent = 'Pattern-based predictions - Good baseline accuracy';
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
    _bestTimeCache.clear(); // bust cached best-time strings
    updateLastUpdatedTime();
    displayDataStatus();
    checkLocalAlerts(); // re-check saved alerts with latest crowd levels
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
        const backendUrl = API_CONFIG.BACKEND_URL || 'http://localhost:8080';
        
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

// ============================================================
// SCROLL REVEAL ANIMATION — Intersection Observer
// ============================================================
(function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    let _observeTimer = null;
    function observeElements() {
        document.querySelectorAll('.smart-feature-card, .feature-card, .destination-card').forEach(el => {
            if (!el.classList.contains('reveal-on-scroll') && !el.classList.contains('revealed')) {
                el.classList.add('reveal-on-scroll');
                observer.observe(el);
            }
        });
    }
    // Debounced version to avoid hammering the DOM on rapid filter clicks
    function scheduleObserve() {
        clearTimeout(_observeTimer);
        _observeTimer = setTimeout(observeElements, 150);
    }

    // Hook into renderDestinations + appendNextBatch
    const origRender = window.renderDestinations;
    if (typeof origRender === 'function') {
        window.renderDestinations = function() {
            origRender.apply(this, arguments);
            scheduleObserve();
        };
    }
    const origAppend = window.appendNextBatch;
    if (typeof origAppend === 'function') {
        window.appendNextBatch = function() {
            origAppend.apply(this, arguments);
            scheduleObserve();
        };
    }
    document.addEventListener('DOMContentLoaded', () => setTimeout(observeElements, 200));
    if (document.readyState !== 'loading') setTimeout(observeElements, 200);
})();
