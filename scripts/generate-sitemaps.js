const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://crowdwise.in';
const DATA_FILE = path.join(ROOT, 'data.js');
const DESTINATION_PAGE_FILE = path.join(ROOT, 'destination.html');
const BLOG_DIR = path.join(ROOT, 'blog');
const SITEMAP_DIR = path.join(ROOT, 'sitemaps');
const DESTINATION_SITEMAP_DIR = path.join(SITEMAP_DIR, 'destinations');
const DESTINATIONS_DIR = path.join(ROOT, 'destinations');
const CHUNK_SIZE = 250;

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function xmlEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function htmlEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function getFileDate(filePath) {
    return formatDate(fs.statSync(filePath).mtime);
}

function loadDestinations() {
    const source = fs.readFileSync(DATA_FILE, 'utf8');
    const context = {};

    vm.createContext(context);
    vm.runInContext(`${source}\nthis.__destinations = destinations;`, context);

    if (!Array.isArray(context.__destinations)) {
        throw new Error('Unable to load destinations from data.js');
    }

    return context.__destinations;
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
    const parts = [
        '    <url>',
        `        <loc>${xmlEscape(loc)}</loc>`,
        `        <lastmod>${lastmod}</lastmod>`
    ];

    if (changefreq) {
        parts.push(`        <changefreq>${changefreq}</changefreq>`);
    }

    if (typeof priority === 'number') {
        parts.push(`        <priority>${priority.toFixed(2)}</priority>`);
    }

    parts.push('    </url>');
    return parts.join('\n');
}

function buildUrlSet(entries) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        entries.join('\n'),
        '</urlset>',
        ''
    ].join('\n');
}

function buildSitemapIndex(entries) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.map(({ loc, lastmod }) => [
            '    <sitemap>',
            `        <loc>${xmlEscape(loc)}</loc>`,
            `        <lastmod>${lastmod}</lastmod>`,
            '    </sitemap>'
        ].join('\n')),
        '</sitemapindex>',
        ''
    ].join('\n');
}

function getDestinationPriority(avgVisitors) {
    if (avgVisitors >= 50000) return 0.85;
    if (avgVisitors >= 25000) return 0.80;
    if (avgVisitors >= 10000) return 0.75;
    if (avgVisitors >= 5000) return 0.70;
    return 0.65;
}

function getBlogPages() {
    const files = fs.readdirSync(BLOG_DIR)
        .filter(file => file.endsWith('.html'))
        .sort((a, b) => a.localeCompare(b));

    return files.map(file => {
        const cleanPath = `/blog/${file.replace(/\.html$/, '')}`;
        return {
            loc: `${BASE_URL}${cleanPath}`,
            lastmod: getFileDate(path.join(BLOG_DIR, file)),
            changefreq: 'monthly',
            priority: 0.72
        };
    });
}

