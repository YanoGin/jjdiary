# JJ 樹 — UI Design Principles

A brief a designer can build from. The product is a **tree-shaped diary** (榕樹 / banyan): a life
grows from a seed into a trunk, branches, leaves; a strong branch reaches the ground and becomes
its own tree; trees make a forest. The UI must *feel* like that — organic, calm, and legible — not
like a dashboard.

---

## 1. Spirit

- **Organic, not mechanical.** Everything grows *upward*. Curves, never right angles, for living parts.
- **Calm and warm.** Paper-and-bark palette, generous whitespace, quiet by default; color is meaning, not decoration.
- **Legible at every zoom.** A glance reads the shape of a life; a click reads one moment. Detail appears on demand, never all at once.
- **The tool makes the human's weighing visible — it never judges.** Size, prominence, and sort reflect the user's own marks, not an algorithm's score.

## 2. Palette (tokens)

Use role tokens, never raw hex in components.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAF7F0` | canvas / page (warm paper) |
| `--panel` | `#FFFDF8` | reader pane, cards, modals |
| `--ink` | `#3A352F` | primary text |
| `--muted` | `#8C8275` | secondary text, captions |
| `--line` | `#E7E0D3` | hairlines, borders |
| `--bark` | `#8A6A47` | trunk & limbs |
| `--bark-dark` | `#6F5436` | limb shadow, primary button |

**The seven growth colors** (node meaning — each glyph keeps its hue):

| Node | Glyph | Token | Hex | Meaning |
|---|---|---|---|---|
| seed | 🌱 | `--seed` | `#C79A3C` | an idea / a day |
| root | 🌰 | `--root` | `#9A8A6B` | a foundation |
| branch | 🌿 | `--branch` | `#7D8A5A` | a job / mission |
| leaf | 🍃 | `--leaf` | `#5F9A55` | a record |
| knot | 🪢 | `--knot` | `#BD5A33` | a headache |
| flower | 🌸 | `--flower` | `#D684AB` | an achievement |
| fruit | 🍎 | `--fruit` | `#E0772E` | created value |

