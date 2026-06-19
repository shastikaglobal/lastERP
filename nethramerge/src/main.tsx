import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

// --- Global Fetch Interceptor for Real-Time Sync ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  try {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
    const method = (args[1]?.method || (args[0] instanceof Request ? args[0].method : 'GET')).toUpperCase();
    
    if (
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) &&
      url.includes('/api/') &&
      !url.includes('/auth/v1/') &&
      response.ok
    ) {
      // Trigger global broadcast
      supabase.channel('global_data_sync').send({
        type: 'broadcast',
        event: 'data_changed',
        payload: { path: url }
      }).catch(err => console.error('Broadcast failed:', err));
    }
  } catch (err) {
    // Ignore errors in interceptor
  }
  return response;
};
// ---------------------------------------------------

// Force the dark + gold theme globally
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
