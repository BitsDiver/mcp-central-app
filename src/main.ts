import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import { createAuth0 } from "@auth0/auth0-vue";
import type { Ref } from "vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./i18n";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(
  createAuth0({
    domain: import.meta.env.VITE_AUTH0_DOMAIN || "",
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || "",
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE || "",
    },
  }),
);

// ── Navigation guard ─────────────────────────────────────────────
// Auth0 plugin is now installed — $auth0 is available on globalProperties.
const $auth0 = app.config.globalProperties.$auth0 as {
  isLoading: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
};

router.beforeEach(async (to) => {
  // Wait for Auth0 SDK to finish its silent auth check on page load
  if ($auth0.isLoading.value) {
    await new Promise<void>((resolve) => {
      const stop = watch($auth0.isLoading, (loading) => {
        if (!loading) {
          stop();
          resolve();
        }
      });
    });
  }

  const authed = $auth0.isAuthenticated.value;

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
