chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "fetch_lead_info") {
        const leadInfo = await getLeadInfo();
        sendResponse(leadInfo);
    }
    else if (message.action === "start_extraction") {
        const data = await fetchAllTableData(message.pages);
        chrome.runtime.sendMessage({ action: "fetched_leads", data: data });
    }
});

async function getLeadInfo(): Promise<{ pageSize: number; leadsCount: number }> {
    const panel = await ensureElementLoaded(() => [...document.getElementsByClassName('finder-results-list-panel-content')].find(_ => true));
    const regex = /\d+ - (\d+) of (\d+)/;
    const match = panel.innerHTML.match(regex)!;
    const pageSize = Number(match[1]);
    const leadsCount = Number(match[2]);

    return {pageSize, leadsCount};
}

async function ensureElementLoaded (selectorQuery: Function) {
    while (!selectorQuery()) {
        await new Promise(resolve => requestAnimationFrame(resolve) )
    }
    return selectorQuery();
};

async function fetchAllTableData(pages: number): Promise<{ tableHeaders: string[]; tableData: string[][] }>  {
    let tableHeaders: string[] = [];
    let tableData: string[][] = [];

    for (let index = 0; index < pages; index++) {
        await getTableData(tableHeaders, tableData, index != 0);
        if (index != pages -1) {
            const button = document.querySelector("button[aria-label='right-arrow']") as HTMLButtonElement;
            button.click();
        }
    }
    const indexToRemove = tableHeaders.indexOf("Quick Actions")
    if (indexToRemove != -1) {
        tableHeaders = tableHeaders.filter((x, i) => i != indexToRemove);
        tableData = tableData.map((row) => row.filter((x, i) => i != indexToRemove));
    }

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

async function getTableData(tableHeaders: string[], tableData: string[][], shouldWait: boolean) {
    const table = await ensureElementLoaded(() => document.querySelector('.finder-results-list-panel-content table'));
    
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
        tableHeaders.push(...fetchTableHeaders(table));

    tableData.push(...fetchTableData(table));
}

function fetchTableHeaders(table: Element): string[]  {
    return [...table.querySelectorAll("thead tr th")].map(x => x.textContent as string);
}

function fetchTableData(table: Element): string[][]  {
    const rows = [...table.querySelectorAll("tbody tr")];
    const mappedRows = rows.map(x => [...x.querySelectorAll('td')].map(y => y.textContent as string))

    return mappedRows;
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