import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Global counter for non-React Query components
let globalSyncCounter = 0;
const subscribers = new Set<(counter: number) => void>();

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const [syncCounter, setSyncCounter] = useState(globalSyncCounter);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Local subscription to global sync counter
    const handleUpdate = (newCounter: number) => {
      setSyncCounter(newCounter);
    };
    subscribers.add(handleUpdate);

    // Only set up Supabase channel once globally (first subscriber does it)
    if (globalSyncCounter === 0 && subscribers.size === 1) {
      const channel = supabase.channel('global_data_sync');
      
      channel.on('broadcast', { event: 'data_changed' }, (payload) => {
        // Debounce to prevent broadcast storms
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          console.log('🔄 Global Realtime Sync Triggered!');
          // 1. Invalidate React Query caches globally
          queryClient.invalidateQueries();
          
          // 2. Increment global counter for manual fetch pages
          globalSyncCounter += 1;
          subscribers.forEach(sub => sub(globalSyncCounter));
        }, 500); // 500ms debounce
      }).subscribe();

      return () => {
        subscribers.delete(handleUpdate);
        if (subscribers.size === 0) {
          supabase.removeChannel(channel);
        }
      };
    }

    return () => {
      subscribers.delete(handleUpdate);
    };
  }, [queryClient]);

  return { syncCounter };
}
