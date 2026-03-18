const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { minify: minifyHtml } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const terser = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const GENERATE_SITEMAPS = path.join(ROOT, 'scripts', 'generate-sitemaps.js');

const ROOT_FILES = [
    'BingSiteAuth.xml',
    'og-image.jpg',
    'index.html',
    'blog.html',
    'destination.html',
    'styles.css',
    'destination-page.css',
    'script.js',
    'config.js',
    'api-service.js',
    'client-algorithm.js',
    'data.js',
    'feedback-widget.js',
    'robots.txt',
    'sitemap.xml'
];

const ROOT_DIRS = [
    'blog',
    'data',
    'js',
    'promo',
    'sitemaps',
    'destinations'
];

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.xml', '.txt']);

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    ensureDir(dirPath);
}

function copyFileSync(source, target) {
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
}

function copyDirSync(sourceDir, targetDir) {
    ensureDir(targetDir);
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(sourcePath, targetPath);
        } else if (entry.isFile()) {
            copyFileSync(sourcePath, targetPath);
        }
    }
}

function walkFiles(dirPath, collector = []) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, collector);
        } else if (entry.isFile()) {
            collector.push(fullPath);
        }
    }

    return collector;
}

function minifyXml(content) {
    return content.replace(/>\s+</g, '><').trim() + '\n';
}

function shouldObfuscate(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized === 'data.js') return false;
    if (normalized.startsWith('destinations/') || normalized.startsWith('blog/') || normalized.startsWith('promo/')) return false;
    return true;
}

async function transformFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) return;

    const relativePath = path.relative(DIST, filePath).replace(/\\/g, '/');
    const original = fs.readFileSync(filePath, 'utf8');
    let output = original;

    if (extension === '.html') {
        output = await minifyHtml(original, {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            decodeEntities: true,
            minifyCSS: true,
            minifyJS: false,
            processConditionalComments: true,
            removeAttributeQuotes: false,
            removeComments: true,
            removeEmptyAttributes: false,
            removeOptionalTags: false,
            removeRedundantAttributes: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true
        });
    } else if (extension === '.css') {
        const result = new CleanCSS({ level: 2 }).minify(original);
        if (result.errors.length) {
            throw new Error(`CSS minification failed for ${relativePath}: ${result.errors.join(', ')}`);
        }
        output = result.styles;
    } else if (extension === '.js') {
        const minified = await terser.minify(original, {
            compress: {
                passes: 2
            },
            format: {
                comments: false
            },
            mangle: true
        });

        if (!minified.code) {
            throw new Error(`JS minification failed for ${relativePath}`);
        }

        output = minified.code;

        if (shouldObfuscate(relativePath)) {
            output = JavaScriptObfuscator.obfuscate(output, {
                compact: true,
                controlFlowFlattening: false,
                deadCodeInjection: false,
                disableConsoleOutput: false,
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                selfDefending: true,
                splitStrings: false,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayEncoding: ['base64'],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayThreshold: 0.75,
                target: 'browser',
                transformObjectKeys: true,
                unicodeEscapeSequence: false
            }).getObfuscatedCode();
        }
    } else if (extension === '.xml') {
        output = minifyXml(original);
    } else if (extension === '.txt') {
        output = original.trimEnd() + '\n';
    }

    fs.writeFileSync(filePath, output, 'utf8');
}

async function main() {
    console.log('Generating prerendered pages and sitemaps...');
    execFileSync(process.execPath, [GENERATE_SITEMAPS], { cwd: ROOT, stdio: 'inherit' });

    console.log('Preparing dist directory...');
    cleanDir(DIST);

    for (const file of ROOT_FILES) {
        const sourcePath = path.join(ROOT, file);
        if (fs.existsSync(sourcePath)) {
            copyFileSync(sourcePath, path.join(DIST, file));
        }
    }

    for (const dir of ROOT_DIRS) {
        const sourcePath = path.join(ROOT, dir);
        if (fs.existsSync(sourcePath)) {
            copyDirSync(sourcePath, path.join(DIST, dir));
        }
    }

    console.log('Minifying and obfuscating frontend assets...');
    const files = walkFiles(DIST);
    for (const filePath of files) {
        await transformFile(filePath);
    }

    console.log('Frontend build complete. Output directory: dist');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
