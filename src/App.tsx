import { useEffect, useRef, useState } from "react";
const IDLE_DELAY_MS = 7_000;
const FALLBACK_SCREENSAVER_IMAGES = [
  "/fidenza-hover.webp",
  "/ringers-hover.webp",
  "/fragments-hover.webp",
  "/reas-hover.webp",
];

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

function IdleScreensaver() {
  const [images, setImages] = useState(FALLBACK_SCREENSAVER_IMAGES);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://ab5d.xyz/api/holdings")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((data: { holdings?: Array<{ image?: unknown }> }) => {
        if (cancelled) return;
        const collectionImages = (data.holdings ?? [])
          .map((holding) => holding.image)
          .filter((image): image is string => typeof image === "string" && image.startsWith("https://"));
        if (collectionImages.length) setImages(collectionImages);
      })
      .catch(() => { /* Local collection works remain available as a resilient fallback. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let activityVersion = 0;
    const arm = () => {
      const version = ++activityVersion;
      window.clearTimeout(timer);
      setActiveImage(null);
      timer = window.setTimeout(() => {
        const next = images[Math.floor(Math.random() * images.length)];
        if (!next) return;
        const preloader = new Image();
        preloader.onload = () => {
          if (version === activityVersion) setActiveImage(next);
        };
        preloader.onerror = () => {
          const fallback = FALLBACK_SCREENSAVER_IMAGES[Math.floor(Math.random() * FALLBACK_SCREENSAVER_IMAGES.length)];
          if (version === activityVersion && fallback) setActiveImage(fallback);
        };
        preloader.src = next;
      }, IDLE_DELAY_MS);
    };
    const events: Array<keyof WindowEventMap> = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, arm, { passive: true }));
    arm();
    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, arm));
    };
  }, [images]);

  return <div className={`screensaver${activeImage ? " is-active" : ""}`} aria-hidden="true">
    {activeImage ? <img src={activeImage} alt="" /> : null}
  </div>;
}

type RasterCollector = {
  name: string;
  address: string;
  works_held: number;
  raw_work_days: number;
  first_acquired_at: string | null;
  last_acquired_at: string | null;
  tdh: number;
  daily_rate: number;
  rank: number;
};

type RasterTdhResponse = {
  covered?: boolean;
  message?: string;
  snapshotAt?: string;
  error?: string;
  metric?: { id: string; label: string };
  artist?: {
    name: string;
    raster_url: string;
  };
  corpus?: {
    name: string;
    artworks: number;
    tokens: number;
    eligible_collector_addresses: number;
    reference_artwork_size: number;
  };
  method?: { definition: string; edition_weight_formula: string; exclusions: string };
  collectors?: RasterCollector[];
  pagination?: { total: number };
};

const number = new Intl.NumberFormat("en-AU");
const COLLECTORS_PER_PAGE = 100;

function CalculatePage() {
  const [profile, setProfile] = useState("");
  const [result, setResult] = useState<RasterTdhResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collectorQuery, setCollectorQuery] = useState("");
  const [collectorPage, setCollectorPage] = useState(0);

  const calculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setCollectorPage(0);
    setCollectorQuery("");
    try {
      const response = await fetch(`/api/raster-collector-tdh?profile=${encodeURIComponent(profile)}&limit=5000`);
      const data = await response.json() as RasterTdhResponse;
      setResult(data);
    } catch {
      setResult({ error: "Unable to reach the TDH service" });
    } finally {
      setLoading(false);
    }
  };

  const collectors = (result?.collectors ?? []).filter((collector) => {
    const query = collectorQuery.trim().toLowerCase();
    return !query || collector.name.toLowerCase().includes(query) || collector.address.toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(collectors.length / COLLECTORS_PER_PAGE));
  const visibleCollectors = collectors.slice(collectorPage * COLLECTORS_PER_PAGE, (collectorPage + 1) * COLLECTORS_PER_PAGE);

  return <main className="calculate-page">
    <header className="calculate-header">
      <a href="/">myTDH</a>
      <span>RASTER COLLECTOR REGISTER</span>
    </header>
    <section className="calculate-intro">
      <div className="calculate-stage">
        <h1>ENTER YOUR<br />RASTER URL.</h1>
        <form onSubmit={(event) => { void calculate(event); }}>
          <label htmlFor="raster-profile">RASTER ARTIST PROFILE URL</label>
          <div className="profile-entry">
            <input id="raster-profile" type="url" inputMode="url" placeholder="https://www.raster.art/artist/casey-reas" value={profile} onChange={(event) => setProfile(event.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? "READING" : "BUILD REGISTER"}</button>
          </div>
        </form>
        <p className="coverage-note">CURRENT COVERAGE / VERIFIED RASTER-INDEXED OEUVRES</p>
      </div>
    </section>
    {result ? <section className="profile-result" aria-live="polite">
      {result.artist && result.corpus && result.metric ? <>
        <div className="register-title">
          <div>
            <h2>{result.artist.name}</h2>
            <a href="/methodology">{result.metric.label} / ARTIST-SPECIFIC abTDH</a>
          </div>
          <strong>{number.format(result.corpus.eligible_collector_addresses)}</strong>
          <span>ELIGIBLE COLLECTOR ADDRESSES</span>
        </div>
        <p className="register-explainer">Every current collector is shown. Each score adds uninterrupted days held across the artist’s Raster-indexed oeuvre, with smaller editions receiving proportionally more weight. This is an artist-specific equivalent of abTDH, not oTDH.</p>
        <dl>
          <div><dt>INDEXED ARTWORKS</dt><dd>{number.format(result.corpus.artworks)}</dd></div>
          <div><dt>INDEXED TOKENS</dt><dd>{number.format(result.corpus.tokens)}</dd></div>
          <div><dt>REFERENCE EDITION</dt><dd>{number.format(result.corpus.reference_artwork_size)}</dd></div>
          <div><dt>SNAPSHOT</dt><dd>{result.snapshotAt?.slice(0, 10)}</dd></div>
        </dl>
        <div className="collector-controls">
          <label htmlFor="collector-query">SEARCH THE ENTIRE COLLECTOR CORPUS</label>
          <input id="collector-query" type="search" placeholder="COLLECTOR OR WALLET" value={collectorQuery} onChange={(event) => { setCollectorQuery(event.target.value); setCollectorPage(0); }} />
        </div>
        <div className="collector-table-wrap">
          <table className="collector-table">
            <thead><tr><th>RANK</th><th>COLLECTOR</th><th>{result.metric.label}</th><th>WORKS</th><th>EARLIEST CURRENT HOLD</th><th>POINTS / DAY</th></tr></thead>
            <tbody>{visibleCollectors.map((collector) => <tr key={collector.address}>
              <td>{number.format(collector.rank)}</td>
              <td><b>{collector.name}</b><span>{collector.address}</span></td>
              <td>{number.format(collector.tdh)}</td>
              <td>{number.format(collector.works_held)}</td>
              <td>{collector.first_acquired_at?.slice(0, 10) ?? "NOT RECORDED"}</td>
              <td>{number.format(collector.daily_rate)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="collector-pagination">
          <button type="button" disabled={collectorPage === 0} onClick={() => setCollectorPage((page) => Math.max(0, page - 1))}>PREVIOUS 100</button>
          <p>PAGE {number.format(collectorPage + 1)} OF {number.format(pageCount)} / {number.format(collectors.length)} MATCHING COLLECTORS</p>
          <button type="button" disabled={collectorPage + 1 >= pageCount} onClick={() => setCollectorPage((page) => Math.min(pageCount - 1, page + 1))}>NEXT 100</button>
        </div>
      </> : <p className="profile-message">{result.error ?? result.message}</p>}
    </section> : null}
    <SiteFooter />
  </main>;
}

function SiteFooter() {
  return <footer>
    <div className="footer-license">
      <span>myTDH · MMXXVI</span>
      <Maxand98Wordmark />
      <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 · NO RIGHTS RESERVED</a>
    </div>
  </footer>;
}

function MethodologyPage() {
  return <main className="methodology-page">
    <header className="calculate-header">
      <a href="/">myTDH</a>
      <a href="/calculate">Calculate yours</a>
    </header>
    <article className="methodology-copy">
      <h1>HOW THE REGISTER<br />IS CALCULATED.</h1>
      <p className="methodology-lede">The calculator creates an artist-specific equivalent of AB5D’s abTDH: a collector register built from uninterrupted holding time and edition-size weighting. It is not oTDH and it is not an artist score.</p>

      <section>
        <h2>EACH CURRENT WORK</h2>
        <p>For every work still held at the snapshot, complete uninterrupted days are measured from Raster’s last-acquired timestamp. A disposal ends that interval; reacquisition begins a new one.</p>
        <p className="methodology-formula">work contribution = complete days held × edition weight</p>
      </section>

      <section>
        <h2>EDITION WEIGHT</h2>
        <p>The largest indexed artwork in the artist’s declared Raster oeuvre is the reference edition. Each artwork’s weight is the reference size divided by that artwork’s indexed edition size, rounded to two decimal places. This is the same supply-resistance principle used by abTDH, applied within one artist’s oeuvre.</p>
        <p className="methodology-formula">edition weight = largest indexed edition ÷ artwork indexed edition</p>
      </section>

      <section>
        <h2>THE COLLECTOR SCORE</h2>
        <p>All weighted work contributions held by one current ownership address are added. The result is that collector’s artist-specific TDH. The register shows every eligible collector address, its current works, earliest current acquisition and points earned per additional day.</p>
        <p className="methodology-formula">collector artist-TDH = Σ weighted current-work days</p>
      </section>

      <section>
        <h2>BOUNDARIES</h2>
        <p>The corpus is the artist’s verified Raster-indexed oeuvre. Raster-listed artist addresses and identified marketplace custody are excluded. Each ownership address is reported independently; a named Raster collector is shown where available.</p>
        <p>Price, sales volume, floor price, reputation and artistic judgment have no input. Every result identifies the formula as <code>raster-artist-abtdh/1</code>, names the corpus and publishes the full collector register.</p>
      </section>
    </article>
    <SiteFooter />
  </main>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/calculate") return <CalculatePage />;
  if (path === "/methodology") return <MethodologyPage />;
  const moveHeroLetter = (event: React.PointerEvent<HTMLSpanElement>) => {
    const letter = event.currentTarget;
    const bounds = letter.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    letter.style.setProperty("--letter-x", `${x * 12}px`);
    letter.style.setProperty("--letter-y", `${y * 8}px`);
  };

  const restHeroLetter = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.removeProperty("--letter-x");
    event.currentTarget.style.removeProperty("--letter-y");
  };

  return (
    <main>
      <IdleScreensaver />
      <section className="hero" id="top">
        <h1 className="hero-title" aria-label="my Total Days Held">
          <span
            className="hero-letter hero-letter-m"
            tabIndex={0}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
          >m</span>
          <span
            className="hero-letter hero-letter-y"
            tabIndex={0}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
          >y</span>
          <span
            className="hero-letter hero-letter-t"
            tabIndex={0}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
          >T</span>
          <span
            className="hero-letter hero-letter-d"
            tabIndex={0}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
          >D</span>
          <span
            className="hero-letter hero-letter-h"
            tabIndex={0}
            onPointerMove={moveHeroLetter}
            onPointerLeave={restHeroLetter}
          >H</span>
        </h1>
        <div className="hero-foot">
          <p><a href="/methodology">A transparent holding-duration signal for any digital artist.</a></p>
          <a className="primary-link" href="/calculate">Calculate yours</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
