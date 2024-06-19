import { useState, useEffect } from "react";
import { getActiveTab, isCorrectUrl } from "../../utils";

type StateTypes =
    "IncorrectSite"
    | "CorrectSite"
    | "Export";

export default function Main(){
    const [canExtract, setCanExtract] = useState(false);
    const [leadsCount, setLeadsCount] = useState(0);
    const [state, setState] = useState<StateTypes>("IncorrectSite");

    const extractLeads = () => {
        // chrome.runtime.sendMessage({ action: "start_extraction" }, (response) => {
        //     if (response && response.totalLeads && response.pages) {
                
        //     }
        // });
        setState("Export");
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

            setState("CorrectSite");
            await chrome.tabs.sendMessage(tab.id!, { action: "fetch_lead_info" }, (response) => {
                setLeadsCount(response.leadCount);
                setCanExtract(true);
            });
        }
        run();
    }, [])
    
    function message(): any {
        if (state === "IncorrectSite") {
            return <>
                <p>Incorrect site. Please visit apollo's lead list page.</p>
                <button disabled>Extract</button>
            </>
        } else if (state === "CorrectSite") {
            return <>
                <p>You have extracted {leadsCount} leads</p>
                <button onClick={extractLeads} disabled={!canExtract}>Extract</button>
            </>
        } else if (state === "Export") {
            return <>
                <p>Export {leadsCount} leads</p>
                <div style={{display: "flex", flexDirection: "column", gap: 16}}>
                    <button>Export to Excel</button>
                    <button>Export to CSV</button>
                    <button>Export to ClosingDealz CRM</button>
                </div>
            </>
        }
    }

    return (
        <main style={{width: 500, height: 300}}>
            <h1>Lead Extractor</h1>
            {message()}
        </main>
    );
}



