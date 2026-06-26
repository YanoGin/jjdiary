#!/usr/bin/env python3
"""
gen_seed.py — grow the FIRST tree from the concluded rakusat diary.

Reads the structured diary (monospages/docs/DIARY/entries.json) and transforms it into
`seed-tree.json`, the first tree of the personal forest, following the owner's pattern:

    🌰 roots (foundations)  →  🌱 seed = jjconnect.jp  →  🌿 branches (the ventures)
    on each branch: 🍃 leaf (record) · 🪢 knot (headache) · 🌸 flower (achievement) · 🍎 fruit (created value)
    a branch can graduate into its own tree (Rakusat already has).

No dependencies. Re-run after the diary changes:  python3 gen_seed.py
"""
from __future__ import annotations
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIARY = HERE.parent / "monospages" / "monospages" / "docs" / "DIARY" / "entries.json"

# --- the seed is jjconnect.jp; every other project grows as a branch from it ----------
SEED_PROJECT = "jjconnect-jp"

BRANCH_LABEL = {
    "jjconnect-jp": "jjconnect.jp · 会社サイト",
    "rakusat": "落札ラボ / Rakusat",
    "jjcashflow": "jjcashflow",
    "mansion-manager": "Mansion Manager",
    "do": "道 / Do",
    "strategy": "Strategy · 経営革新",
}
# a branch that grew strong enough to become its own tree
GRADUATED = {"rakusat"}

# --- 🌰 the roots: the foundations that hold the whole tree up (hand-authored) --------
ROOTS = [
    ("株式会社ＪＪ ＣＯＮＮＥＣＴ", "法人番号 3011001151860 · 設立 令和5年1月 · 資本金 700万 · 本店 新宿区北新宿. The legal ground it all stands on."),
    ("朱麗娟 — 代表取締役", "Founder & sole director. The hands that tend the tree."),
    ("Moat = dataset + judgment", "The engine is swappable compute; what compounds is the data and the judgment on top."),
    ("Info-only line", "Information & analysis only — no 媒介 / 代行 / 非弁. What lets a 法人 run without a 宅建業免許."),
    ("Build for exit", "Portability is the real driver — repos, domains, the Supabase cutover all keep it sellable and handover-ready."),
    ("Ship early, but hot-fix is dangerous", "Cut over as soon as it's safe; a push to main is a prod deploy — diagnose and reproduce first."),
]

# --- map a diary entry's `kind` to a tree node type ----------------------------------
KIND_TO_TYPE = {
    "lesson": "knot",        # 🪢 a headache
    "milestone": "flower",   # 🌸 an achievement
    "ship": "leaf",          # 🍃 a record (some become fruit, below)
    "decision": "leaf",
    "principle": "leaf",
    "pivot": "seed",         # 🌱 a new idea sprouting on the branch
    "origin": "seed",
}

# created value, packageable / shareable / sellable → 🍎 fruit (override on title keywords)
FRUIT_HINTS = (
    "asset", "skill", "secret weapon", "先进入例", "invitation", "200×", "killing the",
    "real ocr", "demo", "wedge", "set-recommend", "mono-card", "the signals on the card",
    "provider-flexible", "schema ships",
)
# clear celebrations / arrivals → 🌸 flower (override)
FLOWER_HINTS = (
    "goes live", "live —", "live on", "launch", "milestone", "rescue", "front door rebuilt",
    "online —", "the read-flip", "resolved", "consolidation",
)


def pick_type(kind: str, title: str) -> str:
    t = (title or "").lower()
    if any(h in t for h in FRUIT_HINTS):
        return "fruit"
    if any(h in t for h in FLOWER_HINTS):
        return "flower"
    return KIND_TO_TYPE.get(kind, "leaf")


def main() -> None:
    data = json.loads(DIARY.read_text(encoding="utf-8"))
    entries = data["entries"]

    nodes: list[dict] = []

    # seed = jjconnect.jp's first entry
    seed_entries = sorted([e for e in entries if e["project"] == SEED_PROJECT], key=lambda e: e["date"])
    seed_date = seed_entries[0]["date"] if seed_entries else "2026-02-06"
    nodes.append({
        "id": "seed", "type": "seed", "parent": None, "branch": None,
        "date": seed_date, "approx": False,
        "title": "jjconnect.jp",
        "body": "The company platform, online 2026-02-06. The seed everything else grew from.",
        "refs": [],
    })

    # roots, beneath the seed
    for i, (title, body) in enumerate(ROOTS):
        nodes.append({
            "id": f"root-{i}", "type": "root", "parent": "seed", "branch": None,
            "date": seed_date, "approx": False, "title": title, "body": body, "refs": [],
        })

    # branches, ordered by their first activity (so they sprout up the trunk over time)
    projects = [p for p in BRANCH_LABEL if any(e["project"] == p for e in entries)]
    first_date = {p: min(e["date"] for e in entries if e["project"] == p) for p in projects}
    # the seed project's *first* entry is the seed; its remaining entries still form a branch
    order = sorted(projects, key=lambda p: first_date[p])

    for bi, proj in enumerate(order):
        proj_entries = sorted([e for e in entries if e["project"] == proj], key=lambda e: e["date"])
        # drop the single seed entry from the jjconnect.jp branch
        if proj == SEED_PROJECT:
            proj_entries = [e for e in proj_entries if e["date"] != seed_date or e["title"] != seed_entries[0]["title"]]
        if not proj_entries:
            continue
        bid = f"branch-{proj}"
        nodes.append({
            "id": bid, "type": "branch", "parent": "seed", "branch": proj,
            "side": -1 if bi % 2 == 0 else 1, "order": bi,
            "date": proj_entries[0]["date"], "approx": False,
            "title": BRANCH_LABEL[proj],
            "body": f"{len(proj_entries)} records · {proj_entries[0]['date']} → {proj_entries[-1]['date']}",
            "graduated": proj in GRADUATED,
            "refs": [],
        })
        for j, e in enumerate(proj_entries):
            nodes.append({
                "id": f"{proj}-{j}", "type": pick_type(e["kind"], e["title"]),
                "parent": bid, "branch": proj,
                "date": e["date"], "dateLabel": e.get("dateLabel", e["date"]), "approx": e.get("approx", False),
                "title": e["title"], "body": e.get("summary", ""), "kind": e.get("kind", ""),
                "thread": e.get("thread", ""), "refs": e.get("refs", []),
            })

    out = {
        "tree": {
            "id": "jjconnect",
            "title": "JJ — the first tree",
            "seedDate": seed_date,
            "note": "Grown from the concluded diary. jjconnect.jp is the seed; Rakusat has become its own tree.",
        },
        "legend": {
            "seed": "🌱", "root": "🌰", "branch": "🌿",
            "leaf": "🍃", "knot": "🪢", "flower": "🌸", "fruit": "🍎",
        },
        "nodes": nodes,
    }
    (HERE / "seed-tree.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # report
    from collections import Counter
    c = Counter(n["type"] for n in nodes)
    print(f"✓ seed-tree.json — {len(nodes)} nodes")
    for t in ("root", "seed", "branch", "leaf", "knot", "flower", "fruit"):
        print(f"    {out['legend'][t]} {t:<7} {c.get(t,0)}")
    print(f"  branches: {', '.join(BRANCH_LABEL[p] for p in order)}")


if __name__ == "__main__":
    main()