Accent for *connections* (links the mind can't hold): `#9A86C4` (soft violet), always dashed + low opacity.
Danger/delete: `#B5562F`. Background gradient under the tree: `radial-gradient(120% 80% at 50% 100%, #F1EAD9, var(--bg))`.

## 3. Form language — curves

Limbs are **quadratic Bézier** curves, never straight lines. The grammar:

- **Trunk:** rises from the seed (bottom-center) to the canopy with a gentle S; width ~16–22px, round caps, `--bark`.
- **Branch:** one curve from its attach point on the trunk to a tip that grows **up-and-outward**. Control point bows outward at mid-height. Width **tapers with importance**: `6 + min(childCount×0.5, 8)` px; a graduated branch is thicker.
- **Recursion (the banyan rule):** a leaf you "dig into" sprouts its **own** limb from where it sits, **up-and-outward, away from the trunk**, ~`0.86×` shorter per depth. Same curve language at every scale — self-similar.
- **Aerial root / bridge:** a graduated branch drops a faint curve (`opacity 0.38`) from its tip down to the ground line — the banyan reaching earth to become a new trunk.
- **Leaves/knots/flowers/fruits** hang off a limb on tiny twigs (1.6px, 55% opacity), alternating sides.

Curve feel: smooth, slightly asymmetric (hand-drawn, not CAD). Avoid uniform fans; alternate and vary lengths so it reads as grown, not generated.

## 4. Node glyphs

Emoji glyphs on a white disc (ring `--line`, 14–19px radius by importance), with a 3px white text-halo so they read over any limb. Selected node: ring `--bark`, 2.5px. **Labels appear only when zoomed in or selected** — never crowd the canopy. Branch names always show, at the tip.

## 5. Layout grammar

- **Vertical axis = time/order.** Older lower, newer higher; the tree literally grows upward as the diary fills.
- **Trunk centered.** Branches attach in chronological order, alternating left/right, fanning wider in later "tiers."
- **Roots** fan *below* the seed (the unseen foundations).
- **Two-pane reading view:** left = the living tree (pan/zoom); right = a 400px **markdown reader** that opens the clicked node — title, date, rendered body, refs, and a *connections* list. On ≤760px the reader becomes a slide-over.
- **Forest (next):** multiple trees side by side; a graduated branch becomes a standalone trunk; bridges mark lineage.

## 6. Typography & motion

- **Type:** system sans (`-apple-system, "Hiragino Sans", "PingFang SC", "Segoe UI"`). Sizes: 26 title, 16/15 headings, 14 body (1.65 line-height), 12–13 captions. Mixed JA/中文/EN — keep CJK comfortable.
- **Motion:** quiet. Pane slides 0.22s ease; no bouncing, no spinners on the canvas. Pan/zoom is direct (drag/scroll). Growth could animate later (a new node "buds" in) — subtle if so.

## 7. Worked example (read this to feel the language)

One branch with a leaf, a knot, a flower, and a fruit — plus a dug-in fork. Virtual coords, `viewBox` units:

```svg
<!-- a branch limb: trunk attach (700,1400) → tip (1040,1000), bowed outward -->
<path d="M700,1400 Q930,1140 1040,1000" fill="none" stroke="#8A6A47" stroke-width="9" stroke-linecap="round"/>

<!-- a fruit hanging on a twig -->
<path d="M905,1185 Q925,1175 936,1160" fill="none" stroke="#8A6A47" stroke-width="1.6" opacity="0.55"/>
<g transform="translate(936,1160)">
  <circle r="17" fill="#fff" stroke="#E0772E" stroke-width="1.6"/>
  <text text-anchor="middle" dy="1" font-size="22" stroke="#fff" stroke-width="3" paint-order="stroke">🍎</text>
  <text y="30" text-anchor="middle" font-size="12" fill="#3A352F">200× — killing the scan</text>
</g>

<!-- a dug-in leaf sprouting its OWN sub-limb, up-and-outward -->
<path d="M820,1280 Q880,1180 905,1095" fill="none" stroke="#8A6A47" stroke-width="4"/>

<!-- a connection: dashed violet, low opacity -->
<path d="M936,1160 Q820,980 690,1120" fill="none" stroke="#9A86C4" stroke-width="1.6"
      stroke-dasharray="5 5" opacity="0.55"/>
```

And the reader pane it pairs with:

```
┌ 🍎 果 · created value ──────────────────── × ┐
│ 200× — killing the 25-second batches scan   │
│ 2026-06-16 · Perf                            │
│                                              │
│ "Loading faster" was the whole brief, so I   │
│ measured on prod first…  (rendered markdown) │
│                                              │
│ [aadad0d] [migration …] [STAGE_PERF…]        │
│                                              │
│ つながり · CONNECTIONS                        │
│ 🔗 🍎 OCR made provider-flexible             │
│ 🍎 The parsing skill is an asset             │
│                                              │
│ 🌱掘る  🌳独立  🔗つなぐ          削除        │
└──────────────────────────────────────────────┘
```

## 8. For the designer — do / don't

- **Do** keep it quiet, warm, hand-grown; let color carry meaning; design for zoom (glance → detail).
- **Do** treat the curve language as the brand — every limb is a bowed quadratic that grows up-and-outward.
- **Don't** add boxes, grids, drop-shadows-as-style, hard right angles in living parts, or more than the seven meanings.
- **Don't** let the canopy crowd with always-on labels; reveal on zoom/click.
- **Don't** introduce a color that doesn't map to a meaning.

*The implemented reference is `index.html` (tokens + layout) and `tree.js` (the curve/layout engine). When in doubt, match the live tree at jjconnect.blog.*
