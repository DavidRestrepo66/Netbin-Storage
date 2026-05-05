const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const HardwareRepository = require('../repositories/hardwareRepository');
const SoftwareRepository = require('../repositories/softwareRepository');
const ToolRepository     = require('../repositories/toolRepository');
const CmdbRepository     = require('../repositories/cmdbRepository');

/* ── Normalización de cabeceras ──────────────────────────────
 * Compara columnas tolerando mayúsculas, espacios y acentos:
 *   "Categoría" / "CATEGORIA" / "categoria" → "categoria"
 */
const norm = (s) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ── Esquemas de mapeo por tipo ──────────────────────────────
 * `headerKey`: cabecera distintiva que identifica la fila real
 *              (el archivo trae 7-8 filas institucionales antes).
 * `columns`:   nombre normalizado del archivo → campo del JSON.
 */
const SCHEMAS = {
  hardware: {
    repository: HardwareRepository,
    headerKey:  'id_hw',
    columns: {
      'id_hw':              'id_hw',
      'categoria':          'categoria',
      'marca':              'marca',
      'modelo':             'modelo',
      '# de serie':         'numero_serie',
      'numero de serie':    'numero_serie',
      'numero_serie':       'numero_serie',
      'procesador':         'procesador',
      'memoria ram':        'memoria_ram',
      'almacenamiento':     'almacenamiento',
      'sistema operativo':  'sistema_operativo',
      'estado':             'estado',
      'ubicacion':          'ubicacion',
      'fecha adquisicion':  'fecha_adquisicion',
      'proveedor':          'proveedor',
      'garantia':           'garantia',
      'observaciones':      'observaciones'
    }
  },
  software: {
    repository: SoftwareRepository,
    headerKey:  'id_sw',
    columns: {
      'id_sw':              'id_sw',
      'nombre sw':          'nombre_sw',
      'nombre_sw':          'nombre_sw',
      'categoria':          'categoria',
      'version':            'version',
      'tipo de licencia':   'tipo_licencia',
      'tipo_licencia':      'tipo_licencia',
      '# licencias':        'numero_licencias',
      'numero de licencias':'numero_licencias',
      'numero_licencias':   'numero_licencias',
      'licencias en uso':   'licencias_en_uso',
      'licencias_en_uso':   'licencias_en_uso',
      'clave de producto':  'clave_producto',
      'clave_producto':     'clave_producto',
      'fecha compra':       'fecha_compra',
      'fecha_compra':       'fecha_compra',
      'fecha vencimiento':  'fecha_vencimiento',
      'fecha_vencimiento':  'fecha_vencimiento',
      'proveedor':          'proveedor',
      'instalado en:':      'instalado_en',
      'instalado en':       'instalado_en',
      'instalado_en':       'instalado_en',
      'estado':             'estado',
      'observaciones':      'observaciones'
    }
  },
  tools: {
    repository: ToolRepository,
    headerKey:  'id_tool',
    columns: {
      'id_tool':           'id_tool',
      'nombre':            'nombre',
      'categoria':         'categoria',
      'marca':             'marca',
      'modelo':            'modelo',
      '# de serie':        'numero_serie',
      'numero de serie':   'numero_serie',
      'numero_serie':      'numero_serie',
      'cantidad total':    'cantidad_total',
      'cantidad_total':    'cantidad_total',
      'unidad de medida':  'unidad_medida',
      'unidad_medida':     'unidad_medida',
      'estado':            'estado',
      'ubicacion':         'ubicacion',
      'fecha adquisicion': 'fecha_adquisicion',
      'fecha_adquisicion': 'fecha_adquisicion',
      'proveedor':         'proveedor',
      'observaciones':     'observaciones'
    }
  },
  cmdb: {
    repository: CmdbRepository,
    headerKey:  'equipo',
    columns: {
      'equipo': 'equipo',
      'modelo': 'modelo',
      'rol':    'rol',
      'serial': 'serial'
    }
  }
};

/* ── Utilidad: localiza la fila de encabezados ───────────────
 * Recorre las primeras 20 filas y retorna el índice de la
 * primera que contiene la cabecera distintiva del esquema.
 */
const findHeaderRow = (rows, headerKey) => {
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    if (rows[i].some(cell => norm(cell) === headerKey)) return i;
  }
  return -1;
};

/* ── Utilidad: convierte filas en objetos según el esquema ── */
const rowsToRecords = (headers, dataRows, schema, tipo) => {
  const headerMap = headers.map(h => schema.columns[norm(h)] || null);

  return dataRows
    .filter(r => r.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map((row, idx) => {
      const obj = {
        id:                 `${tipo}-${uuidv4().split('-')[0]}`,
        fechaImportacion:   new Date().toISOString()
      };
      headerMap.forEach((field, colIdx) => {
        if (field) obj[field] = String(row[colIdx] ?? '').trim();
      });
      return obj;
    });
};

/* ── Controller ──────────────────────────────────────────── */

const importData = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Archivo requerido (campo "file").' });
  }

  const tipo   = String(req.body.tipo || '').toLowerCase();
  const schema = SCHEMAS[tipo];
  if (!schema) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Permitidos: ${Object.keys(SCHEMAS).join(', ')}.`
    });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return res.status(400).json({ success: false, message: 'El archivo no contiene hojas.' });
    }

    // Modo array-of-arrays: nos permite saltar las filas institucionales iniciales.
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1, defval: '', raw: false, blankrows: false
    });

    const headerIdx = findHeaderRow(rows, schema.headerKey);
    if (headerIdx === -1) {
      return res.status(400).json({
        success: false,
        message: `No se encontró la fila de encabezados (se buscó la columna "${schema.headerKey}" en las primeras 20 filas).`
      });
    }

    const headers  = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);
    const newRecords = rowsToRecords(headers, dataRows, schema, tipo);

    if (newRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo no contiene filas de datos después de los encabezados.'
      });
    }

    // Estrategia: APPEND (acumula con lo ya importado).
    const existing = schema.repository.findAll();
    const merged   = [...existing, ...newRecords];
    schema.repository.save(merged);

    return res.status(200).json({
      success:  true,
      message:  `${newRecords.length} registros importados correctamente.`,
      tipo,
      imported: newRecords.length,
      total:    merged.length,
      headerRow: headerIdx + 1
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Error procesando el archivo: ${err.message}`
    });
  }
};

module.exports = { importData };
