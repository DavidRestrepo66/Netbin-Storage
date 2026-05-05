/**
 * importController.js
 * Responsabilidad: importar masivamente registros de inventario desde archivos
 * .xlsx, .xls o .csv subidos por el usuario.
 *
 * Problema específico de los archivos institucionales:
 * Los archivos Excel de la universidad incluyen 6–8 filas de encabezado
 * institucional (logo, nombre de la entidad, título, fecha, etc.) ANTES
 * de la fila real de columnas de datos. El sistema no puede asumir un número
 * fijo de filas a saltarse porque varía según la plantilla.
 *
 * Solución adoptada:
 * - Se lee el archivo en modo array-of-arrays (sin parsear cabeceras).
 * - Se escanean las primeras 20 filas buscando la "cabecera distintiva"
 *   de cada tipo (ej. la celda `id_hw` para hardware).
 * - Todas las filas anteriores a esa se descartan automáticamente.
 * - Las filas posteriores se mapean a objetos usando el esquema de columnas.
 *
 * Compatibilidad de nombres:
 * Los campos JSON producidos por este controller son IDÉNTICOS a los que
 * genera inventoryController (registro manual), para que ambos flujos sean
 * intercambiables y el frontend no distinga el origen.
 */

const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const HardwareRepository = require('../repositories/hardwareRepository');
const SoftwareRepository = require('../repositories/softwareRepository');
const ToolRepository     = require('../repositories/toolRepository');
const CmdbRepository     = require('../repositories/cmdbRepository');

/**
 * Normaliza una cadena para comparación tolerante:
 * elimina mayúsculas, espacios extra y caracteres diacríticos (acentos).
 * Permite que "Categoría", "CATEGORIA" y "categoria" sean equivalentes.
 *
 * @param {*} s - Valor a normalizar.
 * @returns {string}
 */
const norm = (s) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Esquemas de importación por tipo de inventario.
 *
 * @property {Object} repository  - Repositorio de persistencia.
 * @property {string} headerKey   - Nombre normalizado de la columna distintiva
 *                                  (usada para localizar la fila de encabezados).
 * @property {Object} columns     - Mapa columna-normalizada → campo en JSON.
 *                                  Se aceptan varias formas de la misma columna
 *                                  para tolerar variaciones en las plantillas.
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
      // El campo "# de Serie" puede venir con o sin numeral y con o sin acento
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
      'id_sw':               'id_sw',
      // "Nombre SW" es el título que usa la plantilla institucional
      'nombre sw':           'nombre_sw',
      'nombre_sw':           'nombre_sw',
      'categoria':           'categoria',
      'version':             'version',
      'tipo de licencia':    'tipo_licencia',
      'tipo_licencia':       'tipo_licencia',
      // "# Licencias" puede venir con numeral o escrito completo
      '# licencias':         'numero_licencias',
      'numero de licencias': 'numero_licencias',
      'numero_licencias':    'numero_licencias',
      'licencias en uso':    'licencias_en_uso',
      'licencias_en_uso':    'licencias_en_uso',
      'clave de producto':   'clave_producto',
      'clave_producto':      'clave_producto',
      'fecha compra':        'fecha_compra',
      'fecha_compra':        'fecha_compra',
      'fecha vencimiento':   'fecha_vencimiento',
      'fecha_vencimiento':   'fecha_vencimiento',
      'proveedor':           'proveedor',
      // Algunas plantillas incluyen los dos puntos al final del encabezado
      'instalado en:':       'instalado_en',
      'instalado en':        'instalado_en',
      'instalado_en':        'instalado_en',
      'estado':              'estado',
      'observaciones':       'observaciones'
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

/**
 * Busca la fila de encabezados reales dentro del archivo.
 * Escanea hasta las primeras 20 filas buscando la cabecera distintiva del esquema.
 *
 * Se limita a 20 filas para no iterar documentos completos en caso de archivos
 * mal formados; en la práctica los encabezados institucionales nunca superan 10 filas.
 *
 * @param {Array[]}  rows      - Archivo en formato array-of-arrays.
 * @param {string}   headerKey - Nombre normalizado de la columna a buscar.
 * @returns {number} Índice de la fila de encabezados, o -1 si no se encontró.
 */
const findHeaderRow = (rows, headerKey) => {
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    if (rows[i].some(cell => norm(cell) === headerKey)) return i;
  }
  return -1;
};

/**
 * Convierte las filas de datos en objetos JSON usando el esquema de columnas.
 * Ignora filas completamente vacías. Asigna un UUID interno a cada registro.
 *
 * @param {string[]}  headers  - Fila de cabeceras del archivo.
 * @param {Array[][]} dataRows - Filas de datos (todo lo que viene después de headers).
 * @param {Object}    schema   - Esquema de columnas del tipo ({columns: {key: field}}).
 * @param {string}    tipo     - Nombre del tipo (para el prefijo del UUID).
 * @returns {Object[]} Array de registros listos para persistir.
 */
const rowsToRecords = (headers, dataRows, schema, tipo) => {
  // Pre-compila el mapa columna → campo para no re-buscarlo en cada fila
  const headerMap = headers.map(h => schema.columns[norm(h)] || null);

  return dataRows
    .filter(r => r.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map((row) => {
      const obj = {
        id:               `${tipo}-${uuidv4().split('-')[0]}`,
        fechaImportacion: new Date().toISOString()
        // Nota: los registros importados NO tienen campo `origen`;
        // los manuales sí tienen `origen: "manual"`, lo que permite distinguirlos.
      };
      headerMap.forEach((field, colIdx) => {
        if (field) obj[field] = String(row[colIdx] ?? '').trim();
      });
      return obj;
    });
};

/* ── Controller ──────────────────────────────────────────────────── */

/**
 * POST /api/import
 * Procesa el archivo subido y persiste los registros en el JSON del tipo indicado.
 *
 * Estrategia de persistencia: APPEND (acumula sobre los existentes).
 * El archivo nunca se escribe en disco; `multer` lo mantiene en memoria.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Express.Multer.File} req.file       - Archivo en memoria.
 * @param {string}              req.body.tipo  - Tipo de inventario a importar.
 * @returns {200} { success, message, tipo, imported, total, headerRow }
 * @returns {400} Si falta el archivo, el tipo es inválido, no se encuentran cabeceras o no hay datos.
 * @returns {500} Si ocurre un error inesperado al parsear el archivo.
 */
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
    // `cellDates: true` convierte fechas de Excel a objetos Date de JS
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return res.status(400).json({ success: false, message: 'El archivo no contiene hojas.' });
    }

    // Modo array-of-arrays: nos permite saltar las filas institucionales
    // sin asumir que la primera fila siempre es el encabezado real.
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

    const headers    = rows[headerIdx];
    const dataRows   = rows.slice(headerIdx + 1);
    const newRecords = rowsToRecords(headers, dataRows, schema, tipo);

    if (newRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo no contiene filas de datos después de los encabezados.'
      });
    }

    // Append: preserva los registros ya existentes y agrega los nuevos al final
    const existing = schema.repository.findAll();
    const merged   = [...existing, ...newRecords];
    schema.repository.save(merged);

    return res.status(200).json({
      success:   true,
      message:   `${newRecords.length} registros importados correctamente.`,
      tipo,
      imported:  newRecords.length,
      total:     merged.length,
      headerRow: headerIdx + 1   // fila (base-1) donde se encontraron los encabezados
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Error procesando el archivo: ${err.message}`
    });
  }
};

module.exports = { importData };
