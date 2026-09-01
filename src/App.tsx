import { useEffect, useRef, useState } from "react";
const IDLE_DELAY_MS = 5_000;
const SCREENSAVER_TRAIL_SPACING_PX = 1.25;
const CALCULATE_DODGE_LIMIT = 3;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  useEffect(() => {
    if (!activeImage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const item = itemRef.current;
    const image = imageRef.current;
    if (!container || !canvas || !item || !image) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const state = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      width: 0,
      height: 0,
      velocityX: 176 * Math.cos(Math.PI / 4),
      velocityY: 176 * Math.sin(Math.PI / 4),
      lastTime: 0,
    };
    let frame = 0;

    const updateItemSize = () => {
      const rect = item.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;
      state.x = Math.max(0, Math.min(state.x, container.clientWidth - state.width));
      state.y = Math.max(0, Math.min(state.y, container.clientHeight - state.height));
      state.lastX = state.x;
      state.lastY = state.y;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(container.clientWidth * dpr);
      canvas.height = Math.round(container.clientHeight * dpr);
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#050505";
      context.fillRect(0, 0, container.clientWidth, container.clientHeight);
      updateItemSize();
    };

    const drawTrail = () => {
      if (!image.complete || !image.naturalWidth || !state.width || !state.height) return;
      const distance = Math.hypot(state.x - state.lastX, state.y - state.lastY);
      const steps = Math.max(1, Math.ceil(distance / SCREENSAVER_TRAIL_SPACING_PX));
      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const x = state.lastX + (state.x - state.lastX) * progress;
        const y = state.lastY + (state.y - state.lastY) * progress;
        context.drawImage(image, x, y, state.width, state.height);
      }
    };

    const animate = (time: number) => {
      const delta = state.lastTime ? Math.min(time - state.lastTime, 33.3) / 1000 : 0;
      state.lastTime = time;
      state.lastX = state.x;
      state.lastY = state.y;
      state.x += state.velocityX * delta;
      state.y += state.velocityY * delta;
      const maxX = Math.max(0, container.clientWidth - state.width);
      const maxY = Math.max(0, container.clientHeight - state.height);
      if (state.x <= 0 || state.x >= maxX) {
        state.velocityX *= -1;
        state.x = Math.max(0, Math.min(state.x, maxX));
      }
      if (state.y <= 0 || state.y >= maxY) {
        state.velocityY *= -1;
        state.y = Math.max(0, Math.min(state.y, maxY));
      }
      item.style.transform = `translate3d(${state.x}px,${state.y}px,0)`;
      drawTrail();
      frame = requestAnimationFrame(animate);
    };

    image.addEventListener("load", updateItemSize);
    window.addEventListener("resize", resize);
    resize();
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      image.removeEventListener("load", updateItemSize);
      window.removeEventListener("resize", resize);
    };
  }, [activeImage, images]);

  return <div ref={containerRef} className={`screensaver${activeImage ? " is-active" : ""}`} aria-hidden="true">
    <canvas ref={canvasRef} className="screensaver-canvas" />
    {activeImage ? <div ref={itemRef} className="screensaver-item">
      <img ref={imageRef} src={activeImage} alt="" />
    </div> : null}
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
  methodology?: string;
  profile?: string;
  slug?: string;
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
  cache?: {
    source: "bundled" | "generated";
    age_seconds: number;
    max_age_seconds: number;
    stale: boolean;
    revalidating?: boolean;
  };
};

type RasterRegisterJob = {
  id?: string;
  slug?: string;
  state: "queued" | "running" | "complete" | "errored";
  stage?: "queued" | "oeuvre" | "tokens" | "owners" | "collectors" | "calculating" | "complete" | "errored";
  message?: string;
  completed?: number;
  total?: number | null;
  updatedAt?: string;
  jobUrl?: string;
  resultUrl?: string;
  cached?: boolean;
  stale?: boolean;
  snapshotAt?: string;
  refreshing?: boolean;
  refreshJobUrl?: string;
  error?: string;
};

const number = new Intl.NumberFormat("en-AU");
const COLLECTORS_PER_PAGE = 100;

