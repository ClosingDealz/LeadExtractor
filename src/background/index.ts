// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     console.log("onUpdated");
//     if (changeInfo.status === 'complete') {
//         chrome.tabs.get(tabId, handleTabEvent);
//     }
// });
  
// chrome.tabs.onActivated.addListener((activeInfo) => {
//     chrome.tabs.get(activeInfo.tabId, handleTabEvent);
// });

// async function handleTabEvent (tab: chrome.tabs.Tab) {
//     if (tab.url && tab.url.includes("https://app.apollo.io/#/people")) {
//         const querySplit = tab.url.split("?");

//         if (querySplit.length < 2)
//             return;

//         const queryParameters = querySplit[1];
//         const urlParameters = new URLSearchParams(queryParameters);
//         if (!urlParameters.has("contactLabelIds[]"))
//             return; 

//         await chrome.tabs.sendMessage(tab.id!, { action: "can_extract" });
//     }
// }