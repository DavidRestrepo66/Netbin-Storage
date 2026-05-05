/**
 * reportController.js
 * Responsabilidad: definir y ejecutar reportes sobre el inventario unificado.
 *
 * Los reportes tienen dos partes:
 *  1. "Definición" — guardada en data/reports.json (nombre, tipo, icono).
 *  2. "Datos calculados" — generados al vuelo leyendo los 5 inventarios.
 *
 * La función `loadAllAssets` normaliza los 5 JSON de inventario a un shape
 * común { codigo, nombre, categoria, estado, responsable, fechaVencimiento, fechaBaja }
 * para que los generadores de reporte funcionen con una sola estructura.
 */

const { v4: uuidv4 }       = require('uuid');
const ReportRepository     = require('../repositories/reportRepository');
const HardwareRepository   = require('../repositories/hardwareRepository');
const SoftwareRepository   = require('../repositories/softwareRepository');
const ToolRepository       = require('../repositories/toolRepository');
const ConsumableRepository = require('../repositories/consumableRepository');
const CmdbRepository       = require('../repositories/cmdbRepository');

/**
 * Une los 5 inventarios en una lista con un shape mínimo y común:
 * { codigo, nombre, categoria, estado, responsable, fechaVencimiento, fechaBaja }
 *
 * Esto permite que los generadores de reporte operen sobre una interfaz única
 * sin conocer los detalles de cada tipo de inventario.
 *
 * @returns {Array<{codigo:string, nombre:string, categoria:string, estado:string,
 *                  responsable:string, fechaVencimiento:string|null, fechaBaja:string|null}>}
 */
const loadAllAssets = () => {
  const map = (records, categoria, getId, getNombre) =>
    records.map(r => ({
      codigo:           getId(r) || r.id || '—',
      nombre:           getNombre(r) || '—',
      categoria,
      estado:           r.estado || (categoria === 'CMDB' ? 'Activo' : '—'),
      responsable:      r.responsable || r.instalado_en || '—',
      fechaVencimiento: r.fecha_vencimiento || null,
      fechaBaja:        r.fecha_baja || null
    }));

  return [
    ...map(HardwareRepository.findAll(),   'Hardware',    r => r.id_hw,         r => `${r.marca || ''} ${r.modelo || ''}`.trim()),
    ...map(SoftwareRepository.findAll(),   'Software',    r => r.id_sw,         r => r.nombre_sw),
    ...map(ToolRepository.findAll(),       'Herramienta', r => r.id_tool,       r => r.nombre),
    ...map(ConsumableRepository.findAll(), 'Consumible',  r => r.id_consumable, r => r.nombre),
    ...map(CmdbRepository.findAll(),       'CMDB',        r => r.serial,        r => r.equipo)
  ];
};

const TIPOS_VALIDOS = [
  'resumen-general',
  'por-categoria',
  'por-estado',
  'proximos-vencer',
  'bajas',
  'por-responsable'
];

/* ── Utilidad ────────────────────────────────────────────────── */

/**
 * Agrupa un array de objetos por el valor de una clave.
 *
 * @param {Array} arr
 * @param {string} key - Propiedad por la que agrupar.
 * @returns {Object} Objeto cuyas claves son los valores únicos de `key`.
 */
const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = item[key] || 'Sin asignar';
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});

/* ── Generadores de datos por tipo de reporte ─────────────────── */

/**
 * Genera un resumen de totales por categoría y por estado.
 *
 * @param {Array} assets - Lista normalizada de activos.
 * @returns {{ totales: Object, porCategoria: Array, porEstado: Array }}
 */
const buildResumenGeneral = (assets) => {
  const porCategoria = groupBy(assets, 'categoria');
  const porEstado    = groupBy(assets, 'estado');

  return {
    totales: {
      total:          assets.length,
      activos:        assets.filter(a => a.estado === 'Activo').length,
      reparacion:     assets.filter(a => a.estado === 'En Reparación').length,
      proximoVencer:  assets.filter(a => a.estado === 'Próximo a Vencer').length,
      deshabilitados: assets.filter(a => a.estado === 'Deshabilitado').length
    },
    porCategoria: Object.entries(porCategoria).map(([k, v]) => ({ categoria: k, cantidad: v.length })),
    porEstado:    Object.entries(porEstado).map(([k, v]) => ({ estado: k, cantidad: v.length }))
  };
};

/**
 * Lista todos los activos agrupados por categoría.
 *
 * @param {Array} assets
 * @returns {Array<{ categoria: string, cantidad: number, items: Array }>}
 */
const buildPorCategoria = (assets) =>
  Object.entries(groupBy(assets, 'categoria')).map(([categoria, items]) => ({
    categoria,
    cantidad: items.length,
    items: items.map(a => ({
      codigo: a.codigo, nombre: a.nombre, estado: a.estado, responsable: a.responsable
    }))
  }));

/**
 * Lista todos los activos agrupados por estado.
 *
 * @param {Array} assets
 * @returns {Array<{ estado: string, cantidad: number, items: Array }>}
 */
const buildPorEstado = (assets) =>
  Object.entries(groupBy(assets, 'estado')).map(([estado, items]) => ({
    estado,
    cantidad: items.length,
    items: items.map(a => ({
      codigo: a.codigo, nombre: a.nombre, categoria: a.categoria, responsable: a.responsable
    }))
  }));

/**
 * Lista el software cuya fecha de vencimiento cae dentro de los próximos 3 meses.
 * Los resultados se ordenan por días restantes (ascendente).
 *
 * Ventana de 3 meses elegida por requisito institucional; un mes sería muy corto
 * para activar compras o renovaciones a tiempo.
 *
 * @param {Array} assets
 * @returns {Array<{ codigo, nombre, responsable, fechaVencimiento, diasRestantes, estado }>}
 */
