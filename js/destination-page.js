(function () {
    function toSlug(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function ensureMeta(selector, attributes) {
        let element = document.head.querySelector(selector);
        if (!element) {
            element = document.createElement('meta');
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            document.head.appendChild(element);
        }
        return element;
    }

    function ensureCanonical() {
        let link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        return link;
    }

    function getDestinationPath(slug) {
        return `/destinations/${slug}/`;
    }

    function getAbsoluteUrl(path) {
        return new URL(path, window.location.origin).toString();
    }

    function findDestinationFromRoute() {
        if (window.__DESTINATION_DATA__) {
            return window.__DESTINATION_DATA__;
        }

        const params = new URLSearchParams(window.location.search);
        const destSlug = params.get('dest');
        const destIdParam = parseInt(params.get('id'), 10);
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const pathSlug = pathSegments[0] === 'destinations' && pathSegments[1] ? decodeURIComponent(pathSegments[1]) : null;

        if (pathSlug && Array.isArray(window.destinations)) {
            const byPath = window.destinations.find(destination => toSlug(destination.name) === pathSlug);
            if (byPath) return byPath;
        }

        if (destSlug && Array.isArray(window.destinations)) {
            const byQuery = window.destinations.find(destination => toSlug(destination.name) === destSlug);
            if (byQuery) return byQuery;
        }

        if (destIdParam && Array.isArray(window.destinations)) {
            const byId = window.destinations.find(destination => destination.id === destIdParam);
            if (byId) return byId;
        }

        return null;
    }

    function getCrowdLabel(level) {
        if (typeof level === 'string') {
            const labels = {
                low: '🟢 Low Crowd',
                moderate: '🟡 Moderate',
                heavy: '🟠 Heavy Crowd',
                overcrowded: '🔴 Overcrowded',
                closed: '⚫ Closed'
            };
            return labels[level] || level;
        }
        if (level <= 35) return '🟢 Low Crowd';
        if (level <= 55) return '🟡 Moderate';
        if (level <= 75) return '🟠 Heavy Crowd';
        return '🔴 Overcrowded';
    }

    function normalizeCrowdLevel(level) {
        if (typeof level === 'string') return level;
        if (level <= 35) return 'low';
        if (level <= 55) return 'moderate';
        if (level <= 75) return 'heavy';
        return 'overcrowded';
    }

    function formatCategory(category) {
        if (!category) return 'General';
        return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
    }

    function trimText(value, maxLength) {
        const normalized = String(value).replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) return normalized;

        const sliced = normalized.slice(0, Math.max(0, maxLength - 1));
        const lastSpace = sliced.lastIndexOf(' ');
        return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
    }

    function buildDestinationTitle(destination) {
        const primary = `${destination.name}, ${destination.state} Crowd Forecast & Best Time to Visit | CrowdWise India`;
        if (primary.length <= 68) return primary;

        const secondary = `${destination.name} Crowd Forecast & Best Time to Visit | CrowdWise India`;
        if (secondary.length <= 68) return secondary;

        return `${destination.name} Crowd Forecast | CrowdWise India`;
    }

    function fmtVisitors(value) {
        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (value >= 1000) return Math.round(value / 1000) + 'k';
        return value.toLocaleString();
    }

    function formatFestivalDate(dateStr) {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    function formatFestivalDateRange(startDate, endDate) {
        if (!startDate) return 'Dates to be announced';
        if (!endDate || startDate === endDate) return formatFestivalDate(startDate);

        const start = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

        if (sameMonth) {
            return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })}`;
        }

        return `${formatFestivalDate(startDate)} - ${formatFestivalDate(endDate)}`;
    }

    function formatImpactLevel(level, impact) {
        if (level) return String(level).replace(/_/g, ' ');
        if (impact >= 2.2) return 'EXTREME';
        if (impact >= 1.6) return 'VERY HIGH';
        if (impact >= 1.3) return 'HIGH';
        return 'ELEVATED';
    }

    function buildMetaDescription(destination) {
        return trimText(
            `Check live crowd levels, best time to visit, peak hours, weather, and nearby attractions for ${destination.name} in ${destination.state}, India with CrowdWise India.`,
            158
        );
    }

    function updateSeo(destination) {
        const slug = toSlug(destination.name);
        const canonicalPath = getDestinationPath(slug);
        const canonicalUrl = getAbsoluteUrl(canonicalPath);
        const description = buildMetaDescription(destination);
        const title = buildDestinationTitle(destination);

        document.title = title;
        ensureCanonical().setAttribute('href', canonicalUrl);
        ensureMeta('meta[name="title"]', { name: 'title' }).setAttribute('content', title);
        ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
        ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
        ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
        ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
        ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonicalUrl);
        ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
        ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name' }).setAttribute('content', 'CrowdWise India');
        ensureMeta('meta[property="og:locale"]', { property: 'og:locale' }).setAttribute('content', 'en_IN');
        ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', 'https://crowdwise.in/og-image.jpg');
        ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image');
        ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
        ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
        ensureMeta('meta[name="twitter:url"]', { name: 'twitter:url' }).setAttribute('content', canonicalUrl);
        ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image' }).setAttribute('content', 'https://crowdwise.in/og-image.jpg');
    }

    function createJsonLd(destination, dynamicCrowdLevel) {
        const slug = toSlug(destination.name);
        return {
            '@context': 'https://schema.org',
            '@type': 'TouristAttraction',
            name: destination.name,
            url: getAbsoluteUrl(getDestinationPath(slug)),
            description: buildMetaDescription(destination),
            address: {
                '@type': 'PostalAddress',
                addressLocality: destination.city || destination.state,
                addressRegion: destination.state,
                addressCountry: 'IN'
            },
            touristType: formatCategory(destination.category),
            additionalProperty: [
                {
                    '@type': 'PropertyValue',
                    name: 'Crowd level',
                    value: dynamicCrowdLevel
                },
                {
                    '@type': 'PropertyValue',
                    name: 'Peak hours',
                    value: destination.peakHours || 'N/A'
                },
                {
                    '@type': 'PropertyValue',
                    name: 'Best time',
                    value: destination.bestTimeToVisit || destination.bestTime || 'Year-round'
                }
            ]
        };
    }

    function upsertJsonLd(data) {
        let script = document.getElementById('destination-jsonld');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'destination-jsonld';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }

    function renderDestinationPage(destination) {
        const baseCrowdLevel = typeof destination.crowdLevel === 'number'
            ? destination.crowdLevel
            : { low: 25, moderate: 50, heavy: 70, overcrowded: 90 }[destination.crowdLevel] || 50;

        let dynamicCrowdLevel = normalizeCrowdLevel(destination.crowdLevel);
        let closedMessage = null;
        let predictedFactors = null;
        let predictedPercentage = baseCrowdLevel;

        if (window.clientCrowdAlgorithm) {
            try {
                const predicted = window.clientCrowdAlgorithm.calculateCrowdScore({
                    baseCrowdLevel,
                    category: destination.category || 'default',
                    destinationId: destination.id
                });
                if (predicted.status === 'closed') {
                    dynamicCrowdLevel = 'closed';
                    closedMessage = predicted.message || 'Currently closed';
                } else {
                    dynamicCrowdLevel = predicted.level || dynamicCrowdLevel;
                    predictedPercentage = predicted.percentageFull || predictedPercentage;
                }
                predictedFactors = predicted.factors || null;
            } catch (_) {}
        }

        updateSeo(destination);
        upsertJsonLd(createJsonLd(destination, dynamicCrowdLevel));

        function getBestTimeNow() {
            try {
                if (window.clientCrowdAlgorithm) {
                    const result = window.clientCrowdAlgorithm.getBestTimeToday(baseCrowdLevel, destination.category || 'default', destination.id);
                    if (result && result.bestTime) return result.bestTime;
                }
            } catch (_) {}
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 9) return '6:00 AM - 9:00 AM';
            if (hour < 16) return '4:00 PM - 6:00 PM';
            return '6:00 AM - 9:00 AM';
        }

        const crowdLabel = getCrowdLabel(dynamicCrowdLevel);
        const bestTime = getBestTimeNow();
        const bestTimeBadge = bestTime === 'Closed today' ? '🔒 Closed Today' : `⏰ ${bestTime}`;
        const weather = typeof destination.weather === 'object'
            ? `${destination.weather.temp}°C, ${destination.weather.condition}`
            : destination.weather || 'N/A';
        const averageVisitors = destination.avgVisitors || 5000;
        const visitorRange = `${fmtVisitors(Math.round(averageVisitors * 0.6))} – ${fmtVisitors(Math.round(averageVisitors * 1.5))}`;
        const estimateMeta = dynamicCrowdLevel === 'closed' || !window.VisitorEstimateService
            ? null
            : window.VisitorEstimateService.buildCurrentEstimate(destination, predictedPercentage);
        const estimateLabel = estimateMeta?.detailLabel || 'Typical Daily Visitors (est.)';
        const estimateValue = visitorRange;

        let confidence = 65;
        if (predictedFactors) {
            if (predictedFactors.holiday && predictedFactors.holiday !== 'None') confidence += 3;
            if (predictedFactors.festival) confidence += 2;
            if (predictedFactors.weather) confidence += 1;
        }
        if ((destination.category || 'default') !== 'default') confidence += 3;
        if (destination.openTime || destination.closeTime) confidence += 2;
        if (destination.closedOn) confidence += 2;
        confidence = Math.min(confidence, 75);

        function generateDestSparklineSVG() {
            if (!window.clientCrowdAlgorithm || dynamicCrowdLevel === 'closed') return '';
            const algorithm = window.clientCrowdAlgorithm;
            const category = destination.category || 'default';
            const hourly = algorithm.hourlyPatterns[category] || algorithm.hourlyPatterns.default;
            const now = new Date().getHours();
            const startHour = 6;
            const endHour = 22;
            const width = 120;
            const height = 28;
            const padding = 2;
            const steps = endHour - startHour;
            const points = [];
            for (let hour = startHour; hour <= endHour; hour++) {
                const x = padding + ((hour - startHour) / steps) * (width - padding * 2);
                const y = height - padding - (hourly[hour] || 0) * (height - padding * 2);
                points.push({ x, y });
            }
            const polyline = points.map(point => point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
            let nowDot = '';
            if (now >= startHour && now <= endHour) {
                const point = points[now - startHour];
                if (point) {
                    const color = dynamicCrowdLevel === 'low' ? '#22c55e' : dynamicCrowdLevel === 'moderate' ? '#eab308' : dynamicCrowdLevel === 'heavy' ? '#f97316' : '#ef4444';
                    nowDot = '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3" fill="' + color + '" stroke="white" stroke-width="1.5"/>';
                }
            }
            const fillPoints = points[0].x.toFixed(1) + ',' + height + ' ' + polyline + ' ' + points[points.length - 1].x.toFixed(1) + ',' + height;
            const tickHours = [6, 9, 12, 15, 18, 21];
            const formatHour = hour => hour === 12 ? '12pm' : hour < 12 ? hour + 'am' : (hour - 12) + 'pm';
            const tickLabels = tickHours.map(hour => {
                const leftPct = ((hour - startHour) / steps * 100).toFixed(1);
                const align = hour === startHour ? 'left' : hour === endHour ? 'right' : 'center';
                const transform = align === 'left' ? 'none' : align === 'right' ? 'translateX(-100%)' : 'translateX(-50%)';
                return '<span style="left:' + leftPct + '%;transform:' + transform + '">' + formatHour(hour) + '</span>';
            }).join('');
            return '<svg viewBox="0 0 ' + width + ' ' + height + '" class="sparkline-svg" preserveAspectRatio="none">' +
                '<defs><linearGradient id="sparkFillDest" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="var(--primary)" stop-opacity="0.15"/>' +
                '<stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02"/>' +
                '</linearGradient></defs>' +
                '<polygon points="' + fillPoints + '" fill="url(#sparkFillDest)"/>' +
                '<polyline points="' + polyline + '" fill="none" stroke="var(--primary-light)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                nowDot + '</svg>' +
                '<div class="sparkline-labels">' + tickLabels + '</div>';
        }

        const sparklineHtml = generateDestSparklineSVG();
        const nearbyHtml = destination.nearbyAttractions && destination.nearbyAttractions.length > 0
            ? destination.nearbyAttractions.map(attraction => `<span class="dest-nearby-tag">${attraction}</span>`).join('')
            : '<span class="dest-nearby-tag">No nearby attractions listed</span>';
        const alertsHtml = destination.alerts && destination.alerts.length > 0
            ? destination.alerts.map(alert => `<li>⚠️ ${alert}</li>`).join('')
            : '<li>No special alerts</li>';

        const destPage = document.getElementById('destPage');
        if (!destPage) return;

        destPage.innerHTML = `
            <a href="/" class="dest-back" onclick="if(document.referrer.includes(location.origin)){event.preventDefault();history.back();}">← Back to all destinations</a>
            <div class="dest-hero" id="destHero">
                <div class="dest-hero-img" id="destHeroImg"></div>
                <div class="dest-hero-overlay"></div>
                <div class="dest-hero-info">
                    <div class="dest-hero-name">${destination.emoji} ${destination.name}</div>
                    <div class="dest-hero-state">📍 ${destination.city && destination.city !== destination.state ? destination.city + ', ' + destination.state : destination.state}</div>
                    <div class="dest-hero-badges">
                        <span class="dest-hero-badge crowd">${crowdLabel}</span>
                        <span class="dest-hero-badge best-time">${bestTimeBadge}</span>
                    </div>
                </div>
            </div>
            <div class="dest-card">
                <div class="dest-tabs">
                    <button class="dest-tab active" id="dtab-ov" onclick="switchDestTab('overview')">📊 Overview</button>
                    <button class="dest-tab" id="dtab-cal" onclick="switchDestTab('calendar')">📅 Crowd Calendar</button>
                </div>
                <div class="dest-tab-panel active" id="dpanel-ov">
                    <div class="dest-quick-stats">
                        ${dynamicCrowdLevel === 'closed' ? `<div class="dest-stat-card"><div class="dest-stat-icon">⚫</div><div class="dest-stat-label">Status</div><div class="dest-stat-value" style="font-size:12px;color:#6b7280;">${closedMessage || 'Currently Closed'}</div></div>` : `<div class="dest-stat-card"><div class="dest-stat-icon">👥</div><div class="dest-stat-label">${estimateLabel}</div><div class="dest-stat-value" style="font-size:13px">${estimateValue}</div></div>`}
                        <div class="dest-stat-card"><div class="dest-stat-icon">🔥</div><div class="dest-stat-label">Peak Hours</div><div class="dest-stat-value">${destination.peakHours || 'N/A'}</div></div>
                        <div class="dest-stat-card"><div class="dest-stat-icon">🌡️</div><div class="dest-stat-label">Weather</div><div class="dest-stat-value">${weather}</div></div>
                        <div class="dest-stat-card"><div class="dest-stat-icon">🏷️</div><div class="dest-stat-label">Category</div><div class="dest-stat-value">${formatCategory(destination.category)}</div></div>
                    </div>
                    <div class="dest-section-title">📊 Current Status &amp; Best Time</div>
                    <div class="dest-status-row">
                        <div class="dest-status-chip"><span class="dest-status-dot status-${dynamicCrowdLevel}"></span><div><div class="dest-status-label">Now</div><div class="dest-status-val">${crowdLabel.replace(/^[\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F534}\u{26AB}\u{1F512}]\s*/u, '')}</div></div></div>
                        <div class="dest-status-divider"></div>
                        <div class="dest-status-chip"><span class="dest-status-icon">🟢</span><div><div class="dest-status-label">Best Today</div><div class="dest-status-val">${bestTime}</div></div></div>
                        <div class="dest-status-divider"></div>
                        <div class="dest-status-chip"><span class="dest-status-icon">📅</span><div><div class="dest-status-label">Best Season</div><div class="dest-status-val">${destination.bestTimeToVisit || destination.bestTime || 'Year-round'}</div></div></div>
                    </div>
                    ${sparklineHtml ? `<div class="dest-section-title">📈 Crowd Curve</div>${sparklineHtml}` : ''}
                    <div class="dest-section-title">🎯 Prediction Confidence</div>
                    <div class="dest-detail-item"><div class="dest-detail-item-label">Model Confidence</div><div class="dest-detail-item-value">${confidence}% estimated accuracy</div></div>
                    <div class="dest-section-title">⚠️ Alerts &amp; Tips</div>
                    <ul class="dest-alerts-list">${alertsHtml}</ul>
                    <div class="dest-section-title">📍 Nearby Attractions</div>
                    <div class="dest-nearby-tags">${nearbyHtml}</div>
                </div>
                <div class="dest-tab-panel" id="dpanel-cal">
                    <div id="calendarContainer"></div>
                    <div class="cal-day-detail" id="calDayDetail"></div>
                </div>
            </div>
        `;

        if (window.DestinationPhotos) {
            window.DestinationPhotos.fetchPhoto(destination.id).then(url => {
                if (url) {
                    const heroImg = document.getElementById('destHeroImg');
                    if (heroImg) heroImg.style.backgroundImage = `url('${url}')`;
                }
            });
        }

        let yearData = null;
        let currentCalMonth = new Date().getMonth();
        let currentCalYear = new Date().getFullYear();
        let selectedCalDate = null;
        let isFestivalRefreshQueued = false;

        function getYearData() {
            if (!yearData && window.clientCrowdAlgorithm && typeof window.clientCrowdAlgorithm.predictYear === 'function') {
                yearData = window.clientCrowdAlgorithm.predictYear({
                    baseCrowdLevel,
                    category: destination.category || 'default',
                    destinationId: destination.id,
                    destinationState: destination.state || null,
                    destinationName: destination.name || null
                });
            }
            return yearData;
        }

        function getFestivalScopeLabel(festival) {
            const matchType = festival?.matchType || '';
            if (matchType === 'destination') return 'Destination-specific';
            if (matchType === 'state-category') return 'Regional match';
            if (matchType === 'state') return 'Statewide travel pattern';
            return 'Relevant festival period';
        }

        function refreshFestivalCalendar() {
            yearData = null;

            if (window._cwCalendarRendered) {
                renderCalendar();
                if (selectedCalDate) {
                    const selectedCell = document.querySelector(`#calendarContainer .cal-day[data-date="${selectedCalDate}"]`);
                    if (selectedCell) {
                        window.showCalDetail(selectedCalDate, selectedCell);
                    }
                }
            }
        }

        function ensureFestivalDataReady() {
            if (isFestivalRefreshQueued || typeof FestivalService === 'undefined' || typeof FestivalService.loadFestivals !== 'function') {
                return;
            }

            isFestivalRefreshQueued = true;
            Promise.resolve(FestivalService.loadFestivals())
                .then(() => {
                    refreshFestivalCalendar();
                })
                .catch(() => {});
        }

        function colorForScore(score) {
            if (score < 0.25) return '#dcfce7';
            if (score < 0.40) return '#bbf7d0';
            if (score < 0.55) return '#fef9c3';
            if (score < 0.70) return '#fed7aa';
            if (score < 0.85) return '#fecaca';
            return '#fca5a5';
        }

        function textForScore(score) {
            if (score < 0.40) return '#166534';
            if (score < 0.55) return '#854d0e';
            if (score < 0.70) return '#9a3412';
            return '#991b1b';
        }

        function renderCalendar() {
            const data = getYearData();
            const container = document.getElementById('calendarContainer');
            if (!container) return;
            if (!data) {
                container.innerHTML = '<div class="dest-intro">Crowd calendar will load when the prediction engine is ready.</div>';
                return;
            }

            const firstOfMonth = new Date(currentCalYear, currentCalMonth, 1);
            const lastOfMonth = new Date(currentCalYear, currentCalMonth + 1, 0);
            const startDow = firstOfMonth.getDay();
            const daysInMonth = lastOfMonth.getDate();
            const monthName = firstOfMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const todayStr = new Date().toISOString().split('T')[0];

            let html = `<div class="cal-header"><div class="cal-month-nav"><button onclick="changeCalMonth(-1)" aria-label="Previous month">&#8249;</button><div class="cal-month-title">${monthName}</div><button onclick="changeCalMonth(1)" aria-label="Next month">&#8250;</button></div><div class="cal-legend"><div class="cal-legend-item"><div class="cal-legend-dot" style="background:#dcfce7;"></div> Low</div><div class="cal-legend-item"><div class="cal-legend-dot" style="background:#fef9c3;"></div> Moderate</div><div class="cal-legend-item"><div class="cal-legend-dot" style="background:#fed7aa;"></div> Heavy</div><div class="cal-legend-item"><div class="cal-legend-dot" style="background:#fca5a5;"></div> Packed</div><div class="cal-legend-item cal-legend-note">🎊 Festival</div><div class="cal-legend-item cal-legend-note">🎉 Holiday</div></div></div><div class="cal-grid">`;
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => { html += `<div class="cal-day-header">${day}</div>`; });
            for (let index = 0; index < startDow; index++) html += '<div class="cal-day empty"></div>';
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const info = data[dateStr];
                const isToday = dateStr === todayStr;
                if (info) {
                    const bg = colorForScore(info.score);
                    const fg = textForScore(info.score);
                    const festivalMarker = info.festival ? '<span class="cal-day-marker festival">🎊</span>' : '';
                    const holidayMarker = info.holiday ? '<span class="cal-day-marker holiday">🎉</span>' : '';
                    html += `<div class="cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}" style="background:${bg}; color:${fg};" onclick="showCalDetail('${dateStr}', this)"><span class="cal-day-markers">${festivalMarker}${holidayMarker}</span><span class="cal-day-num">${day}</span><span class="cal-day-pct">${info.percentFull}%</span></div>`;
                } else {
                    html += `<div class="cal-day empty" style="background:#f9fafb; color:#d1d5db;"><span class="cal-day-num">${day}</span></div>`;
                }
            }
            html += '</div>';
            container.innerHTML = html;
        }

        window.changeCalMonth = function (dir) {
            currentCalMonth += dir;
            if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
            if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }

            const now = new Date();
            const minDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);
            const currentDate = new Date(currentCalYear, currentCalMonth, 1);
            if (currentDate < minDate) { currentCalMonth = minDate.getMonth(); currentCalYear = minDate.getFullYear(); }
            if (currentDate > maxDate) { currentCalMonth = maxDate.getMonth(); currentCalYear = maxDate.getFullYear(); }
            renderCalendar();
        };

        window.showCalDetail = function (dateStr, cell) {
            const data = getYearData();
            if (!data) return;
            const info = data[dateStr];
            if (!info) return;
            selectedCalDate = dateStr;
            document.querySelectorAll('#calendarContainer .cal-day.selected').forEach(element => element.classList.remove('selected'));
            if (cell) cell.classList.add('selected');
            const card = document.getElementById('calDayDetail');
            if (!card) return;
            const date = new Date(dateStr + 'T12:00:00');
            const dayName = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const dayType = info.isWeekend ? 'Weekend' : 'Weekday';
            const festivalNames = info.festival ? info.festival.festivals.map(festival => festival.name).join(', ') : '';
            const festivalImpact = info.festival ? `${formatImpactLevel(info.festival.festivals[0]?.impactLevel, info.festival.impact)} (${info.festival.impact}x)` : '';
            const festivalScope = info.festival ? (info.festival.matchLabel || getFestivalScopeLabel(info.festival.festivals[0])) : '';
            card.innerHTML = `<div class="cal-day-detail-date">📅 ${dayName}</div><div class="cal-day-detail-row"><span>Crowd Level</span><span>${info.emoji} ${info.label}</span></div><div class="cal-day-detail-row"><span>Expected Fill</span><span>${info.percentFull}% full</span></div><div class="cal-day-detail-row"><span>Day Type</span><span>${dayType}</span></div>${info.festival ? `<div class="cal-day-detail-row"><span>🎊 Festival</span><span>${festivalNames}</span></div><div class="cal-day-detail-row"><span>Festival Scope</span><span>${festivalScope}</span></div><div class="cal-day-detail-row"><span>Festival Impact</span><span>${festivalImpact}</span></div>` : ''}${info.holiday ? `<div class="cal-day-detail-row"><span>🎉 Holiday</span><span>${info.holiday}</span></div>` : ''}`;
            card.classList.add('show');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };

        window.switchDestTab = function (tab) {
            const isCalendar = tab === 'calendar';
            const overviewTab = document.getElementById('dtab-ov');
            const calendarTab = document.getElementById('dtab-cal');
            const overviewPanel = document.getElementById('dpanel-ov');
            const calendarPanel = document.getElementById('dpanel-cal');
            if (!overviewTab || !calendarTab || !overviewPanel || !calendarPanel) return;
            overviewTab.classList.toggle('active', !isCalendar);
            calendarTab.classList.toggle('active', isCalendar);
            overviewPanel.classList.toggle('active', !isCalendar);
            calendarPanel.classList.toggle('active', isCalendar);
            if (isCalendar && !window._cwCalendarRendered) {
                window._cwCalendarRendered = true;
                renderCalendar();
            }
        };

        ensureFestivalDataReady();
    }

    function init() {
        const destination = findDestinationFromRoute();
        if (!destination) {
            window.location.href = '/';
            return;
        }
        renderDestinationPage(destination);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
