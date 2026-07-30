console.log("🚨 [Stealth Blocker] SCRIPT INJECTED SUCCESSFULLY!");

let blockedHandles = new Set();
let blockedNames = new Set();
let loggedThisSession = false;

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

// Inject custom whitelisted feed stylesheet
const stylesInject = `
#stealth-whitelisted-feed {
  padding: 30px 10px;
  font-family: Roboto, Arial, sans-serif;
  color: var(--yt-spec-text-primary, #fff);
  max-width: 100%;
  margin: 0 auto;
  min-height: 200px;
}
.stealth-feed-header {
  margin-bottom: 24px;
}
.stealth-feed-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--yt-spec-text-primary, #fff);
  margin: 0 0 6px 0;
}
.stealth-feed-header p.subtitle {
  font-size: 14px;
  color: var(--yt-spec-text-secondary, #aaa);
  margin: 0;
}
.stealth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px 16px;
}
.stealth-card {
  background: transparent;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}
.stealth-card:hover {
  transform: scale(1.02);
}
.stealth-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.stealth-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stealth-info {
  padding: 12px 4px 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stealth-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  max-height: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--yt-spec-text-primary, #fff);
}
.stealth-channel {
  font-size: 12px;
  color: var(--yt-spec-text-secondary, #aaa);
  font-weight: 400;
}
.stealth-loading, .stealth-empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 24px;
  color: var(--yt-spec-text-secondary, #aaa);
  background: var(--yt-spec-raised-background, rgba(255, 255, 255, 0.03));
  border: 1px dashed var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.1));
  border-radius: 16px;
}
`;

const styleEl = document.createElement('style');
styleEl.id = 'stealth-feed-styles';
styleEl.textContent = stylesInject;
document.head ? document.head.appendChild(styleEl) : document.documentElement.appendChild(styleEl);

// Renders whitelisted videos inside the container
function renderWhitelistedFeed(container) {
    container.innerHTML = `
        <div class="stealth-feed-header">
            <h2>🌱 Productive Focus Feed</h2>
            <p class="subtitle">Showing the latest 10 videos from your whitelisted channels.</p>
        </div>
        <div class="stealth-grid" id="stealth-grid-content">
            <div class="stealth-loading">Loading whitelisted channels...</div>
        </div>
    `;

    chrome.storage.local.get(['whitelistedChannels'], async (result) => {
        const whitelisted = result.whitelistedChannels || [];
        const gridContent = document.getElementById('stealth-grid-content');
        
        if (whitelisted.length === 0) {
            if (gridContent) {
                gridContent.innerHTML = `
                    <div class="stealth-empty-state">
                        <span style="font-size: 32px; margin-bottom: 12px; display: block;">🕊️</span>
                        <p style="margin: 0; font-size: 14px; font-weight: 500;">Your focus feed is clear.</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--yt-spec-text-secondary, #aaa);">Add productive channels in the YT Stealth Extension to see their content here.</p>
                    </div>
                `;
            }
            return;
        }

        // Fetch videos for each whitelisted channel
        let allVideos = [];
        const fetchPromises = whitelisted.map(async (channel) => {
            const handle = typeof channel === 'string' ? channel.toLowerCase().replace('@', '').trim() : (channel.handle || '');
            if (!handle) return;
            
            const cacheKey = `latestVideos_${handle}`;
            const cached = await new Promise((resolve) => {
                chrome.storage.local.get([cacheKey], (res) => resolve(res[cacheKey]));
            });

            const fourHours = 4 * 60 * 60 * 1000;
            if (cached && cached.timestamp && cached.videos && (Date.now() - cached.timestamp < fourHours)) {
                allVideos.push(...cached.videos);
            } else {
                try {
                    const response = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: 'fetchLatestVideos', channelHandle: handle }, (res) => resolve(res));
                    });
                    if (response && response.success && response.data) {
                        allVideos.push(...response.data);
                    } else if (cached && cached.videos) {
                        allVideos.push(...cached.videos);
                    }
                } catch (err) {
                    console.error("Failed to fetch fresh videos for whitelisted channel:", handle, err);
                    if (cached && cached.videos) {
                        allVideos.push(...cached.videos);
                    }
                }
            }
        });

        await Promise.all(fetchPromises);

        // Interleave videos across different channels for a balanced grid layout
        const videosByChannel = {};
        whitelisted.forEach(ch => {
            const name = typeof ch === 'string' ? ch : ch.name;
            videosByChannel[name] = [];
        });
        
        allVideos.forEach(vid => {
            if (videosByChannel[vid.channelName]) {
                videosByChannel[vid.channelName].push(vid);
            } else {
                videosByChannel[vid.channelName] = [vid];
            }
        });

        const interleavedVideos = [];
        let maxLen = 0;
        Object.values(videosByChannel).forEach(list => {
            if (list.length > maxLen) maxLen = list.length;
        });

        for (let i = 0; i < maxLen; i++) {
            Object.keys(videosByChannel).forEach(name => {
                if (videosByChannel[name][i]) {
                    interleavedVideos.push(videosByChannel[name][i]);
                }
            });
        }

        if (gridContent) {
            if (interleavedVideos.length === 0) {
                gridContent.innerHTML = `
                    <div class="stealth-empty-state">
                        <p style="margin: 0; font-size: 14px;">No videos found.</p>
                    </div>
                `;
            } else {
                gridContent.innerHTML = interleavedVideos.map(vid => `
                    <a class="stealth-card" href="/watch?v=${vid.videoId}">
                        <div class="stealth-thumbnail-wrapper">
                            <img class="stealth-thumbnail" src="${vid.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop'}" alt="${vid.videoTitle}">
                        </div>
                        <div class="stealth-info">
                            <span class="stealth-title" title="${vid.videoTitle}">${vid.videoTitle}</span>
                            <span class="stealth-channel">${vid.channelName}</span>
                        </div>
                    </a>
                `).join('');

                // Log the displayed videos count to extension storage
                if (!loggedThisSession) {
                    loggedThisSession = true;
                    console.log("📤 [Stealth Content] Sending WHITELIST_VIDEOS_DISPLAYED message, count:", interleavedVideos.length);
                    chrome.runtime.sendMessage({ 
                        type: 'WHITELIST_VIDEOS_DISPLAYED', 
                        action: 'WHITELIST_VIDEOS_DISPLAYED',
                        count: interleavedVideos.length 
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log("❌ [Stealth Content] Error sending WHITELIST_VIDEOS_DISPLAYED message:", chrome.runtime.lastError.message);
                        } else {
                            console.log("✅ [Stealth Content] Logged whitelisted videos display count successfully:", response);
                        }
                    });
                }
            }
        }
    });
}