const buildProximosVencer = (assets) => {
  const hoy   = new Date();
  const limite = new Date(hoy);
  limite.setMonth(limite.getMonth() + 3);

  return assets
    .filter(a => a.categoria === 'Software' && a.fechaVencimiento && new Date(a.fechaVencimiento) <= limite)
    .map(a => {
      const exp = new Date(a.fechaVencimiento);
      const diasRestantes = Math.round((exp - hoy) / (1000 * 60 * 60 * 24));
      return {
        codigo: a.codigo, nombre: a.nombre, responsable: a.responsable,
        fechaVencimiento: a.fechaVencimiento, diasRestantes, estado: a.estado
      };
    })
    .sort((x, y) => x.diasRestantes - y.diasRestantes);
};

/**
 * Lista los activos que están dados de baja (estado Deshabilitado).
 * Ordenados por fecha de baja más reciente primero.
 *
 * @param {Array} assets
 * @returns {Array<{ codigo, nombre, categoria, responsable, fechaBaja }>}
 */
const buildBajas = (assets) =>
  assets
    .filter(a => a.estado === 'Deshabilitado')
    .map(a => ({
      codigo: a.codigo, nombre: a.nombre, categoria: a.categoria,
      responsable: a.responsable, fechaBaja: a.fechaBaja
    }))
    .sort((x, y) => new Date(y.fechaBaja || 0) - new Date(x.fechaBaja || 0));

/**
 * Lista los activos agrupados por responsable / equipo donde están instalados.
 * Ordenados por cantidad descendente (más activos primero).
 *
 * @param {Array} assets
 * @returns {Array<{ responsable, cantidad, activos, deshabilitados }>}
 */
const buildPorResponsable = (assets) =>
  Object.entries(groupBy(assets, 'responsable'))
    .map(([responsable, items]) => ({
      responsable,
      cantidad:       items.length,
      activos:        items.filter(a => a.estado === 'Activo').length,
      deshabilitados: items.filter(a => a.estado === 'Deshabilitado').length
    }))
    .sort((x, y) => y.cantidad - x.cantidad);

/** Mapa tipo → función generadora. */
const GENERADORES = {
  'resumen-general': buildResumenGeneral,
  'por-categoria':   buildPorCategoria,
  'por-estado':      buildPorEstado,
  'proximos-vencer': buildProximosVencer,
  'bajas':           buildBajas,
  'por-responsable': buildPorResponsable
};

/* ── Controllers ────────────────────────────────────────────────── */

/**
 * GET /api/reports
 * Lista las definiciones de reportes disponibles (no ejecuta los reportes).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {200} Array de definiciones de reporte.
 */
const listReports = (req, res) => {
  return res.status(200).json({ success: true, data: ReportRepository.findAll() });
};

/**
 * GET /api/reports/:id/generate
 * Ejecuta un reporte: carga todos los activos, aplica el generador
 * correspondiente al tipo del reporte y retorna los datos calculados.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.id - ID de la definición del reporte.
 * @returns {200} { definicion, datos, generadoEn }
 * @returns {404} Si la definición no existe.
 * @returns {400} Si el tipo no tiene generador implementado.
 */
const generateReport = (req, res) => {
  const { id } = req.params;
  const definicion = ReportRepository.findById(id);
  if (!definicion) {
    return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });
  }

  const generador = GENERADORES[definicion.tipo];
  if (!generador) {
    return res.status(400).json({ success: false, message: `Tipo de reporte no soportado: ${definicion.tipo}` });
  }

  const datos = generador(loadAllAssets());
  return res.status(200).json({
    success: true,
    data: { definicion, datos, generadoEn: new Date().toISOString() }
  });
};

/**
 * POST /api/reports
 * Crea una nueva definición de reporte. No ejecuta el reporte;
 * solo persiste la configuración para que el usuario pueda generarlo después.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @body {{ nombre: string, tipo: string, descripcion?: string, icono?: string, filtros?: Object }}
 * @returns {201} La definición creada.
 * @returns {400} Si falta nombre/tipo o el tipo no es válido.
 */
const createReport = (req, res) => {
  const { nombre, descripcion, tipo, icono, filtros } = req.body;

  if (!nombre || !tipo) {
    return res.status(400).json({ success: false, message: 'Nombre y tipo son requeridos.' });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Permitidos: ${TIPOS_VALIDOS.join(', ')}`
    });
  }

  const reports = ReportRepository.findAll();
  const newReport = {
    id:          `rep-${uuidv4().split('-')[0]}`,
    nombre:      nombre.trim(),
    descripcion: (descripcion || '').trim(),
    tipo,
    icono:       icono || 'bx-bar-chart-alt-2',
    filtros:     filtros || {}
  };

  reports.push(newReport);
  ReportRepository.save(reports);
  return res.status(201).json({ success: true, data: newReport });
};

/**
 * DELETE /api/reports/:id
 * Elimina una definición de reporte. No afecta los datos de inventario.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.id - ID del reporte a eliminar.
 * @returns {200} La definición eliminada.
 * @returns {404} Si no existe.
 */
const deleteReport = (req, res) => {
  const { id } = req.params;
  const reports = ReportRepository.findAll();
  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });
  }
  const [removed] = reports.splice(idx, 1);
  ReportRepository.save(reports);
  return res.status(200).json({ success: true, data: removed });
};

module.exports = { listReports, generateReport, createReport, deleteReport };
