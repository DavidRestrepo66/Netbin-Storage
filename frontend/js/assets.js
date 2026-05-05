/* assets.js — Módulo unificado de Activos.
 * Consume /api/inventory/{hardware,software,tools,consumable,cmdb} y los
 * fusiona en una sola vista. El modal "Nuevo Activo" elige la categoría
 * y muestra los campos exactos de esa categoría (alineados con la
 * importación por Excel).
 */

(function () {
  'use strict';

  const API_BASE = '/api/inventory';
  const token    = () => window.NB_SESSION?.token || '';

  /* ── Etiquetas legibles por tipo ─────────────────────────── */
  const TIPO_LABEL = {
    hardware:   'Hardware',
    software:   'Software',
    tools:      'Herramienta',
    consumable: 'Consumible',
    cmdb:       'CMDB'
  };
  const TIPOS = Object.keys(TIPO_LABEL);

  /* ── Esquemas de formulario por categoría ────────────────── */
  const SCHEMAS = {
    hardware: {
      idField: 'id_hw',
      nameField: 'modelo',
      fields: [
        { key:'id_hw',            label:'ID Hardware',         type:'text',  hint:'Si se deja vacío se autogenera (HW-001…).' },
        { key:'categoria',        label:'Categoría',           type:'text',  req:true, hint:'Ej: Laptop, Servidor, Switch.' },
        { key:'marca',            label:'Marca',               type:'text',  req:true },
        { key:'modelo',           label:'Modelo',              type:'text',  req:true },
        { key:'numero_serie',     label:'Número de Serie',     type:'text' },
        { key:'procesador',       label:'Procesador',          type:'text' },
        { key:'memoria_ram',      label:'Memoria RAM',         type:'text' },
        { key:'almacenamiento',   label:'Almacenamiento',      type:'text' },
        { key:'sistema_operativo',label:'Sistema Operativo',   type:'text' },
        { key:'estado',           label:'Estado',              type:'select', req:true,
          options:['Activo','En Reparación','En Bodega','Deshabilitado'] },
        { key:'ubicacion',        label:'Ubicación',           type:'text' },
        { key:'fecha_adquisicion',label:'Fecha de Adquisición',type:'date' },
        { key:'proveedor',        label:'Proveedor',           type:'text' },
        { key:'garantia',         label:'Garantía',            type:'text' },
        { key:'observaciones',    label:'Observaciones',       type:'textarea', full:true }
      ]
    },
    software: {
      idField: 'id_sw',
      nameField: 'nombre_sw',
      fields: [
        { key:'id_sw',            label:'ID Software',         type:'text',  hint:'Si se deja vacío se autogenera (SW-001…).' },
        { key:'nombre_sw',        label:'Nombre del Software', type:'text',  req:true, full:true },
        { key:'categoria',        label:'Categoría',           type:'text',  req:true, hint:'Ej: SO, Ofimática, Antivirus.' },
        { key:'version',          label:'Versión',             type:'text' },
        { key:'tipo_licencia',    label:'Tipo de Licencia',    type:'select',
          options:['Perpetua','Suscripción','OEM','Free','Open Source'] },
        { key:'numero_licencias', label:'Número de Licencias', type:'number' },
        { key:'licencias_en_uso', label:'Licencias en Uso',    type:'number' },
        { key:'clave_producto',   label:'Clave de Producto',   type:'text' },
        { key:'fecha_compra',     label:'Fecha de Compra',     type:'date' },
        { key:'fecha_vencimiento',label:'Fecha de Vencimiento',type:'date' },
        { key:'proveedor',        label:'Proveedor',           type:'text' },
        { key:'instalado_en',     label:'Instalado En',        type:'text', full:true,
          hint:'Equipo o conjunto de equipos donde está instalado.' },
        { key:'estado',           label:'Estado',              type:'select', req:true,
          options:['Activo','Próximo a Vencer','Vencido','Deshabilitado'] },
        { key:'observaciones',    label:'Observaciones',       type:'textarea', full:true }
      ]
    },
    tools: {
      idField: 'id_tool',
      nameField: 'nombre',
      fields: [
        { key:'id_tool',          label:'ID Herramienta',      type:'text',  hint:'Si se deja vacío se autogenera (TL-001…).' },
        { key:'nombre',           label:'Nombre',              type:'text',  req:true, full:true },
        { key:'categoria',        label:'Categoría',           type:'text',  req:true },
        { key:'marca',            label:'Marca',               type:'text' },
        { key:'modelo',           label:'Modelo',              type:'text' },
        { key:'numero_serie',     label:'Número de Serie',     type:'text' },
        { key:'cantidad_total',   label:'Cantidad Total',      type:'number' },
        { key:'unidad_medida',    label:'Unidad de Medida',    type:'text', hint:'unidad, metro, paquete…' },
        { key:'estado',           label:'Estado',              type:'select', req:true,
          options:['Disponible','En Uso','En Reparación','Dañada','Deshabilitada'] },
        { key:'ubicacion',        label:'Ubicación',           type:'text' },
        { key:'fecha_adquisicion',label:'Fecha de Adquisición',type:'date' },
        { key:'proveedor',        label:'Proveedor',           type:'text' },
        { key:'observaciones',    label:'Observaciones',       type:'textarea', full:true }
      ]
    },
    consumable: {
      idField: 'id_consumable',
      nameField: 'nombre',
      fields: [
        { key:'id_consumable',    label:'ID Consumible',       type:'text',  hint:'Si se deja vacío se autogenera (CN-001…).' },
        { key:'nombre',           label:'Nombre',              type:'text',  req:true, full:true },
        { key:'categoria',        label:'Categoría',           type:'text',  req:true, hint:'Ej: Cable, Conector, Cinta.' },
        { key:'marca',            label:'Marca',               type:'text' },
        { key:'cantidad_total',   label:'Cantidad Total',      type:'number' },
        { key:'unidad_medida',    label:'Unidad de Medida',    type:'text', hint:'unidad, metro, paquete…' },
        { key:'stock_minimo',     label:'Stock Mínimo',        type:'number' },
        { key:'estado',           label:'Estado',              type:'select', req:true,
          options:['Disponible','Stock Bajo','Agotado','Deshabilitado'] },
        { key:'ubicacion',        label:'Ubicación',           type:'text' },
        { key:'fecha_adquisicion',label:'Fecha de Adquisición',type:'date' },
        { key:'proveedor',        label:'Proveedor',           type:'text' },
        { key:'observaciones',    label:'Observaciones',       type:'textarea', full:true }
      ]
    },
    cmdb: {
      idField: null,
      nameField: 'equipo',
      fields: [
        { key:'equipo', label:'Equipo', type:'text', req:true, full:true },
        { key:'modelo', label:'Modelo', type:'text' },
        { key:'rol',    label:'Rol',    type:'text', hint:'Ej: Core, Acceso, Servidor de archivos.' },
        { key:'serial', label:'Serial', type:'text', req:true }
      ]
    }
  };

  /* ── Etiquetas amigables para el modal de detalle ───────── */
  const FIELD_LABELS = {
    id_hw: 'ID Hardware', id_sw: 'ID Software', id_tool: 'ID Herramienta',
    id_consumable: 'ID Consumible',
    categoria: 'Categoría', marca: 'Marca', modelo: 'Modelo',
    numero_serie: 'Número de Serie', procesador: 'Procesador',
    memoria_ram: 'Memoria RAM', almacenamiento: 'Almacenamiento',
    sistema_operativo: 'Sistema Operativo', estado: 'Estado',
    ubicacion: 'Ubicación', fecha_adquisicion: 'Fecha de Adquisición',
    proveedor: 'Proveedor', garantia: 'Garantía', observaciones: 'Observaciones',
    nombre_sw: 'Nombre del Software', nombre: 'Nombre', version: 'Versión',
    tipo_licencia: 'Tipo de Licencia', numero_licencias: '# Licencias',
    licencias_en_uso: 'Licencias en Uso', clave_producto: 'Clave de Producto',
    fecha_compra: 'Fecha de Compra', fecha_vencimiento: 'Fecha de Vencimiento',
    instalado_en: 'Instalado En',
    cantidad_total: 'Cantidad Total', unidad_medida: 'Unidad de Medida',
    stock_minimo: 'Stock Mínimo', fecha_adquisicion: 'Fecha de Adquisición',
    equipo: 'Equipo', rol: 'Rol', serial: 'Serial',
    origen: 'Origen del registro', fechaImportacion: 'Fecha de importación'
  };

  /* Campos que van a ancho completo en el detalle */
  const FULL_WIDTH_FIELDS = new Set([
    'observaciones', 'almacenamiento', 'instalado_en', 'nombre_sw', 'nombre', 'equipo'
  ]);

  /* ── Estado ──────────────────────────────────────────────── */
  let unifiedCache  = []; // [{ _tipo, _id, _nombre, _estado, _ubicacion, _fecha, ...raw }]
  let currentFilter = 'todos';

  /* ── Utilidades ──────────────────────────────────────────── */
  const escAttr = (s) => String(s ?? '').replace(/"/g, '&quot;');
  const escHtml = (s) => String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const apiFetch = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers }
    }).then(r => r.json());

  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const estadoClass = (estado) => {
    const e = String(estado || '').toLowerCase();
    if (e.includes('reparacion') || e.includes('reparación') || e.includes('próximo') || e.includes('proximo') || e.includes('stock bajo'))
      return 'status-proximo';
    if (e.includes('deshabilit') || e.includes('agotado') || e.includes('vencido') || e.includes('dañad'))
      return 'status-fuera';
    if (e === '' || e === '—') return '';
    return 'status-activo';
  };

  /* ── Normaliza un registro de cualquier tipo para la tabla ── */
  const normalize = (raw, tipo) => {
    const schema = SCHEMAS[tipo];
    const idVal  = schema.idField ? raw[schema.idField] : '';
    const id     = idVal || raw.serial || raw.id || '—';
    const nombre = raw[schema.nameField] || raw.nombre || raw.modelo || raw.equipo || '—';
    return {
      _tipo:      tipo,
      _id:        id,
      _nombre:    nombre,
      _estado:    raw.estado || (tipo === 'cmdb' ? 'Activo' : '—'),
      _ubicacion: raw.ubicacion || raw.instalado_en || '—',
      _fecha:     raw.fecha_adquisicion || raw.fecha_compra || raw.fechaImportacion || '',
      raw
    };
  };

  /* ── Carga de datos: un fetch por tipo, fusión en cache ──── */
  const loadAll = async () => {
    const results = await Promise.all(
      TIPOS.map(t => apiFetch(`${API_BASE}/${t}`)
        .then(r => r.success ? r.data.map(rec => normalize(rec, t)) : [])
        .catch(() => []))
    );
    unifiedCache = results.flat();
  };

  /* ── Filtro y render de la tabla ─────────────────────────── */
  const filtered = () => {
    const q = (document.getElementById('asset-search')?.value || '').toLowerCase();
    return unifiedCache.filter(r => {
      const matchTipo = currentFilter === 'todos' || r._tipo === currentFilter;
      const matchQ    = !q ||
        String(r._id).toLowerCase().includes(q) ||
        String(r._nombre).toLowerCase().includes(q) ||
        String(r._ubicacion).toLowerCase().includes(q) ||
        String(r._estado).toLowerCase().includes(q);
      return matchTipo && matchQ;
    });
  };

  const detalleResumen = (r) => {
    if (r._tipo === 'hardware')   return [r.raw.marca, r.raw.numero_serie].filter(Boolean).join(' · ') || '—';
    if (r._tipo === 'software')   return [r.raw.version, r.raw.tipo_licencia].filter(Boolean).join(' · ') || '—';
    if (r._tipo === 'tools')      return [r.raw.marca, r.raw.cantidad_total && `${r.raw.cantidad_total} ${r.raw.unidad_medida || ''}`.trim()].filter(Boolean).join(' · ') || '—';
    if (r._tipo === 'consumable') return [r.raw.cantidad_total && `${r.raw.cantidad_total} ${r.raw.unidad_medida || ''}`.trim(), r.raw.stock_minimo && `mín ${r.raw.stock_minimo}`].filter(Boolean).join(' · ') || '—';
    if (r._tipo === 'cmdb')       return [r.raw.rol, r.raw.serial].filter(Boolean).join(' · ') || '—';
    return '—';
  };

  const renderTable = () => {
    const tbody = document.getElementById('assets-tbody');
    if (!tbody) return;
    const list = filtered();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:2.5rem;color:var(--color-gray);">
            <i class="bx bx-inbox" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            No se encontraron activos
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map((r, idx) => {
      const globalIdx = unifiedCache.indexOf(r);
      return `
      <tr>
        <td><strong>${escHtml(r._id)}</strong></td>
        <td>${escHtml(r._nombre)}</td>
        <td><span class="cat-badge cat-${r._tipo}">${escHtml(TIPO_LABEL[r._tipo])}</span></td>
        <td><span class="status-badge ${estadoClass(r._estado)}">${escHtml(r._estado)}</span></td>
        <td>${escHtml(r._ubicacion)}</td>
        <td style="font-size:.85rem;color:var(--color-gray)">${escHtml(detalleResumen(r))}</td>
        <td>
          <div class="action-btns">
            <button class="btn-edit btn-detail" title="Ver detalle"
              data-idx="${globalIdx}">
              <i class="bx bx-show"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  const updateCounts = () => {
    const counts = { todos: unifiedCache.length };
    TIPOS.forEach(t => { counts[t] = unifiedCache.filter(r => r._tipo === t).length; });
    Object.entries(counts).forEach(([k, v]) => {
      const el = document.getElementById(`count-${k}`);
      if (el) el.textContent = v;
    });
  };

  /* ── Estadísticas y "Últimos registrados" del dashboard ──── */
  const updateDashboardStats = () => {
    const total   = unifiedCache.length;
    const fuera   = unifiedCache.filter(r => /deshabilit|agotado|vencido|dañad/i.test(r._estado)).length;
    const adv     = unifiedCache.filter(r => /reparaci|próximo|proximo|stock bajo/i.test(r._estado)).length;
    const activos = total - fuera - adv;
    const pct     = (n) => total > 0 ? Math.round(n / total * 100) + '%' : '0%';

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stat-total',        total);
    set('stat-total-pct',    '100%');
    set('stat-activos',      activos);
    set('stat-activos-pct',  pct(activos));
    set('stat-advertencias', adv);
    set('stat-adv-pct',      pct(adv));
    set('stat-fuera',        fuera);
    set('stat-fuera-pct',    pct(fuera));

    const tbody = document.getElementById('recent-assets-tbody');
    if (!tbody) return;
    const recent = unifiedCache
      .slice()
      .sort((a, b) => String(b.raw.fechaImportacion || '').localeCompare(String(a.raw.fechaImportacion || '')))
      .slice(0, 5);
    tbody.innerHTML = recent.map(r => `
      <tr>
        <td><strong>${escHtml(r._id)}</strong></td>
        <td>${escHtml(r._nombre)}</td>
        <td>${escHtml(TIPO_LABEL[r._tipo])}</td>
        <td><span class="status-badge ${estadoClass(r._estado)}">${escHtml(r._estado)}</span></td>
        <td>${escHtml(r._ubicacion)}</td>
      </tr>`).join('');
  };

  /* ── Modal de detalle ────────────────────────────────────── */
  const openDetailModal = (record) => {
    const body  = document.getElementById('detail-modal-body');
    const title = document.getElementById('detail-modal-title');
    if (!body) return;

    const schema = SCHEMAS[record._tipo];
    const raw    = record.raw;

    title.textContent = TIPO_LABEL[record._tipo] + ': ' + record._nombre;

    /* Cabecera: badge de tipo + ID + estado */
    const headerHtml = `
      <div class="detail-header">
        <span class="cat-badge cat-${record._tipo} detail-badge-tipo">${escHtml(TIPO_LABEL[record._tipo])}</span>
        <span class="detail-id">ID interno: ${escHtml(raw.id || '—')}</span>
        <span class="status-badge ${estadoClass(record._estado)}" style="margin-left:auto">${escHtml(record._estado)}</span>
      </div>`;

    /* Cuerpo: todos los campos del schema */
    const fieldsHtml = schema.fields.map(f => {
      const val     = String(raw[f.key] ?? '').trim();
      const isEmpty = val === '' || val === '0' && f.type === 'number' && !raw[f.key];
      const fullCls = FULL_WIDTH_FIELDS.has(f.key) ? ' detail-field--full' : '';
      const label   = FIELD_LABELS[f.key] || f.label;
      return `
        <div class="detail-field${fullCls}">
          <label>${escHtml(label)}</label>
          <span class="${isEmpty ? 'empty' : ''}">${isEmpty ? 'Sin datos' : escHtml(val)}</span>
        </div>`;
    }).join('');

    /* Metadatos del sistema */
    const metaHtml = `
      <div class="detail-field" style="margin-top:1rem;grid-column:1/-1;border-top:1px solid #eee;padding-top:.75rem">
        <label>Fecha de registro</label>
        <span>${escHtml(raw.fechaImportacion ? new Date(raw.fechaImportacion).toLocaleString('es-CO') : '—')}</span>
      </div>
      <div class="detail-field">
        <label>Origen</label>
        <span>${raw.origen === 'manual' ? 'Registro manual' : 'Importación Excel'}</span>
      </div>`;

    body.innerHTML = headerHtml + `<div class="detail-fields">${fieldsHtml}${metaHtml}</div>`;

    document.getElementById('asset-detail-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  const closeDetailModal = () => {
    document.getElementById('asset-detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
  };

  /* ── Modal: render dinámico de campos por categoría ──────── */
  const renderFields = (tipo) => {
    const container = document.getElementById('asset-dynamic-fields');
    const submitBtn = document.getElementById('asset-submit');
    if (!container) return;

    if (!tipo || !SCHEMAS[tipo]) {
      container.innerHTML = '';
      submitBtn.disabled = true;
      return;
    }

    submitBtn.disabled = false;

    container.innerHTML = SCHEMAS[tipo].fields.map(f => {
      const id      = `asset-f-${f.key}`;
      const fullCls = f.full ? ' form-group--full' : '';
      const reqMark = f.req ? ' *' : '';
      const reqAttr = f.req ? ' required' : '';
      const hint    = f.hint ? `<span class="field-hint">${escHtml(f.hint)}</span>` : '';

      let control;
      if (f.type === 'textarea') {
        control = `<textarea id="${id}" name="${f.key}" rows="2"${reqAttr}></textarea>`;
      } else if (f.type === 'select') {
        const opts = ['<option value="">— Seleccionar —</option>']
          .concat((f.options || []).map(o => `<option value="${escAttr(o)}">${escHtml(o)}</option>`))
          .join('');
        control = `<select id="${id}" name="${f.key}"${reqAttr}>${opts}</select>`;
      } else {
        control = `<input type="${f.type}" id="${id}" name="${f.key}"${reqAttr}>`;
      }

      return `
        <div class="form-group${fullCls}">
          <label for="${id}">${escHtml(f.label)}${reqMark}</label>
          ${control}
          ${hint}
        </div>`;
    }).join('');
  };

  const openModal = () => {
    document.getElementById('asset-form').reset();
    document.getElementById('asset-feedback').classList.add('hidden');
    document.getElementById('asset-tipo').value = '';
    renderFields('');
    document.getElementById('asset-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    document.getElementById('asset-modal').classList.add('hidden');
    document.body.style.overflow = '';
  };

  const showFeedback = (msg, ok) => {
    const fb = document.getElementById('asset-feedback');
    fb.classList.remove('hidden');
    fb.style.background = ok ? 'rgba(40,167,69,.12)' : 'rgba(217,83,79,.12)';
    fb.style.color      = ok ? '#1f7a37' : '#a3302d';
    fb.textContent      = msg;
  };

  /* ── Inicialización ──────────────────────────────────────── */
  const init = async () => {
    await loadAll();
    renderTable();
    updateCounts();
    updateDashboardStats();

    // Filtros
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

    // Modal de detalle: delegación en el tbody
    document.getElementById('assets-tbody')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-idx]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      if (!Number.isNaN(idx) && unifiedCache[idx]) openDetailModal(unifiedCache[idx]);
    });
    document.getElementById('detail-modal-close')?.addEventListener('click', closeDetailModal);
    document.getElementById('asset-detail-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeDetailModal();
    });

    // Modal de nuevo activo
    document.getElementById('btn-add-asset')   ?.addEventListener('click', openModal);
    document.getElementById('asset-modal-close') ?.addEventListener('click', closeModal);
    document.getElementById('asset-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('asset-modal')     ?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('asset-detail-modal').classList.contains('hidden')) { closeDetailModal(); return; }
      if (!document.getElementById('asset-modal').classList.contains('hidden')) closeModal();
    });

    document.getElementById('asset-tipo')?.addEventListener('change', e => renderFields(e.target.value));

    // Submit
    document.getElementById('asset-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipo = document.getElementById('asset-tipo').value;
      if (!tipo) { showFeedback('Selecciona una categoría.', false); return; }

      const payload = {};
      SCHEMAS[tipo].fields.forEach(f => {
        const el = document.getElementById(`asset-f-${f.key}`);
        if (el) payload[f.key] = el.value;
      });

      const submitBtn = document.getElementById('asset-submit');
      submitBtn.disabled  = true;
      submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando…';

      const res = await apiFetch(`${API_BASE}/${tipo}`, {
        method: 'POST',
        body:   JSON.stringify(payload)
      }).catch(err => ({ success:false, message:String(err) }));

      submitBtn.disabled  = false;
      submitBtn.innerHTML = '<i class="bx bx-save"></i> Guardar';

      if (res.success) {
        showFeedback('Activo guardado correctamente.', true);
        await loadAll();
        renderTable();
        updateCounts();
        updateDashboardStats();
        setTimeout(closeModal, 700);
      } else {
        showFeedback(res.message || 'Error al guardar el activo.', false);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
