import { useMemo, useState } from "react";
import { calculateArtistTdh } from "./domain/artist-tdh";
import { DEMO_INPUT } from "./demo";

const formatter = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const metric = (value: number) => formatter.format(value);

export default function App() {
  const [source, setSource] = useState(() => JSON.stringify(DEMO_INPUT, null, 2));
  const calculation = useMemo(() => {
    try {
      return { result: calculateArtistTdh(JSON.parse(source) as unknown), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Invalid input" };
    }
  }, [source]);

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="myTDH home">myTDH<span>®</span></a>
        <nav aria-label="Primary navigation">
          <a href="#method">( Method )</a><a href="#lab">( Calculate )</a>
          <a href="https://github.com/maxand98/TDH">( Source ↗ )</a>
        </nav>
        <p className="edition">PUBLIC LAB / 001</p>
      </header>

      <section className="hero" id="top">
        <div className="hero-meta hero-meta-left"><span>Measure</span><strong>Total Days Held</strong></div>
        <div className="hero-meta hero-meta-right"><span>Signal</span><strong>Time × Breadth</strong></div>
        <div className="hero-title" aria-label="my Total Days Held"><span>MY</span><h1>TDH</h1></div>
        <div className="hero-foot">
          <p>A transparent holding-duration signal for any digital artist.</p>
          <a className="primary-link" href="#lab">Calculate yours <span>↓</span></a>
          <p className="hero-index">ARTIST / OEUVRE / COLLECTOR / TIME</p>
        </div>
        <div className="side-stamp side-stamp-left">NO PRICE</div>
        <div className="side-stamp side-stamp-right">OPEN METHOD</div>
      </section>

      <div className="ticker" aria-hidden="true">
        <span>HOLDING IS A RELATIONSHIP</span><b>+</b><span>DURATION IS EVIDENCE</span><b>+</b>
        <span>THE FORMULA STAYS VISIBLE</span><b>+</b>
      </div>

      <section className="method" id="method">
        <div className="method-intro">
          <p className="section-number">00_1 / THE METHOD</p>
          <h2>Time held.<br /><em>Not value claimed.</em></h2>
          <p className="method-note">A public instrument for reading collector commitment across a declared body of work.</p>
        </div>
        <div className="method-copy">
          <div className="formula" aria-label="TDH formula">
            <span>PROJECT SCORE</span><strong>median days × log(1 + identities)</strong>
            <i>then combined with diminishing returns</i>
          </div>
          <dl>
            <div><dt>01 / Counts</dt><dd>Current uninterrupted holding</dd></div>
            <div><dt>02 / Resists</dt><dd>Supply, duplicates, self-holding</dd></div>
            <div><dt>03 / Excludes</dt><dd>Price, volume, reputation</dd></div>
            <div><dt>04 / Publishes</dt><dd>Formula, inputs, coverage</dd></div>
          </dl>
        </div>
      </section>

      <section className="manifesto" aria-label="Principle">
        <p className="section-number">A SIGNAL WITH RECEIPTS</p>
        <p>Every number should reveal<br />what made it.</p><span>∞</span>
      </section>

      <section className="lab" id="lab">
        <div className="lab-heading">
          <p className="section-number">00_2 / METHODOLOGY LAB</p>
          <h2>Inspect every<br /><em>input.</em></h2>
          <p>Paste a declared current-holdings dataset. The browser calculates the result immediately; nothing here asks you to trust an unexplained score.</p>
        </div>
        <div className="workbench">
          <div className="panel-label"><label htmlFor="input-json">Current-holdings JSON</label><span>EDITABLE / LIVE</span></div>
          <textarea id="input-json" spellCheck={false} value={source} onChange={(event) => setSource(event.target.value)} />
        </div>
        <div className="result" aria-live="polite">
          {calculation.error ? <div className="error"><span>Input incomplete</span>{calculation.error}</div> : calculation.result ? <>
            <div className="result-heading"><p className="result-label">Artist TDH / {calculation.result.methodology}</p><span>CALCULATED NOW</span></div>
            <div className="score-lockup"><strong className="score">{metric(calculation.result.tdh)}</strong><span>TOTAL<br />DAYS<br />HELD</span></div>
            <div className="metric-grid">
              <div><span>Collector identities</span><strong>{metric(calculation.result.collectorIdentities)}</strong></div>
              <div><span>Eligible projects</span><strong>{metric(calculation.result.eligibleProjects)}</strong></div>
              <div><span>Eligible works</span><strong>{metric(calculation.result.eligibleWorks)}</strong></div>
              <div><span>Raw collector-days</span><strong>{metric(calculation.result.rawCollectorDays)}</strong></div>
            </div>
            <div className="projects"><p className="projects-label">PROJECT BREAKDOWN</p>
              {calculation.result.projects.map((project, index) => <article key={project.id}>
                <b>{String(index + 1).padStart(2, "0")}</b><span>{project.label}</span>
                <small>{project.collectorIdentities} identities · median {metric(project.medianIdentityHoldDays)} days</small>
                <strong>{metric(project.score)}</strong>
              </article>)}
            </div>
          </> : null}
        </div>
      </section>

      <footer>
        <a className="footer-mark" href="#top">myTDH</a>
        <div><span>Public foundation / 2026</span><span>Methodology is evidence, not judgment.</span></div>
        <a href="https://github.com/maxand98/TDH">VIEW SOURCE ↗</a>
      </footer>
    </main>
  );
}
