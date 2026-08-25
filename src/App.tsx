import { useEffect, useMemo, useRef, useState } from "react";
import { calculateArtistTdh } from "./domain/artist-tdh";
import { DEMO_INPUT } from "./demo";

const formatter = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const metric = (value: number) => formatter.format(value);

const MAXAND98_FACES = [
  { family: "'Monoton', cursive", scale: ".72", spacing: ".02em" },
  { family: "'UnifrakturMaguntia', cursive", scale: ".95", spacing: "0" },
  { family: "'Press Start 2P', monospace", scale: ".5", spacing: "-.04em" },
  { family: "'Rye', serif", scale: ".78", spacing: "0" },
  { family: "'Yesteryear', cursive", scale: "1", spacing: "0" },
  { family: "'Bungee Inline', sans-serif", scale: ".74", spacing: "0" },
  { family: "'Faster One', system-ui", scale: ".74", spacing: "0" },
  { family: "'Rubik Glitch', system-ui", scale: ".84", spacing: "0" },
] as const;

function Maxand98Wordmark() {
  const wordmarkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const wordmark = wordmarkRef.current;
    if (!wordmark || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const base = wordmark.querySelector<HTMLElement>(".mx-wordmark-base");
    const glow = wordmark.querySelector<HTMLElement>(".mx-wordmark-glow");
    if (!base || !glow) return;

    MAXAND98_FACES.forEach(({ family }) => {
      void document.fonts.load(`400 100px ${family.split(",")[0]}`, "MAXAND98");
    });

    const colours = ["#fff", "rgba(255,255,255,.65)", "#bcd0ff", "#7e8cff", "#fff", "#dfe6ff"];
    const shuffledFaces = () => [...MAXAND98_FACES].sort(() => Math.random() - .5);
    const settle = () => {
      wordmark.style.removeProperty("font-family");
      wordmark.style.removeProperty("font-weight");
      wordmark.style.removeProperty("letter-spacing");
      wordmark.style.removeProperty("--mx-fs");
      base.style.removeProperty("color");
      glow.classList.remove("mx-sweep");
    };

    let phase: "rest" | "roll" | "spot" = "rest";
    let phaseStart: number | null = null;
    let cutIndex = -1;
    let fontRun = shuffledFaces();
    let frame = 0;
    const animate = (timestamp: number) => {
      frame = requestAnimationFrame(animate);
      const rect = wordmark.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
        if (phaseStart !== null) settle();
        phase = "rest";
        phaseStart = null;
        return;
      }
      if (phaseStart === null) {
        phaseStart = timestamp;
        return;
      }
      const elapsed = timestamp - phaseStart;
      if (phase === "rest") {
        if (elapsed >= 900) {
          phase = "roll";
          phaseStart = timestamp;
          fontRun = shuffledFaces();
          cutIndex = -1;
        }
        return;
      }
      if (phase === "roll") {
        const nextCut = Math.min(Math.floor(elapsed / 140), 18);
        if (nextCut !== cutIndex) {
          cutIndex = nextCut;
          const face = fontRun[nextCut % fontRun.length] ?? MAXAND98_FACES[0];
          wordmark.style.fontFamily = face.family;
          wordmark.style.fontWeight = "400";
          wordmark.style.letterSpacing = face.spacing;
          wordmark.style.setProperty("--mx-fs", face.scale);
          base.style.color = colours[Math.floor(Math.random() * colours.length)] ?? "#fff";
        }
        if (elapsed >= 2660) {
          settle();
          glow.classList.add("mx-sweep");
          phase = "spot";
          phaseStart = timestamp;
        }
        return;
      }
      if (elapsed >= 3350) {
        glow.classList.remove("mx-sweep");
        phase = "rest";
        phaseStart = timestamp;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      settle();
    };
  }, []);

  return <a ref={wordmarkRef} className="mx-wordmark" href="https://maxand98.com/" aria-label="maxand98 home">
    <span className="mx-wordmark-base">MAXAND98</span>
    <span className="mx-wordmark-glow" aria-hidden="true">MAXAND98</span>
  </a>;
}

