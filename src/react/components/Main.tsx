import { useState, useEffect } from "react";
import { addLeads, downloadCsv, getActiveTab, isCorrectUrl, reloadPage } from "../../utils";
import "./style.css"

type StateTypes =
    "IncorrectSite"
    | "Loading"
    | "CorrectSite"
    | "Export";

export default function Main(){
    const [leadsCount, setLeadsCount] = useState(0);
    const [state, setState] = useState<StateTypes>("IncorrectSite");
    const [tableHeaders, setTableHeaders] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState("");
    const [apiKey, setApiKey] = useState("");

    const extractLeads = async () => {
        setState("Loading");
        const tab = await getActiveTab();
        chrome.tabs.sendMessage(tab.id! ,{ action: "start_extraction" }, (response) => {
            setTableHeaders(response.tableHeaders);
            setTableData(response.tableData);
            setState("Export");
        });
    };

    useEffect(() => {
        const messageListener = (message: any, sender: any, sendResponse: any) => {};

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    useEffect(() => {
        async function run() {
            const tab = await getActiveTab();
            if (!isCorrectUrl(tab.url!)) {
                setState("IncorrectSite");
                return;
            }

            setState("Loading");
            await chrome.tabs.sendMessage(tab.id!, { action: "fetch_lead_info" }, (response) => {
                setLeadsCount(response.leadCount);
                setState("CorrectSite");
            });
        }
        run();
    }, [])
    
    function message(): any {
        if (state === "IncorrectSite") {
            return <>
                <p style={{textAlign: "center", marginTop: "4rem"}}>Incorrect site. Please visit apollo's lead list page.</p>
            </>
        } else if (state === "CorrectSite") {
            return <>
                <p style={{textAlign: "center", marginTop: "4rem"}}>You have extracted {leadsCount} leads</p>
                <button className="filled" style={{marginTop: "1rem"}} onClick={extractLeads} disabled={leadsCount === 0}>Extract</button>
            </>
        } else if (state === "Export") {
            return <>
                <div style={{display: "flex", flexDirection: "column", gap: 16, marginTop: "2rem", padding: "8px"}}>
                    <h6>Export Leads</h6>
                    <div style={{display: "flex", gap: 8, justifyContent: "start", alignItems: "center"}}>
                        <div className="input" data-has-value={fileName.length > 0}>
                            <label>File name</label>
                            <input value={fileName} onChange={e => setFileName(e.target.value)} type="text" required data-underline />
                        </div>
                        <button disabled={fileName.length === 0} className="filled" style={{margin: 0, flex: 1}} onClick={() => downloadCsv(fileName, tableHeaders, tableData)}>CSV</button>
                    </div>
                    <div style={{display: "flex", gap: 8, justifyContent: "start", alignItems: "center"}}>
                        <div className="input" data-has-value={apiKey.length > 0}>
                            <label>API key</label>
                            <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="text" required data-underline />
                        </div>
                        <button disabled={apiKey.length === 0} style={{margin: 0, flex: 1}} onClick={() => addLeads(apiKey, tableHeaders, tableData)} className="filled">ClosingDealz CRM</button>
                    </div>
                </div>
                <div style={{marginTop: "4rem", overflowX: "auto", height: "315px"}}>
                    <h6 style={{paddingLeft: "8px"}}>Preview</h6>
                    <table>
                        <thead>
                            {displayTableHeaders(tableHeaders)}
                        </thead>
                        <tbody>
                            {tableData.map((x) => displayTableRow(x))}
                        </tbody>
                    </table>
                </div>
                
            </>
        } else if (state === "Loading") {
            return <>
                <p style={{textAlign: "center", marginTop: "4rem"}}>Loading... <a style={{textAlign: "center", marginTop: "1rem"}} onClick={async () => await reloadPage()}>Reload</a></p>
            </>
        }
    }

    function displayTableRow(row: string[]) {
        return (
            <tr>
                {row.map((x) => (
                    <td>{x}</td>
                ))}
            </tr>
        );
    }

    function displayTableHeaders(header: string[]) {
        return (
            <tr>
                {header.map((x) => (
                    <th>{x}</th>
                ))}
            </tr>
        );
    }

    return (
        <main style={{width: 500, height: 300}}>
            <header>
                <h1>Lead Extractor</h1>
            </header>
            {message()}
        </main>
    );
}