function Celebration({ run }: { run: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!run || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const colors = ["#ffffff", "#ef3e24", "#ffca3a", "#7bc8ff", "#d98cff"];
    const particles = Array.from({ length: 320 }, (_, index) => {
      const burst = index % 8;
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 260;
      return {
        x: window.innerWidth * (.12 + (burst / 7) * .76),
        y: window.innerHeight * (.12 + Math.random() * .42),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        delay: burst * 90,
        color: colors[index % colors.length]!,
        size: 1.5 + Math.random() * 3.5,
      };
    });
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const started = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      const elapsed = time - started;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((particle) => {
        const age = elapsed - particle.delay;
        if (age < 0 || age > 1700) return;
        const seconds = age / 1000;
        const opacity = Math.max(0, 1 - age / 1700);
        const x = particle.x + particle.vx * seconds;
        const y = particle.y + particle.vy * seconds + 145 * seconds * seconds;
        context.globalAlpha = opacity;
        context.fillStyle = particle.color;
        context.fillRect(x, y, particle.size, particle.size * 2.4);
      });
      context.globalAlpha = 1;
      if (elapsed < 2350) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [run]);

  return <canvas ref={canvasRef} className="celebration" aria-hidden="true" />;
}

function downloadExport(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownCell(value: string | number | null) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function CalculatePage() {
  const initialArtist = new URLSearchParams(window.location.search).get("artist") ?? "";
  const [profile, setProfile] = useState(initialArtist);
  const [result, setResult] = useState<RasterTdhResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collectorQuery, setCollectorQuery] = useState("");
  const [collectorPage, setCollectorPage] = useState(0);
  const [celebrationRun, setCelebrationRun] = useState(0);
  const [apiCopied, setApiCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [job, setJob] = useState<RasterRegisterJob | null>(null);
  const calculationRun = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (!initialArtist || autoSubmitted.current) return;
    autoSubmitted.current = true;
    formRef.current?.requestSubmit();
  }, [initialArtist]);

  const loadRegister = async (resultUrl: string, run: number, celebrate = true) => {
    const response = await fetch(resultUrl);
    const data = await response.json() as RasterTdhResponse;
    if (run !== calculationRun.current) return;
    setResult(data);
    if (celebrate && data.artist && data.collectors) {
      setCelebrationRun((value) => value + 1);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }));
    }
  };

  const refreshCachedRegister = async (statusUrl: string, resultUrl: string, run: number) => {
    try {
      let current: RasterRegisterJob = { state: "queued", jobUrl: statusUrl };
      while (run === calculationRun.current && current.state !== "complete" && current.state !== "errored") {
        await new Promise((resolve) => window.setTimeout(resolve, current.state === "queued" ? 1_500 : 2_500));
        const response = await fetch(statusUrl);
        current = await response.json() as RasterRegisterJob;
      }
      if (run !== calculationRun.current) return;
      if (current.state === "complete") {
        await new Promise((resolve) => window.setTimeout(resolve, 1_500));
        await loadRegister(resultUrl, run, false);
      } else {
        setResult((value) => value?.cache ? { ...value, cache: { ...value.cache, revalidating: false } } : value);
      }
    } catch {
      if (run === calculationRun.current) {
        setResult((value) => value?.cache ? { ...value, cache: { ...value.cache, revalidating: false } } : value);
      }
    }
  };

  const pollJob = async (initial: RasterRegisterJob, run: number) => {
    let current = initial;
    const statusUrl = initial.jobUrl;
    if (!statusUrl) throw new Error("The register job did not provide a status URL");
    while (run === calculationRun.current && current.state !== "complete" && current.state !== "errored") {
      await new Promise((resolve) => window.setTimeout(resolve, current.state === "queued" ? 1_500 : 2_500));
      const response = await fetch(statusUrl);
      const update = await response.json() as RasterRegisterJob;
      current = { ...update, jobUrl: update.jobUrl ?? statusUrl };
      if (run !== calculationRun.current) return;
      setJob(current);
    }
    if (run !== calculationRun.current) return;
    if (current.state === "errored") throw new Error(current.error || "The collector register could not be completed");
    if (!current.resultUrl) throw new Error("The completed register did not provide a result URL");
    await loadRegister(current.resultUrl, run);
  };

  const calculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const run = calculationRun.current + 1;
    calculationRun.current = run;
    setLoading(true);
    setResult(null);
    setJob(null);
    setCollectorPage(0);
    setCollectorQuery("");
    try {
      const response = await fetch("/api/raster-collector-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await response.json() as RasterRegisterJob;
      if (!response.ok || data.error) throw new Error(data.error || "Unable to start the collector map");
      if (run !== calculationRun.current) return;
      if (data.slug) window.history.replaceState(null, "", `/calculate?artist=${encodeURIComponent(data.slug)}`);
      setJob(data);
      if (data.state === "complete") {
        if (!data.resultUrl) throw new Error("The cached register did not provide a result URL");
        await loadRegister(data.resultUrl, run);
        if (data.refreshing && data.refreshJobUrl) {
          void refreshCachedRegister(data.refreshJobUrl, data.resultUrl, run);
        }
      } else {
        await pollJob(data, run);
      }
    } catch (error) {
      if (run !== calculationRun.current) return;
      setResult({ error: error instanceof Error ? error.message : "Unable to reach the TDH service" });
    } finally {
      if (run === calculationRun.current) setLoading(false);
    }
  };

  const collectors = (result?.collectors ?? []).filter((collector) => {
    const query = collectorQuery.trim().toLowerCase();
    return !query || collector.name.toLowerCase().includes(query) || collector.address.toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(collectors.length / COLLECTORS_PER_PAGE));
  const visibleCollectors = collectors.slice(collectorPage * COLLECTORS_PER_PAGE, (collectorPage + 1) * COLLECTORS_PER_PAGE);
  const exportSlug = result?.artist?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artist";
  const apiUrl = `${window.location.origin}/api/raster-collector-tdh?profile=${encodeURIComponent(result?.profile ?? profile)}&limit=5000`;
  const resultSlug = result?.slug ?? result?.profile?.split("/artist/")[1]?.replace(/\/$/, "") ?? "";
  const shareUrl = `${window.location.origin}/calculate?artist=${encodeURIComponent(resultSlug)}`;

  const exportJson = () => {
    if (result) downloadExport(`${exportSlug}-mytdh.json`, `${JSON.stringify(result, null, 2)}\n`, "application/json");
  };

  const exportCsv = () => {
    if (!result?.collectors) return;
    const header = ["rank", "collector_name", "address", "artist_tdh", "works_held", "raw_work_days", "earliest_current_hold", "latest_current_hold", "points_per_day"];
    const rows = result.collectors.map((collector) => [collector.rank, collector.name, collector.address, collector.tdh, collector.works_held, collector.raw_work_days, collector.first_acquired_at, collector.last_acquired_at, collector.daily_rate]);
    downloadExport(`${exportSlug}-mytdh.csv`, `${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "text/csv;charset=utf-8");
  };

  const exportMarkdown = () => {
    if (!result?.collectors || !result.artist || !result.corpus || !result.metric) return;
    const header = ["Rank", "Collector", "Address", result.metric.label, "Works", "Earliest current hold", "Points / day"];
    const separator = header.map(() => "---");
    const rows = result.collectors.map((collector) => [collector.rank, collector.name, collector.address, collector.tdh, collector.works_held, collector.first_acquired_at?.slice(0, 10) ?? "Not recorded", collector.daily_rate]);
    const table = [header, separator, ...rows].map((row) => `| ${row.map(markdownCell).join(" | ")} |`).join("\n");
    const content = `# ${result.artist.name} collector TDH\n\n` +
      `- Snapshot: ${result.snapshotAt?.slice(0, 10) ?? "Not recorded"}\n` +
      `- Eligible collector addresses: ${result.corpus.eligible_collector_addresses}\n` +
      `- Indexed artworks: ${result.corpus.artworks}\n` +
      `- Indexed tokens: ${result.corpus.tokens}\n` +
      `- Raster profile: ${result.artist.raster_url}\n` +
      `- Shareable register: ${shareUrl}\n\n${table}\n`;
    downloadExport(`${exportSlug}-mytdh.md`, content, "text/markdown;charset=utf-8");
  };

  const copyApiUrl = async () => {
    await navigator.clipboard.writeText(apiUrl);
    setApiCopied(true);
    window.setTimeout(() => setApiCopied(false), 1800);
  };

  const shareRegister = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${result?.artist?.name ?? "Artist"} collector TDH`, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  };

  return <main className="calculate-page">
    <Celebration run={celebrationRun} />
    <header className="calculate-header">
      <a className="back-chevron" href="/" aria-label="Back to myTDH home">‹</a>
    </header>
    <section className="calculate-intro">
      <div className="calculate-stage">
        <h1>ENTER AN ARTIST</h1>
        <form ref={formRef} onSubmit={(event) => { void calculate(event); }}>
          <label htmlFor="raster-profile">ARTIST NAME OR RASTER PROFILE URL</label>
          <div className="profile-entry">
            <input id="raster-profile" type="text" placeholder="e.g. Joe Pease" value={profile} onChange={(event) => setProfile(event.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? "MAPPING" : "MAP YOUR MOST LOYAL COLLECTORS"}</button>
          </div>
        </form>
        {loading && job ? <div className="register-loading" role="status" aria-live="polite">
          <div className="register-loading-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div>
            <strong>{job.message ?? "Mapping the Raster oeuvre"}</strong>
            <p>{job.total ? `${number.format(job.completed ?? 0)} / ${number.format(job.total)}` : "THIS MAY TAKE A FEW MINUTES"}</p>
            <div className="register-progress"><span style={{ width: job.total ? `${Math.max(2, Math.min(100, ((job.completed ?? 0) / job.total) * 100))}%` : "18%" }} /></div>
          </div>
        </div> : null}
      </div>
    </section>
    {result ? <section ref={resultRef} className="profile-result" aria-live="polite">
      {result.artist && result.corpus && result.metric ? <>
        <div className="register-title">
          <div>
            <h2>{result.artist.name}</h2>
            <span className="metric-label"><a href="/methodology">{result.metric.label} / ARTIST-SPECIFIC&nbsp;</a><b>TDH</b></span>
          </div>
          <strong>{number.format(result.corpus.eligible_collector_addresses)}</strong>
          <span>ELIGIBLE COLLECTOR ADDRESSES</span>
        </div>
        <div className="register-explainer">Every current collector is shown. Each score adds uninterrupted days held across the artist’s Raster-indexed oeuvre, with smaller editions receiving proportionally more weight.</div>
        {result.cache?.revalidating ? <p className="register-cache-state" role="status">Cached snapshot shown immediately. Updating it in the background.</p> : null}
        <dl>
          <div><dt>INDEXED ARTWORKS</dt><dd>{number.format(result.corpus.artworks)}</dd></div>
          <div><dt>INDEXED TOKENS</dt><dd>{number.format(result.corpus.tokens)}</dd></div>
          <div><dt>REFERENCE EDITION</dt><dd>{number.format(result.corpus.reference_artwork_size)}</dd></div>
          <div><dt>SNAPSHOT</dt><dd>{result.snapshotAt?.slice(0, 10)}</dd></div>
        </dl>
        <div className="register-actions" aria-label="Export collector register">
          <button type="button" onClick={exportJson}>EXPORT JSON</button>
          <button type="button" onClick={exportCsv}>EXPORT CSV</button>
          <button type="button" onClick={exportMarkdown}>EXPORT MARKDOWN</button>
          <button type="button" onClick={() => { void shareRegister(); }}>{shareCopied ? "SHARE URL COPIED" : "SHARE LIST"}</button>
          <button type="button" onClick={() => { void copyApiUrl(); }}>{apiCopied ? "API URL COPIED" : "COPY API URL"}</button>
        </div>
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
      <Maxand98Wordmark />
      <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 · NO RIGHTS RESERVED</a>
    </div>
  </footer>;
}

function DodgeCalculateLink() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const dodgeCountRef = useRef(0);
  const usedPositionsRef = useRef<number[]>([]);
  const lastPointerTypeRef = useRef("");
  const [dodgeCount, setDodgeCount] = useState(0);

  const dodge = (event: React.PointerEvent<HTMLAnchorElement>) => {
    lastPointerTypeRef.current = event.pointerType;
    if (event.pointerType !== "mouse" || dodgeCountRef.current >= CALCULATE_DODGE_LIMIT || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const link = linkRef.current;
    const hero = link?.closest<HTMLElement>(".hero");
    if (!link || !hero) return;
    const linkBounds = link.getBoundingClientRect();
    const heroBounds = hero.getBoundingClientRect();
    const availableWidth = Math.max(0, heroBounds.width - linkBounds.width - 32);
    const availableHeight = Math.max(0, heroBounds.height - linkBounds.height - 32);
    const positions = [
      [.04, .08], [.48, .06], [.96, .1],
      [.08, .62], [.5, .56], [.96, .64],
    ] as const;
    const candidates = positions
      .map(([x, y], index) => ({
        index,
        left: heroBounds.left + 16 + availableWidth * x,
        top: heroBounds.top + 16 + availableHeight * y,
      }))
      .filter(({ index }) => !usedPositionsRef.current.includes(index))
      .sort((a, b) => Math.hypot(b.left - event.clientX, b.top - event.clientY) - Math.hypot(a.left - event.clientX, a.top - event.clientY));
    const target = candidates[0] ?? positions.map(([x, y], index) => ({
      index,
      left: heroBounds.left + 16 + availableWidth * x,
      top: heroBounds.top + 16 + availableHeight * y,
    })).sort((a, b) => Math.hypot(b.left - event.clientX, b.top - event.clientY) - Math.hypot(a.left - event.clientX, a.top - event.clientY))[0];
    if (!target) return;
    usedPositionsRef.current.push(target.index);
    const currentX = Number(link.dataset.dodgeX ?? 0);
    const currentY = Number(link.dataset.dodgeY ?? 0);
    const nextX = currentX + target.left - linkBounds.left;
    const nextY = currentY + target.top - linkBounds.top;
    link.dataset.dodgeX = String(nextX);
    link.dataset.dodgeY = String(nextY);
    link.style.setProperty("--dodge-x", `${nextX}px`);
    link.style.setProperty("--dodge-y", `${nextY}px`);
    dodgeCountRef.current += 1;
    setDodgeCount(dodgeCountRef.current);
  };

  const status = dodgeCount === 1 ? "TOO SLOW" : dodgeCount === 2 ? "SO CLOSE" : dodgeCount === 3 ? "OK, YOU WIN" : "";

  return <a
    ref={linkRef}
    className={`calculate-dodge${dodgeCount === CALCULATE_DODGE_LIMIT ? " is-caught" : ""}`}
    href="/calculate"
    aria-label="Calculate yours"
    onPointerEnter={dodge}
    onPointerDown={(event) => {
      lastPointerTypeRef.current = event.pointerType;
      if (event.pointerType === "mouse" && dodgeCountRef.current < CALCULATE_DODGE_LIMIT) event.preventDefault();
    }}
    onClick={(event) => {
      if (lastPointerTypeRef.current === "mouse" && dodgeCountRef.current < CALCULATE_DODGE_LIMIT) event.preventDefault();
    }}
  >
    <span>CALCULATE<br />YOURS</span>
    {status ? <small aria-live="polite">{status}</small> : null}
  </a>;
}

function MethodologyPage() {
  return <main className="methodology-page">
    <header className="calculate-header">
      <a className="back-chevron" href="/" aria-label="Back to myTDH home">‹</a>
      <a href="/calculate">Calculate yours</a>
    </header>
    <article className="methodology-copy">
      <h1>HOW THE REGISTER<br />IS CALCULATED.</h1>
      <p className="methodology-lede">TDH is a points score built from uninterrupted holding time. It rewards current holdings that have been held longer and gives scarcer works more weight. It is not a literal count of days, a price signal or an artist ranking.</p>

      <section>
        <h2>THE CORPUS</h2>
        <div className="methodology-detail">
          <p>The calculation begins with every artwork and token currently indexed under the artist on Raster. An artwork is included only when Raster supplies at least one indexed token.</p>
          <p>For each artwork, its indexed edition size is the larger of Raster’s declared edition size, the number of indexed tokens, or one. This prevents a partially indexed edition from being treated as artificially scarce.</p>
          <p className="methodology-formula">indexed edition size = max(declared edition size, indexed tokens, 1)</p>
        </div>
      </section>

      <section>
        <h2>EACH CURRENT WORK</h2>
        <div className="methodology-detail">
          <p>For every token or edition copy still held at the snapshot, complete uninterrupted days are measured from Raster’s last-acquired timestamp. Partial days are discarded. A disposal ends that interval; reacquisition begins a new one.</p>
          <p>Every copy counts. If an address holds two copies of the same edition, both copies contribute holding days and both add the artwork’s weight to that collector’s points per day.</p>
          <p className="methodology-formula">copy days = floor((snapshot time − last acquired time) ÷ 24 hours)</p>
        </div>
      </section>

      <section>
        <h2>EDITION WEIGHT</h2>
        <div className="methodology-detail">
          <p>The largest indexed artwork in the artist’s Raster oeuvre becomes the reference edition. Each artwork’s weight is the reference size divided by that artwork’s indexed edition size, rounded to two decimal places.</p>
          <p>A 1/1 therefore receives the full reference weight. A work from an edition half the reference size receives a weight of two. A work from the reference edition receives a weight of one.</p>
          <p className="methodology-formula">edition weight = round₂(reference edition size ÷ artwork indexed edition size)</p>
        </div>
      </section>

      <section>
        <h2>THE COLLECTOR SCORE</h2>
        <div className="methodology-detail">
          <p>For each artwork, the complete holding days of all copies owned by the address are added and multiplied by that artwork’s weight. That artwork contribution is rounded to the nearest whole point. All artwork contributions are then added to produce the collector’s TDH.</p>
          <p>The register’s works figure counts individual tokens or edition copies, not only distinct artwork titles. Points per day is the amount the score gains after one more complete day if the holdings do not change.</p>
          <p className="methodology-formula">artwork contribution = round(Σ copy days × edition weight)<br />collector TDH = Σ artwork contributions<br />points per day = round(Σ edition weight × copies held)</p>
        </div>
      </section>

      <section>
        <h2>A WORKED EXAMPLE</h2>
        <div className="methodology-detail methodology-example-wrap">
          <p>Suppose the artist’s largest indexed edition contains 100 works. A collector currently holds four copies:</p>
          <table className="methodology-example">
            <thead><tr><th>HOLDING</th><th>DAYS</th><th>WEIGHT</th><th>POINTS</th></tr></thead>
            <tbody>
              <tr><td>One 1/1</td><td>30</td><td>100</td><td>3,000</td></tr>
              <tr><td>Two copies from an edition of 10</td><td>20 each</td><td>10 each</td><td>400</td></tr>
              <tr><td>One copy from the edition of 100</td><td>50</td><td>1</td><td>50</td></tr>
            </tbody>
          </table>
          <p className="methodology-formula">TDH = 3,000 + 400 + 50 = 3,450<br />points per day = 100 + 10 + 10 + 1 = 121<br />tokens / copies held = 4</p>
        </div>
      </section>

      <section>
        <h2>BOUNDARIES</h2>
        <div className="methodology-detail">
          <p>Raster-listed artist addresses and identified marketplace custody are excluded. Each ownership address is reported independently; wallets are not combined into a person unless Raster itself supplies the displayed collector name.</p>
          <p>The result is a snapshot. A transfer, disposal, new acquisition, Raster indexing change or later snapshot can change the holdings, score and rank.</p>
          <p>Price, sales volume, floor price, reputation and artistic judgment have no input. Every result identifies the formula as <code>raster-artist-abtdh/1</code>, names the corpus and publishes the full collector register.</p>
        </div>
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
    letter.style.setProperty("--letter-rx", `${y * -5}deg`);
    letter.style.setProperty("--letter-ry", `${x * 7}deg`);
    letter.style.setProperty("--letter-rz", `${x * 1.2}deg`);
  };

  const restHeroLetter = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.removeProperty("--letter-x");
    event.currentTarget.style.removeProperty("--letter-y");
    event.currentTarget.style.removeProperty("--letter-rx");
    event.currentTarget.style.removeProperty("--letter-ry");
    event.currentTarget.style.removeProperty("--letter-rz");
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
          <a className="methodology-link" href="/methodology">A transparent holding-duration signal for any digital artist.</a>
          <DodgeCalculateLink />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
