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

/* ── 3. Navegación entre secciones ───────────────────────── */
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

/* ── 4. Datos de ejemplo para la tabla de activos ─────────── */
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
      <td style="max-width:200px; font-size:.8rem; color:var(--color-gray)">
        ${asset.ubicacion}
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

// Inicializar tabla al cargar
renderAssetsTable();
