export async function getActiveTab(): Promise<chrome.tabs.Tab> {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    });
  
    return tabs[0];
}

export function isCorrectUrl(url: string): boolean {
    if (!url || !url.includes("https://app.apollo.io/#/people"))
        return false;

    const querySplit = url.split("?");
    if (querySplit.length < 2)
        return false;

    const queryParameters = querySplit[1];
    const urlParameters = new URLSearchParams(queryParameters);
    if (!urlParameters.has("contactLabelIds[]"))
        return false; 

    return true;
}