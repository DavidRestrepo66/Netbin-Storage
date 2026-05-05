/* import.js — Módulo de Importación de Datos
 * POST multipart/form-data a /api/import. Depende de window.NB_SESSION.
 */

(function () {
  'use strict';

  const API_URL = '/api/import';
  const token   = () => window.NB_SESSION?.token || '';

  const form     = document.getElementById('import-form');
  const tipoSel  = document.getElementById('import-tipo');
  const fileInp  = document.getElementById('import-file');
  const submit   = document.getElementById('import-submit');
  const reset    = document.getElementById('import-reset');
  const feedback = document.getElementById('import-feedback');
  const hint     = document.getElementById('import-tipo-hint');

  if (!form) return;

  /* ── Hint dinámico por tipo ────────────────────────────── */

  const HINTS = {
    hardware: 'Columnas esperadas: ID_HW, Categoría, Marca, Modelo, # de Serie, Procesador, Memoria RAM, Almacenamiento, Sistema Operativo, Estado, Ubicación, Fecha Adquisición, Proveedor, Garantía, Observaciones.',
    software: 'Columnas esperadas: ID_SW, Nombre SW, Categoría, Versión, Tipo de Licencia, # Licencias, Licencias en uso, Clave de Producto, Fecha Compra, Fecha Vencimiento, Proveedor, Instalado en, Estado, Observaciones.',
    tools:    'Columnas esperadas: ID_tool, Nombre, Categoría, Marca, Modelo, # de Serie, Cantidad Total, Unidad de medida, Estado, Ubicación, Fecha Adquisición, Proveedor, Observaciones.',
    cmdb:     'Columnas esperadas: Equipo, Modelo, Rol, Serial.'
  };

  tipoSel.addEventListener('change', () => {
    hint.textContent = HINTS[tipoSel.value] ||
      'Cada tipo usa un formato de columnas distinto. Las primeras 7-8 filas institucionales se omiten automáticamente.';
  });

  /* ── Feedback visual ──────────────────────────────────── */

  const showFeedback = (kind, message) => {
    const palette = {
      success: { bg: '#e6f6ec', color: '#1e7e34', icon: 'bx-check-circle' },
      error:   { bg: '#fde8e8', color: '#9a1f1f', icon: 'bx-error-circle' },
      info:    { bg: 'var(--color-primary-lt)', color: 'var(--color-primary-dk)', icon: 'bx-info-circle' }
    }[kind] || { bg: 'var(--color-gray-lt)', color: 'var(--color-gray-dk)', icon: 'bx-info-circle' };

    feedback.classList.remove('hidden');
    feedback.style.background = palette.bg;
    feedback.style.color      = palette.color;
    feedback.style.border     = `1px solid ${palette.color}33`;
    feedback.innerHTML        = `<i class="bx ${palette.icon}" style="font-size:1.25rem;flex-shrink:0"></i><div>${message}</div>`;
  };

  const clearFeedback = () => {
    feedback.classList.add('hidden');
    feedback.innerHTML = '';
  };

  /* ── Reset ────────────────────────────────────────────── */

  reset.addEventListener('click', () => {
    form.reset();
    clearFeedback();
    hint.textContent = HINTS.hardware ? 'Cada tipo usa un formato de columnas distinto. Las primeras 7-8 filas institucionales se omiten automáticamente.' : '';
  });

  /* ── Submit ───────────────────────────────────────────── */

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const tipo = tipoSel.value;
    const file = fileInp.files[0];

    if (!tipo) {
      showFeedback('error', 'Debes seleccionar el tipo de inventario.');
      return;
    }
    if (!file) {
      showFeedback('error', 'Debes seleccionar un archivo .csv o .xlsx.');
      return;
    }

    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('file', file);

    submit.disabled  = true;
    submit.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Importando...';
    showFeedback('info', `Procesando "${file.name}"...`);

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` }, // NO Content-Type: lo pone fetch con boundary
        body:    fd
      });
      const json = await resp.json();

      if (json.success) {
        showFeedback(
          'success',
          `<strong>${json.imported} registros importados</strong> al inventario de
           <strong>${tipo}</strong>. Total acumulado: ${json.total}.
           Fila de encabezados detectada: ${json.headerRow}.`
        );
        form.reset();
      } else {
        showFeedback('error', json.message || 'Ocurrió un error al importar el archivo.');
      }
    } catch (err) {
      showFeedback('error', `Error de red: ${err.message}`);
    } finally {
      submit.disabled  = false;
      submit.innerHTML = '<i class="bx bx-upload"></i> Importar archivo';
    }
  });
})();
