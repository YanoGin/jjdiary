// jjdiary — the data layer.
// One tree of typed nodes. Persists to localStorage now; a thin async surface so the
// same calls swap onto Supabase later (see config.js).
(function () {
  const cfg = window.JJ_CONFIG || {};
  const KEY = "jjdiary_tree_v1";

  // the vocabulary of growth
  const TYPES = {
    seed:   { glyph: "🌱", jp: "種子", cn: "种子", en: "idea / a day",    color: "var(--seed)" },
    root:   { glyph: "🌰", jp: "根",   cn: "根",   en: "foundation",      color: "var(--root)" },
    branch: { glyph: "🌿", jp: "枝",   cn: "枝",   en: "job / mission",   color: "var(--branch)" },
    leaf:   { glyph: "🍃", jp: "葉",   cn: "叶",   en: "a record",        color: "var(--leaf)" },
    knot:   { glyph: "🪢", jp: "節",   cn: "节",   en: "a headache",      color: "var(--knot)" },
    flower: { glyph: "🌸", jp: "花",   cn: "花",   en: "an achievement",  color: "var(--flower)" },
    fruit:  { glyph: "🍎", jp: "果",   cn: "果",   en: "created value",   color: "var(--fruit)" },
  };

  function uid() {
    return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  const model = {
    state: null,
    TYPES,

    async load() {
      if (cfg.BACKEND === "supabase" && cfg.SUPABASE_ANON_KEY) {
        try { return await this._loadSupabase(); }
        catch (e) { console.warn("supabase load failed, falling back to local:", e); }
      }
      const raw = localStorage.getItem(KEY);
      if (raw) { this.state = JSON.parse(raw); return this.state; }
      const seed = await fetch("seed-tree.json").then((r) => r.json());
      this.state = seed;
      this.save();
      return this.state;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) {}
    },

    nodes() { return this.state ? this.state.nodes : []; },
    byId(id) { return this.nodes().find((n) => n.id === id); },
    branches() { return this.nodes().filter((n) => n.type === "branch"); },

    add({ type, branch, parent, date, title, body }) {
      const n = {
        id: uid(), type, parent: parent || null, branch: branch || null,
        date: date || new Date().toISOString().slice(0, 10),
        title: title || "", body: body || "", refs: [], user: true,
      };
      this.state.nodes.push(n);
      this.save();
      this._up(n);
      return n;
    },

    addBranch(name) {
      const order = this.branches().length;
      const b = {
        id: uid(), type: "branch", parent: "seed", branch: null,
        side: order % 2 === 0 ? -1 : 1, order,
        date: new Date().toISOString().slice(0, 10),
        title: name || "新しい枝", body: "", refs: [], user: true,
      };
      b.branch = b.id;
      this.state.nodes.push(b);
      this.save();
      this._up(b);
      return b;
    },

    remove(id) {
      const node = this.byId(id);
      if (!node) return;
      const parent = node.parent;
      // reparent any children up to this node's parent, then drop it
      this.state.nodes.forEach((n) => { if (n.parent === id) n.parent = parent; });
      this.state.nodes = this.nodes().filter((n) => n.id !== id);
      this.save();
      this._del(id);
    },

    resetToSeed() {
      localStorage.removeItem(KEY);
      this.state = null;
    },

    // --- supabase adapter (active only when SUPABASE_ANON_KEY is set; see schema.sql) --
    // Each row promotes a few columns for querying and keeps the full node in `data` jsonb,
    // so this maps 1:1 onto the localStorage node shape. Writes sync via _up / _del below.
    // (Cloud paths are wired but verify together once the anon key lands.)
    _toRow(n) { return { id: n.id, type: n.type, date: n.date || null, parent: n.parent || null, branch: n.branch || null, data: n }; },
    async _up(n) { if (this._cloud && this._sb) { try { await this._sb.from("nodes").upsert(this._toRow(n)); } catch (e) { console.warn("cloud up:", e); } } },
    async _del(id) { if (this._cloud && this._sb) { try { await this._sb.from("nodes").delete().eq("id", id); } catch (e) { console.warn("cloud del:", e); } } },

    async _loadSupabase() {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      this._sb = sb; this._cloud = true;
      const { data, error } = await sb.from("nodes").select("*").order("date", { ascending: true });
      if (error) throw error;
      const toNode = (r) => Object.assign({}, r.data, { id: r.id, type: r.type, date: r.date, parent: r.parent, branch: r.branch });
      if (!data || !data.length) {                       // first run on a fresh DB → plant the seed
        const seed = await fetch("seed-tree.json").then((r) => r.json());
        await sb.from("nodes").insert(seed.nodes.map(this._toRow));
        this.state = seed;
      } else {
        this.state = { tree: { id: "jjconnect", title: "JJ — the first tree" }, nodes: data.map(toNode) };
      }
      return this.state;
    },
  };

  window.JJ = { model, TYPES };
})();
