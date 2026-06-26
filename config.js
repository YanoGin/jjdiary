// jjdiary — runtime config.
// Backend starts on the browser (localStorage) so the tree is alive instantly.
// To move to the cloud: paste the Supabase ANON / publishable key and set BACKEND:"supabase".
window.JJ_CONFIG = {
  SUPABASE_URL: "https://sgekfwmaujgghhrzzfhi.supabase.co",
  SUPABASE_ANON_KEY: "",            // <- owner pastes the anon (publishable) key here
  BACKEND: "local"                  // "local" | "supabase"
};