function chunk(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

function formatCategory(category) {
    if (!category) return 'General';
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

function buildMetaDescription(destination) {
    return `Live crowd forecast for ${destination.name} in ${destination.state}. Check best time to visit, peak hours, crowd level, nearby attractions, and plan a smarter trip with CrowdWise India.`
        .slice(0, 158);
}

function buildWeather(destination) {
    if (typeof destination.weather === 'object' && destination.weather) {
        return `${destination.weather.temp}°C, ${destination.weather.condition}`;
    }
    return destination.weather || 'N/A';
}

function fmtVisitors(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1000) return Math.round(value / 1000) + 'k';
    return value.toLocaleString();
}

function buildStaticDestinationMarkup(destination) {
    const visitorBase = Number(destination.avgVisitors) || 5000;
    const visitorRange = `${fmtVisitors(Math.round(visitorBase * 0.6))} – ${fmtVisitors(Math.round(visitorBase * 1.5))}`;
    const nearby = Array.isArray(destination.nearbyAttractions) && destination.nearbyAttractions.length
        ? destination.nearbyAttractions.map(item => `<span class="dest-nearby-tag">${htmlEscape(item)}</span>`).join('')
        : '<span class="dest-nearby-tag">No nearby attractions listed</span>';
    const alerts = Array.isArray(destination.alerts) && destination.alerts.length
        ? destination.alerts.map(item => `<li>⚠️ ${htmlEscape(item)}</li>`).join('')
        : '<li>No special alerts</li>';

    return `
    <a href="/" class="dest-back">← Back to all destinations</a>
    <div class="dest-hero">
        <div class="dest-hero-overlay"></div>
        <div class="dest-hero-info">
            <div class="dest-hero-name">${htmlEscape(destination.emoji || '📍')} ${htmlEscape(destination.name)}</div>
            <div class="dest-hero-state">📍 ${htmlEscape(destination.city && destination.city !== destination.state ? `${destination.city}, ${destination.state}` : destination.state)}</div>
            <div class="dest-hero-badges">
                <span class="dest-hero-badge crowd">Live crowd forecast</span>
                <span class="dest-hero-badge best-time">Best season: ${htmlEscape(destination.bestTimeToVisit || destination.bestTime || 'Year-round')}</span>
            </div>
        </div>
    </div>
    <div class="dest-card">
        <div class="dest-tabs">
            <button class="dest-tab active" type="button">📊 Overview</button>
            <button class="dest-tab" type="button">📅 Crowd Calendar</button>
        </div>
        <div class="dest-tab-panel active">
            <div class="dest-intro">
                CrowdWise India predicts live crowd conditions for <strong>${htmlEscape(destination.name)}</strong> using day-of-week, seasonal, holiday, and category-specific travel patterns. This pre-rendered page gives search engines and visitors immediate destination details before live crowd enhancements load.
            </div>
            <div class="dest-quick-stats">
                <div class="dest-stat-card"><div class="dest-stat-icon">👥</div><div class="dest-stat-label">Daily Visitors</div><div class="dest-stat-value">${htmlEscape(visitorRange)}</div></div>
                <div class="dest-stat-card"><div class="dest-stat-icon">🔥</div><div class="dest-stat-label">Peak Hours</div><div class="dest-stat-value">${htmlEscape(destination.peakHours || 'N/A')}</div></div>
                <div class="dest-stat-card"><div class="dest-stat-icon">🌡️</div><div class="dest-stat-label">Weather</div><div class="dest-stat-value">${htmlEscape(buildWeather(destination))}</div></div>
                <div class="dest-stat-card"><div class="dest-stat-icon">🏷️</div><div class="dest-stat-label">Category</div><div class="dest-stat-value">${htmlEscape(formatCategory(destination.category))}</div></div>
            </div>
            <div class="dest-section-title">📍 Nearby Attractions</div>
            <div class="dest-nearby-tags">${nearby}</div>
            <div class="dest-section-title">⚠️ Alerts &amp; Tips</div>
            <ul class="dest-alerts-list">${alerts}</ul>
        </div>
    </div>`;
}

function buildDestinationJsonLd(destination, destinationUrl, description) {
    return {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: destination.name,
        url: destinationUrl,
        description,
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

function buildPrerenderedDestinationPage(destination) {
    const slug = toSlug(destination.name);
    const destinationPath = `/destinations/${slug}/`;
    const destinationUrl = `${BASE_URL}${destinationPath}`;
    const title = `${destination.name} Crowd Forecast & Best Time to Visit | CrowdWise India`;
    const description = buildMetaDescription(destination);
    const jsonLd = JSON.stringify(buildDestinationJsonLd(destination, destinationUrl, description)).replace(/</g, '\\u003c');
    const preloadedData = JSON.stringify(destination).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>${htmlEscape(title)}</title>
    <meta name="description" content="${htmlEscape(description)}">
    <link rel="canonical" href="${htmlEscape(destinationUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${htmlEscape(title)}">
    <meta property="og:description" content="${htmlEscape(description)}">
    <meta property="og:url" content="${htmlEscape(destinationUrl)}">
    <meta name="twitter:title" content="${htmlEscape(title)}">
    <meta name="twitter:description" content="${htmlEscape(description)}">
    <link rel="stylesheet" href="../../styles.css?v=5.0">
    <link rel="stylesheet" href="../../destination-page.css?v=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
    <div class="dest-page" id="destPage">${buildStaticDestinationMarkup(destination)}</div>
    <script>window.__DESTINATION_DATA__ = ${preloadedData};</script>
    <script src="../../config.js"></script>
    <script src="../../data.js"></script>
    <script src="../../js/festival-service.js"></script>
    <script src="../../js/weather-service.js"></script>
    <script src="../../js/accuracy-tracker.js"></script>
    <script src="../../js/destination-photos.js"></script>
    <script src="../../js/gamification/points-engine.js"></script>
    <script src="../../js/gamification/badge-system.js"></script>
    <script src="../../api-service.js"></script>
    <script src="../../client-algorithm.js?v=3.0"></script>
    <script src="../../js/destination-page.js?v=1.0"></script>
</body>
</html>
`;
}

function generateDestinationPages(destinations) {
    ensureDir(DESTINATIONS_DIR);

    destinations.forEach(destination => {
        const slug = toSlug(destination.name);
        const directory = path.join(DESTINATIONS_DIR, slug);
        ensureDir(directory);
        writeFile(path.join(directory, 'index.html'), buildPrerenderedDestinationPage(destination));
    });
}

function main() {
    ensureDir(SITEMAP_DIR);
    ensureDir(DESTINATION_SITEMAP_DIR);

    const destinations = loadDestinations()
        .slice()
        .sort((left, right) => {
            const byState = left.state.localeCompare(right.state);
            if (byState !== 0) return byState;
            return left.name.localeCompare(right.name);
        });

    generateDestinationPages(destinations);

    const destinationLastMod = formatDate(new Date(Math.max(
        fs.statSync(DATA_FILE).mtimeMs,
        fs.statSync(DESTINATION_PAGE_FILE).mtimeMs
    )));

    const pageEntries = [
        {
            loc: `${BASE_URL}/`,
            lastmod: getFileDate(path.join(ROOT, 'index.html')),
            changefreq: 'daily',
            priority: 1.0
        },
        {
            loc: `${BASE_URL}/blog.html`,
            lastmod: getFileDate(path.join(ROOT, 'blog.html')),
            changefreq: 'weekly',
            priority: 0.9
        }
    ];

    writeFile(
        path.join(SITEMAP_DIR, 'sitemap-pages.xml'),
        buildUrlSet(pageEntries.map(buildUrlEntry))
    );

    const blogEntries = getBlogPages();
    writeFile(
        path.join(SITEMAP_DIR, 'sitemap-blog.xml'),
        buildUrlSet(blogEntries.map(buildUrlEntry))
    );

    const destinationEntries = destinations.map(destination => buildUrlEntry({
        loc: `${BASE_URL}/destinations/${toSlug(destination.name)}/`,
        lastmod: destinationLastMod,
        changefreq: 'weekly',
        priority: getDestinationPriority(Number(destination.avgVisitors) || 0)
    }));

    const destinationChunks = chunk(destinationEntries, CHUNK_SIZE);
    const indexEntries = [
        {
            loc: `${BASE_URL}/sitemaps/sitemap-pages.xml`,
            lastmod: getFileDate(path.join(SITEMAP_DIR, 'sitemap-pages.xml'))
        },
        {
            loc: `${BASE_URL}/sitemaps/sitemap-blog.xml`,
            lastmod: getFileDate(path.join(SITEMAP_DIR, 'sitemap-blog.xml'))
        }
    ];

    destinationChunks.forEach((entries, chunkIndex) => {
        const fileName = `sitemap-destinations-${String(chunkIndex + 1).padStart(2, '0')}.xml`;
        const relativePath = path.join('sitemaps', 'destinations', fileName).replace(/\\/g, '/');
        const absolutePath = path.join(ROOT, relativePath);

        writeFile(absolutePath, buildUrlSet(entries));

        indexEntries.push({
            loc: `${BASE_URL}/${relativePath}`,
            lastmod: getFileDate(absolutePath)
        });
    });

    writeFile(path.join(ROOT, 'sitemap.xml'), buildSitemapIndex(indexEntries));

    console.log(`Generated ${destinations.length} prerendered destination pages.`);
    console.log(`Generated ${destinationChunks.length} destination sitemap files for ${destinations.length} destinations.`);
}

main();
