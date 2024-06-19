chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "fetch_lead_info") {
        const leadCount = findLeadCount();
        sendResponse({leadCount});
    }
});

function findLeadCount(): string {
    const panel = document.getElementsByClassName('finder-results-list-panel-content')[0];
    const regex = /\d+ - \d+ of (\d+)/;

    return panel.innerHTML.match(regex)![1];
}