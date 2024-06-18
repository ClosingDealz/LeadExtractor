chrome.tabs.onActivated.addListener(async (tab) => {
    const [currentTab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    console.log(currentTab.url);
    if (currentTab.url && currentTab.url.includes("https://app.apollo.io/#/people")) {
        const querySplit = currentTab.url.split("?");


        if (querySplit.length < 2)
            return;

        const queryParameters = querySplit[1];
        const urlParameters = new URLSearchParams(queryParameters);
        if (!urlParameters.has("contactLabelIds[]"))
            return;

        console.log(tab);
        console.log(currentTab);
        await chrome.tabs.sendMessage(tab.tabId, { action: "can_extract" });

        // chrome.tabs.sendMessage(tabId, { action: "can_extract" }, response => {
        //     if (response && response.leads) {
        //         chrome.storage.local.set({ leads: response.leads });
        //         chrome.runtime.sendMessage({ leadsCount: response.leads.length });
        //     }
        // });
    }
})