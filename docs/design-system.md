# myTDH visual system

This file is the canonical visual contract for the web app. New screens and components must follow it rather than inventing isolated treatments.

## Typography

- Meaningful interface text is never smaller than 14px (`0.875rem`).
- Body copy starts at 18px (`1.125rem`) with at least 1.5 line height.
- The condensed display face is for short headings and numeric results, not paragraphs.
- IBM Plex Mono is reserved for labels, metadata, controls, and technical values.
- Do not shrink text to make a layout fit. Reflow, wrap, stack, or remove secondary content instead.

The CSS tokens are:

```css
--text-label: 0.875rem;
--text-ui: 0.95rem;
--text-body: 1.125rem;
```

## Links

- Link labels describe the destination or action in words.
- Do not append `↗`, `↑`, `→`, or similar decorative arrows to links.
- External links do not need a visual glyph. Context and descriptive link text are sufficient.
- Text links use an underline or a clearly defined bordered control. Hover and keyboard focus strengthen the existing treatment.
- Do not use vague labels such as “click here” or “learn more” when a precise label is possible.

## Colour and structure

- Warm paper (`#f2eadf`) is the primary surface.
- Near-black ink (`#181512`) provides text and structural rules.
- Signal red (`#ef3e24`) is reserved for emphasis, state, and major transitions.
- Layout uses strong scale, whitespace, rules, and editorial grouping rather than decorative cards or floating pills.

## Hero

- The opening viewport is a black cosmic field with an original photographic nebula texture.
- `myTDH` spans nearly the full viewport width, with each letter kept as a distinct interactive form and a visible optical gap between neighbours.
- The hero has no masthead, menu bar, or top metadata; the identity and calculation action carry the opening screen without navigation chrome.
- The main wordmark uses the heaviest display weight, reinforced by a restrained white stroke.
- Each letter owns one artwork reveal: `m` / Fidenza, `y` / Autoglyph, `T` / Ringers, `D` / Fragments, and `H` / Reas. Hover or keyboard focus reveals that artwork only inside the letterform; the cosmic hero behind it never changes.
- Pointer movement may shift and tilt only the active letter. The movement stays restrained and returns cleanly to rest when the pointer leaves.
- Non-active letters and supporting copy remain white and unchanged throughout every letter interaction.
- Cosmic motion combines visible photographic drift with moving blue and copper luminosity. It must never compete with the wordmark or impair reading.
- All motion stops when the visitor requests reduced motion.
- Navigation, metadata, descriptive copy, and the calculate control remain at least 14px and maintain strong contrast over the image.

## Attribution footer

- The footer uses the canonical animated `MAXAND98` wordmark: a rapid display-face roll followed by a moving light sweep.
- The signature field uses maxand98 blue (`#0a30e6`) and links to `maxand98.com`.
- Every release carries the explicit statement `CC0 · NO RIGHTS RESERVED`, linked to CC0 1.0 Universal.
- Reduced-motion visitors see the settled white wordmark with no font roll or light sweep.

## Idle field

- After seven seconds without pointer, keyboard, scroll, or touch input, a full-viewport black idle field appears.
- Each activation selects one random work from the live AB5D Art Blocks holdings feed. The bundled hero works provide a local fallback if that feed is unavailable.
- The artwork occupies a large left-aligned field with deliberate black negative space on wide screens; narrow screens use the full viewport.
- Any interaction dismisses the idle field immediately and restarts the timer.
- The idle field does not activate when reduced motion is requested.

## Prohibited patterns

- Text below 14px, except a non-semantic typographic mark such as the registered symbol in the wordmark.
- Decorative arrow glyphs attached to links.
- Generic rounded cards, excessive pill controls, gradient text, glass effects, or ornamental shadows.
- Unexplained metrics, unlabeled scores, or visual hierarchy that implies price or ranking.

The automated style guardrail test checks the minimum literal `rem` size and banned arrow glyphs on every validation run.
