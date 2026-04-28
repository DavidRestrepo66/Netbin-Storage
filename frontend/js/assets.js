/* assets.js — Módulo de Gestión de Activos
 * Consume /api/assets, gestiona la tabla, filtros, modal y estadísticas del inicio.
 * Depende de window.NB_SESSION (inyectado por authGuard.js).
 */

(async function () {
  'use strict';

  const API_BASE = '/api/assets';
  const token    = () => window.NB_SESSION?.token || '';

  let assetsCache  = [];
  let currentFilter = 'todos';
  let editingId     = null;

  /* ── Utilidades ───────────────────────────────────────── */

  const estadoClass = (estado) => ({
    'Activo':           'status-activo',
    'En Reparación':    'status-reparacion',
    'Próximo a Vencer': 'status-proximo',
    'Deshabilitado':    'status-fuera'
  })[estado] || 'status-activo';

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const esc = (s) => String(s).replace(/'/g, "\\'");

  /* ── API ──────────────────────────────────────────────── */

  const apiFetch = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers } })
      .then(r => r.json());

  const loadAssets = () =>
    apiFetch(API_BASE).then(j => j.success ? j.data : []);

  const loadHardware = () =>
    apiFetch(`${API_BASE}?categoria=Hardware`).then(j => j.success ? j.data : []);

  const saveAsset = (payload, id) =>
    apiFetch(id ? `${API_BASE}/${id}` : API_BASE, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

  const apiDeactivate = (id) =>
    apiFetch(`${API_BASE}/${id}/baja`, { method: 'PATCH' });

  /* ── Render tabla ─────────────────────────────────────── */

  const filteredAssets = () => {
    const q = (document.getElementById('asset-search')?.value || '').toLowerCase();
    return assetsCache.filter(a => {
      const matchCat = currentFilter === 'todos' || a.categoria === currentFilter;
      const matchQ   = !q ||
        a.nombre.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q) ||
        (a.responsable || '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  };

  const renderTable = () => {
    const tbody = document.getElementById('assets-tbody');
    if (!tbody) return;
    const list = filteredAssets();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2.5rem;color:var(--color-gray);">
            <i class="bx bx-inbox" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            No se encontraron activos
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(a => {
      const baja = a.estado === 'Deshabilitado';
      return `
        <tr>
          <td><strong>${a.codigo}</strong></td>
          <td>
            ${a.nombre}
            ${a.categoria === 'Software' && a.fechaVencimiento
              ? `<span class="exp-info"><i class="bx bx-calendar-x"></i> Vence: ${formatDate(a.fechaVencimiento)}</span>`
              : ''}
          </td>
          <td><span class="cat-badge cat-${a.categoria.toLowerCase()}">${a.categoria}</span></td>
          <td><span class="status-badge ${estadoClass(a.estado)}">${a.estado}</span></td>
          <td>${a.responsable || '—'}</td>
          <td style="font-size:.8rem;white-space:nowrap">${formatDate(a.fechaRegistro)}</td>
          <td>
            <div class="action-btns">
              <button class="btn-edit" title="Editar"
                onclick="window.AssetsModule.openEdit('${esc(a.id)}')"
                ${baja ? 'disabled' : ''}>
                <i class="bx bx-edit"></i>
              </button>
              <button class="btn-baja" title="Dar de baja"
                onclick="window.AssetsModule.confirmBaja('${esc(a.id)}','${esc(a.nombre)}')"
                ${baja ? 'disabled' : ''}>
                <i class="bx bx-x-circle"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  };

  /* ── Contadores de filtros ────────────────────────────── */

  const updateCounts = () => {
    const counts = {
      todos:       assetsCache.length,
      hardware:    assetsCache.filter(a => a.categoria === 'Hardware').length,
      software:    assetsCache.filter(a => a.categoria === 'Software').length,
      consumible:  assetsCache.filter(a => a.categoria === 'Consumible').length,
      herramienta: assetsCache.filter(a => a.categoria === 'Herramienta').length
    };
    for (const [k, v] of Object.entries(counts)) {
      const el = document.getElementById(`count-${k}`);
      if (el) el.textContent = v;
    }
  };

  /* ── Estadísticas del inicio ─────────────────────────── */

  const updateDashboardStats = () => {
    const total   = assetsCache.length;
    const activos = assetsCache.filter(a => a.estado === 'Activo').length;
    const adv     = assetsCache.filter(a => a.estado === 'En Reparación' || a.estado === 'Próximo a Vencer').length;
    const fuera   = assetsCache.filter(a => a.estado === 'Deshabilitado').length;
    const pct     = (n) => total > 0 ? Math.round(n / total * 100) + '%' : '0%';

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stat-total',       total);
    set('stat-total-pct',   '100%');
    set('stat-activos',     activos);
    set('stat-activos-pct', pct(activos));
    set('stat-advertencias', adv);
    set('stat-adv-pct',     pct(adv));
    set('stat-fuera',       fuera);
    set('stat-fuera-pct',   pct(fuera));

    const tbody = document.getElementById('recent-assets-tbody');
    if (!tbody) return;
    const recent = assetsCache.slice().reverse().slice(0, 5);
    tbody.innerHTML = recent.map(a => `
      <tr>
        <td><strong>${a.codigo}</strong></td>
        <td>${a.nombre}</td>
        <td>${a.categoria}</td>
        <td><span class="status-badge ${estadoClass(a.estado)}">${a.estado}</span></td>
        <td>${a.responsable || '—'}</td>
      </tr>`).join('');
  };

  /* ── Modal ────────────────────────────────────────────── */

  const toggleConditionalFields = (cat) => {
    const isSW = cat === 'Software';
    document.getElementById('row-vencimiento').classList.toggle('hidden', !isSW);
    document.getElementById('row-hardware').classList.toggle('hidden',    !isSW);
    document.getElementById('row-stock').classList.toggle('hidden', cat !== 'Consumible');
  };

  const openModal = async (asset = null) => {
    editingId = asset ? asset.id : null;
    document.getElementById('modal-title').textContent = asset ? 'Editar Activo' : 'Nuevo Activo';
    document.getElementById('asset-form').reset();

    const hwSelect = document.getElementById('field-hardware');
    const hw = await loadHardware();
    hwSelect.innerHTML =
      `<option value="">— Sin hardware asociado —</option>` +
      hw.filter(h => h.id !== editingId)
        .map(h => `<option value="${h.id}">${h.codigo} – ${h.nombre}</option>`)
        .join('');

    if (asset) {
      document.getElementById('field-nombre').value       = asset.nombre;
      document.getElementById('field-descripcion').value  = asset.descripcion || '';
      document.getElementById('field-categoria').value    = asset.categoria;
      document.getElementById('field-estado').value       = asset.estado;
      document.getElementById('field-responsable').value  = asset.responsable || '';
      document.getElementById('field-ubicacion').value    = asset.ubicacion || '';
      if (asset.hardware_asociado_id) hwSelect.value      = asset.hardware_asociado_id;
      if (asset.stock !== null)       document.getElementById('field-stock').value = asset.stock;
      document.getElementById('field-vencimiento').value  =
        asset.fechaVencimiento ? asset.fechaVencimiento.substring(0, 10) : '';
    }

    toggleConditionalFields(asset?.categoria || 'Hardware');
    document.getElementById('asset-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('field-nombre').focus();
  };

  const closeModal = () => {
    document.getElementById('asset-modal').classList.add('hidden');
    document.body.style.overflow = '';
    editingId = null;
  };

  /* ── Handlers públicos (usados en onclick del HTML) ──── */

  const openEdit = (id) => {
    const asset = assetsCache.find(a => a.id === id);
    if (asset) openModal(asset);
  };

  const confirmBaja = async (id, nombre) => {
    if (!confirm(`¿Dar de baja "${nombre}"?\nSu estado cambiará a Deshabilitado.`)) return;
    const res = await apiDeactivate(id);
    if (res.success) {
      assetsCache = assetsCache.map(a => a.id === id ? res.data : a);
      renderTable();
      updateCounts();
      updateDashboardStats();
    } else {
      alert(res.message || 'Error al dar de baja el activo.');
    }
  };

  /* ── Inicialización ───────────────────────────────────── */

  // Exponer antes de renderizar la tabla (los onclick del tbody lo necesitan)
  window.AssetsModule = { openEdit, confirmBaja };

  // Cargar activos desde la API
  assetsCache = await loadAssets();
  renderTable();
  updateCounts();
  updateDashboardStats();

  // Filtros de categoría
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Búsqueda
  document.getElementById('asset-search')?.addEventListener('input', renderTable);

  // Botón nuevo activo
  document.getElementById('btn-add-asset')?.addEventListener('click', () => openModal());

  // Cambio de categoría en el formulario
  document.getElementById('field-categoria')?.addEventListener('change', e => {
    toggleConditionalFields(e.target.value);
  });

  // Cerrar modal
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('asset-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Submit del formulario
  document.getElementById('asset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoria = document.getElementById('field-categoria').value;
    const payload   = {
      nombre:              document.getElementById('field-nombre').value.trim(),
      descripcion:         document.getElementById('field-descripcion').value.trim(),
      categoria,
      estado:              document.getElementById('field-estado').value,
      responsable:         document.getElementById('field-responsable').value.trim(),
      ubicacion:           document.getElementById('field-ubicacion').value.trim(),
      hardware_asociado_id: categoria === 'Software'
        ? (document.getElementById('field-hardware').value || null)
        : null,
      fechaVencimiento: categoria === 'Software'
        ? (document.getElementById('field-vencimiento').value || null)
        : null,
      stock: categoria === 'Consumible'
        ? (parseInt(document.getElementById('field-stock').value, 10) || 0)
        : null
    };

    const submitBtn = document.getElementById('btn-submit-asset');
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';

    const res = await saveAsset(payload, editingId);
    submitBtn.disabled  = false;
    submitBtn.innerHTML = '<i class="bx bx-save"></i> Guardar';

    if (res.success) {
      assetsCache = editingId
        ? assetsCache.map(a => a.id === editingId ? res.data : a)
        : [...assetsCache, res.data];
      renderTable();
      updateCounts();
      updateDashboardStats();
      closeModal();
    } else {
      alert(res.message || 'Error al guardar el activo.');
    }
  });
})();
