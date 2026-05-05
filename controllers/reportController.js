const { v4: uuidv4 }       = require('uuid');
const ReportRepository     = require('../repositories/reportRepository');
const HardwareRepository   = require('../repositories/hardwareRepository');
const SoftwareRepository   = require('../repositories/softwareRepository');
const ToolRepository       = require('../repositories/toolRepository');
const ConsumableRepository = require('../repositories/consumableRepository');
const CmdbRepository       = require('../repositories/cmdbRepository');

/* Une los 5 inventarios en una vista común con campos:
 * { codigo, nombre, categoria, estado, responsable, fechaVencimiento, fechaBaja }
 * Sustituye al antiguo AssetRepository.findAll usado por los reportes.
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

/* ── Generadores de datos por tipo de reporte ────────────────── */

const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = item[key] || 'Sin asignar';
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});

const buildResumenGeneral = (assets) => {
  const porCategoria = groupBy(assets, 'categoria');
  const porEstado    = groupBy(assets, 'estado');

  return {
    totales: {
      total:         assets.length,
      activos:       assets.filter(a => a.estado === 'Activo').length,
      reparacion:    assets.filter(a => a.estado === 'En Reparación').length,
      proximoVencer: assets.filter(a => a.estado === 'Próximo a Vencer').length,
      deshabilitados: assets.filter(a => a.estado === 'Deshabilitado').length
    },
    porCategoria: Object.entries(porCategoria).map(([k, v]) => ({ categoria: k, cantidad: v.length })),
    porEstado:    Object.entries(porEstado).map(([k, v]) => ({ estado: k, cantidad: v.length }))
  };
};

const buildPorCategoria = (assets) =>
  Object.entries(groupBy(assets, 'categoria')).map(([categoria, items]) => ({
    categoria,
    cantidad: items.length,
    items: items.map(a => ({
      codigo: a.codigo, nombre: a.nombre, estado: a.estado, responsable: a.responsable
    }))
  }));

const buildPorEstado = (assets) =>
  Object.entries(groupBy(assets, 'estado')).map(([estado, items]) => ({
    estado,
    cantidad: items.length,
    items: items.map(a => ({
      codigo: a.codigo, nombre: a.nombre, categoria: a.categoria, responsable: a.responsable
    }))
  }));

const buildProximosVencer = (assets) => {
  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setMonth(limite.getMonth() + 3); // Ventana de 3 meses

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

const buildBajas = (assets) =>
  assets
    .filter(a => a.estado === 'Deshabilitado')
    .map(a => ({
      codigo: a.codigo, nombre: a.nombre, categoria: a.categoria,
      responsable: a.responsable, fechaBaja: a.fechaBaja
    }))
    .sort((x, y) => new Date(y.fechaBaja || 0) - new Date(x.fechaBaja || 0));

const buildPorResponsable = (assets) =>
  Object.entries(groupBy(assets, 'responsable'))
    .map(([responsable, items]) => ({
      responsable,
      cantidad: items.length,
      activos:       items.filter(a => a.estado === 'Activo').length,
      deshabilitados: items.filter(a => a.estado === 'Deshabilitado').length
    }))
    .sort((x, y) => y.cantidad - x.cantidad);

const GENERADORES = {
  'resumen-general':  buildResumenGeneral,
  'por-categoria':    buildPorCategoria,
  'por-estado':       buildPorEstado,
  'proximos-vencer':  buildProximosVencer,
  'bajas':            buildBajas,
  'por-responsable':  buildPorResponsable
};

/* ── Controllers ─────────────────────────────────────────────── */

const listReports = (req, res) => {
  return res.status(200).json({ success: true, data: ReportRepository.findAll() });
};

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
