/**
 * dashboard.js - Responsabilidad Única: Gestionar la interactividad del Dashboard.
 * Inicializa datos del usuario, el reloj, la navegación por secciones y la tabla de activos.
 * Principio DIP: Consume window.NB_SESSION (inyectado por authGuard.js), sin acoplarse al storage.
 */

/* ── 1. Inyección de datos de sesión en la UI ─────────────── */
(function initUserUI() {
  const user = window.NB_SESSION?.user || {};
  const nombre = user.nombre || 'Usuario';
  const rol    = user.rol    || '—';

  // Avatar: primera letra del nombre
  const avatar = document.getElementById('topbar-avatar');
  if (avatar) avatar.textContent = nombre.charAt(0).toUpperCase();

  const nameEl = document.getElementById('topbar-name');
  if (nameEl) nameEl.textContent = nombre;

  const roleEl = document.getElementById('topbar-role');
  if (roleEl) roleEl.textContent = rol;
})();

/* ── 2. Reloj en tiempo real ──────────────────────────────── */
(function initClock() {
  const clockEl = document.getElementById('topbar-clock');
  const update = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}`;
  };
  update();
  setInterval(update, 10_000);
})();

/* ── 3. Asignar evento al botón logout ───────────────────────────────── */
// Usa la función logout() que viene de authGuard.js (window.NB_SESSION.logout)
document.getElementById('btn-logout')?.addEventListener('click', () => {
  window.NB_SESSION.logout();
});

/* ── 4. Navegación entre secciones ───────────────────────── */
const SECTIONS = ['inicio', 'activos', 'reportes', 'usuarios', 'roles', 'importacion'];

const SECTION_ICONS = {
  inicio:      '🏠',
  activos:     '🖥️',
  reportes:    '📊',
  usuarios:    '👥',
  roles:       '🛡️',
  importacion: '⬆️'
};

const SECTION_NAMES = {
  inicio:      'Inicio',
  activos:     'Revisión de Activos',
  reportes:    'Reportes',
  usuarios:    'Gestión de Usuarios',
  roles:       'Gestión de Roles',
  importacion: 'Importación de Datos'
};

/**
 * Navega a una sección del dashboard.
 * @param {string} sectionId
 */
function navigateTo(sectionId) {
  // Esconder todas las secciones
  SECTIONS.forEach((id) => {
    document.getElementById(`section-${id}`)?.classList.add('hidden');
    document.getElementById(`nav-${id}`)?.classList.remove('active');
  });

  // Mostrar la sección activa
  document.getElementById(`section-${sectionId}`)?.classList.remove('hidden');
  document.getElementById(`nav-${sectionId}`)?.classList.add('active');

  // Actualizar topbar
  const sectionNameEl = document.getElementById('topbar-section-name');
  const titleIconEl   = document.querySelector('.topbar-title .title-icon');
  if (sectionNameEl) sectionNameEl.textContent = SECTION_NAMES[sectionId] || sectionId;
  if (titleIconEl)   titleIconEl.textContent   = SECTION_ICONS[sectionId] || '';
}

// Asignar eventos a los nav-items
SECTIONS.forEach((id) => {
  document.getElementById(`nav-${id}`)?.addEventListener('click', () => navigateTo(id));
});

/* ── 5. Stats y tablas del inicio son gestionados por assets.js ── */
