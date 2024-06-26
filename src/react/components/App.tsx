import { useEffect, useState } from "react";
import Apollo from "./Apollo";
import GoogleMaps from "./GoogleMaps";
import { getActiveTab, isCorrectUrl, reloadPage } from "../../utils";

type StateTypes = "Loading" | "IncorrectSite" | "Apollo" | "GoogleMaps";
const App = () => {
  const [state, setState] = useState<StateTypes>("Loading");
  const [tabId, setTabId] = useState<number>(0);
  const [incorrectPage, setIncorrectPage] = useState<boolean>(false);

  // Startup
  useEffect(() => {
    async function run() {
        const tab = await getActiveTab();
        setTabId(tab.id!);
        const result = isCorrectUrl(tab.url!);
        if (!result.correctSite) {
            setState("IncorrectSite");
            return;
        }

        setIncorrectPage(!result.correctPage);
        
        if (result.site === "apollo") {
          setState("Apollo");
        } else if (result.site === "google-maps") {
          setState("GoogleMaps");
        }
    }

    run();
  }, []);

  function display(): JSX.Element {
    if (state === "Loading") {
      return <p style={{textAlign: "center", marginTop: "4rem"}}>Loading... <a style={{textAlign: "center", marginTop: "1rem"}} onClick={async () => await reloadPage()}>Reload</a></p>
    } else if (state === "IncorrectSite") {
      return <p style={{textAlign: "center", marginTop: "4rem"}}>Incorrect site. Please visit Apollo or Google Maps.</p>
    } else if (state === "Apollo") {
      return <Apollo incorrectPage={incorrectPage} tabId={tabId} />
    } else if (state === "GoogleMaps") {
      return <GoogleMaps incorrectPage={incorrectPage} tabId={tabId} />
    }

    return <></>;
  }

  return (
    <main style={{width: 500, height: 300}}>
          <header>
              <h1>Lead Extractor</h1>
          </header>

          {display()}
      </main>
  );
};

export default App;