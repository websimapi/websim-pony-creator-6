import { processBasePony, preloadImage } from './image-utils.js';
import { setupPaletteInteractions, setupStageInteractions } from './interaction-handlers.js';
import { clearAll, adjustZForSelected, flipSelected, replaceFirstItemOfType, spawnItem, STAGE, repositionWings, logCalibrationData } from './stage-manager.js';
import { state } from './state.js';
// ... existing code ...

// Setup Delete Zone
const DELETE_ZONE = document.createElement('div');
DELETE_ZONE.id = 'delete-zone';
// ... existing code ...

// Simple preloader overlay
function createPreloaderOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'preloader-overlay';
    overlay.innerHTML = `
        <div class="preloader-inner">
            <div class="preloader-spinner"></div>
            <div class="preloader-text">Loading ponies...</div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

async function preloadAssets() {
    const srcSet = new Set();

    // Palette images
    document.querySelectorAll('.palette-item').forEach(img => {
        if (img.src) srcSet.add(img.src);
    });

    // Base pony variants referenced directly by file path (in case not in DOM yet)
    const baseSources = [
        '/base_pony_white.png',
        '/base-pony.jpeg',
        '/base_pony_pink.png',
        '/base_pony_blue.png',
        '/base_pony_purple.png',
        '/base_pony_yellow.png',
        '/base_pony_sketch.png'
    ];
    baseSources.forEach(src => srcSet.add(new URL(src, window.location.origin).toString()));

    const tasks = [];
    srcSet.forEach(src => {
        tasks.push(
            Promise.all([
                preloadImage(src),
                // Prepare hitmap for precise hit-testing / snapping
                // This is fast once the image is loaded.
                (async () => {
                    try {
                        const { prepareHitmap } = await import('./image-utils.js');
                        await prepareHitmap(src);
                    } catch (e) {
                        console.warn('Hitmap preload failed for', src, e);
                    }
                })()
            ])
        );
    });

    await Promise.all(tasks);
}

// Initialize
async function init() {
    const ponyImg = document.getElementById('base-pony');

    const loadBase = async (src) => {
        state.currentBasePonySrc = src;
        try {
            const processedPonyUrl = await processBasePony(src);
            ponyImg.src = processedPonyUrl;
            // Recalculate wing positions for new base
            await repositionWings(processedPonyUrl);
        } catch (e) {
            console.error('Pony processing failed, using original image:', e);
            ponyImg.src = src;
            await repositionWings(src);
        }
    };

    // Preloader overlay + asset prefetch
    const overlay = createPreloaderOverlay();
    try {
        await preloadAssets();
    } finally {
        if (overlay && overlay.parentNode) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 250);
        }
    }

    // Initial load
    await loadBase(BASE_PONY_SRC);

    // Setup interactions for drag/drop items
    setupPaletteInteractions();
    setupStageInteractions();

// Cache for per-pixel hit-testing
const imageHitmapCache = new Map();

import { state } from './state.js';

export function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

export function processBasePony(src) {