// Injects the custom focus feed onto the homepage
function injectWhitelistedFeed() {
    const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    
    if (isHomepage) {
        const targetGrid = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
        if (targetGrid) {
            let feedContainer = document.getElementById('stealth-whitelisted-feed');
            if (!feedContainer) {
                feedContainer = document.createElement('div');
                feedContainer.id = 'stealth-whitelisted-feed';
                targetGrid.parentNode.insertBefore(feedContainer, targetGrid);
                renderWhitelistedFeed(feedContainer);
            }
        }
    } else {
        const feedContainer = document.getElementById('stealth-whitelisted-feed');
        if (feedContainer) {
            feedContainer.remove();
        }
    }
}

// Watch for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.blockedChannels) {
            updateBlockedLists(changes.blockedChannels.newValue || []);
            console.log("🔄 [Stealth Blocker] Targets updated from storage");
            nukeBlockedChannels();
        }
        if (changes.whitelistedChannels) {
            const feed = document.getElementById('stealth-whitelisted-feed');
            if (feed) {
                renderWhitelistedFeed(feed);
            }
        }
    }
});

// Fetch initial blocked list from storage
chrome.storage.local.get(['blockedChannels'], (result) => {
    console.log("📦 [Stealth Blocker] Raw Storage Data on load:", result);
    if (result.blockedChannels) {
        updateBlockedLists(result.blockedChannels);
        nukeBlockedChannels();
    } else {
        console.log("⚠️ [Stealth Blocker] Storage is empty or undefined!");
    }
    injectWhitelistedFeed();
});

// Throttle MutationObserver execution with requestAnimationFrame
let rafId = null;
const observer = new MutationObserver(() => {
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            nukeBlockedChannels();
            injectWhitelistedFeed();
            rafId = null;
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log("👀 [Stealth Blocker] DOM Observer Active with rAF throttling...");