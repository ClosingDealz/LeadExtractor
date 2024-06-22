chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "fetch_lead_info") {
        const leadInfo = await getLeadPageInfo();
        sendResponse(leadInfo);
    }
    else if (message.action === "start_extraction") {
        const data = await fetchAllTableData(message.pages);
        chrome.runtime.sendMessage({ action: "fetched_leads", data: data });
    }
});

async function getLeadPageInfo(): Promise<{ remainingPages: number; leadsCount: number }> {
    const panel = await ensureElementLoaded(() => [...document.getElementsByClassName('finder-results-list-panel-content')].find(_ => true)!);
    const regex = /(\d+) - (\d+) of (\d+)/;
    const match = panel.innerHTML.match(regex)!;

    const leadsStart = Number(match[1]);
    const leadsEnd = Number(match[2]);
    const totalLeads = Number(match[3]);

    const pageSize = leadsEnd - leadsStart + 1;
    const leadsCount = totalLeads - leadsStart + 1;
    const remainingPages = Math.ceil(leadsCount / pageSize);

    return {remainingPages, leadsCount};
}

async function ensureElementLoaded(selectorQuery: () => Element): Promise<Element> {
    while (!selectorQuery()) {
        await new Promise(resolve => requestAnimationFrame(resolve) )
    }

    return selectorQuery();
};

async function fetchAllTableData(pages: number): Promise<{ tableHeaders: string[]; tableData: string[][] }>  {
    let tableHeaders: string[] = [];
    let tableData: string[][] = [];

    for (let i = 0; i < pages; i++) {
        await appendTableData(tableHeaders, tableData, i != 0);

        if (i != pages - 1) {
            const button = document.querySelector("button[aria-label='right-arrow']") as HTMLButtonElement;
            if (button.disabled)
                break;

            button.click();
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    // Remove Quick Actions header
    const indexToRemove = tableHeaders.indexOf("Quick Actions")
    if (indexToRemove != -1) {
        tableHeaders = tableHeaders.filter((x, i) => i != indexToRemove);
        tableData = tableData.map((row) => row.filter((x, i) => i != indexToRemove));
    }

    // Format column data
    replaceColumns(tableHeaders, tableData, "Name", (x) => x.replace("------", ""));
    replaceColumns(tableHeaders, tableData, "Title", (x) => x.replace("N/A", ""));
    replaceColumns(tableHeaders, tableData, "Phone", (x) => x.replace("Request Mobile Number", ""));
    replaceColumns(tableHeaders, tableData, "Company", (x) => x.replace("N/A", ""));
    replaceColumns(tableHeaders, tableData, "# Employees", (x) => x.replace("N/A", ""));
    replaceColumns(tableHeaders, tableData, "Industry", (x) => x.replace("N/A", ""));
    replaceColumns(tableHeaders, tableData, "Keywords", (x) => x.replace("N/A", ""));
    replaceColumns(tableHeaders, tableData, "Contact Owner", (x) => x.replace("N/A", ""));

    replaceHeaderName(tableHeaders, "# Employees", "Employees");

    return {
        tableHeaders,
        tableData
    };
}

async function appendTableData(tableHeaders: string[], tableData: string[][], shouldWait: boolean) {
    const table = await ensureElementLoaded(() => document.querySelector('.finder-results-list-panel-content table')!);
    
    // Ensure table content is loaded
    if (shouldWait) {
        let resolvePromise: (value: unknown) => void;
    
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
        });
    
        const callback = function(mutationsList: any[], observer: any) {
            resolvePromise(observer);
        };
    
        const observer = new MutationObserver(callback);
        observer.observe(table, { childList: true, subtree: true });
    
        await promise;
        observer.disconnect();
    }

    if (tableHeaders.length === 0)
        tableHeaders.push(...getTableHeaders(table));

    tableData.push(...getTableData(table, tableHeaders));
}

function getTableHeaders(table: Element): string[]  {
    const headers = [...table.querySelectorAll("thead tr th")].map(x => x.textContent as string);
    return [...headers, "Website", "LinkedIn", "Twitter", "Facebook"];
}

function getTableData(table: Element, headers: string[]): string[][]  {
    const rows = [...table.querySelectorAll("tbody tr")];
    const companyIndex = headers.indexOf("Company");
    const mappedRows = rows.map(mapRow)

    return mappedRows;

    function mapRow(row: Element): string[] {
        const columns = [...row.querySelectorAll('td')];
        const mappedColumns = columns.map(x => x.textContent as string);

        const company = columns[companyIndex];
        const allLinks = [...company.querySelectorAll("a.zp-link")].map(x => (x as HTMLLinkElement).href);

        const linkedin = getLink(allLinks, ["https://linkedin.com", "http://linkedin.com"]);
        const twitter = getLink(allLinks, ["https://twitter.com", "http://twitter.com", "https://x.com", "http://x.com"]);
        const facebook = getLink(allLinks, ["https://facebook.com", "http://facebook.com"]);
        const website = allLinks.length === 0 ? "" : allLinks[0];

        return [...mappedColumns, website, linkedin, twitter, facebook];
    }

    function getLink(allLinks: string[], queryUrls: string[]): string {
        for (const url of queryUrls) {
            const index = allLinks.findIndex((x) => x.startsWith(url));
            if (index === -1)
                continue;

            const link = allLinks[index];
            allLinks.splice(index, 1);

            return link;
        }
        return "";
    }
}

function replaceColumns(tableHeaders: string[], tableData: string[][], columnName: string, replacement: (value: string) => string) {
    const indexToFormat = tableHeaders.indexOf(columnName)
    if (indexToFormat != -1) {
        tableData.forEach(row =>  row[indexToFormat] = replacement(row[indexToFormat]));
    }
}

function replaceHeaderName(tableHeaders: string[], columnName: string, replacement: string) {
    const indexToFormat = tableHeaders.indexOf(columnName)
    if (indexToFormat != -1) {
        tableHeaders[indexToFormat] = replacement;
    }
}