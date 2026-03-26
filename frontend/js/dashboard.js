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
const SECTIONS = ['inicio', 'activos', 'reportes', 'usuarios', 'roles'];

const SECTION_ICONS = {
  inicio:   '🏠',
  activos:  '🖥️',
  reportes: '📊',
  usuarios: '👥',
  roles:    '🛡️'
};

const SECTION_NAMES = {
  inicio:   'Inicio',
  activos:  'Revisión de Activos',
  reportes: 'Reportes',
  usuarios: 'Gestión de Usuarios',
  roles:    'Gestión de Roles'
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

/* ── 5. Datos de ejemplo para la tabla de activos ─────────── */
const SAMPLE_ASSETS = [
  {
    codigo: 'RT-0012',
    nombre: 'Cisco Catalyst Switch',
    categoria: 'Hardware',
    estado: 'Activo',
    ubicacion: 'Sede Central → Piso 3 → Sala 301 → Estante A → Caja 1',
    responsable: 'Carlos Ramírez',
    ultimaMod: '09/03/2023 09:00'
  },
  {
    codigo: 'RT-0013',
    nombre: 'Dell Precision Workstation',
    categoria: 'Hardware',
    estado: 'Advertencia',
    ubicacion: 'Sede Central → Piso 3 → Sala 301 → Estante A → Caja 1',
    responsable: 'Carlos Ramírez',
    ultimaMod: '09/03/2023 08:00'
  },
  {
    codigo: 'RT-0014',
    nombre: 'Fluke Networks Tester',
    categoria: 'Herramienta',
    estado: 'Activo',
    ubicacion: 'Sede Central → Piso 3 → Sala 301 → Estante A → Caja 1',
    responsable: 'Carlos Ramírez',
    ultimaMod: '09/03/2023 06:00'
  },
  {
    codigo: 'RT-0015',
    nombre: 'Fluke Networks Tester',
    categoria: 'Herramienta',
    estado: 'Fuera de Servicio',
    ubicacion: 'Sede Central → Piso 3 → Sala 301 → Estante A → Caja 2',
    responsable: 'Carlos Ramírez (Monitor)',
    ultimaMod: '09/03/2023 06:00'
  },
  {
    codigo: 'RT-0016',
    nombre: 'Fluke Networks Tester',
    categoria: 'Herramienta',
    estado: 'Fuera de Servicio',
    ubicacion: 'Sede Central → Piso 3 → Sala 301 → Estante A → Caja 2',
    responsable: 'Carlos Ramírez (Monitor)',
    ultimaMod: '09/03/2023 06:00'
  },
  {
    codigo: 'RT-0017',
    nombre: 'Ubiquiti UniFi AP',
    categoria: 'Hardware',
    estado: 'Activo',
    ubicacion: 'Sede Central → Piso 3 → Sala 302 → Rack B',
    responsable: 'Laura Torres',
    ultimaMod: '10/03/2023 10:30'
  }
];

/**
 * Devuelve la clase CSS correspondiente al estado del activo.
 * @param {string} estado
 * @returns {string}
 */
const estadoClass = (estado) => {
  const map = {
    'Activo':          'status-activo',
    'Advertencia':     'status-advertencia',
    'Fuera de Servicio': 'status-fuera',
    'Mantenimiento':   'status-mantenimiento'
  };
  return map[estado] || 'status-activo';
};

/* ── 6. Funciones para estadísticas del dashboard ─────────── */

/**
 * Calcula las estadísticas de los activos.
 * @returns {object} Objeto con estadísticas
 */
function calculateStats() {
  const total = SAMPLE_ASSETS.length;
  const activos = SAMPLE_ASSETS.filter(a => a.estado === 'Activo').length;
  const advertencias = SAMPLE_ASSETS.filter(a => a.estado === 'Advertencia').length;
  const fuera = SAMPLE_ASSETS.filter(a => a.estado === 'Fuera de Servicio').length;
  
  return {
    total,
    activos,
    advertencias,
    fuera,
    activosPct: total > 0 ? Math.round((activos / total) * 100) : 0,
    advertenciasPct: total > 0 ? Math.round((advertencias / total) * 100) : 0,
    fueraPct: total > 0 ? Math.round((fuera / total) * 100) : 0
  };
}

/**
 * Renderiza las estadísticas en la sección de inicio.
 */
function renderDashboardStats() {
  const stats = calculateStats();
  
  // Actualizar valores de estadísticas
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-total-pct').textContent = '100%';
  
  document.getElementById('stat-activos').textContent = stats.activos;
  document.getElementById('stat-activos-pct').textContent = stats.activosPct + '%';
  
  document.getElementById('stat-advertencias').textContent = stats.advertencias;
  document.getElementById('stat-adv-pct').textContent = stats.advertenciasPct + '%';
  
  document.getElementById('stat-fuera').textContent = stats.fuera;
  document.getElementById('stat-fuera-pct').textContent = stats.fueraPct + '%';
}

/**
 * Renderiza la tabla de últimos activos registrados en la sección de inicio.
 */
function renderRecentAssets() {
  const tbody = document.getElementById('recent-assets-tbody');
  if (!tbody) return;

  // Mostrar solo los últimos 5 activos en orden inverso (más recientes primero)
  const recentAssets = SAMPLE_ASSETS.slice().reverse().slice(0, 5);

  tbody.innerHTML = recentAssets.map((asset) => `
    <tr>
      <td><strong>${asset.codigo}</strong></td>
      <td>${asset.nombre}</td>
      <td>${asset.categoria}</td>
      <td>
        <span class="status-badge ${estadoClass(asset.estado)}">
          ${asset.estado}
        </span>
      </td>
      <td>${asset.responsable}</td>
    </tr>
  `).join('');
}

/**
 * Renderiza la tabla de activos con los datos de muestra.
 */
function renderAssetsTable() {
  const tbody = document.getElementById('assets-tbody');
  if (!tbody) return;

  tbody.innerHTML = SAMPLE_ASSETS.map((asset) => `
    <tr>
      <td><strong>${asset.codigo}</strong></td>
      <td>${asset.nombre}</td>
      <td>${asset.categoria}</td>
      <td>
        <span class="status-badge ${estadoClass(asset.estado)}">
          ${asset.estado}
        </span>
      </td>
      <td>${asset.responsable}</td>
      <td style="font-size:.8rem; white-space:nowrap">${asset.ultimaMod}</td>
      <td>
        <button class="btn-detalle" onclick="alert('Detalle de ${asset.codigo}')">
          Ver Detalle
        </button>
      </td>
    </tr>
  `).join('');
}

// Inicializar todas las tablas y estadísticas al cargar
renderDashboardStats();
renderRecentAssets();
renderAssetsTable();
