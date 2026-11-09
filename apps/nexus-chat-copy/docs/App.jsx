import React, { useEffect, useState } from "react";

const starter = {
  project: "My Nexus Project",
  title: "Describe an app to get started.",
  description: "Your app preview will appear here.",
  prompts: [],
  messages: [{ role: "assistant", text: "What would you like to build?" }],
  activeTab: "App Builder",
  page: "Home",
};

const css = `
*{box-sizing:border-box}body{margin:0;background:#f6f7fb;color:#202333;font-family:Inter,system-ui,Arial,sans-serif}
button,input,textarea{font:inherit}button{cursor:pointer}
.app{min-height:100vh;display:grid;grid-template-columns:220px minmax(300px,1fr) 320px}
.sidebar,.chat{background:white;padding:18px;border-color:#e7e9f0}
.sidebar{border-right:1px solid #e7e9f0}.chat{border-left:1px solid #e7e9f0;display:flex;flex-direction:column}
.logo{font-size:20px;font-weight:800;margin:4px 8px 25px}.logo span{color:#7055ed}
.section{font-size:11px;color:#85899a;text-transform:uppercase;font-weight:700;margin:20px 8px 8px}
.sideButton{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px;border-radius:9px;color:#35384a;margin:2px 0}
.sideButton:hover,.sideButton.active{background:#f0edff;color:#7055ed}
.projectInput,.search{width:100%;padding:10px;border:1px solid #e4e6ee;border-radius:9px}
main{padding:20px;min-width:0}.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
h1{font-size:20px;margin:0}.controls{display:flex;gap:7px;flex-wrap:wrap}
.btn{border:1px solid #e2e4eb;background:white;padding:8px 11px;border-radius:9px;color:#34364a}
.btn.primary{background:#7055ed;border-color:#7055ed;color:white}
.canvas{min-height:75vh;background:#e9ebf2;border:1px solid #e1e3eb;border-radius:14px;padding:20px;display:grid;place-items:center}
.preview{background:white;width:min(100%,850px);min-height:580px;border-radius:12px;box-shadow:0 8px 30px #20233312;overflow:hidden}
.preview.mobile{width:min(390px,100%);min-height:650px}
.previewHeader{padding:16px 22px;border-bottom:1px solid #eee;display:flex;justify-content:space-between}
.previewBody{padding:32px}.previewBody h2{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:12px 0;letter-spacing:-1px}
.muted{color:#777d8e;line-height:1.6}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}
.card{border:1px solid #e8e9ef;padding:16px;border-radius:11px}.card p{font-size:13px;color:#777d8e}
.chat h2{font-size:16px;margin:2px 0}.notice{padding:10px;background:#fff7d8;border:1px solid #f2e5a6;border-radius:9px;font-size:12px;line-height:1.5;margin:13px 0}
.messages{flex:1;overflow:auto;min-height:180px}.bubble{padding:10px 12px;background:#f4f5f9;border-radius:10px;margin:9px 0;font-size:13px;line-height:1.5}
.bubble.user{background:#f0edff}.promptBox{border:1px solid #e3e5ec;border-radius:12px;padding:9px}
textarea{width:100%;min-height:75px;resize:vertical;border:0;outline:0}
.promptBottom{display:flex;justify-content:space-between;align-items:center}.status{font-size:11px;color:#777d8e}
.listing{background:white;border:1px solid #e5e7ed;border-radius:12px;padding:16px;margin:12px 0}
.tag{font-size:11px;color:#806600;background:#fff4c8;border-radius:20px;padding:5px 8px}
@media(max-width:950px){.app{grid-template-columns:190px 1fr}.chat{grid-column:1/-1;min-height:350px;border-left:0;border-top:1px solid #e7e9f0}}
@media(max-width:620px){.app{display:block}.sidebar{border-right:0;border-bottom:1px solid #e7e9f0;padding:12px}.logo{margin:4px 8px 12px}.section,#pageList,.projectInput{display:none}.mobileNav{display:flex;overflow:auto;gap:4px}.mobileNav .sideButton{white-space:nowrap;width:auto}main{padding:12px}.canvas{padding:8px;min-height:60vh}.previewBody{padding:22px}.cards{grid-template-columns:1fr}.chat{min-height:390px}}
`;

