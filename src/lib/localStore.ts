// Local storage layer — replaces Firebase auth + Firestore for beta
// All data persists in the browser's localStorage

const PREFIX = 'camino_';

function key(name: string): string {
  return `${PREFIX}${name}`;
}

export function getProfile(): any | null {
  try {
    const raw = localStorage.getItem(key('profile'));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(data: any): void {
  const existing = getProfile() || {};
  const merged = { ...existing, ...data };
  localStorage.setItem(key('profile'), JSON.stringify(merged));
}

export function getPlans(): any[] {
  try {
    const raw = localStorage.getItem(key('plans'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlans(plans: any[]): void {
  localStorage.setItem(key('plans'), JSON.stringify(plans));
}

export function addPlan(plan: any): void {
  const plans = getPlans();
  plans.push({ ...plan, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  savePlans(plans);
}

export function getLogs(): any[] {
  try {
    const raw = localStorage.getItem(key('logs'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLog(log: any): void {
  const logs = getLogs();
  logs.push({ ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  localStorage.setItem(key('logs'), JSON.stringify(logs));
}

export function getLeaderboard(): any[] {
  try {
    const raw = localStorage.getItem(key('leaderboard'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLeaderboard(data: any[]): void {
  localStorage.setItem(key('leaderboard'), JSON.stringify(data));
}

// Generate a mock user object that matches what components expect
export function getLocalUser() {
  const profile = getProfile();
  return {
    uid: 'local-user',
    displayName: profile?.displayName || 'Pilgrim',
    email: '',
    photoURL: null,
  };
}
