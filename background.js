let YOUTUBE_API_KEY_CACHED = null;

async function getApiKey() {
    if (YOUTUBE_API_KEY_CACHED) return YOUTUBE_API_KEY_CACHED;
    try {
        const url = chrome.runtime.getURL('secrets.js');
        const response = await fetch(url);
        const text = await response.text();
        const match = text.match(/YOUTUBE_API_KEY\s*=\s*["']([^"']+)["']/);
        if (match && match[1]) {
            YOUTUBE_API_KEY_CACHED = match[1];
            return YOUTUBE_API_KEY_CACHED;
        }
    } catch (e) {
        console.error("Failed to load secrets.js dynamically:", e);
    }
    return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'YT_VIDEO_TRACK') {
        const { channel, category } = request.payload;
        const senderTabId = sender.tab?.id;
        
        flushTrackingSession();
        
        currentTracking = {
            channelName: channel,
            category: category,
            startTime: Date.now(),
            tabId: senderTabId
        };
        console.log(`⏱️ [Stealth Background] Tracking: ${channel} (${category}) on tab ${senderTabId}`);
        sendResponse({ success: true });
        return;
    }

    if (request.type === 'YT_VIDEO_UNTRACK') {
        flushTrackingSession();
        sendResponse({ success: true });
        return;
    }

    if (request.action === "fetchSuggestions") {
        getApiKey().then(apiKey => {
            if (!apiKey) {
                console.error("YOUTUBE_API_KEY is not defined.");
                sendResponse({ success: false, error: "API key is missing in secrets.js" });
                return;
            }

            // Querying the official YouTube v3 API for channels, max 5 matches
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(request.query)}&key=${apiKey}`;
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.items && data.items.length > 0) {
                        const channelIds = data.items.map(item => item.id?.channelId || item.snippet?.channelId).filter(Boolean).join(',');
                        if (!channelIds) {
                            sendResponse({ success: true, data: [] });
                            return;
                        }
                        
                        const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${apiKey}`;
                        fetch(detailsUrl)
                        .then(res => res.json())
                        .then(detailsData => {
                            if (detailsData.items) {
                                const richResults = detailsData.items.map(channel => ({
                                    name: channel.snippet.title,
                                    thumbnail: channel.snippet.thumbnails?.default?.url || '',
                                    handle: channel.snippet.customUrl ? channel.snippet.customUrl.replace('@', '').toLowerCase().trim() : '',
                                    channelId: channel.id
                                }));
                                sendResponse({ success: true, data: richResults });
                            } else {
                                sendResponse({ success: true, data: [] });
                            }
                        })
                        .catch(err => {
                            console.error("Channels detail fetch error:", err);
                            sendResponse({ success: false, error: err.message });
                        });
                } else {
                    sendResponse({ success: true, data: [] });
                }
            })
            .catch(error => {
                console.error("Background search fetch error:", error);
                sendResponse({ success: false, error: error.message });
            });
        }).catch(err => {
            console.error("Failed to load API key:", err);
            sendResponse({ success: false, error: err.message });
        });
            
        // Return true tells Chrome we will send the response asynchronously
        return true; 
    }

    if (request.action === "recordNuke") {
        chrome.storage.local.get(['totalNukes', 'nukeHistory'], (result) => {
            const totalNukes = (result.totalNukes || 0) + 1;
            const nukeHistory = result.nukeHistory || {};
            
            // Local date key (YYYY-MM-DD)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            nukeHistory[dateStr] = (nukeHistory[dateStr] || 0) + 1;
            
            chrome.storage.local.set({ totalNukes, nukeHistory }, () => {
                sendResponse({ success: true, totalNukes, nukeHistory });
            });
        });
        return true;
    }

    if (request.type === "WHITELIST_VIDEOS_DISPLAYED" || request.action === "WHITELIST_VIDEOS_DISPLAYED") {
        const countToAdd = request.count || 0;
        console.log("📥 [Stealth Background] Received WHITELIST_VIDEOS_DISPLAYED message, count to add:", countToAdd);
        chrome.storage.local.get(['videosDisplayed', 'totalWhitelistDisplayed', 'whitelistDisplayHistory'], (result) => {
            const currentTotal = result.videosDisplayed !== undefined ? result.videosDisplayed : (result.totalWhitelistDisplayed || 0);
            const newTotal = currentTotal + countToAdd;
            
            const whitelistHistory = result.whitelistDisplayHistory || {};
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            whitelistHistory[dateStr] = (whitelistHistory[dateStr] || 0) + countToAdd;
            
            console.log("📥 [Stealth Background] Existing total:", currentTotal, "Updating total to:", newTotal);
            chrome.storage.local.set({ 
                videosDisplayed: newTotal,
                totalWhitelistDisplayed: newTotal,
                whitelistDisplayHistory: whitelistHistory
            }, () => {
                sendResponse({ success: true, videosDisplayed: newTotal, totalWhitelistDisplayed: newTotal, whitelistDisplayHistory: whitelistHistory });
            });
        });
        return true;
    }

    if (request.action === "logWhitelistDisplayed") {
        const countToAdd = request.count || 0;
        chrome.storage.local.get(['totalWhitelistDisplayed', 'whitelistDisplayHistory'], (result) => {
            const totalWhitelist = (result.totalWhitelistDisplayed || 0) + countToAdd;
            const whitelistHistory = result.whitelistDisplayHistory || {};
            
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            whitelistHistory[dateStr] = (whitelistHistory[dateStr] || 0) + countToAdd;
            
            chrome.storage.local.set({ totalWhitelistDisplayed: totalWhitelist, whitelistDisplayHistory: whitelistHistory }, () => {
                sendResponse({ success: true, totalWhitelistDisplayed: totalWhitelist, whitelistDisplayHistory: whitelistHistory });
            });
        });
        return true;
    }

    if (request.action === "fetchLatestVideos") {
        fetchLatestVideos(request.channelHandle)
            .then(videos => {
                sendResponse({ success: true, data: videos });
            })
            .catch(err => {
                console.error("fetchLatestVideos error:", err);
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }
});

