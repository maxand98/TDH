import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("visual system guardrails", () => {
  it("does not use decorative arrow glyphs in links or interface copy", () => {
    expect(appSource).not.toMatch(/[↗↑→↓]/u);
  });

  it("does not declare meaningful rem text below 14px", () => {
    const remSizes = [...stylesheet.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)].map((match) => Number(match[1]));
    expect(remSizes.filter((size) => size < 0.875)).toEqual([]);
  });

  it("keeps artwork clipped inside the interactive hero letters", () => {
    expect(stylesheet).toContain("-webkit-mask-size:100% 100%; mask-size:100% 100%;");
    expect(stylesheet).toContain('.hero-letter-y { width:.456em; -webkit-mask-image:url("/glyph-y.svg");');
    expect(stylesheet).toContain('.hero-letter-y:hover,.hero-letter-y:focus-visible { background-image:url("/autoglyph-hover.svg"); background-size:auto 140%; }');
    expect(appSource).not.toContain("hero-art");
  });

  it("offers durable register exports and a celebratory completion state", () => {
    expect(appSource).toContain("EXPORT JSON");
    expect(appSource).toContain("EXPORT CSV");
    expect(appSource).toContain("COPY API URL");
    expect(appSource).toContain('className="celebration"');
  });

  it("keeps the public page to the hero and attribution footer", () => {
    expect(appSource).not.toContain('className="method"');
    expect(appSource).not.toContain('className="manifesto"');
    expect(appSource).not.toContain('className="lab"');
    expect(appSource).not.toContain('className="footer-top"');
    expect(appSource).toContain('href="/calculate"');
    expect(appSource).toContain('href="/methodology"');
  });

  it("uses the live AB5D collection for the idle field", () => {
    expect(appSource).toContain("https://ab5d.xyz/api/holdings");
    expect(appSource).toContain("const IDLE_DELAY_MS = 5_000");
    expect(appSource).toContain('className="screensaver-canvas"');
    expect(appSource).toContain("context.drawImage");
  });
});
