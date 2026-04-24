export const ADMIN_SESSION_COOKIE = "yesbakery-admin-session";

export function getDashboardPassword() {
  return process.env.BACKEND_DASHBOARD_PASSWORD?.trim() || "";
}

function getSessionSecret() {
  return process.env.BACKEND_SESSION_SECRET?.trim() || "";
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  return secret ? `yesbakery-admin:${secret}` : "";
}

export function isValidAdminSessionToken(token: string) {
  const expected = createAdminSessionToken();
  return Boolean(expected) && token === expected;
}
