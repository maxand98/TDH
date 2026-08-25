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

type RasterTdhResponse = {
  covered?: boolean;
  corpus?: string;
  message?: string;
  snapshotAt?: string;
  error?: string;
  artist?: {
    artist: string;
    otdh: number;
    collector_identities: number;
    projects: number;
    current_works: number;
    raw_collector_days: number;
    rank: number;
  };
};

const number = new Intl.NumberFormat("en-AU");

function CalculatePage() {
  const [profile, setProfile] = useState("");
  const [result, setResult] = useState<RasterTdhResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/raster-tdh?profile=${encodeURIComponent(profile)}`);
      const data = await response.json() as RasterTdhResponse;
      setResult(data);
    } catch {
      setResult({ error: "Unable to reach the TDH service" });
    } finally {
      setLoading(false);
    }
  };

  return <main className="calculate-page">
    <header className="calculate-header">
      <a href="/">myTDH</a>
      <span>RASTER PROFILE CALCULATOR</span>
    </header>
    <section className="calculate-stage">
      <h1>PASTE YOUR<br />RASTER PROFILE.</h1>
      <form onSubmit={(event) => { void calculate(event); }}>
        <label htmlFor="raster-profile">RASTER ARTIST PROFILE URL</label>
        <div className="profile-entry">
          <input id="raster-profile" type="url" inputMode="url" placeholder="https://www.raster.art/artist/casey-reas" value={profile} onChange={(event) => setProfile(event.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "READING" : "CALCULATE"}</button>
        </div>
      </form>
      <p className="coverage-note">CURRENT COVERAGE / AB[500] DECLARED CORPUS</p>
      {result ? <div className="profile-result" aria-live="polite">
        {result.artist ? <>
          <div className="profile-score">
            <span>{result.artist.artist}</span>
            <strong>{number.format(result.artist.otdh)}</strong>
            <small>ARTIST TDH</small>
          </div>
          <dl>
            <div><dt>COLLECTOR IDENTITIES</dt><dd>{number.format(result.artist.collector_identities)}</dd></div>
            <div><dt>PROJECTS</dt><dd>{number.format(result.artist.projects)}</dd></div>
            <div><dt>CURRENT WORKS</dt><dd>{number.format(result.artist.current_works)}</dd></div>
            <div><dt>RAW COLLECTOR-DAYS</dt><dd>{number.format(result.artist.raw_collector_days)}</dd></div>
          </dl>
          <p>{result.corpus} / SNAPSHOT {result.snapshotAt?.slice(0, 10)}</p>
        </> : <p className="profile-message">{result.error ?? result.message}</p>}
      </div> : null}
    </section>
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
      <h1>HOW TDH<br />IS CALCULATED.</h1>
      <p className="methodology-lede">TDH measures the duration and breadth of current independent collecting across an artist’s declared body of work. It is a holding-behaviour signal, not a judgment of artistic or financial value.</p>

      <section>
        <h2>THE PROJECT SCORE</h2>
        <p>For each project, the current uninterrupted holding time of every eligible work is measured in complete days. If one collector identity holds several works from that project, those holding times are averaged so that the identity contributes one observation.</p>
        <p className="methodology-formula">project TDH = median identity hold days × log₂(1 + collector identities)</p>
        <p>The median resists a few exceptionally old holdings. The logarithm rewards genuine collector breadth while reducing the effect of very large editions.</p>
      </section>

      <section>
        <h2>THE ARTIST SCORE</h2>
        <p>All eligible project scores are added, then divided by the square root of the number of projects. This allows a sustained body of work to contribute without making prolific release schedules dominate the result.</p>
        <p className="methodology-formula">artist TDH = sum of project TDH ÷ √ eligible projects</p>
      </section>

      <section>
        <h2>WHAT COUNTS</h2>
        <p>Only works still held at the declared snapshot count. A disposal ends the holding period; reacquisition begins a new one. Transfers between wallets belonging to one consolidated identity preserve the original acquisition date.</p>
        <p>Artist-controlled wallets, treasuries, burn addresses and unresolved custody are excluded or explicitly flagged. Price, sales volume, floor price, reputation and social attention have no weight.</p>
      </section>

      <section>
        <h2>COVERAGE</h2>
        <p>The public Raster-profile calculator currently resolves artists represented in the declared AB[500] corpus. An artist outside that corpus is reported as uncovered, never as a zero score.</p>
        <p>Every result identifies the formula as <code>artist-tdh/1</code>, names its corpus and gives its snapshot date, collector count, project count, work count and raw collector-days.</p>
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
