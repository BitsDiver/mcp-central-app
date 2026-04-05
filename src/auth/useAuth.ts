/**
 * useAuth — Drop-in replacement for `useAuth0` from `@auth0/auth0-vue`.
 *
 * Exposes an identical interface so that all existing components (App.vue,
 * LandingView.vue, AppHeader.vue) require minimal changes.
 *
 * Public interface:
 *  - `isAuthenticated: Ref<boolean>`
 *  - `isLoading: Ref<boolean>`
 *  - `user: Ref<{ name?: string; email?: string } | null>`
 *  - `loginWithRedirect()` — initiates PKCE flow towards auth-service
 *  - `logout()` — revokes tokens and redirects to auth-service logout
 *  - `getAccessTokenSilently() → Promise<string>` — returns token or silently refreshes
 */

import { ref, readonly } from "vue";
import type { Ref } from "vue";
import {
  buildAuthorizationUrl,
  exchangeCode,
  refreshAccessToken,
  revokeToken,
  type PkceConfig,
} from "./pkce.js";
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  onSilentRefresh,
} from "./tokenStore.js";

// ─── Singleton state ───────────────────────────────────────

const _isLoading = ref(true);
const _isAuthenticated = ref(false);
const _user = ref<{ name?: string; email?: string } | null>(null);

// ─── Config (populated by install()) ─────────────────────

let _config: PkceConfig = {
  authServiceUrl: "",
  clientId: "",
  redirectUri: `${window.location.origin}/callback`,
  scopes: "openid profile email offline_access roles permissions features",
};

// ─── Initialization ────────────────────────────────────────

/**
 * Initialize the auth module. Call once in main.ts before mounting the app.
 * Returns a Promise so main.ts can `await initAuth()` before mounting.
 *
 * Config resolution strategy (first non-empty value wins):
 *   1. VITE_AUTH_SERVICE_URL / VITE_AUTH_SERVICE_CLIENT_ID  — baked in at
 *      build time (local dev with `pnpm dev`).
 *   2. GET /api/env  — runtime injection from the backend's own env vars.
 *      Used in production where the SPA is served as pre-built static files
 *      and the VITE_* values are empty.
 */
export async function initAuth(): Promise<void> {
  let authServiceUrl = import.meta.env.VITE_AUTH_SERVICE_URL ?? "";
  let clientId = import.meta.env.VITE_AUTH_SERVICE_CLIENT_ID ?? "";

  // If either value is missing, fetch runtime config from the backend.
  if (!authServiceUrl || !clientId) {
    try {
      const res = await fetch("/api/env");
      if (res.ok) {
        const json = (await res.json()) as {
          authServiceUrl?: string;
          clientId?: string;
        };
        if (!authServiceUrl && json.authServiceUrl)
          authServiceUrl = json.authServiceUrl;
        if (!clientId && json.clientId) clientId = json.clientId;
      }
    } catch {
      // Network error — config will remain empty and the first auth attempt
      // will throw a clear "not a valid URL" error.
    }
  }

  _config = {
    authServiceUrl,
    clientId,
    redirectUri: `${window.location.origin}/callback`,
    scopes: "openid profile email offline_access roles permissions features",
  };

  // Register silent refresh callback
  onSilentRefresh(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      _isAuthenticated.value = false;
      return;
    }
    try {
      const tokens = await refreshAccessToken(_config, refreshToken);
      setTokens({
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        refreshToken: tokens.refresh_token,
      });
    } catch {
      _isAuthenticated.value = false;
      clearTokens();
    }
  });

  // Restore session if a refresh token is already in sessionStorage
  const existingRefreshToken = getRefreshToken();
  if (existingRefreshToken) {
    // Attempt silent refresh to restore session on page reload
    refreshAccessToken(_config, existingRefreshToken)
      .then((tokens) => {
        setTokens({
          accessToken: tokens.access_token,
          expiresIn: tokens.expires_in,
          refreshToken: tokens.refresh_token,
        });
        // Parse user info from access token claims
        _user.value = parseUserFromToken(tokens.access_token);
        _isAuthenticated.value = true;
      })
      .catch(() => {
        clearTokens();
        _isAuthenticated.value = false;
      })
      .finally(() => {
        _isLoading.value = false;
      });
  } else {
    _isLoading.value = false;
  }
}

// ─── Composable ────────────────────────────────────────────

export function useAuth() {
  return {
    isAuthenticated: readonly(_isAuthenticated) as Ref<boolean>,
    isLoading: readonly(_isLoading) as Ref<boolean>,
    user: readonly(_user) as Ref<{ name?: string; email?: string } | null>,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  };
}

// ─── Actions ───────────────────────────────────────────────

/** Redirect the browser to auth-service for login (PKCE). */
export async function loginWithRedirect(options?: {
  appState?: { returnTo?: string };
}): Promise<void> {
  if (options?.appState?.returnTo) {
    sessionStorage.setItem("oidc_return_to", options.appState.returnTo);
  }
  const url = await buildAuthorizationUrl(_config);
  window.location.href = url.toString();
}

/**
 * Revoke tokens and redirect to the auth-service logout endpoint,
 * which in turn redirects back to `window.location.origin`.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();

  // Revoke both tokens best-effort before clearing
  await Promise.allSettled([
    refreshToken
      ? revokeToken(_config, refreshToken, "refresh_token")
      : Promise.resolve(),
    accessToken
      ? revokeToken(_config, accessToken, "access_token")
      : Promise.resolve(),
  ]);

  clearTokens();
  _isAuthenticated.value = false;
  _user.value = null;

  // Redirect to auth-service end_session endpoint
  const logoutUrl = new URL(`${_config.authServiceUrl}/api/auth/sign-out`);
  logoutUrl.searchParams.set("callbackURL", window.location.origin);
  window.location.href = logoutUrl.toString();
}

/**
 * Returns the current access token, attempting a silent refresh if needed.
 * Throws if no token is available.
 */
export async function getAccessTokenSilently(): Promise<string> {
  const current = getAccessToken();
  if (current) return current;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Not authenticated");

  const tokens = await refreshAccessToken(_config, refreshToken);
  setTokens({
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
  });

  _user.value = parseUserFromToken(tokens.access_token);
  _isAuthenticated.value = true;

  return tokens.access_token;
}

/**
 * Complete the PKCE callback. Called from CallbackView.vue.
 * Returns the `returnTo` path that was stored before the redirect (or "/dashboard").
 */
export async function handleCallback(
  code: string,
  state: string,
): Promise<string> {
  const tokens = await exchangeCode(_config, code, state);

  setTokens({
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
  });

  _user.value = parseUserFromToken(tokens.access_token);
  _isAuthenticated.value = true;
  _isLoading.value = false;

  const returnTo = sessionStorage.getItem("oidc_return_to") ?? "/dashboard";
  sessionStorage.removeItem("oidc_return_to");
  return returnTo;
}

// ─── Internal helpers ──────────────────────────────────────

/** Parse display-only user info from a JWT payload (no signature verification needed here — token was just issued). */
function parseUserFromToken(
  token: string,
): { name?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return {
      name: payload.name ?? undefined,
      email: payload.email ?? undefined,
    };
  } catch {
    return null;
  }
}