/**
 * Fetches the 10 most recent videos for a channel by handle.
 * Utilizes chrome.storage.local to cache results for up to 4 hours.
 * 
 * @param {string} channelHandle The YouTube channel handle (e.g. "@GoogleDevelopers" or "GoogleDevelopers").
 * @returns {Promise<Array>} A promise resolving to an array of structured video objects.
 */
async function fetchLatestVideos(channelHandle) {
    if (!channelHandle) {
        throw new Error("Channel handle is required");
    }

    // Normalize the handle: lowercase, trim, strip leading '@'
    const normalizedHandle = channelHandle.toLowerCase().replace('@', '').trim();
    if (!normalizedHandle) {
        throw new Error("Invalid channel handle");
    }

    const cacheKey = `latestVideos_${normalizedHandle}`;

    // Helper to get from chrome.storage.local
    const cachedData = await new Promise((resolve) => {
        chrome.storage.local.get([cacheKey], (result) => {
            resolve(result[cacheKey]);
        });
    });

    const fourHours = 4 * 60 * 60 * 1000;
    if (cachedData && cachedData.timestamp && cachedData.videos) {
        const age = Date.now() - cachedData.timestamp;
        if (age < fourHours) {
            console.log(`[fetchLatestVideos] Cache hit for handle: ${normalizedHandle}`);
            return cachedData.videos;
        }
    }

    console.log(`[fetchLatestVideos] Cache miss or expired for handle: ${normalizedHandle}. Fetching from API...`);

    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error("YOUTUBE_API_KEY is not defined in secrets.js");
    }

    // Step 1: Query channels.list (part=contentDetails) to get the uploads playlist ID
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent('@' + normalizedHandle)}&key=${apiKey}`;
    
    const channelResponse = await fetch(channelUrl);
    if (!channelResponse.ok) {
        throw new Error(`YouTube API channel request failed: ${channelResponse.statusText}`);
    }
    
    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
        throw new Error(`Channel not found for handle: ${channelHandle}`);
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
        throw new Error(`Uploads playlist not found for channel: ${channelHandle}`);
    }

    // Step 2: Query playlistItems.list (part=snippet, maxResults=10) to get the 10 most recent videos
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
    
    const playlistResponse = await fetch(playlistUrl);
    if (!playlistResponse.ok) {
        throw new Error(`YouTube API playlistItems request failed: ${playlistResponse.statusText}`);
    }

    const playlistData = await playlistResponse.json();
    const items = playlistData.items || [];

    // Structure the videos: thumbnail URL, video title, video ID, channel name
    const videos = items.map(item => {
        const snippet = item.snippet || {};
        const thumbnails = snippet.thumbnails || {};
        const thumbnailUrl = thumbnails.maxres?.url || 
                             thumbnails.high?.url || 
                             thumbnails.medium?.url || 
                             thumbnails.default?.url || 
                             '';
        
        return {
            thumbnailUrl: thumbnailUrl,
            videoTitle: snippet.title || '',
            videoId: snippet.resourceId?.videoId || '',
            channelName: snippet.channelTitle || ''
        };
    });

    // Save to cache
    const cacheValue = {
        timestamp: Date.now(),
        videos: videos
    };

    await new Promise((resolve) => {
        chrome.storage.local.set({ [cacheKey]: cacheValue }, () => {
            resolve();
        });
    });

    return videos;
}

// Time tracking state machine
let currentTracking = {
    channelName: null,
    category: null,
    startTime: null,
    tabId: null
};

function flushTrackingSession() {
    if (!currentTracking.channelName || !currentTracking.startTime) return;
    
    const durationMs = Date.now() - currentTracking.startTime;
    if (durationMs >= 1000) { // Keep track if duration >= 1 second
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const payload = {
            channelName: currentTracking.channelName,
            category: currentTracking.category,
            durationMs: durationMs,
            date: dateStr
        };
        
        console.log(`⏱️ [Stealth Background] Logging duration: ${durationMs}ms for channel ${currentTracking.channelName}`);
        
        fetch('http://localhost:5000/api/time/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("⏱️ [Stealth Background] Backend response:", data);
        })
        .catch(err => {
            console.error("⏱️ [Stealth Background] Error sending time log:", err);
        });
    }
    
    // Clear the tracking session
    currentTracking = {
        channelName: null,
        category: null,
        startTime: null,
        tabId: null
    };
}

// Track tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    if (currentTracking.tabId && activeInfo.tabId !== currentTracking.tabId) {
        flushTrackingSession();
    }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
    // Focus lost or changed - flush session
    flushTrackingSession();
});

// Track tab updates (URLs changing)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (currentTracking.tabId === tabId && changeInfo.status === 'loading') {
        flushTrackingSession();
    }
});

// Track tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    if (currentTracking.tabId === tabId) {
        flushTrackingSession();
    }
});

// Set idle check interval to 15 seconds
chrome.idle.setDetectionInterval(15);

// Track idle state changes
chrome.idle.onStateChanged.addListener((state) => {
    if (state === 'idle' || state === 'locked') {
        flushTrackingSession();
    }
});

// Periodic heartbeat sync (every 10 seconds) to push active watch slices to DB in real-time
setInterval(() => {
    if (currentTracking.channelName && currentTracking.startTime) {
        const durationMs = Date.now() - currentTracking.startTime;
        if (durationMs >= 1000) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const payload = {
                channelName: currentTracking.channelName,
                category: currentTracking.category,
                durationMs: durationMs,
                date: dateStr
            };
            
            // Advance the tracker start time to the current moment to prevent double logging
            currentTracking.startTime = Date.now();
            
            console.log(`⏱️ [Stealth Background] Heartbeat sync: logging ${durationMs}ms slice for ${currentTracking.channelName}`);
            
            fetch('http://localhost:5000/api/time/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                console.log("⏱️ [Stealth Background] Heartbeat logged successfully:", data);
            })
            .catch(err => {
                console.error("⏱️ [Stealth Background] Heartbeat sync error:", err);
            });
        }
    }
}, 10000);