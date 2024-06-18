chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "can_extract") {
        // const leadCount = Array.from(document.querySelectorAll(".lead-selector")).map(lead => lead.textContent);
        const leadCount = 69;
        await chrome.runtime.sendMessage({ leadCount, action: "extract" });
    }
});