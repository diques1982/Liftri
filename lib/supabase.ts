import { createClient } from '@supabase/supabase-js';

// Supabase credentials configured for Liftri
const supabaseUrl = 'https://bseraosjwjwmdzkzbgnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZXJhb3Nqd2p3bWR6a3piZ25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTg5NTUsImV4cCI6MjA5MzQ5NDk1NX0.1iJyyK5zGVq9-Z5EPdtXDI-lQi-TezGzLJS-pnPIoE0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
