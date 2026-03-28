/**
 * Secure Vault Service
 * Uses Web Crypto API to encrypt/decrypt health app tokens
 */

const VAULT_KEY_NAME = 'camino_vault_key';
const ENCRYPTED_STORAGE_PREFIX = 'vault_';

async function getOrCreateKey(): Promise<CryptoKey> {
  const existingKey = localStorage.getItem(VAULT_KEY_NAME);
  if (existingKey) {
    const keyData = JSON.parse(existingKey);
    return await window.crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await window.crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(VAULT_KEY_NAME, JSON.stringify(exported));
  return key;
}

export async function saveToVault(key: string, value: string) {
  const cryptoKey = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  const base64 = btoa(String.fromCharCode(...combined));
  localStorage.setItem(`${ENCRYPTED_STORAGE_PREFIX}${key}`, base64);
}

export async function getFromVault(key: string): Promise<string | null> {
  const base64 = localStorage.getItem(`${ENCRYPTED_STORAGE_PREFIX}${key}`);
  if (!base64) return null;

  try {
    const cryptoKey = await getOrCreateKey();
    const combined = new Uint8Array(
      atob(base64).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Vault decryption failed', e);
    return null;
  }
}

export async function deleteFromVault(key: string) {
  localStorage.removeItem(`${ENCRYPTED_STORAGE_PREFIX}${key}`);
}

/**
 * CloudBridge Logic: Passive Sensor Ingestion
 * Mocking API calls for Apple HealthKit, Google Fit, etc.
 * In a real app, these would be OAuth flows.
 */
export interface HealthData {
  steps: number;
  distance: number;
  heartRate: number;
  lastSync: string;
}

export async function syncHealthData(provider: 'apple' | 'google' | 'samsung' | 'fitbit'): Promise<HealthData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // In a real app, we'd check for tokens in the vault
  const token = await getFromVault(`${provider}_token`);
  if (!token) {
    throw new Error('NOT_AUTHORIZED');
  }

  // Mock data ingestion
  return {
    steps: Math.floor(Math.random() * 5000) + 5000,
    distance: parseFloat((Math.random() * 5 + 2).toFixed(2)),
    heartRate: Math.floor(Math.random() * 20) + 60,
    lastSync: new Date().toISOString()
  };
}
