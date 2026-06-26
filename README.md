# JJ 樹 · jjdiary — a tree-shaped diary

A diary that grows like a tree. An idea or just a normal day is a 🌱 **seed**; it grows over
time. A record is a 🍃 **leaf**, a headache a 🪢 **knot**, a job or mission a 🌿 **branch**, an
achievement a 🌸 **flower**, and something you create with value — shareable, sellable,
packable — a 🍎 **fruit**. Beneath it all are 🌰 **roots**: the foundations that hold it up.

**The pattern:** seed → branches grow from it → a branch can grow strong enough to become its
own tree → trees make a forest → forests connect into a forest of forests.

This **first tree** is grown from the founder's concluded work-diary: **jjconnect.jp is the
seed**, and **落札ラボ / Rakusat** has already grown into its own tree.

## Run locally

It's a static site (no build step). Serve over HTTP so the seed can be fetched:

```
python3 -m http.server 8123
# open http://localhost:8123
```

Add growth with **＋ 成長を記録**; click any node for its detail; drag to pan, scroll to zoom;
zoom in to reveal every label. Data persists in your browser (localStorage) until the cloud
is switched on.

## Files

| File | What |
|---|---|
| `index.html` | App shell + styles |
| `tree.js` | The SVG tree renderer — layout, pan/zoom, detail panel, add-growth |
| `model.js` | Data layer — localStorage now, Supabase-swappable |
| `config.js` | Supabase URL + backend switch |
| `seed-tree.json` | The first tree (generated) |
| `gen_seed.py` | Regenerate `seed-tree.json` from the concluded diary |
| `supabase/schema.sql` | Cloud schema — `trees`, `nodes`, owner-scoped RLS |

## Go to the cloud (jjconnect.blog)

1. **Schema** — in the Supabase project (`sgekfwmaujgghhrzzfhi`) SQL editor, run
   `supabase/schema.sql`.
2. **Key** — paste the **anon / publishable** key into `config.js` and set `BACKEND: "supabase"`.
3. **Deploy** — push to `github.com/YanoGin/jjdiary`, connect **Cloudflare Pages** to the repo
   (framework: none, output: root), and point **jjconnect.blog** at it.

Auth for v1 is owner-only (RLS scopes every node to `auth.uid()`), so the forest is private.

## The vocabulary

🌱 seed · 🌰 root · 🌿 branch · 🍃 leaf · 🪢 knot · 🌸 flower · 🍎 fruit

## Roadmap (held, on purpose — build the first tree first)

- **Connections:** links between nodes; AI that finds relations across the forest.
- **The forest:** many trees; a branch graduating into a new tree; trees linked by branches.
- **A forest of forests:** connect to others; cultivate a tree by joint effort.
