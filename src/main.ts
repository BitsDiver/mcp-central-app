import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import "highlight.js/styles/monokai.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./i18n";
import { initAuth, useAuth } from "./auth/useAuth";
import { accessTokenRef } from "./auth/tokenStore";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// Initialise PKCE auth module (restores session from sessionStorage if present)
initAuth();

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
