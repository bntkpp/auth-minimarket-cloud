// Frontend de demostración: consume directamente el Identity Service real.
// No hay backend propio aquí ni simulación: cada acción es un fetch a la API,
// que a su vez persiste/lee usuarios en Supabase Auth.

// URL base del Identity Service. Ajustar aquí si se despliega en otra parte.
const API_BASE = 'http://localhost:8080';

const els = {
  authCard: document.getElementById('authCard'),
  sessionCard: document.getElementById('sessionCard'),

  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  forgotForm: document.getElementById('forgotForm'),
  resetForm: document.getElementById('resetForm'),
  btnForgot: document.getElementById('btnForgot'),
  btnCancelForgot: document.getElementById('btnCancelForgot'),
  btnCancelReset: document.getElementById('btnCancelReset'),

  profileBox: document.getElementById('profileBox'),
  btnLogout: document.getElementById('btnLogout'),
  updateNameForm: document.getElementById('updateNameForm'),
  changePasswordForm: document.getElementById('changePasswordForm'),

  toast: document.getElementById('toast'),
};

// Sesión guardada en sessionStorage: se pierde al cerrar la pestaña. Es una
// decisión deliberada para una demo (evita que un token quede vivo
// indefinidamente en el navegador); no es el patrón recomendado para producción,
// donde conviene un cookie httpOnly para mitigar robo de token vía XSS.
const state = {
  accessToken: sessionStorage.getItem('access_token') || null,
  refreshToken: sessionStorage.getItem('refresh_token') || null,
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
};

// Temporizador de renovación automática del access_token (comportamiento de
// un sitio real: el usuario nunca ve ni dispara el refresh a mano).
let refreshTimer = null;

function saveSession({ access_token, refresh_token, user }) {
  state.accessToken = access_token;
  state.refreshToken = refresh_token;
  state.user = user;
  sessionStorage.setItem('access_token', access_token);
  sessionStorage.setItem('refresh_token', refresh_token);
  sessionStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  clearTimeout(refreshTimer);
  refreshTimer = null;
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user');
}

function toast(message, ok = true) {
  els.toast.textContent = message;
  els.toast.className = `toast ${ok ? 'ok' : 'err'}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.add('hidden'), 3500);
}

// Cliente HTTP mínimo: agrega Authorization si hay sesión y normaliza
// errores del contrato de la API ({ message, code, ... }).
async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    if (!state.accessToken) throw new Error('No hay sesión activa.');
    headers.Authorization = `Bearer ${state.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const mockResetToken = res.headers.get('X-Mock-Reset-Token');
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && data.message) || `Error HTTP ${res.status}`;
    throw new Error(message);
  }
  return { data, mockResetToken };
}

// --- Renovación automática de sesión ---------------------------------------
// Llama a /auth/refresh, actualiza el estado y devuelve el nuevo expires_in.
// Lanza si el refresh_token ya no sirve (expiró o fue usado).
async function doRefresh() {
  const { data } = await apiFetch('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: state.refreshToken },
  });
  state.accessToken = data.access_token;
  state.refreshToken = data.refresh_token;
  sessionStorage.setItem('access_token', data.access_token);
  sessionStorage.setItem('refresh_token', data.refresh_token);
  return data;
}

function scheduleAutoRefresh(expiresInSeconds) {
  clearTimeout(refreshTimer);
  if (!expiresInSeconds) return;
  // Renueva 15s antes de expirar (con un piso de 5s para TTLs muy cortos usados en demos).
  const delayMs = Math.max((expiresInSeconds - 15) * 1000, 5000);
  refreshTimer = setTimeout(async () => {
    try {
      const data = await doRefresh();
      scheduleAutoRefresh(data.expires_in);
    } catch {
      doLogoutLocally();
    }
  }, delayMs);
}

async function refreshProfile() {
  const { data } = await apiFetch('/users/me', { auth: true });
  state.user = data;
  sessionStorage.setItem('user', JSON.stringify(data));
}

// --- Tabs login / registro ----------------------------------------------
function showForm(name) {
  const forms = { login: els.loginForm, register: els.registerForm, forgot: els.forgotForm, reset: els.resetForm };
  Object.values(forms).forEach((f) => f.classList.add('hidden'));
  forms[name].classList.remove('hidden');
  els.tabLogin.classList.toggle('active', name === 'login');
  els.tabRegister.classList.toggle('active', name === 'register');
}
els.tabLogin.addEventListener('click', () => showForm('login'));
els.tabRegister.addEventListener('click', () => showForm('register'));
els.btnForgot.addEventListener('click', () => showForm('forgot'));
els.btnCancelForgot.addEventListener('click', () => showForm('login'));
els.btnCancelReset.addEventListener('click', () => showForm('login'));

