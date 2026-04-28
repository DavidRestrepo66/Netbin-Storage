/* roles.js — Módulo de Gestión de Roles
 * Consume /api/roles. Depende de window.NB_SESSION (authGuard.js).
 */

(async function () {
  'use strict';

  const API_BASE = '/api/roles';
  const token    = () => window.NB_SESSION?.token || '';

  let rolesCache = [];
  let editingId  = null;

  const PERMISOS = [
    { key: 'acceso_activos',   label: 'Activos',   icon: 'bx-server' },
    { key: 'acceso_reportes',  label: 'Reportes',  icon: 'bx-bar-chart-alt-2' },
    { key: 'acceso_usuarios',  label: 'Usuarios',  icon: 'bx-group' },
    { key: 'acceso_roles',     label: 'Roles',     icon: 'bx-shield-quarter' }
  ];

  /* ── API ──────────────────────────────────────────────── */

  const apiFetch = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers }
    }).then(r => r.json());

  const loadRoles = () => apiFetch(API_BASE).then(j => j.success ? j.data : []);

  const saveRole = (payload, id) =>
    apiFetch(id ? `${API_BASE}/${id}` : API_BASE, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

  /* ── Render ───────────────────────────────────────────── */

  const permBadge = (active, label) =>
    `<span class="perm-badge ${active ? 'perm-on' : 'perm-off'}">${label}</span>`;

  const renderTable = () => {
    const tbody = document.getElementById('roles-tbody');
    if (!tbody) return;

    if (rolesCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:2.5rem;color:var(--color-gray);">
            <i class="bx bx-shield-quarter" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            No hay roles definidos
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rolesCache.map(r => `
      <tr>
        <td>
          <div style="font-weight:600">${r.nombre}</div>
        </td>
        <td style="color:var(--color-gray);font-size:.85rem;max-width:280px">${r.descripcion || '—'}</td>
        <td>
          <div class="perm-group">
            ${PERMISOS.map(p => permBadge(r.permisos[p.key], p.label)).join('')}
          </div>
        </td>
        <td>
          <button class="btn-edit" title="Editar rol"
            onclick="window.RolesModule.openEdit('${r.id}')">
            <i class="bx bx-edit"></i>
          </button>
        </td>
      </tr>`).join('');
  };

  /* ── Modal ────────────────────────────────────────────── */

  const openModal = (role = null) => {
    editingId = role ? role.id : null;
    document.getElementById('role-modal-title').textContent = role ? 'Editar Rol' : 'Nuevo Rol';
    document.getElementById('role-form').reset();

    if (role) {
      document.getElementById('role-nombre').value      = role.nombre;
      document.getElementById('role-descripcion').value = role.descripcion || '';
      PERMISOS.forEach(p => {
        const cb = document.getElementById(`perm-${p.key}`);
        if (cb) cb.checked = role.permisos[p.key] === true;
      });
    }

    document.getElementById('role-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('role-nombre').focus();
  };

  const closeModal = () => {
    document.getElementById('role-modal').classList.add('hidden');
    document.body.style.overflow = '';
    editingId = null;
  };

  /* ── Handlers públicos ────────────────────────────────── */

  const openEdit = (id) => {
    const role = rolesCache.find(r => r.id === id);
    if (role) openModal(role);
  };

  /* ── Exponer API antes de renderizar ──────────────────── */
  window.RolesModule = { openEdit };

  /* ── Init ─────────────────────────────────────────────── */
  rolesCache = await loadRoles();
  renderTable();

  document.getElementById('btn-add-role')?.addEventListener('click', () => openModal());
  document.getElementById('role-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('role-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('role-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('role-modal').classList.contains('hidden')) {
      closeModal();
    }
  });

  document.getElementById('role-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      nombre:      document.getElementById('role-nombre').value.trim(),
      descripcion: document.getElementById('role-descripcion').value.trim(),
      permisos:    PERMISOS.reduce((acc, p) => {
        acc[p.key] = document.getElementById(`perm-${p.key}`).checked;
        return acc;
      }, {})
    };

    const btn = document.getElementById('role-submit');
    btn.disabled  = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';

    const res = await saveRole(payload, editingId);
    btn.disabled  = false;
    btn.innerHTML = '<i class="bx bx-save"></i> Guardar';

    if (res.success) {
      rolesCache = editingId
        ? rolesCache.map(r => r.id === editingId ? res.data : r)
        : [...rolesCache, res.data];
      renderTable();
      closeModal();
    } else {
      alert(res.message || 'Error al guardar el rol.');
    }
  });
})();
