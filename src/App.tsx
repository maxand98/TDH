import { useMemo, useState } from "react";
import { calculateArtistTdh } from "./domain/artist-tdh";
import { DEMO_INPUT } from "./demo";

const formatter = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });

function metric(value: number): string {
  return formatter.format(value);
}

export default function App() {
  const [source, setSource] = useState(() => JSON.stringify(DEMO_INPUT, null, 2));
  const calculation = useMemo(() => {
    try {
      const input: unknown = JSON.parse(source);
      return { result: calculateArtistTdh(input), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Invalid input" };
    }
  }, [source]);

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="myTDH home">
          my<span>TDH</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#method">Method</a>
          <a href="#lab">Lab</a>
          <a href="https://github.com/maxand98/TDH">Source ↗</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">Holding, made legible</p>
        <h1>Your work.<br />Their time.</h1>
        <p className="lede">
          A transparent holding-duration signal for a digital artist&apos;s declared oeuvre.
          No prices. No volume. No invisible score.
        </p>
        <a className="primary-link" href="#lab">Test the methodology</a>
      </section>

      <section className="method" id="method">
        <div>
          <p className="section-number">01 / METHOD</p>
          <h2>Duration and breadth,<br />with supply resistance.</h2>
        </div>
        <div className="method-copy">
          <p>
            Each project uses the median uninterrupted holding duration across current collector
            identities, multiplied by logarithmic collector breadth. Project scores are combined
            with diminishing returns for prolific release schedules.
          </p>
          <dl>
            <div><dt>Counts</dt><dd>Current uninterrupted holding</dd></div>
            <div><dt>Resists</dt><dd>Supply, duplicates, self-holding</dd></div>
            <div><dt>Excludes</dt><dd>Price, volume, reputation</dd></div>
            <div><dt>Publishes</dt><dd>Formula, inputs, coverage</dd></div>
          </dl>
        </div>
      </section>

      <section className="lab" id="lab">
        <div className="lab-heading">
          <p className="section-number">02 / METHODOLOGY LAB</p>
          <h2>Inspect every input.</h2>
          <p>
            This first foundation calculates a deterministic result from current holdings. Chain
            discovery and background indexing are the next implementation layer.
          </p>
        </div>

        <div className="workbench">
          <label htmlFor="input-json">Current-holdings JSON</label>
          <textarea
            id="input-json"
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>

        <div className="result" aria-live="polite">
          {calculation.error ? (
            <div className="error"><span>Input incomplete</span>{calculation.error}</div>
          ) : calculation.result ? (
            <>
              <p className="result-label">Artist TDH / {calculation.result.methodology}</p>
              <strong className="score">{metric(calculation.result.tdh)}</strong>
              <div className="metric-grid">
                <div><span>Collector identities</span><strong>{metric(calculation.result.collectorIdentities)}</strong></div>
                <div><span>Eligible projects</span><strong>{metric(calculation.result.eligibleProjects)}</strong></div>
                <div><span>Eligible works</span><strong>{metric(calculation.result.eligibleWorks)}</strong></div>
                <div><span>Raw collector-days</span><strong>{metric(calculation.result.rawCollectorDays)}</strong></div>
              </div>
              <div className="projects">
                {calculation.result.projects.map((project) => (
                  <article key={project.id}>
                    <span>{project.label}</span>
                    <strong>{metric(project.score)}</strong>
                    <small>{project.collectorIdentities} identities · median {metric(project.medianIdentityHoldDays)} days</small>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <footer>
        <span>myTDH / public foundation</span>
        <span>Methodology is evidence, not judgment.</span>
      </footer>
    </main>
  );
}
