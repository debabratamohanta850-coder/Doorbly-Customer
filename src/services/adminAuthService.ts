/**
 * Doorbly Device-Specific Admin Authentication Service
 * Strictly restricts Admin Panel access to the specific device where the
 * authorized credentials are provided.
 */

const STORAGE_KEY = 'doorbly_device_admin_auth_v1';
const AUTHORIZED_USER_ID = 'debabrata.tribune@gmail.com';
const AUTHORIZED_PASSWORD = 'Devraj@1122';

export interface AdminAuthState {
  isAuthenticated: boolean;
  email: string | null;
  authenticatedAt: string | null;
  deviceId: string | null;
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('doorbly_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('doorbly_device_id', deviceId);
  }
  return deviceId;
}

export function isDeviceAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data && data.isAuthenticated === true && data.email === AUTHORIZED_USER_ID;
  } catch {
    return false;
  }
}

export function getAdminAuthState(): AdminAuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, email: null, authenticatedAt: null, deviceId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { isAuthenticated: false, email: null, authenticatedAt: null, deviceId: getOrCreateDeviceId() };
    }
    const data = JSON.parse(raw);
    if (data?.isAuthenticated && data.email === AUTHORIZED_USER_ID) {
      return {
        isAuthenticated: true,
        email: data.email,
        authenticatedAt: data.authenticatedAt,
        deviceId: data.deviceId || getOrCreateDeviceId()
      };
    }
  } catch {}
  return { isAuthenticated: false, email: null, authenticatedAt: null, deviceId: getOrCreateDeviceId() };
}

export function authenticateDeviceAdmin(userId: string, pass: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot authenticate on server' };
  }

  const cleanUser = userId.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (cleanUser !== AUTHORIZED_USER_ID.toLowerCase()) {
    return { success: false, error: 'Invalid User ID. Access restricted.' };
  }

  if (cleanPass !== AUTHORIZED_PASSWORD) {
    return { success: false, error: 'Incorrect password for admin access.' };
  }

  const authData = {
    isAuthenticated: true,
    email: AUTHORIZED_USER_ID,
    authenticatedAt: new Date().toISOString(),
    deviceId: getOrCreateDeviceId()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
  window.dispatchEvent(new Event('doorbly_admin_auth_changed'));
  return { success: true };
}

export function revokeDeviceAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('doorbly_admin_auth_changed'));
}

export function subscribeAdminAuth(callback: (isAdmin: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(isDeviceAdminAuthenticated());
  };

  window.addEventListener('doorbly_admin_auth_changed', handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('doorbly_admin_auth_changed', handler);
    window.removeEventListener('storage', handler);
  };
}
