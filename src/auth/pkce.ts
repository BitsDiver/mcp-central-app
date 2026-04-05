/**
 * PKCE helpers for the OAuth 2.0 Authorization Code flow.
 *
 * Implements RFC 7636 using the Web Crypto API (available in all modern
 * browsers and Node 18+).
 *
 * Usage flow:
 *  1. `const verifier = generateCodeVerifier()`      — store in sessionStorage
 *  2. `const challenge = await generateCodeChallenge(verifier)`
 *  3. Redirect to `buildAuthorizationUrl(config, challenge, state)`
 *  4. On callback: `exchangeCode(config, code, verifier)` → tokens
 */

import * as oauth from "oauth4webapi";

// ─── Helpers ───────────────────────────────────────────────

/** Generates a cryptographically random PKCE code verifier (43–128 chars). */
export function generateCodeVerifier(): string {
  return oauth.generateRandomCodeVerifier();
}

/**
 * Computes the S256 code challenge from a verifier.
 *
 * Falls back to the `plain` method when `crypto.subtle` is unavailable
 * (plain HTTP on a non-localhost origin — dev only).
 * In that case the challenge equals the verifier and `code_challenge_method`
 * is set to `"plain"` in the authorization URL.
 *
 * `crypto.subtle` is always available on `https://` origins and on
 * `http://localhost`, so production deployments are unaffected.
 */
async function computeCodeChallenge(
  verifier: string,
): Promise<{ challenge: string; method: "S256" | "plain" }> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const challenge = await oauth.calculatePKCECodeChallenge(verifier);
    return { challenge, method: "S256" };
  }
  // Non-secure context (plain HTTP on a custom hostname).
  // S256 is unavailable — fall back to plain PKCE.
  // This should only happen in development; use HTTPS in production.
  console.warn(
    "[auth] crypto.subtle unavailable (non-secure context). " +
      "Falling back to PKCE 'plain' method. Use HTTPS in production.",
  );
  return { challenge: verifier, method: "plain" };
}

/** Generates a random `state` parameter for CSRF protection. */
export function generateState(): string {
  return oauth.generateRandomState();
}

// ─── Config type ───────────────────────────────────────────

export interface PkceConfig {
  /** Public base URL of auth-service, e.g. "https://auth.example.com" */
  authServiceUrl: string;
  /** OAuth2 client ID registered in auth-service (= app slug) */
  clientId: string;
  /** Full redirect URI, e.g. "https://app.example.com/callback" */
  redirectUri: string;
  /** Space-separated scopes to request */
  scopes: string;
}

// ─── Authorization URL ─────────────────────────────────────

/**
 * Build the authorization URL that the browser will be redirected to.
 * Stores `code_verifier` and `state` in `sessionStorage` for later use.
 */
export async function buildAuthorizationUrl(config: PkceConfig): Promise<URL> {
  const verifier = generateCodeVerifier();
  const { challenge, method } = await computeCodeChallenge(verifier);
  const state = generateState();

  sessionStorage.setItem("oidc_code_verifier", verifier);
  sessionStorage.setItem("oidc_state", state);

  const issuer = new URL(config.authServiceUrl);
  const as = await oauth
    .discoveryRequest(issuer, { algorithm: "oauth2" })
    .then((res) => oauth.processDiscoveryResponse(issuer, res));

  const url = new URL(as.authorization_endpoint!);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", method);
  url.searchParams.set("state", state);

  return url;
}

// ─── Token exchange ────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Exchange an authorization `code` for tokens.
 * Reads the stored `code_verifier` from `sessionStorage`.
 *
 * @param config   PKCE configuration
 * @param code     Authorization code from the callback URL
 * @param state    State parameter from the callback URL (for CSRF validation)
 */
export async function exchangeCode(
  config: PkceConfig,
  code: string,
  state: string,
): Promise<TokenResponse> {
  const storedState = sessionStorage.getItem("oidc_state");
  const verifier = sessionStorage.getItem("oidc_code_verifier");

  if (!verifier)
    throw new Error("PKCE code verifier not found in sessionStorage");
  if (storedState && storedState !== state) {
    throw new Error("OAuth state mismatch — possible CSRF attack");
  }

  // Clean up PKCE artifacts
  sessionStorage.removeItem("oidc_code_verifier");
  sessionStorage.removeItem("oidc_state");

  const issuer = new URL(config.authServiceUrl);
  const as = await oauth
    .discoveryRequest(issuer, { algorithm: "oauth2" })
    .then((res) => oauth.processDiscoveryResponse(issuer, res));

  const client: oauth.Client = { client_id: config.clientId };

  const params = oauth.validateAuthResponse(
    as,
    client,
    new URL(
      `${config.redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    ),
    storedState ?? oauth.skipStateCheck,
  );

  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    oauth.None(), // public client — no client secret
    params,
    config.redirectUri,
    verifier,
  );

  const result = await oauth.processAuthorizationCodeResponse(
    as,
    client,
    response,
  );

  return {
    access_token: result.access_token,
    token_type: result.token_type ?? "Bearer",
    expires_in: result.expires_in ?? 3600,
    refresh_token: result.refresh_token ?? undefined,
    scope: result.scope ?? undefined,
    // id_token: available if 'openid' scope was requested
    // oauth4webapi parses it but we use access_token claims here
  };
}

// ─── Token refresh ─────────────────────────────────────────

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshAccessToken(
  config: PkceConfig,
  refreshToken: string,
): Promise<TokenResponse> {
  const issuer = new URL(config.authServiceUrl);
  const as = await oauth
    .discoveryRequest(issuer, { algorithm: "oauth2" })
    .then((res) => oauth.processDiscoveryResponse(issuer, res));

  const client: oauth.Client = { client_id: config.clientId };

  const response = await oauth.refreshTokenGrantRequest(
    as,
    client,
    oauth.None(),
    refreshToken,
  );

  const result = await oauth.processRefreshTokenResponse(as, client, response);

  return {
    access_token: result.access_token,
    token_type: result.token_type ?? "Bearer",
    expires_in: result.expires_in ?? 3600,
    refresh_token: result.refresh_token ?? refreshToken,
    scope: result.scope ?? undefined,
  };
}

// ─── Token revocation ──────────────────────────────────────

/**
 * Revoke an access or refresh token at the authorization server.
 * Best-effort — errors are silently swallowed.
 */
export async function revokeToken(
  config: PkceConfig,
  token: string,
  tokenTypeHint: "access_token" | "refresh_token" = "refresh_token",
): Promise<void> {
  try {
    const issuer = new URL(config.authServiceUrl);
    const as = await oauth
      .discoveryRequest(issuer, { algorithm: "oauth2" })
      .then((res) => oauth.processDiscoveryResponse(issuer, res));

    if (!as.revocation_endpoint) return;

    const client: oauth.Client = { client_id: config.clientId };
    await oauth.revocationRequest(as, client, oauth.None(), token, {
      additionalParameters: new URLSearchParams({
        token_type_hint: tokenTypeHint,
      }),
    });
  } catch {
    // Revocation is best-effort — do not block logout
  }
}
