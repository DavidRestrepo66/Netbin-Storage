/**
 * inventoryController.js
 * Responsabilidad: gestionar la creación y listado de registros de inventario
 * para las 5 categorías del laboratorio (hardware, software, tools, consumable, cmdb).
 *
 * Diseño:
 * - Cada tipo tiene un "esquema" con su repositorio, campo de ID humano,
 *   prefijo de autogeneración, lista canónica de campos y campos requeridos.
 * - Los nombres de campo en JSON son IDÉNTICOS a los que produce el importController,
 *   garantizando que registros manuales e importados son intercambiables.
 * - Si el campo de ID (id_hw, id_sw, id_tool, id_consumable) viene vacío,
 *   el sistema autogenera uno con el patrón HW-001, SW-001, TL-001, CN-001.
 */

const { v4: uuidv4 } = require('uuid');

const HardwareRepository   = require('../repositories/hardwareRepository');
const SoftwareRepository   = require('../repositories/softwareRepository');
const ToolRepository       = require('../repositories/toolRepository');
const ConsumableRepository = require('../repositories/consumableRepository');
const CmdbRepository       = require('../repositories/cmdbRepository');

/**
 * Esquemas de cada tipo de inventario.
 *
 * @typedef {Object} InventorySchema
 * @property {Object}   repository - Repositorio que accede al JSON del tipo.
 * @property {string|null} idField - Nombre del campo de ID "humano" (null para CMDB).
 * @property {string|null} prefix  - Prefijo para autogeneración del idField.
 * @property {string[]}  fields   - Lista canónica de propiedades del registro.
 * @property {string[]}  required - Subconjunto mínimo validado en el backend.
 */
const SCHEMAS = {
  hardware: {
    repository: HardwareRepository,
    idField:    'id_hw',
    prefix:     'HW',
    fields: [
      'id_hw', 'categoria', 'marca', 'modelo', 'numero_serie',
      'procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo',
      'estado', 'ubicacion', 'fecha_adquisicion', 'proveedor', 'garantia',
      'observaciones'
    ],
    required: ['categoria', 'marca', 'modelo', 'estado']
  },
  software: {
    repository: SoftwareRepository,
    idField:    'id_sw',
    prefix:     'SW',
    fields: [
      'id_sw', 'nombre_sw', 'categoria', 'version', 'tipo_licencia',
      'numero_licencias', 'licencias_en_uso', 'clave_producto',
      'fecha_compra', 'fecha_vencimiento', 'proveedor', 'instalado_en',
      'estado', 'observaciones'
    ],
    required: ['nombre_sw', 'categoria', 'estado']
  },
  tools: {
    repository: ToolRepository,
    idField:    'id_tool',
    prefix:     'TL',
    fields: [
      'id_tool', 'nombre', 'categoria', 'marca', 'modelo', 'numero_serie',
      'cantidad_total', 'unidad_medida', 'estado', 'ubicacion',
      'fecha_adquisicion', 'proveedor', 'observaciones'
    ],
    required: ['nombre', 'categoria', 'estado']
  },
  consumable: {
    repository: ConsumableRepository,
    idField:    'id_consumable',
    prefix:     'CN',
    fields: [
      'id_consumable', 'nombre', 'categoria', 'marca', 'cantidad_total',
      'unidad_medida', 'stock_minimo', 'estado', 'ubicacion',
      'fecha_adquisicion', 'proveedor', 'observaciones'
    ],
    required: ['nombre', 'categoria', 'estado']
  },
  cmdb: {
    repository: CmdbRepository,
    idField:    null,   // CMDB usa `serial` como identificador natural
    prefix:     null,
    fields:     ['equipo', 'modelo', 'rol', 'serial'],
    required:   ['equipo', 'serial']
  }
};

const TIPOS = Object.keys(SCHEMAS);

/**
 * Genera el siguiente ID "humano" sin colisionar con los ya existentes.
 * Busca en los registros actuales el patrón `PREFIX-NNN` y devuelve
 * el siguiente número libre.
 *
 * Ejemplo: si ya existen HW-001 y HW-002, retorna HW-003.
 *
 * @param {Array}  records - Registros actuales del repositorio.
 * @param {string} prefix  - Prefijo del tipo (HW, SW, TL, CN).
 * @returns {string} Nuevo ID único.
 */
const generateHumanId = (records, prefix) => {
  const used = new Set(
    records.map(r => Object.values(r).find(v => typeof v === 'string' && v.startsWith(`${prefix}-`)))
  );
  let n = records.length + 1;
  let candidate = `${prefix}-${String(n).padStart(3, '0')}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(3, '0')}`;
  }
  return candidate;
};

/**
 * Convierte a string y elimina espacios extremos.
 * Trata undefined y null como cadena vacía para mantener consistencia en el JSON.
 *
 * @param {*} val
 * @returns {string}
 */
const sanitize = (val) => (val === undefined || val === null ? '' : String(val).trim());

/* ── Controllers ────────────────────────────────────────────────── */

/**
 * GET /api/inventory/:tipo
 * Devuelve todos los registros del tipo solicitado.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.tipo - Tipo de inventario (hardware|software|tools|consumable|cmdb).
 * @returns {200} { success: true, tipo, data: Array }
 * @returns {400} Si el tipo no es válido.
 */
const listRecords = (req, res) => {
  const tipo   = String(req.params.tipo || '').toLowerCase();
  const schema = SCHEMAS[tipo];
  if (!schema) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Permitidos: ${TIPOS.join(', ')}.`
    });
  }
  return res.status(200).json({ success: true, tipo, data: schema.repository.findAll() });
};

/**
 * POST /api/inventory/:tipo
 * Crea un registro nuevo y lo persiste en el JSON correspondiente.
 *
 * Flujo:
 * 1. Valida que los campos de `schema.required` vengan con valor.
 * 2. Construye el objeto con `id` (UUID interno), `fechaImportacion` y todos
 *    los campos del esquema en el orden canónico.
 * 3. Si el campo de ID humano (id_hw / id_sw / id_tool / id_consumable) viene
 *    vacío, lo autogenera con `generateHumanId`.
 * 4. Hace append al JSON y persiste.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.tipo - Tipo de inventario.
 * @body {Object} req.body - Campos del registro según el esquema del tipo.
 * @returns {201} { success: true, tipo, data: Object } El registro creado.
 * @returns {400} Si el tipo no es válido o faltan campos requeridos.
 */
const createRecord = (req, res) => {
  const tipo   = String(req.params.tipo || '').toLowerCase();
  const schema = SCHEMAS[tipo];
  if (!schema) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Permitidos: ${TIPOS.join(', ')}.`
    });
  }

  const missing = schema.required.filter(f => !sanitize(req.body[f]));
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Campos requeridos faltantes: ${missing.join(', ')}.`
    });
  }

  const records = schema.repository.findAll();

  // Construye el registro respetando el orden y nombres exactos del esquema,
  // igual que lo hace el importController, para que sean intercambiables.
  const record = {
    id:               `${tipo}-${uuidv4().split('-')[0]}`,
    fechaImportacion: new Date().toISOString(),
    origen:           'manual'
  };
  schema.fields.forEach(field => {
    record[field] = sanitize(req.body[field]);
  });

  // Autogenera el ID humano si el usuario lo dejó vacío
  if (schema.idField && !record[schema.idField]) {
    record[schema.idField] = generateHumanId(records, schema.prefix);
  }

  records.push(record);
  schema.repository.save(records);

  return res.status(201).json({ success: true, tipo, data: record });
};

module.exports = { listRecords, createRecord, TIPOS };
