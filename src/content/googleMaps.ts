(() => {
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === "fetch_lead_info") {
            const leadElements = await getLeadElements();
            sendResponse({leadsCount: leadElements.length});
        }
        else if (message.action === "start_extraction") {
            const data = await fetchAllTableData();
            chrome.runtime.sendMessage({ action: "fetched_leads", data: data });
        }
    });
    
    async function getLeadElements(): Promise<Element[]> {
        const leadParent = await ensureElementLoaded(() => document.querySelector('div:has(> div > div > a[href^="https://www.google.com/maps/place"])')!);
        const leads = [...leadParent.querySelectorAll('div:has(a[href^="https://www.google.com/maps/place"]):not(div+div)')];
    
        return leads;
    }
    
    async function fetchAllTableData(): Promise<{ tableHeaders: string[]; tableData: string[][] }>  {
        let tableHeaders: string[] = ["Title", "Rating", "Review Count", "Phone", "Industry", "Address", "Company Url", "Google Maps Link"];
        let tableData: string[][] = [];
    
        const leads = await getLeadElements();

        tableData = leads.map(maptableData);

        function maptableData(lead: Element): string[] {
            
            const title = lead.getElementsByClassName('fontHeadlineSmall')[0].textContent ?? "";
            const starsSection = lead.querySelector('.fontBodyMedium [role="img"]')?.getAttribute("aria-label");
            const starsRegex = /(\d+[\.,\d]*) [^\d]+ (\d+[\. ,\d]*) [^\d]+/;
            const rating = starsSection?.match(starsRegex)?.at(1) ?? "0";
            const reviewCount = starsSection?.match(starsRegex)?.at(2) ?? "0";
            const phoneSection = lead.querySelector('.fontBodyMedium')!.textContent;
            const phoneRegex = /(\+?[-\d\(\)\. ]+)/g;
            const phoneMatch = [...phoneSection!.matchAll(phoneRegex)].at(-1)?.at(1) ?? "";
            const phone = phoneMatch.length > 4 ? phoneMatch : "";
            const industryAddressSection = [...lead.querySelectorAll('.fontBodyMedium > div:last-child > div:first-child span > span')].map(x => x.textContent);
            const industry = industryAddressSection[0] ?? "";
            const address = industryAddressSection.at(-1) === industry ? "" : industryAddressSection.at(-1) ?? "";
            const companyUrl = (lead.querySelector('a[data-value="Website"]') as HTMLLinkElement)?.href ?? "";
            const href = lead.querySelector('a')?.href ?? ""

            return [title, rating, reviewCount, phone, industry, address, companyUrl, href];
        }
    
        return {
            tableHeaders,
            tableData
        };
    }

    async function ensureElementLoaded(selectorQuery: () => Element): Promise<Element> {
        while (!selectorQuery()) {
            await new Promise(resolve => requestAnimationFrame(resolve) )
        }
    
        return selectorQuery();
    };
})();
