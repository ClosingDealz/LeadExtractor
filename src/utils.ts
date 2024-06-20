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

function downloadBlob(blob: Blob, fileName: string) {
    let temp_link = document.createElement('a');

    temp_link.download = fileName;
    let url = window.URL.createObjectURL(blob);
    temp_link.href = url;
 
    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    temp_link.click();
    document.body.removeChild(temp_link);
}

export function downloadCsv(fileName: string, headers: string[], rows: string[][]) {
    const header = headers.map(x => serializeCell(x)).join(", ");
    const data = rows.map(row => row.map(x => serializeCell(x)).join(", ")).join("\n");

    const csvData = header + "\n" + data;
    const csvFile = new Blob([csvData], { type: "text/csv" });

    downloadBlob(csvFile, fileName + ".csv");

    function serializeCell(cell: string) {
        return "\"" + cell.trim().replace("\"", "\"\"") + "\"";
    }
}

export async function exportLeadsToCRM(apiKey: string, headers: string[], rows: string[][]) {
    const url = "https://app.closingdealz.io/api/v1/leads";
    try {
        const reqData: any[] = rows.map((row) => {
            return mapToClosingDealz(headers, row);
        });

        const response = await fetch(url, {
            method: "post",
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(reqData)
        });

        const resData = await response.json();
    
        if (resData.succeeded) {
            console.log("Leads successfully added to ClosingDealz CRM.");
        } else {
            console.log(`Failed to add leads to ClosingDealz CRM. Message: ${resData.message}`);
        }
        
        return resData.data;
    } catch (error) {
        console.error(`An error occurred when adding leads to ClosingDealz CRM: ${error}`);
        return null;
    }
}

function mapToClosingDealz(headers: string[], data: string[]): any {
    const lead: any = { labels: ["Apollo"] };
    const unmappedHeaders = [...Array(headers.length).keys()];

    mapProperty("contactPerson", "Name");
    mapProperty("jobTitle", "Title");
    mapProperty("email", "Email");
    mapProperty("company", "Company");
    mapProperty("phoneNumber", "Phone");
    mapProperty("address", "Contact Location");
    mapProperty("employeeCount", "Employees", true);
    mapProperty("industry", "Industry");
    mapProperty("website", "Website");
    mapProperty("linkedIn", "LinkedIn");
    mapProperty("twitter", "Twitter");
    mapProperty("facebook", "Facebook");

    let notes = "";

    unmappedHeaders.forEach(x => {
        if (data[x] === "")
            return;
        notes += headers[x] + "\n";
        notes += data[x] + "\n\n";
    });

    lead["notes"] = notes;
    
    return lead;

    function mapProperty(propertyName: string, columnName: string, toNumber: boolean = false) {
        const index = headers.indexOf(columnName)
        if (index === -1)
            return
        if (toNumber) {
            const value = Number(data[index]);
            lead[propertyName] = value === 0 ? 1 : value;
        } else {
            lead[propertyName] = data[index];
        }
        const index2 = unmappedHeaders.indexOf(index);
        unmappedHeaders.splice(index2, 1);
        
    }
}

export async function reloadPage() {
    location.reload();
}