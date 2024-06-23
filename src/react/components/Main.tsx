import { useState, useEffect } from "react";
import { exportLeadsToCRM, downloadCsv, getActiveTab, isApolloListUrl, reloadPage } from "../../utils";
import "./style.css"

type StateTypes =
    "IncorrectSite"
    | "Loading"
    | "Extract"
    | "Extracting"
    | "Export";

export default function Main(){
    const [leadsCount, setLeadsCount] = useState(0);
    const [maxPages, setMaxPages] = useState(0);
    const [pages, setPages] = useState(0);
    const [state, setState] = useState<StateTypes>("IncorrectSite");
    const [tableHeaders, setTableHeaders] = useState<string[]>([]);
    const [tableData, setTableData] = useState<string[][]>([]);
    const [fileName, setFileName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [uploadingLeads, setUploadingLeads] = useState(false);
    const [sentLeadsToCrmMessage, setSentLeadsToCrmMessage] = useState<JSX.Element>();

    const extractLeads = async () => {
        setState("Extracting");
        const tab = await getActiveTab();
        chrome.tabs.sendMessage(tab.id!, { action: "start_extraction", pages: Math.max(Math.min(maxPages, pages), 1) });
    };

    const sendLeadsToCRM = async () => {
        setUploadingLeads(true);
        const [success, message] = await exportLeadsToCRM(apiKey, tableHeaders, tableData);
        setUploadingLeads(false);

        if (success)
            setSentLeadsToCrmMessage(<div className="alert">{message}</div>)
        else {
            setSentLeadsToCrmMessage(<div className="alert alert-error">{message}</div>)
        }
    };

    // Chrome message listener
    useEffect(() => {
        const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
            if (message.action === "fetched_leads") {
                setTableHeaders(message.data.tableHeaders);
                setTableData(message.data.tableData);
                setState("Export");
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    // Startup
    useEffect(() => {
        async function run() {
            const tab = await getActiveTab();
            if (!isApolloListUrl(tab.url!)) {
                setState("IncorrectSite");
                return;
            }

            setState("Loading");
            chrome.tabs.sendMessage(tab.id!, { action: "fetch_lead_info" }, (response) => {
                setLeadsCount(response.leadsCount);
                setPages(response.remainingPages)
                setMaxPages(response.remainingPages)
                setState("Extract");
            });
        }

        run();
    }, [])
    
    function message(): JSX.Element {
        if (state === "IncorrectSite") {
            return <>
                <p style={{textAlign: "center", marginTop: "4rem"}}>Incorrect site. Please visit apollo's lead list page.</p>
            </>
        } else if (state === "Extract") {
            return <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: "2rem", padding: 8}}>
                <h6>Found {leadsCount} leads</h6>
                <div className="input" data-has-value="true">
                    <label>Pages to Extract</label>
                    <input type="number" min="1" max={maxPages} value={pages} onChange={e => setPages(Number(e.target.value))} data-underline />
                </div>
                <button className="filled" style={{marginTop: "1rem", width: "100%"}} onClick={extractLeads} disabled={leadsCount === 0}>Extract</button>
            </div>
            </>
        } else if (state === "Export") {
            return <>
                <div style={{display: "flex", flexDirection: "column", gap: 16, marginTop: "2rem", padding: "8px"}}>
                    <h6>Export <span style={{fontSize: "inherit", fontWeight: "inherit"}}>{tableData.length}</span> Leads</h6>
                    <div style={{display: "flex", gap: 8, justifyContent: "start", alignItems: "center"}}>
                        <div className="input" data-has-value={fileName.length > 0}>
                            <label>File Name</label>
                            <input value={fileName} onChange={e => setFileName(e.target.value)} type="text" required data-underline />
                        </div>
                        <button disabled={fileName.length === 0} className="filled" style={{margin: 0, flex: 1}} onClick={() => downloadCsv(fileName, tableHeaders, tableData)}>CSV</button>
                    </div>
                    <div style={{display: "flex", gap: 8, justifyContent: "start", alignItems: "center"}}>
                        <div className="input" data-has-value={apiKey.length > 0}>
                            <label>API Key</label>
                            <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="text" required data-underline />
                        </div>
                        <button disabled={apiKey.length === 0 || uploadingLeads} style={{margin: 0, flex: 1}} onClick={sendLeadsToCRM} className="filled">ClosingDealz CRM</button>
                    </div>
                    {sentLeadsToCrmMessage}
                </div>
                <div style={{marginTop: "2rem", overflowX: "auto", height: "285px"}}>
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
        } else if (state === "Extracting") {
            return <>
                <p style={{textAlign: "center", marginTop: "4rem"}}>Extracting Leads... Don't close this window.</p>
            </>
        }

        return <></>;
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