export default function App() {
  const [data, setData] = useState(() => {
    try {
      return { ...starter, ...JSON.parse(localStorage.getItem("nexus-demo") || "{}") };
    } catch {
      return starter;
    }
  });
  const [prompt, setPrompt] = useState("");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem("nexus-demo", JSON.stringify(data));
  }, [data]);

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function generate(text = prompt) {
    const request = text.trim();
    if (!request || loading) return;

    setLoading(true);
    const userMessage = { role: "user", text: request };
    setData((current) => ({
      ...current,
      prompts: [...current.prompts, request].slice(-5),
      messages: [...current.messages, userMessage],
    }));
    setPrompt("");

    window.setTimeout(() => {
      const title = /dashboard/i.test(request)
        ? "Everything you need, at a glance."
        : /booking/i.test(request)
        ? "Make time for what matters."
        : /shop|store/i.test(request)
        ? "Find something you'll love."
        : request.length > 55
        ? request.slice(0, 52) + "…"
        : request;

      setData((current) => ({
        ...current,
        title,
        description: `This is a sample preview based on: “${request}”`,
        messages: [
          ...current.messages,
          {
            role: "assistant",
            text: "Sample preview updated. This demo does not connect to an AI service.",
          },
        ],
      }));
      setLoading(false);
    }, 500);
  }

  const tabs = ["App Builder", "Live Sports", "App Arcade", "Settings"];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">✦ <span>Nexus</span> Hub</div>
          <div className="mobileNav">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`sideButton ${data.activeTab === tab ? "active" : ""}`}
                onClick={() => update("activeTab", tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="section">Project</div>
          <input
            className="projectInput"
            aria-label="Project name"
            value={data.project}
            onChange={(event) => update("project", event.target.value)}
          />

          <div id="pageList">
            <div className="section">Pages</div>
            {["Home", "About", "Contact"].map((page) => (
              <button
                key={page}
                className={`sideButton ${data.page === page ? "active" : ""}`}
                onClick={() => update("page", page)}
              >
                ▤ &nbsp; {page}
              </button>
            ))}
            <div className="section">Recent prompts</div>
            {data.prompts.length ? (
              data.prompts.slice(-3).reverse().map((item, index) => (
                <button
                  className="sideButton"
                  key={`${item}-${index}`}
                  onClick={() => setPrompt(item)}
                >
                  {item.length > 25 ? item.slice(0, 25) + "…" : item}
                </button>
              ))
            ) : (
              <div className="status" style={{ padding: 8 }}>No prompts yet</div>
            )}
          </div>
        </aside>

        <main>
          <div className="top">
            <h1>{data.activeTab}</h1>
            <div className="controls">
              <button className="btn" onClick={() => setMobilePreview(false)}>Desktop</button>
              <button className="btn" onClick={() => setMobilePreview(true)}>Mobile</button>
              <button
                className="btn primary"
                onClick={() => window.alert("Demo only: publishing is not connected.")}
              >
                Publish
              </button>
            </div>
          </div>

          {data.activeTab === "App Builder" && (
            <div className="canvas">
              <div className={`preview ${mobilePreview ? "mobile" : ""}`}>
                <div className="previewHeader">
                  <strong>{data.project || "Untitled project"}</strong>
                  <span className="status">{data.page}</span>
                </div>
                <div className="previewBody">
                  <span style={{ color: "#7055ed", fontWeight: 700, fontSize: 12 }}>APP PREVIEW</span>
                  <h2>{data.title}</h2>
                  <p className="muted">{data.description}</p>
                  <button className="btn primary" onClick={() => window.alert("Demo button interaction.")}>
                    Get started
                  </button>
                  <div className="cards">
                    {["Plan", "Build", "Share"].map((item) => (
                      <div className="card" key={item}>
                        ✦<strong>{item}</strong>
                        <p>Sample content for your app preview.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {data.activeTab === "Live Sports" && (
            <>
              <div className="notice">Demo listings only. No live scores or streams are connected.</div>
              <h2>Featured game</h2>
              <div className="listing">
                <span className="tag">DEMO EVENT</span>
                <h3>City Hawks vs. Bay Wolves</h3>
                <p className="muted">Basketball · Example League · Scheduled 7:30 PM local time</p>
                <button className="btn primary" onClick={() => window.alert("No stream is connected.")}>
                  Viewing options
                </button>
              </div>
              <h2>Upcoming</h2>
              <div className="listing">North Stars vs. Metro FC · Soccer · Demo</div>
            </>
          )}

          {data.activeTab === "App Arcade" && (
            <>
              <div className="notice">Sample gallery. Community publishing is not connected.</div>
              <input className="search" placeholder="Search demo apps" value={search} onChange={(e) => setSearch(e.target.value)} />
              {["Color Quest", "Daily Focus", "Local Finds"]
                .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
                .map((name) => (
                  <div className="listing" key={name}>
                    <span className="tag">DEMO APP</span><h3>{name}</h3>
                    <button className="btn" onClick={() => window.alert(`${name} is sample content.`)}>Open</button>
                  </div>
                ))}
            </>
          )}

          {data.activeTab === "Settings" && (
            <div className="listing">
              <h2>Settings</h2>
              <p className="muted">This starter stores the demo project in this browser only.</p>
              <button className="btn" onClick={() => {
                localStorage.removeItem("nexus-demo");
                window.location.reload();
              }}>Reset demo project</button>
            </div>
          )}
        </main>

        <section className="chat">
          <h2>App Builder <span className="tag">DEMO</span></h2>
          <div className="notice">Prompt generation is simulated locally; no AI service is connected.</div>
          <div className="messages">
            {data.messages.map((message, index) => (
              <div className={`bubble ${message.role === "user" ? "user" : ""}`} key={index}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="promptBox">
            <textarea
              aria-label="Describe your app"
              placeholder="Describe an app or ask for a change…"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  generate();
                }
              }}
            />
            <div className="promptBottom">
              <span className="status">{loading ? "Generating sample…" : "Saved in this browser"}</span>
              <button className="btn primary" disabled={loading} onClick={() => generate()}>
                {loading ? "Working…" : "Generate"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
