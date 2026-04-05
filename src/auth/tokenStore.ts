/**
 * In-memory token store with sessionStorage persistence for refresh tokens.
 *
 * Security model:
 *  - `access_token` is stored in memory only (XSS-resistant, cleared on page close)
 *  - `refresh_token` is stored in `sessionStorage` (cleared when tab closes; not
 *    persistent across browser sessions unlike localStorage)
 *
 * Silent refresh:
 *  - `scheduleRefresh()` sets a setTimeout to re-run the token refresh
 *    30 seconds before the access_token expires.
 *
 * Usage:
 *  - Call `setTokens()` after a successful code exchange or refresh.
 *  - Call `clearTokens()` on logout (also triggers revocation via callback).
 *  - Read `getAccessToken()` for the current in-memory access token.
 */

import { ref } from "vue";

const REFRESH_TOKEN_KEY = "oidc_refresh_token";

// ─── In-memory access token ────────────────────────────────
const _accessToken = ref<string | null>(null);
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;
let _onRefreshCallback: (() => Promise<void>) | null = null;

// ─── Public API ────────────────────────────────────────────

/** Register a callback that will be invoked when a silent refresh is needed. */
export function onSilentRefresh(cb: () => Promise<void>): void {
  _onRefreshCallback = cb;
}

/** Store tokens after a successful exchange or refresh. */
export function setTokens(tokens: {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}): void {
  _accessToken.value = tokens.accessToken;

  if (tokens.refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  scheduleRefresh(tokens.expiresIn);
}

/** Return the current in-memory access token. */
export function getAccessToken(): string | null {
  return _accessToken.value;
}

/** Return the stored refresh token from sessionStorage. */
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Clear all tokens (logout). Does NOT revoke tokens — caller must do that. */
export function clearTokens(): void {
  _accessToken.value = null;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  if (_refreshTimer !== null) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

/** Reactive reference — useful for watching auth state changes in Vue. */
export const accessTokenRef = _accessToken;

// ─── Silent refresh scheduler ──────────────────────────────

function scheduleRefresh(expiresIn: number): void {
  if (_refreshTimer !== null) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }

  if (!_onRefreshCallback) return;
  if (expiresIn <= 0) return;

  // Refresh 30 seconds before expiry (minimum 5 seconds delay)
  const delayMs = Math.max((expiresIn - 30) * 1000, 5_000);

  _refreshTimer = setTimeout(async () => {
    _refreshTimer = null;
    if (_onRefreshCallback) {
      await _onRefreshCallback().catch(() => {
        // Refresh failed silently — user will be redirected to login on next request
      });
    }
  }, delayMs);
}