export default function App() {
  const [source, setSource] = useState(() => JSON.stringify(DEMO_INPUT, null, 2));
  const [heroArtwork, setHeroArtwork] = useState<"fidenza" | "autoglyph" | "ringers" | "fragments" | "reas" | null>(null);
  const calculation = useMemo(() => {
    try {
      return { result: calculateArtistTdh(JSON.parse(source) as unknown), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Invalid input" };
    }
  }, [source]);

  const moveHeroLetter = (event: React.PointerEvent<HTMLSpanElement>) => {
    const letter = event.currentTarget;
    const bounds = letter.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    letter.style.setProperty("--letter-x", `${x * 12}px`);
    letter.style.setProperty("--letter-y", `${y * 8}px`);
    letter.style.setProperty("--letter-rx", `${y * -7}deg`);
    letter.style.setProperty("--letter-ry", `${x * 10}deg`);
  };

  const restHeroLetter = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.removeProperty("--letter-x");
    event.currentTarget.style.removeProperty("--letter-y");
    event.currentTarget.style.removeProperty("--letter-rx");
    event.currentTarget.style.removeProperty("--letter-ry");
    setHeroArtwork(null);
  };

  return (
    <main>
      <section className={`hero${heroArtwork ? ` is-${heroArtwork}` : ""}`} id="top">
        <div className="hero-art hero-art-fidenza" aria-hidden="true" />
        <div className="hero-art hero-art-autoglyph" aria-hidden="true" />
        <div className="hero-art hero-art-ringers" aria-hidden="true" />
        <div className="hero-art hero-art-fragments" aria-hidden="true" />
        <div className="hero-art hero-art-reas" aria-hidden="true" />
        <h1 className="hero-title" aria-label="my Total Days Held">
          <span
            className="hero-letter hero-letter-m"
            tabIndex={0}
            onPointerEnter={() => setHeroArtwork("fidenza")}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
            onFocus={() => setHeroArtwork("fidenza")}
            onBlur={() => setHeroArtwork(null)}
          >m</span>
          <span
            className="hero-letter hero-letter-y"
            tabIndex={0}
            onPointerEnter={() => setHeroArtwork("autoglyph")}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
            onFocus={() => setHeroArtwork("autoglyph")}
            onBlur={() => setHeroArtwork(null)}
          >y</span>
          <span
            className="hero-letter hero-letter-t"
            tabIndex={0}
            onPointerEnter={() => setHeroArtwork("ringers")}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
            onFocus={() => setHeroArtwork("ringers")}
            onBlur={() => setHeroArtwork(null)}
          >T</span>
          <span
            className="hero-letter hero-letter-d"
            tabIndex={0}
            onPointerEnter={() => setHeroArtwork("fragments")}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
            onFocus={() => setHeroArtwork("fragments")}
            onBlur={() => setHeroArtwork(null)}
          >D</span>
          <span
            className="hero-letter hero-letter-h"
            tabIndex={0}
            onPointerEnter={() => setHeroArtwork("reas")}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
            onFocus={() => setHeroArtwork("reas")}
            onBlur={() => setHeroArtwork(null)}
          >H</span>
        </h1>
        <div className="hero-foot">
          <p>A transparent holding-duration signal for any digital artist.</p>
          <a className="primary-link" href="#lab">Calculate yours</a>
          <p className="hero-index">ARTIST / OEUVRE / COLLECTOR / TIME</p>
        </div>
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
        <div className="footer-top">
          <a className="footer-mark" href="#top">myTDH</a>
          <div className="footer-meta"><span>Public foundation / 2026</span><span>Methodology is evidence, not judgment.</span></div>
          <a className="footer-source" href="https://github.com/maxand98/TDH">VIEW SOURCE</a>
        </div>
        <Maxand98Wordmark />
        <div className="footer-license">
          <span>A MAXAND98 PUBLIC INSTRUMENT</span>
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 · NO RIGHTS RESERVED</a>
        </div>
      </footer>
    </main>
  );
}
