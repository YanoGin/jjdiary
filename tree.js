// jjdiary — the tree renderer. Draws an upward-growing tree from typed nodes in SVG.
(function () {
  const { model, TYPES } = window.JJ;
  const SVG = "http://www.w3.org/2000/svg";
  const stage = document.getElementById("stage");

  const W = 1900, H = 2300;          // virtual canvas
  const TOP = 170, BOT = H - 240;    // time axis: newest at TOP, oldest at BOT
  const CX = W / 2;

  let pos = {};                      // id -> {x,y}
  let branchGeo = {};                // branchId -> {P0,P1,P2,tipX,tipY,side}
  let selected = null;
  let linkSource = null;
  let view = { x: 0, y: 0, w: W, h: H };

  const ms = (d) => new Date(d + "T00:00:00").getTime();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function dateRange() {
    const ds = model.nodes().map((n) => ms(n.date));
    const today = Date.now();
    return { t0: Math.min(...ds), t1: Math.max(today, ...ds) };
  }
  let R = dateRange();
  const yOf = (d) => {
    if (R.t1 === R.t0) return BOT;
    return BOT - ((ms(d) - R.t0) / (R.t1 - R.t0)) * (BOT - TOP);
  };

  // --- geometry --------------------------------------------------------------------
  function quad(P0, P1, P2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
      y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
    };
  }
  function quadNormal(P0, P1, P2, t) {
    const mt = 1 - t;
    const dx = 2 * mt * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
    const dy = 2 * mt * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  }

  function layout() {
    R = dateRange();
    pos = {}; branchGeo = {};
    const nodes = model.nodes();
    const childrenOf = (id) => nodes.filter((n) => n.parent === id && n.type !== "root" && n.type !== "branch");

    const seed = nodes.find((n) => n.type === "seed" && !n.branch) || nodes.find((n) => n.type === "seed");
    if (seed) pos[seed.id] = { x: CX, y: BOT };
    const roots = nodes.filter((n) => n.type === "root");
    roots.forEach((r, i) => {
      const k = i - (roots.length - 1) / 2;
      pos[r.id] = { x: CX + k * 130, y: BOT + 70 + (i % 2) * 34 };
    });

    // 榕树: place `node`'s children along `limb`. Any child that itself has children
    // forks into its OWN sub-limb — a leaf you dug into becomes a branch. Recursive.
    function sprout(node, limb, depth) {
      const kids = childrenOf(node.id).sort((a, b) => ms(a.date) - ms(b.date));
      const K = kids.length;
      kids.forEach((k, i) => {
        const t = K > 1 ? 0.12 + (i / (K - 1)) * 0.84 : 0.55;
        const p = quad(limb.P0, limb.P1, limb.P2, t);
        const nrm = quadNormal(limb.P0, limb.P1, limb.P2, t);
        const grand = childrenOf(k.id);
        if (grand.length && depth < 6) {
          pos[k.id] = { x: p.x, y: p.y, anchor: p, fork: true };
          // a dug-in node grows its own limb up-and-outward (away from the trunk)
          const outX = (p.x >= CX ? 1 : -1);
          let dx = outX * 0.55, dy = -0.85;
          const nn = Math.hypot(dx, dy); dx /= nn; dy /= nn;
          const len = (95 + grand.length * 32) * Math.pow(0.86, depth - 1);
          const tip = { x: p.x + dx * len, y: p.y + dy * len };
          const mid = { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 };
          const bow = ((i % 2) ? 1 : -1) * len * 0.10;
          const ctrl = { x: mid.x - dy * bow, y: mid.y + dx * bow };
          branchGeo[k.id] = { P0: p, P1: ctrl, P2: tip, n: grand.length, graduated: !!k.graduated, sub: true, depth };
          pos[k.id].tip = tip;
          sprout(k, { P0: p, P1: ctrl, P2: tip }, depth + 1);
        } else {
          const big = k.type === "flower" || k.type === "fruit";
          const off = ((i % 2) ? 1 : -1) * (30 + (big ? 10 : 0));
          pos[k.id] = { x: p.x + nrm.x * off, y: p.y + nrm.y * off, anchor: p };
        }
      });
    }

    const branches = nodes.filter((n) => n.type === "branch")
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || ms(a.date) - ms(b.date));
    const N = branches.length;
    branches.forEach((b, bi) => {
      const kidCount = childrenOf(b.id).length;
      const side = b.side || (bi % 2 === 0 ? -1 : 1);
      const tier = Math.floor(bi / 2);
      const spread = 260 + tier * 150;
      const attachFrac = (bi + 1) / (N + 1);
      const baseY = BOT - attachFrac * (BOT - TOP) * 0.62;
      const len = 300 + Math.min(kidCount, 12) * 22;
      const tipY = Math.max(TOP, baseY - len);
      const tipX = CX + side * spread;
      const P0 = { x: CX, y: baseY };
      const P1 = { x: CX + side * spread * 0.5, y: (baseY + tipY) / 2 - 50 };
      const P2 = { x: tipX, y: tipY };
      branchGeo[b.id] = { P0, P1, P2, side, n: kidCount, graduated: !!b.graduated };
      pos[b.id] = { x: tipX, y: tipY };
      sprout(b, { P0, P1, P2 }, 1);
    });
  }

  // --- svg helpers -----------------------------------------------------------------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const cssvar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function render() {
    stage.innerHTML = "";
    const root = el("g", {}, stage);
    const nodes = model.nodes();

    // trunk
    const seed = nodes.find((n) => n.type === "seed" && !n.branch) || nodes.find((n) => n.type === "seed");
    if (seed) {
      el("path", {
        d: `M ${CX} ${BOT} C ${CX - 26} ${(BOT + TOP) / 2}, ${CX + 22} ${(BOT + TOP) / 2 - 40}, ${CX} ${TOP - 6}`,
        class: "branch-path", stroke: cssvar("--bark"), "stroke-width": 22,
      }, root);
    }

    // limbs (paths first, so nodes sit on top): top-level branches + any dug-in sub-limbs
    Object.keys(branchGeo).forEach((id) => {
      const g = branchGeo[id]; if (!g) return;
      const w = g.sub ? Math.max(2, 5 - g.depth) + Math.min(g.n * 0.4, 4)
                      : 6 + (g.graduated ? 8 : 0) + Math.min(g.n * 0.5, 8);
      el("path", {
        d: `M ${g.P0.x} ${g.P0.y} Q ${g.P1.x} ${g.P1.y} ${g.P2.x} ${g.P2.y}`,
        class: "branch-path", stroke: cssvar("--bark"), "stroke-width": w, opacity: 0.92,
      }, root);
    });

    // twigs from branch path to each hanging node
    nodes.forEach((n) => {
      const p = pos[n.id]; if (!p || !p.anchor) return;
      el("path", { d: `M ${p.anchor.x} ${p.anchor.y} Q ${(p.anchor.x + p.x) / 2} ${(p.anchor.y + p.y) / 2} ${p.x} ${p.y}`, class: "twig", "stroke-width": 1.6 }, root);
    });
    // twigs from seed to roots
    const seedP = seed && pos[seed.id];
    if (seedP) nodes.filter((n) => n.type === "root").forEach((r) => {
      const p = pos[r.id]; if (!p) return;
      el("path", { d: `M ${seedP.x} ${seedP.y} Q ${(seedP.x + p.x) / 2} ${seedP.y + 40} ${p.x} ${p.y}`, class: "twig", "stroke-width": 1.6, stroke: cssvar("--root") }, root);
    });

    // graduated nodes drop an aerial root to the ground — the banyan bridge → its own tree
    nodes.filter((n) => n.graduated).forEach((n) => {
      const tip = pos[n.id]; if (!tip) return;
      const gy = BOT - 4;
      el("path", { d: `M ${tip.x} ${tip.y} C ${tip.x + 38} ${(tip.y + gy) / 2}, ${tip.x - 30} ${(tip.y + gy) / 2 + 55}, ${tip.x} ${gy}`,
        class: "branch-path", stroke: cssvar("--bark"), "stroke-width": 7, opacity: 0.38, fill: "none" }, root);
      el("text", { x: tip.x, y: gy + 18, "text-anchor": "middle", class: "node-label" }, root).textContent = "🌳 独立した木";
    });

    // links — the connections you draw (what a mind struggles to hold)
    model.links().forEach((l) => {
      const a = pos[l.from], b = pos[l.to]; if (!a || !b) return;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.14 - 30;
      el("path", { d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, class: "link" }, root);
    });

    // nodes
    nodes.forEach((n) => {
      const p = pos[n.id]; if (!p) return;
      const ty = TYPES[n.type] || TYPES.leaf;
      const isBranch = n.type === "branch";
      const g = el("g", { class: "node" + (selected === n.id ? " sel" : ""), transform: `translate(${p.x},${p.y})` }, root);
      el("title", {}, g).textContent = `${ty.glyph} ${n.title}`;
      const r = isBranch ? 19 : (n.type === "flower" || n.type === "fruit" ? 17 : 14);
      el("circle", { class: "ring", r, cx: 0, cy: 0, fill: "#fff", stroke: cssvar(ty.color.replace("var(", "").replace(")", "")) || cssvar("--line"), "stroke-width": isBranch ? 2.5 : 1.6 }, g);
      const glyph = isBranch && n.graduated ? "🌳" : ty.glyph;
      el("text", { class: "glyph", x: 0, y: 1 }, g).textContent = glyph;
      g.addEventListener("click", (e) => { e.stopPropagation(); select(n.id); });

      // labels: branches always; flowers & fruits always; others on hover/select
      if (isBranch) {
        const lx = (branchGeo[n.id]?.side || 1) >= 0 ? 26 : -26;
        const anchor = lx >= 0 ? "start" : "end";
        const t = el("text", { class: "branch-label", x: lx, y: -2, "text-anchor": anchor }, g);
        t.textContent = n.title + (n.graduated ? "  🌳→" : "");
        if (n.graduated) el("text", { class: "node-label", x: lx, y: 15, "text-anchor": anchor, fill: cssvar("--muted"), "font-size": 11 }, g).textContent = "独立した木 · now its own tree";
      } else {
        const y = (n.type === "flower" || n.type === "fruit") ? 30 : 25;
        el("text", { class: "node-label detail", x: 0, y, "text-anchor": "middle" }, g).textContent = truncate(n.title, 22);
      }
    });

    applyView();
    updateSub();
  }

  function truncate(s, n) { return (s || "").length > n ? s.slice(0, n - 1) + "…" : (s || ""); }

  // minimal markdown → html for the reader pane (no deps)
  function mdToHtml(src) {
    if (!src) return "";
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (t) => esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    let html = "", inList = false, inCode = false, para = [];
    const flushP = () => { if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } };
    for (const raw of src.split(/\r?\n/)) {
      if (/^```/.test(raw)) { if (inCode) { html += "</pre>"; inCode = false; } else { flushP(); if (inList) { html += "</ul>"; inList = false; } html += "<pre>"; inCode = true; } continue; }
      if (inCode) { html += esc(raw) + "\n"; continue; }
      const h = /^(#{1,4})\s+(.*)$/.exec(raw);
      if (h) { flushP(); if (inList) { html += "</ul>"; inList = false; } const lv = h[1].length; html += `<h${lv}>` + inline(h[2]) + `</h${lv}>`; continue; }
      const li = /^\s*[-*]\s+(.*)$/.exec(raw);
      if (li) { flushP(); if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(li[1]) + "</li>"; continue; }
      if (/^\s*$/.test(raw)) { flushP(); if (inList) { html += "</ul>"; inList = false; } continue; }
      para.push(raw.trim());
    }
    flushP(); if (inList) html += "</ul>"; if (inCode) html += "</pre>";
    return html;
  }

  // --- view / pan / zoom -----------------------------------------------------------
  function fit() {
    const ps = Object.values(pos);
    if (!ps.length) { view = { x: 0, y: 0, w: W, h: H }; return applyView(); }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ps.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const pad = 160;
    minX -= pad; minY -= pad; maxX += pad + 120; maxY += pad;
    const cw = maxX - minX, ch = maxY - minY;
    const ar = stage.clientWidth / stage.clientHeight || 1;
    let w = cw, h = ch;
    if (w / h > ar) h = w / ar; else w = h * ar;
    view = { x: minX - (w - cw) / 2, y: minY - (h - ch) / 2, w, h };
    applyView();
  }
  function applyView() { stage.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); stage.classList.toggle("zoomed", view.w < 1150); }
  function zoomAt(cx, cy, factor) {
    const nw = clamp(view.w * factor, 300, W * 3), nh = nw * (view.h / view.w);
    view.x = cx - (cx - view.x) * (nw / view.w);
    view.y = cy - (cy - view.y) * (nh / view.h);
    view.w = nw; view.h = nh; applyView();
  }
  function clientToSvg(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return { x: view.x + ((clientX - r.left) / r.width) * view.w, y: view.y + ((clientY - r.top) / r.height) * view.h };
  }
  stage.addEventListener("wheel", (e) => { e.preventDefault(); const p = clientToSvg(e.clientX, e.clientY); zoomAt(p.x, p.y, e.deltaY > 0 ? 1.12 : 0.89); }, { passive: false });
  let drag = null;
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; stage.classList.add("grabbing"); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const r = stage.getBoundingClientRect();
    view.x -= ((e.clientX - drag.x) / r.width) * view.w;
    view.y -= ((e.clientY - drag.y) / r.height) * view.h;
    drag = { x: e.clientX, y: e.clientY }; applyView();
  });
  stage.addEventListener("pointerup", (e) => { drag = null; stage.classList.remove("grabbing"); });
  stage.addEventListener("click", () => { if (linkSource) { linkSource = null; $("linkHint").classList.remove("on"); } deselect(); });

  // --- selection + panel -----------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  function select(id) {
    if (linkSource && linkSource !== id) { model.addLink(linkSource, id); linkSource = null; $("linkHint").classList.remove("on"); layout(); render(); }
    selected = id; render();
    const n = model.byId(id); if (!n) return;
    const ty = TYPES[n.type] || TYPES.leaf;
    $("pGlyph").textContent = n.type === "branch" && n.graduated ? "🌳" : ty.glyph;
    $("pKind").textContent = `${ty.cn} · ${ty.en}`;
    $("pTitle").textContent = n.title || "—";
    $("pDate").textContent = (n.dateLabel || n.date) + (n.approx ? "  (approx)" : "") + (n.thread ? "  ·  " + n.thread : "");
    $("pBody").innerHTML = mdToHtml(n.body || "");
    const refs = $("pRefs"); refs.innerHTML = "";
    (n.refs || []).forEach((r) => { const s = document.createElement("span"); s.className = "ref"; s.textContent = r; refs.appendChild(s); });
    // connections: explicit links first, then shared-ref relations
    const linkIds = model.linksOf(n.id);
    const refRel = (n.refs && n.refs.length) ? model.nodes().filter((m) => m.id !== n.id && (m.refs || []).some((r) => n.refs.includes(r))) : [];
    const seen = new Set(); const items = [];
    linkIds.forEach((id2) => { if (!seen.has(id2)) { seen.add(id2); items.push({ id: id2, link: true }); } });
    refRel.forEach((m) => { if (!seen.has(m.id)) { seen.add(m.id); items.push({ id: m.id, link: false }); } });
    const rl = $("pRelList"); rl.innerHTML = "";
    $("pRel").style.display = items.length ? "block" : "none";
    items.slice(0, 12).forEach((it) => { const m = model.byId(it.id); if (!m) return; const a = document.createElement("a"); a.textContent = (it.link ? "🔗 " : "") + (TYPES[m.type]?.glyph || "") + " " + m.title; a.onclick = (e) => { e.stopPropagation(); select(it.id); }; rl.appendChild(a); });
    $("pEmpty").style.display = "none"; $("pContent").style.display = "flex";
    $("panel").classList.add("open");
  }
  function deselect() { selected = null; $("panel").classList.remove("open"); $("pContent").style.display = "none"; $("pEmpty").style.display = ""; render(); }
  $("pClose").onclick = deselect;
  $("pDel").onclick = () => {
    if (!selected) return;
    const n = model.byId(selected);
    if (n && (n.type === "branch" || n.id === "seed") && model.nodes().some((m) => m.parent === n.id)) {
      alert("枝・種子に実がついています。先に子ノードを移してください。\n(This branch/seed still carries nodes — move them first.)");
      return;
    }
    if (confirm("このノードを削除しますか？ / Delete this node?")) { model.remove(selected); deselect(); layout(); render(); }
  };
  $("pAddChild").onclick = () => { const n = model.byId(selected); openAdd(n ? (n.type === "branch" ? n.id : n.branch) : null, n ? n.id : null); };
  $("pGraduate").onclick = () => { if (!selected) return; const n = model.byId(selected); model.update(selected, { graduated: !n.graduated }); layout(); render(); select(selected); };
  $("pLink").onclick = () => { if (!selected) return; linkSource = selected; $("linkHint").classList.add("on"); $("panel").classList.remove("open"); };
  $("btnAI").onclick = () => {
    const ns = model.nodes().filter((n) => n.type !== "root");
    const lines = ns.map((n) => `- [${n.type}] ${n.title}${n.body ? ": " + n.body.slice(0, 90) : ""}`).join("\n");
    const prompt = `これは私の樹形日記（tree diary）のノード一覧です。まだ気づいていない「つながり」――因果関係・繰り返すテーマ・未完のタスク（fruitになっていないbranch/seed）――を探し、ノードのタイトルのペアで、理由を添えて提案してください。\n\n${lines}`;
    const done = () => alert("つながり探索プロンプトをコピーしました。\nお使いのAIに貼り付け、返ってきたペアを 🔗つなぐ で結んでください。");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(prompt).then(done, () => window.prompt("コピーして使ってください:", prompt));
    else window.prompt("コピーして使ってください:", prompt);
  };

  // --- add / grow ------------------------------------------------------------------
  let addType = "leaf";
  function buildTypeGrid() {
    const grid = $("typeGrid"); grid.innerHTML = "";
    ["seed", "leaf", "knot", "branch", "flower", "fruit", "root"].forEach((t) => {
      const ty = TYPES[t];
      const d = document.createElement("div");
      d.className = "t" + (t === addType ? " on" : "");
      d.innerHTML = `<span class="g">${ty.glyph}</span>${ty.cn}<br><span style="color:var(--muted);font-size:10px">${ty.en}</span>`;
      d.onclick = () => { addType = t; buildTypeGrid(); syncBranchVis(); };
      grid.appendChild(d);
    });
  }
  function fillBranchSelect(preset) {
    const sel = $("mBranch"); sel.innerHTML = "";
    model.branches().forEach((b) => { const o = document.createElement("option"); o.value = b.id; o.textContent = (b.graduated ? "🌳 " : "🌿 ") + b.title; sel.appendChild(o); });
    const o = document.createElement("option"); o.value = "__new"; o.textContent = "＋ 新しい枝 / new branch"; sel.appendChild(o);
    if (preset) sel.value = preset;
    sel.onchange = syncBranchVis; syncBranchVis();
  }
  function syncBranchVis() {
    const isBranch = addType === "branch";
    const isNew = $("mBranch").value === "__new";
    $("mBranch").parentElement && ($("mBranch").style.display = isBranch ? "none" : "");
    document.querySelector('label[for]') ; // no-op
    $("newBranchWrap").style.display = (!isBranch && isNew) ? "block" : "none";
    $("mHint").textContent = isBranch
      ? "新しい枝（仕事・使命）として種から伸びます。タイトルが枝の名前になります。"
      : (addType === "root" ? "根（土台）として種の下に加わります。" : "選んだ枝に実ります。");
  }
  function openAdd(branchPreset, parentPreset) {
    addType = "leaf"; buildTypeGrid(); fillBranchSelect(branchPreset);
    $("mDate").value = new Date().toISOString().slice(0, 10);
    $("mTitleIn").value = ""; $("mBody").value = ""; $("mNewBranch").value = "";
    $("mSave").dataset.parent = parentPreset || "";
    $("scrim").classList.add("open");
    $("mTitleIn").focus();
  }
  $("btnAdd").onclick = () => openAdd(null, null);
  $("mCancel").onclick = () => $("scrim").classList.remove("open");
  $("scrim").addEventListener("click", (e) => { if (e.target === $("scrim")) $("scrim").classList.remove("open"); });
  $("mSave").onclick = () => {
    const title = $("mTitleIn").value.trim();
    if (!title) { $("mTitleIn").focus(); return; }
    const date = $("mDate").value || new Date().toISOString().slice(0, 10);
    const body = $("mBody").value.trim();
    let node;
    if (addType === "branch") {
      node = model.addBranch(title); node.body = body; node.date = date; model.save();
    } else if (addType === "root") {
      node = model.add({ type: "root", parent: "seed", branch: null, date, title, body });
    } else {
      let parentId = $("mSave").dataset.parent;          // "dig in" → nest under the selected node
      if (!parentId) {
        parentId = $("mBranch").value;
        if (parentId === "__new") { const b = model.addBranch($("mNewBranch").value.trim() || "新しい枝"); parentId = b.id; }
      }
      const pn = model.byId(parentId);
      const branchId = pn ? (pn.branch || pn.id) : parentId;
      node = model.add({ type: addType, parent: parentId, branch: branchId, date, title, body });
    }
    $("scrim").classList.remove("open");
    layout(); render();
    if (pos[node.id]) { const p = pos[node.id]; view = { x: p.x - 500, y: p.y - 380, w: 1000, h: 760 }; applyView(); }
    select(node.id);
  };

  // --- legend + header -------------------------------------------------------------
  function buildLegend() {
    const box = $("legend"); box.innerHTML = "<b>育ちの記号 · the growth</b>";
    Object.entries(TYPES).forEach(([k, ty]) => {
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<span class="g">${ty.glyph}</span><span><b style="font-weight:600">${ty.cn}</b> <span style="color:var(--muted)">${ty.en}</span></span>`;
      box.appendChild(row);
    });
  }
  function updateSub() {
    const ns = model.nodes();
    const ds = ns.map((n) => n.date).sort();
    $("treeSub").textContent = `${ns.length} nodes · ${ds[0]} → ${ds[ds.length - 1]} · seed: jjconnect.jp`;
  }
  $("btnFit").onclick = fit;
  $("ioExportMd").onclick = () => JJ_IO.download("jj-tree.md", JJ_IO.toMarkdown(model.state), "text/markdown;charset=utf-8");
  $("ioExportCsv").onclick = () => JJ_IO.download("jj-tree.csv", JJ_IO.toCSV(model.nodes()), "text/csv;charset=utf-8");
  $("ioImport").onclick = () => $("fileIn").click();
  $("fileIn").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const nodes = JJ_IO.parseCSV(await f.text()); if (nodes.length) { model.replaceAll(nodes); deselect(); layout(); render(); fit(); } }
    catch (err) { alert("読み込み失敗 / import failed: " + (err.message || err)); }
    e.target.value = "";
  };
  $("zin").onclick = () => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 0.8);
  $("zout").onclick = () => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 1.25);
  window.addEventListener("resize", () => { if (!window.__lockView) fit(); });
  window.JJ.dev = {
    add: (pid, type, title) => { const p = model.byId(pid); const n = model.add({ type, parent: pid, branch: p ? (p.branch || p.id) : pid, date: "2026-06-26", title: title || "node" }); layout(); render(); return n.id; },
    byTitle: (s) => (model.nodes().find((n) => (n.title || "").includes(s)) || {}).id,
    zoomTo: (id) => { const p = pos[id]; if (p) { window.__lockView = true; view = { x: p.x - 360, y: p.y - 250, w: 720, h: 520 }; applyView(); } },
    layout, render, select,
  };

  // --- boot + auth gate ------------------------------------------------------------
  async function continueBoot() {
    await model.load();
    buildLegend();
    layout();
    render();
    fit();
    $("btnOut").style.display = model.isCloud() ? "" : "none";
  }
  function wireGate() {
    const inBtn = $("gIn"), err = $("gErr"), tog = $("gToggle");
    let mode = "in";
    const setMode = (m) => {
      mode = m; err.textContent = ""; err.style.color = "";
      inBtn.textContent = m === "in" ? "ログイン / Sign in" : "登録 / Register";
      tog.textContent = m === "in" ? "初めての方 → 登録 / Register" : "← ログインに戻る / Sign in";
    };
    tog.onclick = () => setMode(mode === "in" ? "up" : "in");
    inBtn.onclick = async () => {
      err.textContent = ""; err.style.color = "";
      const email = $("gEmail").value.trim(), pw = $("gPw").value;
      if (!email || !pw) { err.textContent = "メール／パスワードを入力してください"; return; }
      const label = inBtn.textContent; inBtn.disabled = true; inBtn.textContent = "…";
      try {
        if (mode === "in") {
          await model.signIn(email, pw); $("gate").classList.remove("open"); await continueBoot();
        } else {
          const r = await model.signUp(email, pw);
          if (r && r.session) { $("gate").classList.remove("open"); await continueBoot(); }
          else { err.style.color = "#5f9a55"; err.textContent = "確認メールを送信しました。メール内のリンクで登録を完了し、ログインしてください。"; inBtn.disabled = false; inBtn.textContent = label; }
        }
      } catch (e) { err.style.color = ""; err.textContent = e.message || (mode === "in" ? "ログイン失敗" : "登録失敗"); inBtn.disabled = false; inBtn.textContent = label; }
    };
    $("gPw").addEventListener("keydown", (e) => { if (e.key === "Enter") inBtn.click(); });
    $("gDemo").onclick = async () => { model.forceLocal = true; $("gate").classList.remove("open"); await continueBoot(); };
  }
  $("btnOut").onclick = async () => { try { await model.signOut(); } catch (e) {} location.reload(); };

  (async function boot() {
    const cloud = (window.JJ_CONFIG.BACKEND === "supabase" && window.JJ_CONFIG.SUPABASE_ANON_KEY);
    if (cloud) {
      try {
        await model.initClient();
        const session = await model.getSession();
        if (!session) { wireGate(); $("gate").classList.add("open"); return; }
      } catch (e) { console.warn("auth init failed → local:", e); model.forceLocal = true; }
    }
    await continueBoot();
  })();
})();
