import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jixujkfuagcxwpkuqijn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e6xFaQmlleOVaUetgcXBMg_q3GgzYIy';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
