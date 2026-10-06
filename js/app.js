const statusEl = document.querySelector('#status');

if (db) {
    statusEl.textContent = 'Supabase client initialized successfully.';
    console.log('Supabase client:', db);
} else {
    statusEl.textContent = 'Supabase failed to initialize.';
}