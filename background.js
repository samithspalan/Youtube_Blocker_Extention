// Load gitignored secrets (contains YOUTUBE_API_KEY)
try {
    importScripts('secrets.js');
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
});