// Token storage. The access token lives only in memory (gone on reload, so it
// is never readable from storage); the refresh token is kept in localStorage so
// a reload can sign back in. Trade-off: localStorage is readable by any script
// running on this origin, so an XSS bug would expose the refresh token. Moving
// it to an httpOnly cookie needs an API change and is out of scope for now.

const REFRESH_KEY = "nsx_admin_refresh_token";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(tokens: { AccessToken: string; RefreshToken: string }) {
  accessToken = tokens.AccessToken;
  try {
    window.localStorage.setItem(REFRESH_KEY, tokens.RefreshToken);
  } catch {
    // Private mode / blocked storage: the session just won't survive a reload.
  }
}

export function clearTokens() {
  accessToken = null;
  try {
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Nothing to clear.
  }
}
