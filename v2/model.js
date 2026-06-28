// JJ Mind-Forest v2 — DATA layer (render-agnostic) + structured AI EXCHANGE.
// The data is the shared mind. Rendering is a separate skin. Everything is local (your data).
(function () {
  const KEY = "jj_mindforest_v2";

  const model = {
    state: null,

    async load() {
      const raw = localStorage.getItem(KEY);
      if (raw) { this.state = JSON.parse(raw); return this.state; }
      this.state = await fetch("/v2/seed.json").then((r) => r.json());
      this.save();
      return this.state;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) {} },
    reset() { localStorage.removeItem(KEY); this.state = null; },

    nodes() { return this.state.nodes; },
    rels() { return this.state.rels || (this.state.rels = []); },
    byId(id) { return this.nodes().find((n) => n.id === id); },
    projects() { return this.nodes().filter((n) => !n.parent); },
    childrenOf(id) { return this.nodes().filter((n) => n.parent === id); },
    linkedLabels(id) {
      return this.rels().filter((r) => r.from === id || r.to === id)
        .map((r) => { const o = r.from === id ? r.to : r.from; const n = this.byId(o); return n ? n.label : o; });
    },
    uid() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },

    // ============ structured EXCHANGE (the AI-adaptable part) ============

    // parse a structured feed payload:  @project: <hint>  +  - [kind] label :: body
    parsePayload(text) {
      let hint = null; const items = [];
      (text || "").split(/\r?\n/).forEach((line) => {
        const h = /^@project:\s*(.+)$/i.exec(line.trim());
        if (h) { hint = h[1].trim(); return; }
        const m = /^[-*]\s+(.*)$/.exec(line.trim());
        if (!m) return;
        let rest = m[1], kind = "note";
        const tm = /^\[(\w+)\]\s*/.exec(rest);
        if (tm) { kind = tm[1].toLowerCase(); rest = rest.slice(tm[0].length); }
        let links = []; const lm = /\s>>\s*links?:\s*(.+)$/i.exec(rest);
        if (lm) { links = lm[1].split(",").map((x) => x.trim()).filter(Boolean); rest = rest.slice(0, lm.index).trim(); }
        let body = ""; const bi = rest.indexOf("::");
        if (bi >= 0) { body = rest.slice(bi + 2).trim(); rest = rest.slice(0, bi).trim(); }
        items.push({ kind, label: rest, body, links });
      });
      return { hint, items };
    },

    // GUESS which project this feed belongs to (the AI's job; the human confirms)
    guessAttach(hint, items) {
      const projs = this.projects();
      if (hint) {
        const h = hint.toLowerCase();
        const ex = projs.find((p) => { const l = p.label.toLowerCase(); return l === h || l.includes(h) || h.includes(l); });
        if (ex) return { projectId: ex.id, label: ex.label, why: "hint" };
        return { projectId: null, newName: hint, why: "new" };
      }
      // no hint → infer from word overlap with each project's text
      const words = items.flatMap((it) => (it.label + " " + it.body).toLowerCase().split(/\W+/)).filter((w) => w.length > 3);
      let best = null, score = 0;
      projs.forEach((p) => { const blob = (p.label + " " + (p.body || "")).toLowerCase(); let s = 0; words.forEach((w) => { if (blob.includes(w)) s++; }); if (s > score) { score = s; best = p; } });
      return best ? { projectId: best.id, label: best.label, why: "inferred" } : { projectId: null, why: "none" };
    },

    // PREVIEW a push (the AI's reasoned structure) before the human applies it — no manual select
    previewPush(parsed) {
      const g = this.guessAttach(parsed.hint, parsed.items);
      const linkCount = parsed.items.reduce((s, it) => s + (it.links ? it.links.length : 0), 0);
      return { targetId: g.projectId || null, newName: g.newName || null,
        target: g.projectId ? this.byId(g.projectId).label : ("＋ " + (g.newName || "new project")),
        why: g.why, items: parsed.items, linkCount };
    },

    // APPLY the push: add nodes (AI-typed) + create the proposed connections (label-matched)
    applyPush(items, projectId, newName) {
      let pid = projectId;
      if (!pid) { const p = { id: this.uid(), kind: "project", label: newName || "new project", body: "", parent: null }; this.nodes().push(p); pid = p.id; }
      let added = 0, linked = 0;
      items.forEach((it) => {
        const n = { id: this.uid(), kind: it.kind || "note", label: it.label, body: it.body || "", parent: pid, fed: true };
        this.nodes().push(n); added++;
        (it.links || []).forEach((lab) => {
          const L = lab.toLowerCase();
          const tgt = this.nodes().find((x) => x.id !== n.id && (x.label.toLowerCase().includes(L) || L.includes(x.label.toLowerCase())));
          if (tgt) { this.rels().push({ from: n.id, to: tgt.id, kind: "link" }); linked++; }
        });
      });
      this.save();
      return { projectId: pid, added, linked };
    },

    // FEED-OUT: a structured context pack an AI reads at the START of a session
    contextPack(projectId) {
      const p = this.byId(projectId); if (!p) return null;
      const kids = this.childrenOf(projectId);
      return {
        connectTo: p.label,
        summary: p.body,
        nodes: kids.map((n) => ({ kind: n.kind, label: n.label, body: n.body })),
        openItems: kids.filter((n) => n.kind === "open" || n.kind === "headache").map((n) => n.label),
        linkedProjects: this.linkedLabels(projectId),
        feedBackAs: "@project: " + p.label + "  then  - [kind] label :: body",
      };
    },
  };

  window.JJ2 = { model };
})();
