import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import "highlight.js/styles/monokai.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./i18n";
import { initAuth, useAuth } from "./auth/useAuth";
import { accessTokenRef } from "./auth/tokenStore";

// ── Bootstrap ─────────────────────────────────────────────────────
// Wrapped in an async IIFE so we can await initAuth() (which may fetch
// /api/env) before registering the router guard and mounting the app.
// Top-level await is intentionally avoided for wider browser target support.
(async () => {
  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(i18n);

  // Fetch runtime config from /api/env when VITE_* vars are empty (production).
  // Must complete before the router guard runs so that _config is populated.
  await initAuth();

  // ── Navigation guard ─────────────────────────────────────────────
  router.beforeEach(async (to) => {
    // /callback is handled by CallbackView — always allow
    if (to.name === "callback") return;

    // Wait only briefly for any in-flight silent refresh on page load
    // (isLoading is set to false by initAuth once the refresh settles)
    const { isLoading } = useAuth();
    if (isLoading.value) {
      await new Promise<void>((resolve) => {
        const stop = watch(isLoading, (loading) => {
          if (!loading) {
            stop();
            resolve();
          }
        });
      });
    }

    const authed = !!accessTokenRef.value;

    // Unauthenticated users cannot access protected routes
    if (to.meta.requiresAuth && !authed) {
      return { name: "landing" };
    }

    // Authenticated users are redirected away from the landing page
    if (to.name === "landing" && authed) {
      return { name: "dashboard" };
    }
  });

  app.mount("#app");
})();
