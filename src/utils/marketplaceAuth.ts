export interface ActiveMarketplaceSession {
  email: string;
  role: string;
  token?: string | null;
}

export function getActiveMarketplaceSession(): ActiveMarketplaceSession | null {
  try {
    const raw = localStorage.getItem('sso_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = (parsed?.email || '').toString().trim().toLowerCase();
    const role = (parsed?.role || '').toString().trim();
    if (!email || !role) return null;
    const token = localStorage.getItem('sso_token') || localStorage.getItem('token');
    return { email, role, token };
  } catch {
    return null;
  }
}

export function buildMarketplaceHeaders(includeJsonContentType = true): Record<string, string> {
  const session = getActiveMarketplaceSession();
  if (!session) {
    throw new Error('You must be logged in with both an email address and a role to use this feature.');
  }
  const headers: Record<string, string> = {
    'x-user-email': session.email,
    'x-user-role': session.role,
  };
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}