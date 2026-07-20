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
        const channelElement = card.querySelector('ytd-channel-name a');
        if (channelElement) {
            const channelName = channelElement.textContent.trim();
            if (blockedChannels.includes(channelName)) {
                card.style.display = 'none';
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