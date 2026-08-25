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
});
