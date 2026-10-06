const SUPABASE_URL = 'https://nyizxtaofoynfgazhzsg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KVAloXNJvE4WtKu_TcntUA_QH_Jrbfn';

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);