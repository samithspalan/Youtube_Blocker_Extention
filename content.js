console.log("🚨 [Stealth Blocker] SCRIPT INJECTED SUCCESSFULLY!");

let blockedHandles = new Set();
let blockedNames = new Set();

// Helper to normalize and update internal blocked sets
function updateBlockedLists(rawChannels) {
    blockedHandles.clear();
    blockedNames.clear();
    
    if (!rawChannels || !Array.isArray(rawChannels)) return;
    
    rawChannels.forEach(c => {
        if (!c) return;
        if (typeof c === 'string') {
            const normalized = c.toLowerCase().replace('@', '').trim();
            if (normalized) {
                blockedHandles.add(normalized);
                blockedNames.add(normalized);
            }
        } else {
            const handle = (c.handle || '').toLowerCase().replace('@', '').trim();
            const name = (c.name || '').toLowerCase().trim();
            if (handle) {
                blockedHandles.add(handle);
            }
            if (name) {
                blockedNames.add(name);
            }
        }
    });
    console.log("🎯 [Stealth Blocker] Normalized Handles:", Array.from(blockedHandles));
    console.log("🎯 [Stealth Blocker] Normalized Names:", Array.from(blockedNames));
}

// Fetch initial blocked list from storage
chrome.storage.local.get(['blockedChannels'], (result) => {
    console.log("📦 [Stealth Blocker] Raw Storage Data on load:", result);
    if (result.blockedChannels) {
        updateBlockedLists(result.blockedChannels);
        nukeBlockedChannels();
    } else {
        console.log("⚠️ [Stealth Blocker] Storage is empty or undefined!");
    }
});

// Watch for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedChannels) {
        updateBlockedLists(changes.blockedChannels.newValue || []);
        console.log("🔄 [Stealth Blocker] Targets updated from storage");
        nukeBlockedChannels();
    }
});

// Main function to scan and remove elements belonging to blocked channels
function nukeBlockedChannels() {
    if (blockedHandles.size === 0 && blockedNames.size === 0) return;

    // Component selectors target various video containers, profile cards, and shelves across YouTube:
    // ytd-rich-item-renderer: Home feed grid items
    // ytd-video-renderer: Search results list
    // ytd-grid-video-renderer: Channel pages grid items
    // ytd-compact-video-renderer: Sidebar recommendations
    // ytd-reel-item-renderer: Shorts shelf items
    // ytd-channel-renderer: Channel profile cards / search result headers
    // ytd-shelf-renderer: Entire channel shelf carousels/lists
    const selectors = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-reel-item-renderer',
        'ytd-channel-renderer',
        'ytd-shelf-renderer'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(el => {
        let shouldNuke = false;
        let matchedTarget = null;

        // Scoping logic for shelves to avoid nuking a general shelf (e.g. "Trending", "News")
        // because of a single blocked channel video inside it. Instead, we only check the shelf's title/header.
        let checkScope = el;
        if (el.tagName.toLowerCase() === 'ytd-shelf-renderer') {
            const header = el.querySelector('#header, #title-container, #title, ytd-theme-supplemented-renderer-header-layout, h2, #title-text, .ytd-shelf-renderer header, .ytd-shelf-renderer #header');
            if (header) {
                checkScope = header;
            }
        }

        // 1. Check anchor elements containing handles within checkScope
        const links = checkScope.querySelectorAll('a[href*="@"]');
        for (const link of links) {
            const href = link.getAttribute('href') || '';
            const handleMatch = href.match(/@([^\/\?]+)/);
            if (handleMatch && handleMatch[1]) {
                const handle = handleMatch[1].toLowerCase().trim();
                if (blockedHandles.has(handle)) {
                    shouldNuke = true;
                    matchedTarget = handle;
                    break;
                }
            }

            // Also check link text content for channel names or handles
            const linkText = link.textContent || '';
            const normalizedText = linkText.toLowerCase().replace('@', '').trim();
            if (normalizedText && (blockedNames.has(normalizedText) || blockedHandles.has(normalizedText))) {
                shouldNuke = true;
                matchedTarget = normalizedText;
                break;
            }
        }

        // 2. Fallback: check visible text/title in common channel name selectors within checkScope
        if (!shouldNuke) {
            const nameElements = checkScope.querySelectorAll('#channel-name, .ytd-channel-name, #byline, [id*="channel-name"]');
            for (const nameEl of nameElements) {
                const text = nameEl.textContent || '';
                const normalizedText = text.toLowerCase().replace('@', '').trim();
                if (normalizedText && (blockedNames.has(normalizedText) || blockedHandles.has(normalizedText))) {
                    shouldNuke = true;
                    matchedTarget = normalizedText;
                    break;
                }

                const title = nameEl.getAttribute('title') || '';
                const normalizedTitle = title.toLowerCase().replace('@', '').trim();
                if (normalizedTitle && (blockedNames.has(normalizedTitle) || blockedHandles.has(normalizedTitle))) {
                    shouldNuke = true;
                    matchedTarget = normalizedTitle;
                    break;
                }
            }
        }

        // Destructive removal
        if (shouldNuke) {
            console.log(`💥 [Stealth Blocker] NUKING VIDEO/ELEMENT FROM: ${matchedTarget}`);
            el.remove();
            try {
                chrome.runtime.sendMessage({ action: 'recordNuke', handle: matchedTarget });
            } catch (err) {
                // Ignore runtime errors if background context is invalidated
            }
        }
    });
}

// Throttle MutationObserver execution with requestAnimationFrame
let rafId = null;
const observer = new MutationObserver(() => {
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            nukeBlockedChannels();
            rafId = null;
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log("👀 [Stealth Blocker] DOM Observer Active with rAF throttling...");