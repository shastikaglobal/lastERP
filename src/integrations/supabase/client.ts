import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase environment variables are missing");
}

// Hybrid storage: Use localStorage but fall back to sessionStorage for PKCE verifier
class HybridStorage implements Storage {
  private localStoragePrefix = 'supabase-';
  
  getItem(key: string): string | null {
    // Try sessionStorage first for PKCE verifier (doesn't survive tab close)
    if (key.includes('pkce')) {
      const val = sessionStorage.getItem(key);
      if (val) return val;
    }
    // Fall back to localStorage
    return localStorage.getItem(key);
  }
  
  setItem(key: string, value: string): void {
    // Store PKCE verifier in both sessionStorage AND localStorage
    if (key.includes('pkce')) {
      sessionStorage.setItem(key, value);
    }
    localStorage.setItem(key, value);
  }
  
  removeItem(key: string): void {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
  
  clear(): void {
    localStorage.clear();
    sessionStorage.clear();
  }
  
  key(index: number): string | null {
    return localStorage.key(index);
  }
  
  get length(): number {
    return localStorage.length;
  }
}

const hybridStorage = new HybridStorage();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});