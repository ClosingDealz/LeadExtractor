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

export async function exportGoogleMapsLeadsToCRM(apiKey: string, headers: string[], rows: string[][]) {
    const url = "https://app.closingdealz.io/api/v1/leads";
    try {
        const leads: any[] = rows.map((row) => {
            return mapGoogleMapsToClosingDealz(headers, row);
        });

        const responses: any[] = [];
        for (const leadChunk of chunk(leads, 100)) {
            console.log(leadChunk);
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

export async function exportApolloLeadsToCRM(apiKey: string, headers: string[], rows: string[][]) {
    const url = "https://app.closingdealz.io/api/v1/leads";
    try {
        const leads: any[] = rows.map((row) => {
            return mapApolloToClosingDealz(headers, row);
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

function mapGoogleMapsToClosingDealz(headers: string[], data: string[]): any {
    const lead: any = { labels: ["Google Maps"] };
    const unmappedHeaders = [...Array(headers.length).keys()];

    // Remap known properties
    mapProperty(lead, unmappedHeaders, headers, data, "company", "Title");
    mapProperty(lead, unmappedHeaders, headers, data, "phoneNumber", "Phone");
    mapProperty(lead, unmappedHeaders, headers, data, "industry", "Industry");
    mapProperty(lead, unmappedHeaders, headers, data, "address", "Address");
    mapProperty(lead, unmappedHeaders, headers, data, "website", "Company Url");

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
}

function mapApolloToClosingDealz(headers: string[], data: string[]): any {
    const lead: any = { labels: ["Apollo"] };
    const unmappedHeaders = [...Array(headers.length).keys()];

    // Remap known properties
    mapProperty(lead, unmappedHeaders, headers, data, "contactPerson", "Name");
    mapProperty(lead, unmappedHeaders, headers, data, "jobTitle", "Title");
    mapProperty(lead, unmappedHeaders, headers, data, "email", "Email");
    mapProperty(lead, unmappedHeaders, headers, data, "company", "Company");
    mapProperty(lead, unmappedHeaders, headers, data, "phoneNumber", "Phone");
    mapProperty(lead, unmappedHeaders, headers, data, "address", "Contact Location");
    mapProperty(lead, unmappedHeaders, headers, data, "employeeCount", "Employees", true);
    mapProperty(lead, unmappedHeaders, headers, data, "industry", "Industry");
    mapProperty(lead, unmappedHeaders, headers, data, "website", "Website");
    mapProperty(lead, unmappedHeaders, headers, data, "linkedIn", "LinkedIn");
    mapProperty(lead, unmappedHeaders, headers, data, "twitter", "Twitter");
    mapProperty(lead, unmappedHeaders, headers, data, "facebook", "Facebook");

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
}

function mapProperty(lead: any, unmappedHeaders: number[], headers: string[], data: string[], propertyName: string, columnName: string, toNumber: boolean = false) {
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