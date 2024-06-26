export async function getActiveTab(): Promise<chrome.tabs.Tab> {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    });
  
    return tabs[0];
}

export function isApolloListUrl(url: string): [correctSite: boolean, correctPage: boolean] {
    if (!url)
        return [false, false];

    const correctSite = url.includes("https://app.apollo.io");
    if (!correctSite)
        return [false, false];
    
    if (!url.includes("https://app.apollo.io/#/people"))
        return [true, false];

    const querySplit = url.split("?");
    if (querySplit.length < 2)
        return [true, false];

    const queryParameters = querySplit[1];
    const urlParameters = new URLSearchParams(queryParameters);
    if (!urlParameters.has("contactLabelIds[]"))
        return [true, false];

    return [true, true];
}

export function isGoogleMapsUrl(url: string): [correctSite: boolean, correctPage: boolean] {
    if (!url)
        return [false, false];
    
    const correctSite = url.includes("https://www.google.com/maps");
    const correctPage = url.includes("https://www.google.com/maps/search/");

    return [correctSite, correctPage];
}

export function isCorrectUrl(url: string): {correctSite: boolean, correctPage: boolean, site: "apollo" | "google-maps" | null}  {
    const [isApolloSite, isApolloCorrectPage] = isApolloListUrl(url);
    if (isApolloSite) {
        return {correctSite: true, correctPage: isApolloCorrectPage, site: "apollo"};
    }

    const [isGoogleMapsSite, isGoogleMapsCorrectPage] = isGoogleMapsUrl(url);
    if (isGoogleMapsSite) {
        return {correctSite: true, correctPage: isGoogleMapsCorrectPage, site: "google-maps"};
    }

    return {correctSite: false, correctPage: false, site: null};
}

function downloadBlob(blob: Blob, fileName: string) {
    let tempLink = document.createElement('a');

    tempLink.download = fileName;
    let url = window.URL.createObjectURL(blob);
    tempLink.href = url;
 
    tempLink.style.display = "none";
    document.body.appendChild(tempLink);

    tempLink.click();
    document.body.removeChild(tempLink);
}

export function downloadCsv(fileName: string, headers: string[], rows: string[][]) {
    const headerStr = headers.map(x => serializeCell(x)).join(", ");
    const dataStr = rows.map(row => row.map(x => serializeCell(x)).join(", ")).join("\n");

    const csvData = headerStr + "\n" + dataStr;
    const csvFile = new Blob([csvData], { type: "text/csv" });

    downloadBlob(csvFile, fileName + ".csv");

    function serializeCell(cell: string) {
        return "\"" + cell.trim().replace("\"", "\"\"") + "\""; // A " quote => "A "" quote"
    }
}

export async function exportLeadsToCRM(apiKey: string, headers: string[], rows: string[][]) {
    const url = "https://app.closingdealz.io/api/v1/leads";
    try {
        const leads: any[] = rows.map((row) => {
            return mapToClosingDealz(headers, row);
        });

        const responses: any[] = [];
        for (const leadChunk of chunk(leads, 100)) {
            const response = await fetch(url, {
                method: "post",
                headers: {
                    "X-API-Key": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(leadChunk)
            });

            const resData = await response.json();
            responses.push(resData);
        }
        
        return responses.every(x => x.succeeded === true)
            ? [true, "Leads successfully added to ClosingDealz CRM"]
            : [false, "Failed to add leads to ClosingDealz CRM"];

    } catch (error) {
        return [false, `An error occurred when adding leads to ClosingDealz CRM: ${error}`];
    }
}

function mapToClosingDealz(headers: string[], data: string[]): any {
    const lead: any = { labels: ["Apollo"] };
    const unmappedHeaders = [...Array(headers.length).keys()];

    // Remap known properties
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

    // Map rest of the headers to notes
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

function chunk<T>(list: T[], chunkSize: number): T[][] {
    const chunksArray: T[][] = [];
    for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize);
        chunksArray.push(chunk);
    }

    return chunksArray;
}

export async function reloadPage() {
    location.reload();
}