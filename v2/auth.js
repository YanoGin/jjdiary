// v2 AUTH — Supabase login/register, registration allowlisted.
(function () {
  const cfg = window.JJ2_CONFIG || {};
  const ALLOW = ["07.yang@gmail.com"]; // who may REGISTER (for now). Login is open to existing accounts.
  let sb = null;

  const auth = {
    allowed(email) { return ALLOW.includes((email || "").trim().toLowerCase()); },
    async client() {
      if (sb) return sb;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      return sb;
    },
    async session() { const c = await this.client(); const { data } = await c.auth.getSession(); return data.session; },
    async signIn(email, pw) { const c = await this.client(); const { data, error } = await c.auth.signInWithPassword({ email, password: pw }); if (error) throw error; return data; },
    async signUp(email, pw) {
      if (!this.allowed(email)) throw new Error("登録は招待制です（このメールは未許可）/ registration is invite-only");
      const c = await this.client(); const { data, error } = await c.auth.signUp({ email, password: pw }); if (error) throw error; return data;
    },
    async signOut() { if (sb) await sb.auth.signOut(); },
  };
  window.JJ2Auth = auth;
})();
