chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "fetch_lead_info") {
        const leadCount = await findLeadCount();
        sendResponse({leadCount});
    }
    else if (message.action === "start_extraction") {
        const data = await fetchAllTableData();
        sendResponse(data);
    }
});

async function findLeadCount(): Promise<string> {
    const panel = await ensureElementLoaded(() => [...document.getElementsByClassName('finder-results-list-panel-content')].find(_ => true));
    const regex = /\d+ - \d+ of (\d+)/;

    return panel.innerHTML.match(regex)![1];
}

async function ensureElementLoaded (selectorQuery: Function) {
    while (!selectorQuery()) {
        await new Promise(resolve => requestAnimationFrame(resolve) )
    }
    return selectorQuery();
};

async function fetchAllTableData(): Promise<{ tableHeaders: string[]; tableData: string[][] }>  {
    let tableHeaders: string[] = [];
    let tableData: string[][] = [];

    await getTableData(tableHeaders, tableData);

    const indexToRemove = tableHeaders.indexOf("Quick Actions")
    if (indexToRemove != -1) {
        tableHeaders = tableHeaders.filter((x, i) => i != indexToRemove);
        tableData = tableData.map((row) => row.filter((x, i) => i != indexToRemove));
    }

    replaceColumns(tableHeaders, tableData, "Name", (x) => x.replace("------", ""));
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

async function getTableData(tableHeaders: string[], tableData: string[][]) {
    const table = await ensureElementLoaded(() => document.querySelector('.finder-results-list-panel-content table'));

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
