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

async function fetchAllTableData(): Promise<{ tableHeaders: string[]; tableData: any[][] }>  {
    const tableHeaders: string[] = [];
    const tableData: any[][] = [];

    await getTableData(tableHeaders, tableData);

    return {
        tableHeaders,
        tableData
    };
}

async function getTableData(tableHeaders: string[], tableData: any[]) {
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
