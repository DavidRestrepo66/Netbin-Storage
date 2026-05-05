/* reports.js — Módulo de Reportes
 * Consume /api/reports. Depende de window.NB_SESSION (authGuard.js).
 */

(async function () {
  'use strict';

  const API_BASE = '/api/reports';
  const token    = () => window.NB_SESSION?.token || '';

  let reportsCache = [];

  /* ── API ──────────────────────────────────────────────── */

  const apiFetch = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers }
    }).then(r => r.json());

  const loadCatalog = () => apiFetch(API_BASE).then(j => j.success ? j.data : []);
  const runReport   = (id) => apiFetch(`${API_BASE}/${id}/generate`).then(j => j.success ? j.data : null);

  /* ── Helpers ──────────────────────────────────────────── */

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const fmtDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${fmtDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const esc = (s) => String(s ?? '').replace(/[<>&"']/g, c => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'
  })[c]);

  const estadoClass = (estado) => ({
    'Activo':           'status-activo',
    'En Reparación':    'status-reparacion',
    'Próximo a Vencer': 'status-proximo',
    'Deshabilitado':    'status-fuera'
  })[estado] || 'status-activo';

  /* ── Render: catálogo ─────────────────────────────────── */

  const renderCatalog = () => {
    const grid = document.getElementById('reports-catalog');
    if (!grid) return;

    if (reportsCache.length === 0) {
      grid.innerHTML = `
        <div class="placeholder-box" style="grid-column:1/-1">
          <i class="bx bx-clipboard"></i>
          <p>No hay reportes definidos todavía.</p>
        </div>`;
      return;
    }

    grid.innerHTML = reportsCache.map((r, i) => `
      <div class="dash-card ${i % 2 === 1 ? 'accent' : ''}" style="cursor:pointer"
           onclick="window.ReportsModule.open('${esc(r.id)}')">
        <div class="card-icon-wrap">
          <i class="bx ${esc(r.icono || 'bx-bar-chart-alt-2')}"></i>
        </div>
        <div class="card-body">
          <h3>${esc(r.nombre)}</h3>
          <p>${esc(r.descripcion || 'Sin descripción.')}</p>
        </div>
        <div class="card-arrow">
          Generar <i class="bx bx-chevron-right"></i>
        </div>
      </div>`).join('');
  };

  /* ── Render: detalle de reporte ───────────────────────── */

  const showCatalog = () => {
    document.getElementById('reports-catalog')?.classList.remove('hidden');
    document.getElementById('report-detail')?.classList.add('hidden');
  };

  const showDetail = (definicion, datos, generadoEn) => {
    document.getElementById('reports-catalog')?.classList.add('hidden');
    const panel = document.getElementById('report-detail');
    panel?.classList.remove('hidden');

    const titleSpan = document.querySelector('#report-detail-title span');
    if (titleSpan) titleSpan.textContent = definicion.nombre;

    const meta = document.getElementById('report-detail-meta');
    if (meta) meta.textContent = `${definicion.descripcion || ''} · Generado el ${fmtDateTime(generadoEn)}`;

    const body = document.getElementById('report-detail-body');
    if (body) body.innerHTML = renderByType(definicion.tipo, datos);
  };

  const tableHTML = (headers, rows) => `
    <table>
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.length === 0
          ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:2rem;color:var(--color-gray)">Sin datos para este reporte.</td></tr>`
          : rows.join('')}
      </tbody>
    </table>`;

  const renderByType = (tipo, datos) => {
    switch (tipo) {
      case 'resumen-general': {
        const t = datos.totales;
        const stats = `
          <div class="stats-strip" style="margin-bottom:1.5rem">
            <div class="stat-box"><div class="stat-label">Total</div><div class="stat-value">${t.total}</div></div>
            <div class="stat-box"><div class="stat-label">Activos</div><div class="stat-value">${t.activos}</div></div>
            <div class="stat-box"><div class="stat-label">En Reparación</div><div class="stat-value">${t.reparacion}</div></div>
            <div class="stat-box"><div class="stat-label">Deshabilitados</div><div class="stat-value">${t.deshabilitados}</div></div>
          </div>`;
        const cat = tableHTML(
          ['Categoría', 'Cantidad'],
          datos.porCategoria.map(c => `<tr><td><span class="cat-badge cat-${esc(c.categoria.toLowerCase())}">${esc(c.categoria)}</span></td><td>${c.cantidad}</td></tr>`)
        );
        const est = tableHTML(
          ['Estado', 'Cantidad'],
          datos.porEstado.map(e => `<tr><td><span class="status-badge ${estadoClass(e.estado)}">${esc(e.estado)}</span></td><td>${e.cantidad}</td></tr>`)
        );
        return `${stats}
          <h3 class="section-title" style="margin-top:.5rem"><i class="bx bx-category"></i> Por Categoría</h3>${cat}
          <h3 class="section-title" style="margin-top:1.5rem"><i class="bx bx-pulse"></i> Por Estado</h3>${est}`;
      }

      case 'por-categoria': {
        return datos.map(group => {
          const t = tableHTML(
            ['Código', 'Nombre', 'Estado', 'Responsable'],
            group.items.map(i => `
              <tr>
                <td><strong>${esc(i.codigo)}</strong></td>
                <td>${esc(i.nombre)}</td>
                <td><span class="status-badge ${estadoClass(i.estado)}">${esc(i.estado)}</span></td>
                <td>${esc(i.responsable || '—')}</td>
              </tr>`)
          );
          return `
            <h3 class="section-title" style="margin-top:1rem">
              <span class="cat-badge cat-${esc(group.categoria.toLowerCase())}">${esc(group.categoria)}</span>
              <span style="color:var(--color-gray);font-weight:500">(${group.cantidad})</span>
            </h3>${t}`;
        }).join('');
      }

      case 'por-estado': {
        return datos.map(group => {
          const t = tableHTML(
            ['Código', 'Nombre', 'Categoría', 'Responsable'],
            group.items.map(i => `
              <tr>
                <td><strong>${esc(i.codigo)}</strong></td>
                <td>${esc(i.nombre)}</td>
                <td><span class="cat-badge cat-${esc(i.categoria.toLowerCase())}">${esc(i.categoria)}</span></td>
                <td>${esc(i.responsable || '—')}</td>
              </tr>`)
          );
          return `
            <h3 class="section-title" style="margin-top:1rem">
              <span class="status-badge ${estadoClass(group.estado)}">${esc(group.estado)}</span>
              <span style="color:var(--color-gray);font-weight:500">(${group.cantidad})</span>
            </h3>${t}`;
        }).join('');
      }

      case 'proximos-vencer':
        return tableHTML(
          ['Código', 'Nombre', 'Responsable', 'Vence', 'Días restantes', 'Estado'],
          datos.map(i => {
            const cls = i.diasRestantes <= 0 ? 'status-fuera' : (i.diasRestantes <= 30 ? 'status-proximo' : 'status-activo');
            return `
              <tr>
                <td><strong>${esc(i.codigo)}</strong></td>
                <td>${esc(i.nombre)}</td>
                <td>${esc(i.responsable || '—')}</td>
                <td>${fmtDate(i.fechaVencimiento)}</td>
                <td><span class="status-badge ${cls}">${i.diasRestantes <= 0 ? 'Vencido' : i.diasRestantes + ' días'}</span></td>
                <td>${esc(i.estado)}</td>
              </tr>`;
          })
        );

      case 'bajas':
        return tableHTML(
          ['Código', 'Nombre', 'Categoría', 'Responsable', 'Fecha de Baja'],
          datos.map(i => `
            <tr>
              <td><strong>${esc(i.codigo)}</strong></td>
              <td>${esc(i.nombre)}</td>
              <td><span class="cat-badge cat-${esc(i.categoria.toLowerCase())}">${esc(i.categoria)}</span></td>
              <td>${esc(i.responsable || '—')}</td>
              <td>${fmtDate(i.fechaBaja)}</td>
            </tr>`)
        );

      case 'por-responsable':
        return tableHTML(
          ['Responsable', 'Total', 'Activos', 'Deshabilitados'],
          datos.map(i => `
            <tr>
              <td><strong>${esc(i.responsable)}</strong></td>
              <td>${i.cantidad}</td>
              <td>${i.activos}</td>
              <td>${i.deshabilitados}</td>
            </tr>`)
        );

      default:
        return `<pre style="padding:1rem;color:var(--color-gray)">${esc(JSON.stringify(datos, null, 2))}</pre>`;
    }
  };

  /* ── API pública del módulo ───────────────────────────── */

  const open = async (id) => {
    const body = document.getElementById('report-detail-body');
    document.getElementById('reports-catalog')?.classList.add('hidden');
    document.getElementById('report-detail')?.classList.remove('hidden');
    if (body) body.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--color-gray)">
      <i class="bx bx-loader-alt bx-spin" style="font-size:1.5rem"></i>
      <p style="margin-top:.5rem">Generando reporte...</p></div>`;

    const result = await runReport(id);
    if (!result) {
      if (body) body.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--color-danger)">
        <i class="bx bx-error"></i> No se pudo generar el reporte.</div>`;
      return;
    }
    showDetail(result.definicion, result.datos, result.generadoEn);
  };

  window.ReportsModule = { open };

  /* ── Init ─────────────────────────────────────────────── */

  reportsCache = await loadCatalog();
  renderCatalog();

  document.getElementById('btn-back-reports')?.addEventListener('click', showCatalog);
})();
