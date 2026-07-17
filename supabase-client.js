// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT + AUTH
// ═══════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://gyoqlhsbqedbhlgyyqny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b3FsaHNicWVkYmhsZ3l5cW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODU4MzIsImV4cCI6MjA5NzM2MTgzMn0.6Z-Zhzlxj6ph1WDJHpsv-WSfQW6Cuu0tsos6BAaPTAc';

// Создаётся после загрузки SDK (window.supabase из CDN)
let sb = null;
let currentUser = null;

function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('Supabase SDK не загрузился — работаем в локальном режиме');
    return null;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

// ─── Проверка сессии при загрузке ───
async function checkAuthSession() {
  if (!sb) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user || null;
    return currentUser;
  } catch (e) {
    console.error('Ошибка проверки сессии:', e);
    return null;
  }
}

// ─── Вход через Google ───
async function signInWithGoogle() {
  if (!sb) { alert('Supabase не подключён'); return; }
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) { alert('Ошибка входа: ' + error.message); }
}

// ─── Вход по email + пароль ───
async function signInWithPassword(email, password) {
  if (!sb) return { ok: false, msg: 'Supabase не подключён' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, msg: error.message };
  return { ok: true, user: data.user };
}

// ─── Регистрация по email + пароль ───
async function signUpWithPassword(email, password) {
  if (!sb) return { ok: false, msg: 'Supabase не подключён' };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if (error) return { ok: false, msg: error.message };
  // Если email-подтверждение выключено — сразу есть сессия
  const hasSession = !!data.session;
  return { ok: true, user: data.user, needsConfirm: !hasSession };
}

// ─── Выход ───
async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  currentUser = null;
  window.location.reload();
}

// ─── Слушатель смены состояния авторизации ───
function onAuthChange(callback) {
  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    callback(event, currentUser);
  });
}

// ═══════════════════════════════════════════════════════════════
// CLOUD STORAGE — профили, эталоны, настройки
// ═══════════════════════════════════════════════════════════════

// ─── ПРОФИЛИ ───

// Загрузить все профили доступные пользователю (свои + общие)
async function cloudLoadProfiles() {
  if (!sb || !currentUser) return null;
  try {
    const { data, error } = await sb
      .from('cs_profiles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('cloudLoadProfiles:', e);
    return null;
  }
}

// Сохранить (upsert) один профиль. Возвращает id записи.
async function cloudSaveProfile(name, profileData, isShared, existingId) {
  if (!sb || !currentUser) return null;
  try {
    const row = {
      owner_id: currentUser.id,
      name,
      data: profileData,
      is_shared: !!isShared
    };
    if (existingId) row.id = existingId;
    const { data, error } = await sb
      .from('cs_profiles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('cloudSaveProfile:', e);
    return null;
  }
}

async function cloudDeleteProfile(id) {
  if (!sb || !currentUser || !id) return false;
  try {
    const { error } = await sb.from('cs_profiles').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('cloudDeleteProfile:', e);
    return false;
  }
}

// ─── ЭТАЛОНЫ ───

async function cloudLoadReferences() {
  if (!sb || !currentUser) return null;
  try {
    const { data, error } = await sb
      .from('cs_references')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('cloudLoadReferences:', e);
    return null;
  }
}

async function cloudSaveReference(ref, isShared, existingId) {
  if (!sb || !currentUser) return null;
  try {
    const row = {
      owner_id: currentUser.id,
      name: ref.name || 'Эталон',
      script_type: ref.scriptType || '',
      niche: ref.niche || '',
      goal: ref.goal || '',
      tone: ref.tone || '',
      tags: ref.tags || [],
      notes: ref.notes || '',
      profile_data: ref.profileData || ref.profile || ref.data || {},
      is_shared: !!isShared,
      is_active: ref.isActive !== false
    };
    if (existingId) row.id = existingId;
    const { data, error } = await sb
      .from('cs_references')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('cloudSaveReference:', e);
    return null;
  }
}

async function cloudDeleteReference(id) {
  if (!sb || !currentUser || !id) return false;
  try {
    const { error } = await sb.from('cs_references').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('cloudDeleteReference:', e);
    return false;
  }
}

// ─── ОБУЧЕНИЕ НА ПРАВКАХ (было → стало) ───
// Requires a Supabase table `cs_edits`:
//   id uuid pk default gen_random_uuid(), owner_id uuid, created_at timestamptz default now(),
//   block_title text, intent text, ai_ru text, ai_uz text, final_ru text, final_uz text,
//   niche text, goal text
// + RLS: owner_id = auth.uid() for select/insert/delete.
async function cloudSaveEdit(edit) {
  if (!sb || !currentUser) return null;
  try {
    const { data, error } = await sb.from('cs_edits').insert({
      owner_id: currentUser.id,
      block_title: edit.title || '',
      intent: edit.intent || '',
      ai_ru: edit.aiRu || '',
      ai_uz: edit.aiUz || '',
      final_ru: edit.finalRu || '',
      final_uz: edit.finalUz || '',
      niche: edit.niche || '',
      goal: edit.goal || ''
    }).select().single();
    if (error) throw error;
    return data;
  } catch (e) { console.error('cloudSaveEdit:', e); return null; }
}

async function cloudLoadEdits(limit = 40) {
  if (!sb || !currentUser) return [];
  try {
    const { data, error } = await sb
      .from('cs_edits')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) { console.error('cloudLoadEdits:', e); return []; }
}

// ─── НАСТРОЙКИ ───

async function cloudLoadSettings() {
  if (!sb || !currentUser) return null;
  try {
    const { data, error } = await sb
      .from('cs_user_settings')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('cloudLoadSettings:', e);
    return null;
  }
}

async function cloudSaveSettings(llmSettings, prompts, theme) {
  if (!sb || !currentUser) return false;
  try {
    const { error } = await sb.from('cs_user_settings').upsert({
      user_id: currentUser.id,
      llm_settings: llmSettings || {},
      prompts: prompts || {},
      theme: theme || 'dark'
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('cloudSaveSettings:', e);
    return false;
  }
}

function getCurrentUserId() { return currentUser?.id || null; }
function getCurrentUserEmail() { return currentUser?.email || null; }