// --- Registro -------------------------------------------------------------
els.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data } = await apiFetch('/auth/register', {
      method: 'POST',
      body: { email: fd.get('email'), password: fd.get('password'), full_name: fd.get('full_name') },
    });
    saveSession(data);
    scheduleAutoRefresh(data.expires_in);
    toast('Cuenta creada y guardada en Supabase. Sesión iniciada.');
    renderSession();
  } catch (err) {
    toast(err.message, false);
  }
});

// --- Login ------------------------------------------------------------
els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: fd.get('email'), password: fd.get('password') },
    });
    saveSession(data);
    scheduleAutoRefresh(data.expires_in);
    toast('Sesión iniciada.');
    renderSession();
  } catch (err) {
    toast(err.message, false);
  }
});

// --- Forgot / reset password ----------------------------------------------
els.forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data, mockResetToken } = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: { email: fd.get('email') },
    });
    toast(data.message);
    if (mockResetToken) {
      els.resetForm.reset_token.value = mockResetToken;
      showForm('reset');
      toast(`Token de recuperación (solo dev): ${mockResetToken}`);
    }
  } catch (err) {
    toast(err.message, false);
  }
});

els.resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data } = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: { reset_token: fd.get('reset_token'), new_password: fd.get('new_password') },
    });
    toast(data.message);
    showForm('login');
  } catch (err) {
    toast(err.message, false);
  }
});

// --- Sesión activa: render ----------------------------------------------
function renderSession() {
  const loggedIn = Boolean(state.accessToken && state.user);
  els.authCard.classList.toggle('hidden', loggedIn);
  els.sessionCard.classList.toggle('hidden', !loggedIn);
  if (!loggedIn) return;

  const u = state.user;
  els.profileBox.innerHTML = `
    <div><b>user_id:</b> ${u.user_id}</div>
    <div><b>business_user_id:</b> ${u.business_user_id ?? '—'}</div>
    <div><b>email:</b> ${u.email}</div>
    <div><b>nombre:</b> ${u.full_name}</div>
    <div><b>rol:</b> ${u.role}</div>
    <div><b>estado:</b> ${u.status}</div>
    <div><b>email verificado:</b> ${u.email_verified}</div>
    <div><b>creado:</b> ${u.created_at}</div>
  `;
  els.updateNameForm.full_name.value = u.full_name;
}

// --- Acciones de cuenta ------------------------------------------------
els.updateNameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data } = await apiFetch('/users/me', {
      method: 'PATCH',
      auth: true,
      body: { full_name: fd.get('full_name') },
    });
    state.user = data;
    sessionStorage.setItem('user', JSON.stringify(data));
    toast('Nombre actualizado en Supabase.');
    renderSession();
  } catch (err) {
    toast(err.message, false);
  }
});

els.changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { data } = await apiFetch('/auth/change-password', {
      method: 'POST',
      auth: true,
      body: {
        current_password: fd.get('current_password'),
        new_password: fd.get('new_password'),
      },
    });
    toast(`${data.message} Vuelve a iniciar sesión.`);
    e.target.reset();
    doLogoutLocally();
  } catch (err) {
    toast(err.message, false);
  }
});

els.btnLogout.addEventListener('click', async () => {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      auth: true,
      body: { refresh_token: state.refreshToken },
    });
  } catch (err) {
    // Igual cerramos localmente aunque el logout remoto falle (p. ej. token ya expirado).
    toast(err.message, false);
  } finally {
    doLogoutLocally();
  }
});

function doLogoutLocally() {
  clearSession();
  showForm('login');
  renderSession();
}

// --- Arranque: si queda una sesión guardada, la valida y renueva sola -----
// (igual que un sitio real: nunca le pide al usuario que confirme su propio token).
async function init() {
  if (!state.accessToken) {
    renderSession();
    return;
  }
  try {
    const { data } = await apiFetch('/auth/validate', { auth: true });
    const remainingSec = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
    if (remainingSec <= 0) throw new Error('Token expirado.');
    await refreshProfile();
    scheduleAutoRefresh(remainingSec);
  } catch {
    try {
      const data = await doRefresh();
      await refreshProfile();
      scheduleAutoRefresh(data.expires_in);
    } catch {
      clearSession();
    }
  }
  renderSession();
}

init();
