// JJ Mind-Forest v2 — RENDER layer (a swappable SKIN over the data).
// It reads the model; the model knows nothing about it. SKIN maps kind → glyph; replace it to restyle.
(function () {
  const SVG = "http://www.w3.org/2000/svg";

  // the default tree-forest skin (kind → glyph). User can swap glyphs without touching data/layout.
  const SKIN = {
    project: "🌳", idea: "🌱", milestone: "🌸", decision: "🍃",
    headache: "🪢", value: "🍎", open: "◻️", note: "🍃", root: "🌰",
  };

  let stage, model, onSelect, pos = {}, view = { x: 0, y: 0, w: 1600, h: 900 }, sel = null;
  const el = (t, a, p) => { const e = document.createElementNS(SVG, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const BASE = 760;

  // LIVING node: glyph + freshness derived from its life (kind, children, age) — never clicked.
  // grew children → it's a branch; an untouched leaf wilts; brand-new growth glows.
  function life(n) {
    const now = model.freshest ? model.freshest() : Date.now();
    const u = n.updated ? Date.parse(n.updated) : now;
    const ageDays = Math.max(0, (now - u) / 86400000);
    let glyph;
    if (!n.parent) glyph = SKIN.project;
    else if (model.childrenOf(n.id).length) glyph = "🌿";
    else if (n.kind === "value") glyph = "🍎";
    else if (n.kind === "milestone") glyph = "🌸";
    else if (n.kind === "headache") glyph = "🪢";
    else if (n.kind === "idea") glyph = "🌱";
    else glyph = "🍃";
    let stale = false;
    if (n.parent && ageDays > 30 && (glyph === "🍃" || glyph === "🌱")) { glyph = "🍂"; stale = true; }
    const opacity = ageDays > 45 ? 0.5 : ageDays > 18 ? 0.74 : 1;
    const fresh = !!n.parent && ageDays < 2.5;
    return { glyph, opacity, stale, fresh, ageDays };
  }

  function layout() {
    pos = {};
    let x = 220;
    model.projects().forEach((p) => {
      const kids = model.childrenOf(p.id);
      const tw = Math.max(200, 130 + kids.length * 50);
      const cx = x + tw / 2;
      pos[p.id] = { x: cx, y: BASE };
      const top = BASE - 320 - Math.min(kids.length, 8) * 16;
      kids.forEach((k, i) => {
        const f = kids.length > 1 ? i / (kids.length - 1) : 0.5;
        const kx = cx + (f - 0.5) * tw * 0.94;
        const ky = top + Math.abs(f - 0.5) * 150 + (i % 2) * 26;
        pos[k.id] = { x: kx, y: ky, parent: p.id };
        model.childrenOf(k.id).forEach((gk, j) => { pos[gk.id] = { x: kx + (j % 2 ? 34 : -34), y: ky - 46 - j * 30, parent: k.id }; });
      });
      x += tw + 130;
    });
    view = { x: 0, y: 0, w: Math.max(1600, x + 200), h: 900 };
  }

  function render() {
    stage.innerHTML = "";
    const g = el("g", {}, stage);
    el("line", { x1: 70, y1: BASE + 2, x2: view.w - 70, y2: BASE + 2, stroke: "#d9cfbe", "stroke-width": 2 }, g);

    // trunks + twigs
    model.projects().forEach((p) => {
      const pp = pos[p.id];
      el("path", { d: `M${pp.x} ${pp.y} C ${pp.x - 18} ${pp.y - 140}, ${pp.x + 14} ${pp.y - 240}, ${pp.x} ${pp.y - 320}`, fill: "none", stroke: "#8a6a47", "stroke-width": 10, "stroke-linecap": "round" }, g);
      model.childrenOf(p.id).forEach((k) => {
        const kp = pos[k.id];
        el("path", { d: `M${pp.x} ${pp.y - 270} Q ${(pp.x + kp.x) / 2} ${kp.y + 30} ${kp.x} ${kp.y}`, fill: "none", stroke: "#8a6a47", "stroke-width": 3, opacity: 0.7 }, g);
        model.childrenOf(k.id).forEach((gk) => { const gp = pos[gk.id]; el("path", { d: `M${kp.x} ${kp.y} Q ${(kp.x + gp.x) / 2} ${(kp.y + gp.y) / 2} ${gp.x} ${gp.y}`, fill: "none", stroke: "#8a6a47", "stroke-width": 2, opacity: 0.55 }, g); });
      });
    });

    // cross-links (connections)
    model.rels().forEach((r) => {
      const a = pos[r.from], b = pos[r.to]; if (!a || !b) return;
      el("path", { d: `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 90} ${b.x} ${b.y}`, fill: "none", stroke: "#9a86c4", "stroke-width": 1.6, "stroke-dasharray": "5 5", opacity: 0.55 }, g);
    });

    // nodes
    model.nodes().forEach((n) => {
      const p = pos[n.id]; if (!p) return;
      const isP = !n.parent;
      const L = life(n);
      const grp = el("g", { class: "node", transform: `translate(${p.x},${p.y})`, style: "cursor:pointer", opacity: L.opacity }, g);
      el("title", {}, grp).textContent = n.label + (L.stale ? " · 枯れかけ / wilting" : "") + (n.source ? "  (" + n.source + ")" : "");
      if (L.fresh) el("circle", { r: isP ? 25 : 18, cx: 0, cy: 0, fill: "none", stroke: "#97c459", "stroke-width": 2, opacity: 0.7 }, grp);
      el("circle", { r: isP ? 21 : 14, cx: 0, cy: 0, fill: "#fff", stroke: sel === n.id ? "#6f5436" : "#e7e0d3", "stroke-width": sel === n.id ? 3 : 1.6 }, grp);
      el("text", { x: 0, y: 1, "text-anchor": "middle", "dominant-baseline": "central", "font-size": isP ? 26 : 18, style: "paint-order:stroke;stroke:#fff;stroke-width:3px" }, grp).textContent = L.glyph;
      if (isP) el("text", { x: 0, y: 36, "text-anchor": "middle", "font-size": 13, "font-weight": "700", fill: "#3a352f", style: "paint-order:stroke;stroke:#FAF7F0;stroke-width:4px" }, grp).textContent = n.label;
      grp.addEventListener("click", (e) => { e.stopPropagation(); select(n.id); });
    });

    apply();
  }

  function select(id) { sel = id; render(); if (onSelect) onSelect(id); }
  function apply() { stage.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); }

  function fit() {
    const ps = Object.values(pos); if (!ps.length) return apply();
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    ps.forEach((p) => { a = Math.min(a, p.x); c = Math.max(c, p.x); b = Math.min(b, p.y); d = Math.max(d, p.y); });
    const pad = 130; a -= pad; b -= pad; c += pad; d += pad + 50;
    const cw = c - a, ch = d - b, ar = (stage.clientWidth / stage.clientHeight) || 1.6;
    let w = cw, h = ch; if (w / h > ar) h = w / ar; else w = h * ar;
    view = { x: a - (w - cw) / 2, y: b - (h - ch) / 2, w, h }; apply();
  }

  function bind() {
    stage.addEventListener("wheel", (e) => {
      e.preventDefault(); const r = stage.getBoundingClientRect();
      const mx = view.x + (e.clientX - r.left) / r.width * view.w, my = view.y + (e.clientY - r.top) / r.height * view.h;
      const f = e.deltaY > 0 ? 1.12 : 0.9, nw = view.w * f, nh = view.h * f;
      view.x = mx - (mx - view.x) * (nw / view.w); view.y = my - (my - view.y) * (nh / view.h); view.w = nw; view.h = nh; apply();
    }, { passive: false });
    let drag = null;
    stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener("pointermove", (e) => { if (!drag) return; const r = stage.getBoundingClientRect(); view.x -= (e.clientX - drag.x) / r.width * view.w; view.y -= (e.clientY - drag.y) / r.height * view.h; drag = { x: e.clientX, y: e.clientY }; apply(); });
    stage.addEventListener("pointerup", () => (drag = null));
    stage.addEventListener("click", () => { sel = null; render(); if (onSelect) onSelect(null); });
  }

  window.JJ2Forest = {
    init(stageEl, m, onSel) { stage = stageEl; model = m; onSelect = onSel; bind(); },
    layout, render, fit, select, SKIN,
  };
})();
