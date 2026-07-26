console.log("🚨 [Stealth Blocker] SCRIPT INJECTED SUCCESSFULLY!");

let blockedList = [];

chrome.storage.local.get(['blockedChannels'], (result) => {
    console.log("📦 [Stealth Blocker] Raw Storage Data:", result);
    
    if (result.blockedChannels && result.blockedChannels.length > 0) {
        blockedList = result.blockedChannels.map(c => {
            if (typeof c === 'string') {
                return c.toLowerCase().replace('@', '').trim();
            }
            return (c.handle || c.name || '').toLowerCase().replace('@', '').trim();
        }).filter(Boolean);
        console.log("🎯 [Stealth Blocker] Armed Targets:", blockedList);
        scrubPage();
    } else {
        console.log("⚠️ [Stealth Blocker] Storage is empty or undefined!");
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedChannels) {
        blockedList = changes.blockedChannels.newValue.map(c => {
            if (typeof c === 'string') {
                return c.toLowerCase().replace('@', '').trim();
            }
            return (c.handle || c.name || '').toLowerCase().replace('@', '').trim();
        }).filter(Boolean);
        console.log("🔄 [Stealth Blocker] Targets updated:", blockedList);
        scrubPage();
    }
});

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
                    try {
                        chrome.runtime.sendMessage({ action: 'recordNuke', handle: handle });
                    } catch (err) {
                   }
                    break; 
                }
            }
        }
    });
}

const observer = new MutationObserver(() => {
    scrubPage();
});

observer.observe(document.body, { childList: true, subtree: true });
console.log("👀 [Stealth Blocker] DOM Observer Active...");