// Load gitignored secrets (contains YOUTUBE_API_KEY)
try {
    importScripts('./secrets.js');
} catch (e) {
    console.error("Failed to load secrets.js. Make sure it exists at the extension root.", e);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchSuggestions") {
        if (typeof YOUTUBE_API_KEY === 'undefined' || !YOUTUBE_API_KEY) {
            console.error("YOUTUBE_API_KEY is not defined.");
            sendResponse({ success: false, error: "API key is missing in secrets.js" });
            return;
        }

        // Querying the official YouTube v3 API for channels, max 5 matches
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(request.query)}&key=${YOUTUBE_API_KEY}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.items && data.items.length > 0) {
                    const channelIds = data.items.map(item => item.id?.channelId || item.snippet?.channelId).filter(Boolean).join(',');
                    if (!channelIds) {
                        sendResponse({ success: true, data: [] });
                        return;
                    }
                    
                    const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${YOUTUBE_API_KEY}`;
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

    if (typeof YOUTUBE_API_KEY === 'undefined' || !YOUTUBE_API_KEY) {
        throw new Error("YOUTUBE_API_KEY is not defined in secrets.js");
    }

    // Step 1: Query channels.list (part=contentDetails) to get the uploads playlist ID
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent('@' + normalizedHandle)}&key=${YOUTUBE_API_KEY}`;
    
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
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`;
    
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