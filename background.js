chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchSuggestions") {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(request.query)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error("Background fetch error:", error);
                sendResponse({ success: false, error: error.message });
            });
            
        // Return true tells Chrome we will send the response asynchronously
        return true; 
    }
});