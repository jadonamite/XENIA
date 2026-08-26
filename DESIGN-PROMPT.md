# Xenia — landing page build prompt

A literal, hand-it-to-anyone spec for rebuilding the **Parley** Framer template (Apollo Studio) as
**Xenia**. Same fonts, same grid, same component vocabulary, same rhythm. One substitution: every
orange becomes **`#1391E2`**.

Copy changes because the product is different — Parley sells an AI agent, Xenia sends private money
to people who are not set up to receive it. The *structure* does not change.

---

## 1. Design tokens

```css
--paper:        #F4F5F6;  /* page background. Parley's #F7F6F2 with the warmth pulled out, because
                             a warm cream under a cold blue reads as a mistake rather than a choice */
--paper-2:      #EAEBEC;  /* footer band */
--card:         #ECEDEE;  /* the grey feature cards */
--card-raised:  #FFFFFF;  /* the one white card that breaks the row */
--ink:          #17171A;  /* headlines, nav */
--ink-2:        #6E7075;  /* body copy, muted italic headline halves */
--ink-3:        #A2A5AA;  /* the giant ghost numerals 01. 02. 03. */
--accent:       #1391E2;
--accent-2:     #7FC4EF;  /* mid-tint square in the scatter motif */
--accent-3:     #D3E9F9;  /* palest square in the scatter motif */
--pill:         #21201E;  /* the dark button body */
--hairline:     #DFE1E3;

--r-card:  18px;
--r-panel: 24px;   /* the big painterly image blocks */
--r-pill:  12px;
--r-chip:  9px;    /* the accent square inside a pill button */

--page:   1240px;  /* max content width */
--gutter: 24px;
```

## 2. Type

**Switzer** (Fontshare, free) — the closest available match to the template's geometric grotesque.
Load 400 / 500 / 600 / 700 plus italics; the design leans on real italics, never synthetic obliques.

```html
<link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,401,501&display=swap" rel="stylesheet">
```

| Role | Size | Weight | Leading | Notes |
|---|---|---|---|---|
| Display (hero) | clamp(40px, 6vw, 76px) | 500 | 1.04 | Mixes upright and *italic* mid-sentence |
| Section head | clamp(34px, 4.4vw, 56px) | 500 | 1.06 | Second line often italic in `--ink-2` |
| Card title | 22px | 500 | 1.2 | |
| Eyebrow | 13px | 600 | 1 | `--accent`, sits directly above the section head |
| Body | 16px | 400 | 1.55 | `--ink-2` |
| Small | 13.5px | 400 | 1.5 | `--ink-2` |
| Ghost numeral | 64px | 500 | 1 | `--ink-3`, "01." with the period |

Letter-spacing: `-0.02em` on display, `-0.01em` on section heads, `0` elsewhere.

## 3. The four motifs that make it look like one design

1. **Pill button.** Dark `--pill` body, `--r-pill`, and a `--accent` square (`--r-chip`, 30×30) inset
   on the left holding a `›` chevron. Text 14.5px/500 in white. This is the only button shape on the
   site; the ghost variant is the same geometry with a transparent body and a hairline border.
2. **Scatter squares.** 10–18px squares, `--r-chip: 4px`, at three tints (`--accent`, `--accent-2`,
   `--accent-3`), dropped at irregular positions. They fill the numbered cards, sit under the FAQ
   heading, and drift across the footer watermark. Deterministic positions — not random per render,
   or the layout shifts on every hydration.
3. **Square bullet.** A 5×5 `--ink-3` square between nav links, and an `--accent` one before each
   footer column heading.
4. **Painterly panel.** A `--r-panel` block of abstract painted colour, used full-bleed behind the
   hero headline, behind the "how it works" tabs, and behind the closing CTA. Rendered as layered
   SVG turbulence rather than a bitmap, so it ships as bytes rather than megabytes and recolours
   from the tokens.

## 4. Sections, in order

| # | Parley | Xenia |
|---|---|---|
| 1 | Nav: wordmark · Workflows/Pricing/Contact/Blog · "Hire Parley" | wordmark · How it works / Security / Docs / GitHub · "Open the app" |
| 2 | Hero over painted desert: "The AI agent that works *with* you, not just for you" | Hero over painted blue: "Send private money to someone *who isn't* set up to receive it" |
| 3 | "Trusted by 200+ businesses" + 5 logos | "Built on" + Starknet / STRK20 / Cairo / Vercel |
| 4 | "Why Parley — A real partner, not a chatbot in disguise" + 3 numbered cards + 1 white card | "Why Xenia — A link, not an address" + 3 numbered cards + 1 white card |
| 5 | "Intelligent Delegation — Tell Parley once. *It handles the rest.*" left accordion, right app mock | "One transaction — Send it once. *They do the rest.*" left accordion, right app mock |
| 6 | Testimonials carousel | Same shape, carrying the three leaks the design closes instead of quotes |
| 7 | Pricing | **Cut.** Xenia takes no fee, and a pricing table with one free row is worse than no table |
| 8 | "How it works — From ask to done" tabbed screenshot over paint | "How it works — From link to claim" tabbed screenshot over paint |
| 9 | FAQ: left title + CTA + scatter, right accordion | Same |
| 10 | Integrations grid | Wallet support grid |
| 11 | Closing CTA over painted sunset | Same, blue |
| 12 | Footer: wordmark, socials, 3 link columns, giant ghost wordmark + scatter | Same |

## 5. Layout rules

- Everything sits inside a `--page` centred container with `--gutter` padding. The painterly panels
  are inset in that container, **not** edge-to-edge — the paper margin either side is load-bearing.
- Section heads are **left-aligned with the paragraph pushed to the right column** (sections 4, 5),
  or **fully centred** (sections 6, 8, 11). Nothing else.
- Vertical rhythm: 120px between sections on desktop, 72px under 900px.
- Card rows are 4-up on desktop, 2-up at 900px, 1-up at 600px.
- The nav is sticky, gains a `--paper` background and a hairline bottom border after 12px of scroll.

## 6. Motion

Restrained, and all of it optional. Sections fade up 12px over 500ms on first intersection.
Accordion rows animate their own height, not `display`. Hover on a pill lifts it 1px. Honour
`prefers-reduced-motion` by disabling every transform and keeping the opacity end state.

## 7. Non-negotiables

- No orange survives anywhere, including the favicon and the OG image.
- No "Made in Framer" badge, no template attribution, no "Designed by" line in the footer.
- Real copy about what Xenia actually does. No lorem, no invented customer testimonials, no
  "12,000+ professionals" — the site launches with zero users and inventing them is a losing move
  in front of judges who can check.
- Accessible contrast: `--accent` on `--paper` passes AA at 16px+ but not for small grey-on-grey;
  eyebrows stay at 600 weight for that reason.
