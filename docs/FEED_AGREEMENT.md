# Feed Agreement — work ⇄ diary

How a work summary becomes tree growth, and back. **Operational:** paste a block in this format
into **📥 Feed** in the app (jjconnect.blog) and it merges into your tree. Nothing is overwritten —
feed only **adds**.

## The format (tagged markdown)

| Syntax | Meaning |
|---|---|
| `## Branch` | a job/mission. **Matched to an existing branch by name** (substring, case-insensitive) → accumulates; created if new. |
| `- Title` | a 🍃 leaf (a record) under the current branch |
| `- [type] Title` | typed node — `seed` · `leaf` · `knot` · `flower` · `fruit` · `branch` · `root` |
| `- Title :: body` | `::` splits title and body (markdown allowed in the body) |
| `- Title (2026-06-27)` | trailing `(YYYY-MM-DD)` sets the node's date; else today |
| `  - nested` | indentation → a **child** (recursion / dig-in) |

Items before any `## branch` land in a `📥 取り込み` inbox branch.

## Example

```
## Rakusat
- [fruit] 先進入例: registry-driven secret weapon (2026-06-25)
- [knot] DocAI 500 on 30-page originals :: capped pages, then multi-range OCR
- read-feedback loop shipped
  - [leaf] read_feedback table
  - [flower] 読取質量 admin tab

## 散歩 / a new thread
- [seed] a walking diary
```

→ the four Rakusat items attach to the existing **落札ラボ / Rakusat** branch (the two indented ones
nest under "read-feedback loop"); a new **散歩** branch sprouts.

## Both directions

- **work → diary:** at the end of a Rakusalab (or any) work session, Claude emits a block in **this
  exact format**; you paste it into 📥 Feed. (This is the durable contract — Claude can produce a
  conformant feed from any session, not just this one.)
- **diary → work:** **⬇MD** exports the whole tree as readable markdown to bring context back into a
  work session.

## Rules

- **Accumulate:** feed `## Rakusat` every week — it keeps attaching to the same branch, growing it.
- **Add-only:** feed never overwrites. Full restore/replace is the separate **⬆ CSV** import.
- **Stable:** this format is the agreement. If it changes, this file changes with it.
