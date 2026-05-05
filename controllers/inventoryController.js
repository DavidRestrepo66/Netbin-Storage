const { v4: uuidv4 } = require('uuid');

const HardwareRepository   = require('../repositories/hardwareRepository');
const SoftwareRepository   = require('../repositories/softwareRepository');
const ToolRepository       = require('../repositories/toolRepository');
const ConsumableRepository = require('../repositories/consumableRepository');
const CmdbRepository       = require('../repositories/cmdbRepository');

/* ── Esquemas por tipo ──────────────────────────────────────
 * `idField`:  campo "humano" (id_hw, id_sw, id_tool); cmdb no tiene.
 * `prefix`:   prefijo para autogenerar el idField cuando el usuario no lo provee.
 * `fields`:   lista canónica de propiedades guardadas. Coincide EXACTAMENTE
 *             con el mapeo del importController para que ambos generen JSON
 *             intercambiables.
 * `required`: subconjunto mínimo validado en el backend.
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
    idField:    null,
    prefix:     null,
    fields:     ['equipo', 'modelo', 'rol', 'serial'],
    required:   ['equipo', 'serial']
  }
};

const TIPOS = Object.keys(SCHEMAS);

/* Genera el siguiente id "humano" (HW-001, SW-001, TL-001) sin colisionar. */
const generateHumanId = (records, prefix) => {
  const used = new Set(records.map(r => Object.values(r).find(v => typeof v === 'string' && v.startsWith(`${prefix}-`))));
  let n = records.length + 1;
  let candidate = `${prefix}-${String(n).padStart(3, '0')}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(3, '0')}`;
  }
  return candidate;
};

const sanitize = (val) => (val === undefined || val === null ? '' : String(val).trim());

/* ── GET /api/inventory/:tipo ───────────────────────────── */
const listRecords = (req, res) => {
  const tipo   = String(req.params.tipo || '').toLowerCase();
  const schema = SCHEMAS[tipo];
  if (!schema) {
    return res.status(400).json({ success: false, message: `Tipo inválido. Permitidos: ${TIPOS.join(', ')}.` });
  }
  return res.status(200).json({ success: true, tipo, data: schema.repository.findAll() });
};

/* ── POST /api/inventory/:tipo ──────────────────────────── */
const createRecord = (req, res) => {
  const tipo   = String(req.params.tipo || '').toLowerCase();
  const schema = SCHEMAS[tipo];
  if (!schema) {
    return res.status(400).json({ success: false, message: `Tipo inválido. Permitidos: ${TIPOS.join(', ')}.` });
  }

  const missing = schema.required.filter(f => !sanitize(req.body[f]));
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Campos requeridos faltantes: ${missing.join(', ')}.`
    });
  }

  const records = schema.repository.findAll();

  // Construye el registro respetando el orden y nombres exactos del esquema.
  const record = {
    id:               `${tipo}-${uuidv4().split('-')[0]}`,
    fechaImportacion: new Date().toISOString(),
    origen:           'manual'
  };
  schema.fields.forEach(field => {
    record[field] = sanitize(req.body[field]);
  });

  // Autogenera el id "humano" (id_hw / id_sw / id_tool) si vino vacío.
  if (schema.idField && !record[schema.idField]) {
    record[schema.idField] = generateHumanId(records, schema.prefix);
  }

  records.push(record);
  schema.repository.save(records);

  return res.status(201).json({ success: true, tipo, data: record });
};

module.exports = { listRecords, createRecord, TIPOS };
