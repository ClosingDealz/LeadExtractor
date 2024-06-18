import { useState, useEffect } from "react";

export default function Main(){
    const [canExtract, setCanExtract] = useState(false);
    const [leadsCount, setLeadsCount] = useState(0);

    const extractLeads = () => {
        chrome.runtime.sendMessage({ action: "start_extraction" }, (response) => {
            if (response && response.totalLeads && response.pages) {
                
            }
        });
    };

    useEffect(() => {
        const messageListener = (message: any, sender: any, sendResponse: any) => {
            if (message.action === "extract") {
                setLeadsCount(message.leadCount);
                setCanExtract(true);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    return (
        <main style={{width: 500, height: 300}}>
            <h1>Lead Extractor</h1>
            {canExtract && leadsCount > 0 ? (
                <p>You have extracted {leadsCount} leads</p>
            ) : (
                <p>No leads extracted yet.</p>
            )}
            <button onClick={extractLeads} disabled={!canExtract}>Extract</button>
        </main>
    );
}



