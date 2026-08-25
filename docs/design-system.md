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
- `myTDH` is one uninterrupted wordmark and spans nearly the full viewport width.
- Cosmic motion is slow drift and light breathing only. It must never compete with the wordmark or impair reading.
- All motion stops when the visitor requests reduced motion.
- Navigation, metadata, descriptive copy, and the calculate control remain at least 14px and maintain strong contrast over the image.

## Prohibited patterns

- Text below 14px, except a non-semantic typographic mark such as the registered symbol in the wordmark.
- Decorative arrow glyphs attached to links.
- Generic rounded cards, excessive pill controls, gradient text, glass effects, or ornamental shadows.
- Unexplained metrics, unlabeled scores, or visual hierarchy that implies price or ranking.

The automated style guardrail test checks the minimum literal `rem` size and banned arrow glyphs on every validation run.
