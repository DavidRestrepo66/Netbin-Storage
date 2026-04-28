const { v4: uuidv4 } = require('uuid');
const AssetRepository = require('../repositories/assetRepository');

const CATEGORIAS  = ['Hardware', 'Software', 'Consumible', 'Herramienta'];
const ESTADOS     = ['Activo', 'En Reparación', 'Próximo a Vencer', 'Deshabilitado'];
const CAT_PREFIX  = { Hardware: 'HW', Software: 'SW', Consumible: 'CS', Herramienta: 'HE' };

const generateCodigo = (categoria, assets) => {
  const prefix = CAT_PREFIX[categoria] || 'XX';
  const count  = assets.filter(a => a.categoria === categoria).length + 1;
  return `NB-${prefix}-${String(count).padStart(3, '0')}`;
};

/* ── Lógica de vencimiento ───────────────────────────────────
 * Revisa un activo Software con fechaVencimiento y actualiza su
 * estado automáticamente si está próximo a vencer o ya caducó.
 * No toca activos ya Deshabilitados para no pisar una baja manual.
 */
const applyExpirationCheck = (asset) => {
  if (asset.categoria !== 'Software' || !asset.fechaVencimiento || asset.estado === 'Deshabilitado') {
    return asset;
  }
  const now  = new Date();
  const exp  = new Date(asset.fechaVencimiento);
  const soon = new Date(now);
  soon.setMonth(soon.getMonth() + 1);

  if (exp <= now) {
    return { ...asset, estado: 'Deshabilitado', fechaBaja: asset.fechaBaja || now.toISOString() };
  }
  if (exp <= soon && asset.estado === 'Activo') {
    return { ...asset, estado: 'Próximo a Vencer' };
  }
  return asset;
};

/* Recorre todos los activos, aplica el chequeo y persiste si algo cambió. */
const checkExpirations = () => {
  const assets  = AssetRepository.findAll();
  const updated = assets.map(applyExpirationCheck);
  const changed = updated.some((a, i) => a.estado !== assets[i].estado || a.fechaBaja !== assets[i].fechaBaja);
  if (changed) AssetRepository.save(updated);
  return updated;
};

/* ── Controllers ─────────────────────────────────────────────── */

const listAssets = (req, res) => {
  let assets = checkExpirations();
  const { categoria } = req.query;
  if (categoria) assets = assets.filter(a => a.categoria === categoria);
  return res.status(200).json({ success: true, data: assets });
};

const createAsset = (req, res) => {
  const { nombre, descripcion, categoria, estado, responsable, ubicacion,
          hardware_asociado_id, stock, fechaVencimiento } = req.body;

  if (!nombre || !categoria || !estado) {
    return res.status(400).json({ success: false, message: 'Nombre, categoría y estado son requeridos.' });
  }
  if (!CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ success: false, message: 'Categoría inválida.' });
  }
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ success: false, message: 'Estado inválido.' });
  }

  const assets   = AssetRepository.findAll();
  const newAsset = applyExpirationCheck({
    id:                  `ast-${uuidv4().split('-')[0]}`,
    codigo:              generateCodigo(categoria, assets),
    nombre:              nombre.trim(),
    descripcion:         (descripcion || '').trim(),
    categoria,
    estado,
    responsable:         (responsable || '').trim(),
    ubicacion:           (ubicacion || '').trim(),
    fechaRegistro:       new Date().toISOString(),
    fechaBaja:           estado === 'Deshabilitado' ? new Date().toISOString() : null,
    fechaVencimiento:    categoria === 'Software' && fechaVencimiento
                           ? new Date(fechaVencimiento).toISOString()
                           : null,
    hardware_asociado_id: categoria === 'Software' ? (hardware_asociado_id || null) : null,
    stock:               categoria === 'Consumible' ? (Number(stock) || 0) : null
  });

  assets.push(newAsset);
  AssetRepository.save(assets);
  return res.status(201).json({ success: true, data: newAsset });
};

const updateAsset = (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, categoria, estado, responsable, ubicacion,
          hardware_asociado_id, stock, fechaVencimiento } = req.body;

  const assets = AssetRepository.findAll();
  const idx    = assets.findIndex(a => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Activo no encontrado.' });
  }

  if (categoria && !CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ success: false, message: 'Categoría inválida.' });
  }
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ success: false, message: 'Estado inválido.' });
  }

  const current  = assets[idx];
  const catFinal = categoria || current.categoria;

  const merged = {
    ...current,
    nombre:              nombre      !== undefined ? nombre.trim()       : current.nombre,
    descripcion:         descripcion !== undefined ? descripcion.trim()  : current.descripcion,
    categoria:           catFinal,
    estado:              estado      || current.estado,
    responsable:         responsable !== undefined ? responsable.trim()  : current.responsable,
    ubicacion:           ubicacion   !== undefined ? ubicacion.trim()    : current.ubicacion,
    fechaVencimiento:    catFinal === 'Software'
                           ? (fechaVencimiento !== undefined
                               ? (fechaVencimiento ? new Date(fechaVencimiento).toISOString() : null)
                               : current.fechaVencimiento)
                           : null,
    hardware_asociado_id: catFinal === 'Software'
                           ? (hardware_asociado_id ?? current.hardware_asociado_id ?? null)
                           : null,
    stock:               catFinal === 'Consumible'
                           ? (stock !== undefined ? Number(stock) : current.stock)
                           : null,
    fechaBaja:           estado === 'Deshabilitado' && !current.fechaBaja
                           ? new Date().toISOString()
                           : current.fechaBaja
  };

  assets[idx] = applyExpirationCheck(merged);
  AssetRepository.save(assets);
  return res.status(200).json({ success: true, data: assets[idx] });
};

const deactivateAsset = (req, res) => {
  const { id } = req.params;
  const assets  = AssetRepository.findAll();
  const idx     = assets.findIndex(a => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Activo no encontrado.' });
  }

  assets[idx] = { ...assets[idx], estado: 'Deshabilitado', fechaBaja: new Date().toISOString() };
  AssetRepository.save(assets);
  return res.status(200).json({ success: true, data: assets[idx] });
};

module.exports = { listAssets, createAsset, updateAsset, deactivateAsset };
