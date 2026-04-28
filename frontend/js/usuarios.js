/* usuarios.js — Módulo de Gestión de Usuarios
 * Consume /api/usuarios y /api/roles. Depende de window.NB_SESSION (authGuard.js).
 */

(async function () {
  'use strict';

  const API_USERS = '/api/usuarios';
  const API_ROLES = '/api/roles';
  const token     = () => window.NB_SESSION?.token || '';

  let usersCache    = [];
  let rolesCache    = [];
  let currentFilter = 'activos';
  let editingId     = null;

  /* ── API ──────────────────────────────────────────────── */

  const apiFetch = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers }
    }).then(r => r.json());

  const loadUsers   = () => apiFetch(API_USERS).then(j => j.success ? j.data : []);
  const loadRoles   = () => apiFetch(API_ROLES).then(j => j.success ? j.data : []);
  const saveUser    = (payload, id) =>
    apiFetch(id ? `${API_USERS}/${id}` : API_USERS, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  const apiDisable  = (id) =>
    apiFetch(`${API_USERS}/${id}/deshabilitar`, { method: 'PATCH' });

  /* ── Utilidades ───────────────────────────────────────── */

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const initials = (nombre) =>
    nombre.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

  const esc = (s) => String(s).replace(/'/g, "\\'");

  /* ── Filtro y render ──────────────────────────────────── */

  const filteredUsers = () => {
    const q = (document.getElementById('user-search')?.value || '').toLowerCase();
    return usersCache.filter(u => {
      const matchF = currentFilter === 'todos'
        || (currentFilter === 'activos' ? u.activo !== false : u.activo === false);
      const matchQ = !q
        || u.nombre.toLowerCase().includes(q)
        || u.username.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q);
      return matchF && matchQ;
    });
  };

  const renderTable = () => {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    const list = filteredUsers();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:2.5rem;color:var(--color-gray);">
            <i class="bx bx-user-x" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            No se encontraron usuarios
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const activo = u.activo !== false;
      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-avatar-sm">${initials(u.nombre)}</div>
              <div>
                <div class="user-nombre">${u.nombre}</div>
                <div class="user-username">@${u.username}</div>
              </div>
            </div>
          </td>
          <td style="font-size:.875rem">${u.email}</td>
          <td><span class="rol-badge">${u.rol}</span></td>
          <td>
            <span class="status-badge ${activo ? 'status-activo' : 'status-fuera'}">
              ${activo ? 'Activo' : 'Deshabilitado'}
            </span>
          </td>
          <td style="font-size:.8rem;white-space:nowrap">${formatDate(u.fechaRegistro)}</td>
          <td>
            <div class="action-btns">
              <button class="btn-edit" title="Editar"
                onclick="window.UsuariosModule.openEdit('${esc(u.id)}')"
                ${!activo ? 'disabled' : ''}>
                <i class="bx bx-edit"></i>
              </button>
              <button class="btn-baja" title="Deshabilitar"
                onclick="window.UsuariosModule.confirmDeshabilitar('${esc(u.id)}','${esc(u.nombre)}')"
                ${!activo ? 'disabled' : ''}>
                <i class="bx bx-x-circle"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  };

  /* ── Contadores ───────────────────────────────────────── */

  const updateCounts = () => {
    const activos = usersCache.filter(u => u.activo !== false).length;
    const des     = usersCache.filter(u => u.activo === false).length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('ucount-todos', usersCache.length);
    set('ucount-activos', activos);
    set('ucount-deshabilitados', des);
  };

  /* ── Modal ────────────────────────────────────────────── */

  const populateRoles = (selectedId = '') => {
    const sel = document.getElementById('user-rol');
    sel.innerHTML = `<option value="">— Seleccionar rol —</option>` +
      rolesCache.map(r =>
        `<option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>${r.nombre}</option>`
      ).join('');
  };

  const openModal = (user = null) => {
    editingId = user ? user.id : null;
    document.getElementById('user-modal-title').textContent = user ? 'Editar Usuario' : 'Nuevo Usuario';
    document.getElementById('user-form').reset();

    const passRow   = document.getElementById('user-pass-row');
    const passInput = document.getElementById('user-password');
    passRow.classList.toggle('hidden', !!user);
    passInput.required = !user;

    const usernameInput = document.getElementById('user-username');
    usernameInput.readOnly = !!user;
    usernameInput.style.background = user ? 'var(--color-gray-lt)' : '';

    populateRoles(user?.rol_id || '');

    if (user) {
      document.getElementById('user-nombre').value   = user.nombre;
      document.getElementById('user-username').value = user.username;
      document.getElementById('user-email').value    = user.email;
    }

    document.getElementById('user-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('user-nombre').focus();
  };

  const closeModal = () => {
    document.getElementById('user-modal').classList.add('hidden');
    document.body.style.overflow = '';
    editingId = null;
  };

  /* ── Handlers públicos ────────────────────────────────── */

  const openEdit = (id) => {
    const user = usersCache.find(u => u.id === id);
    if (user) openModal(user);
  };

  const confirmDeshabilitar = async (id, nombre) => {
    const user = usersCache.find(u => u.id === id);
    if (!user || user.activo === false) return;
    if (!confirm(`¿Deshabilitar al usuario "${nombre}"?\nNo podrá iniciar sesión hasta que sea reactivado.`)) return;
    const res = await apiDisable(id);
    if (res.success) {
      usersCache = usersCache.map(u => u.id === id ? res.data : u);
      renderTable();
      updateCounts();
    } else {
      alert(res.message || 'Error al deshabilitar el usuario.');
    }
  };

  /* ── Exponer antes de renderizar ──────────────────────── */
  window.UsuariosModule = { openEdit, confirmDeshabilitar };

  /* ── Init ─────────────────────────────────────────────── */
  [usersCache, rolesCache] = await Promise.all([loadUsers(), loadRoles()]);
  renderTable();
  updateCounts();

  document.getElementById('btn-add-user')?.addEventListener('click', () => openModal());

  document.querySelectorAll('[data-user-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-user-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.userFilter;
      renderTable();
    });
  });

  document.getElementById('user-search')?.addEventListener('input', renderTable);

  document.getElementById('user-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('user-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('user-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('user-modal').classList.contains('hidden')) {
      closeModal();
    }
  });

  document.getElementById('user-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      nombre:   document.getElementById('user-nombre').value.trim(),
      username: document.getElementById('user-username').value.trim(),
      email:    document.getElementById('user-email').value.trim(),
      rol_id:   document.getElementById('user-rol').value
    };
    if (!editingId) {
      payload.password = document.getElementById('user-password').value;
    }

    const btn = document.getElementById('user-submit');
    btn.disabled  = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';

    const res = await saveUser(payload, editingId);
    btn.disabled  = false;
    btn.innerHTML = '<i class="bx bx-save"></i> Guardar';

    if (res.success) {
      usersCache = editingId
        ? usersCache.map(u => u.id === editingId ? res.data : u)
        : [...usersCache, res.data];
      renderTable();
      updateCounts();
      closeModal();
    } else {
      alert(res.message || 'Error al guardar el usuario.');
    }
  });
})();
