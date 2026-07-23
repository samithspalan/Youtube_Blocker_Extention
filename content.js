console.log("YT Stealth Blocker: Observer Engine Started...");

let blockedChannels = [];

// 1. Initial Fetch from Chrome Storage
chrome.storage.local.get({ blockedChannels: [] }, (result) => {
    blockedChannels = result.blockedChannels;
    console.log("Loaded block list from storage:", blockedChannels);
});

// 2. Real-time Reactive Listener for storage updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedChannels) {
        blockedChannels = changes.blockedChannels.newValue || [];
        console.log("Updated active block list:", blockedChannels);
        // Re-evaluate current DOM with new rules
        scanAndHide();
    }
});

const VIDEO_SELECTOR = 'ytd-rich-item-renderer';

function scanAndHide() {
    const videoCards = document.querySelectorAll(VIDEO_SELECTOR);
    
    videoCards.forEach(card => {
        // Find the anchor tag (the actual link) inside the channel name component
        const channelLinkElement = card.querySelector('ytd-channel-name a.yt-simple-endpoint');
        
        if (channelLinkElement) {
            // This will grab the relative URL, e.g., "/@MrBeast"
            const urlPath = channelLinkElement.getAttribute('href'); 
            
            if (urlPath && urlPath.includes('/@')) {
                // Extract just the handle by splitting the string at the '/'
                // "/@MrBeast" becomes ["", "@MrBeast"]
                const handle = urlPath.split('/')[1].toLowerCase(); 
                
                // We check against our block list (assuming the React popup saves handles in lowercase)
                if (blockedChannels.includes(handle)) {
                    card.style.display = 'none';
                    console.log(`Mission Accomplished: Blocked handle ${handle}`);
                }
            }
        }
    });
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            scanAndHide();
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });