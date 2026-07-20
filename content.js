console.log("YT Stealth Blocker: Observer Engine Started...");

// Hardcoded for testing. (Pick a channel you see on your screen right now!)
const BLOCKED_CHANNELS = ["MrBeast", "Veritasium", "Sourav Joshi Vlogs"]; 

const VIDEO_SELECTOR = 'ytd-rich-item-renderer';

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            
            const videoCards = document.querySelectorAll(VIDEO_SELECTOR);
            
            videoCards.forEach(card => {
                if (!card.dataset.scanned) {
                    card.dataset.scanned = "true";
                    
                    // 1. Hunt down the specific element holding the channel name inside this card
                    const channelElement = card.querySelector('ytd-channel-name a');
                    
                    if (channelElement) {
                        // 2. Extract the text and clean it up (remove extra spaces)
                        const channelName = channelElement.textContent.trim();
                        
                        // 3. The Execution: Check if it's in our hit list
                        if (BLOCKED_CHANNELS.includes(channelName)) {
                            
                            // 4. Hide the entire video card
                            card.style.display = 'none';
                            console.log(`Mission Accomplished: Hiding video from ${channelName}`);
                        }
                    }
                }
            });
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });