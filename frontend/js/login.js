/**
 * login.js - Responsabilidad Única: Gestionar el flujo de inicio de sesión en el frontend.
 * Envía credenciales al API, guarda el token y redirige al dashboard.
 * NO contiene lógica de validación (esa está en el backend).
 */

const LOGIN_ENDPOINT = '/api/auth/login';

const form     = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const btnText  = document.getElementById('btn-text');
const btnIcon  = document.getElementById('btn-icon');
const errorMsg = document.getElementById('error-msg');
const errorTxt = document.getElementById('error-text');

/* ── Muestra / oculta mensaje de error ─────────────────── */
const showError = (msg) => {
  errorTxt.textContent = msg;
  errorMsg.classList.remove('hidden');
};

const hideError = () => errorMsg.classList.add('hidden');

/* ── Estado de carga del botón ─────────────────────────── */
const setLoading = (loading) => {
  if (loading) {
    btnLogin.classList.add('loading');
    btnText.textContent = 'Verificando...';
    btnIcon.className = 'bx bx-loader-alt bx-spin';
  } else {
    btnLogin.classList.remove('loading');
    btnText.textContent = 'Iniciar sesión';
    btnIcon.className = 'bx bx-log-in';
  }
};

/* ── Envío del formulario ───────────────────────────────── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showError('Por favor ingrese su usuario y contraseña.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Persistir sesión en localStorage
      localStorage.setItem('nb_token', data.token);
      localStorage.setItem('nb_user',  JSON.stringify(data.user));

      // Redirigir al dashboard
      window.location.href = '/index.html';
    } else {
      showError(data.message || 'Credenciales inválidas.');
    }
  } catch (err) {
    showError('Error de conexión con el servidor. Intente nuevamente.');
    console.error('[Netbin Login]', err);
  } finally {
    setLoading(false);
  }
});

/* ── Si ya tiene sesión activa, ir directo al dashboard ─── */
if (localStorage.getItem('nb_token')) {
  window.location.href = '/index.html';
}
