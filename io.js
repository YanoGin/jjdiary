// jjdiary — the standard data agreement.
// "A diary is a book held by the user." So the whole tree exports/imports as plain files:
//   · Markdown — the readable book (share, archive, read anywhere)
//   · CSV      — the lossless, re-importable data (one column per field)
// No lock-in: take your book and leave any time.
(function () {
  const COLS = ["id", "type", "parent", "branch", "date", "title", "body", "refs", "side", "order", "graduated", "thread", "approx"];

  function cell(v) {
    if (v == null) v = "";
    v = String(v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCSV(nodes) {
    const rows = [COLS.join(",")];
    for (const n of nodes) {
      rows.push(COLS.map((c) => (c === "refs" ? cell((n.refs || []).join(";")) : cell(n[c]))).join(","));
    }
    return rows.join("\n");
  }

  // RFC-4180-ish parser (handles quotes, commas, newlines inside quotes)
  function parseCSV(text) {
    const rows = [];
    let i = 0, field = "", row = [], inq = false;
    while (i < text.length) {
      const c = text[i];
      if (inq) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inq = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"') { inq = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows.shift().map((h) => h.trim());
    const out = [];
    for (const r of rows) {
      if (r.length === 1 && r[0] === "") continue;
      const o = {}; header.forEach((h, idx) => (o[h] = r[idx] != null ? r[idx] : ""));
      if (!o.id && !o.title) continue;
      const node = {
        id: o.id || ("n-" + Math.random().toString(36).slice(2, 9)),
        type: o.type || "leaf",
        parent: o.parent || null,
        branch: o.branch || null,
        date: o.date || "",
        title: o.title || "",
        body: o.body || "",
        refs: o.refs ? o.refs.split(";").map((s) => s.trim()).filter(Boolean) : [],
      };
      if (o.side) node.side = parseInt(o.side, 10);
      if (o.order) node.order = parseInt(o.order, 10);
      if (o.graduated) node.graduated = (o.graduated === "true" || o.graduated === "1");
      if (o.thread) node.thread = o.thread;
      if (o.approx) node.approx = (o.approx === "true" || o.approx === "1");
      out.push(node);
    }
    return out;
  }

  function toMarkdown(state) {
    const nodes = (state && state.nodes) || [];
    const TY = window.JJ.TYPES;
    const kids = (id) => nodes.filter((n) => n.parent === id).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let out = "# " + ((state.tree && state.tree.title) || "JJ 樹") + "\n\n";
    const roots = nodes.filter((n) => n.type === "root");
    if (roots.length) { out += "## 🌰 roots\n"; roots.forEach((r) => { out += `- **${r.title}**${r.body ? " — " + r.body : ""}\n`; }); out += "\n"; }
    const seed = nodes.find((n) => n.type === "seed" && !n.branch) || nodes.find((n) => n.type === "seed");
    if (seed) out += `## 🌱 seed — ${seed.title}\n${seed.body || ""}\n\n`;
    function render(node, depth) {
      const ty = TY[node.type] || TY.leaf;
      out += `${"  ".repeat(depth)}- ${ty.glyph} **${node.title}** _(${ty.cn}${node.date ? " · " + node.date : ""})_${node.body ? " — " + node.body : ""}\n`;
      kids(node.id).filter((k) => k.type !== "root").forEach((k) => render(k, depth + 1));
    }
    nodes.filter((n) => n.type === "branch").sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).forEach((b) => {
      out += `## ${b.graduated ? "🌳" : "🌿"} ${b.title}\n`;
      kids(b.id).forEach((k) => render(k, 0));
      out += "\n";
    });
    return out;
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  window.JJ_IO = { toCSV, parseCSV, toMarkdown, download };
})();
