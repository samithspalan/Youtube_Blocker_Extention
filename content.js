console.log("🚨 [Stealth Blocker] SCRIPT INJECTED SUCCESSFULLY!");

let blockedList = [];

// 1. Initial Load: See exactly what is inside Chrome Storage
chrome.storage.local.get(['blockedChannels'], (result) => {
    console.log("📦 [Stealth Blocker] Raw Storage Data:", result);
    
    if (result.blockedChannels && result.blockedChannels.length > 0) {
        blockedList = result.blockedChannels.map(h => h.toLowerCase().trim());
        console.log("🎯 [Stealth Blocker] Armed Targets:", blockedList);
        scrubPage();
    } else {
        console.log("⚠️ [Stealth Blocker] Storage is empty or undefined!");
    }
});

// 2. Live Sync
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedChannels) {
        blockedList = changes.blockedChannels.newValue.map(h => h.toLowerCase().trim());
        console.log("🔄 [Stealth Blocker] Targets updated:", blockedList);
        scrubPage();
    }
});

// 3. The Core Scrubbing Engine
function scrubPage() {
    if (blockedList.length === 0) return;

    const elements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-reel-item-renderer, ytd-channel-renderer');

    elements.forEach(el => {
        const channelLinks = el.querySelectorAll('a[href*="@"]');
        
        for (let link of channelLinks) {
            let href = link.getAttribute('href') || '';
            let match = href.match(/@([^\/\?]+)/); 
            
            if (match && match[1]) {
                let handle = match[1].toLowerCase();
                
                if (blockedList.includes(handle)) {
                    console.log(`💥 [Stealth Blocker] NUKING VIDEO FROM: @${handle}`);
                    el.remove(); 
                    break; 
                }
            }
        }
    });
}

// 4. The MutationObserver
const observer = new MutationObserver(() => {
    scrubPage();
});

observer.observe(document.body, { childList: true, subtree: true });
console.log("👀 [Stealth Blocker] DOM Observer Active...");