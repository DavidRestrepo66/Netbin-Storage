const { v4: uuidv4 }   = require('uuid');
const RoleRepository   = require('../repositories/roleRepository');

const PERMISOS_KEYS = ['acceso_activos', 'acceso_reportes', 'acceso_usuarios', 'acceso_roles'];

const buildPermisos = (permisos = {}) =>
  PERMISOS_KEYS.reduce((acc, key) => { acc[key] = permisos[key] === true; return acc; }, {});

const listRoles = (req, res) => {
  return res.status(200).json({ success: true, data: RoleRepository.findAll() });
};

const createRole = (req, res) => {
  const { nombre, descripcion, permisos } = req.body;

  if (!nombre) {
    return res.status(400).json({ success: false, message: 'El nombre del rol es requerido.' });
  }

  const roles = RoleRepository.findAll();
  if (roles.some(r => r.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
    return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre.' });
  }

  const newRole = {
    id:          `rol-${uuidv4().split('-')[0]}`,
    nombre:      nombre.trim(),
    descripcion: (descripcion || '').trim(),
    permisos:    buildPermisos(permisos)
  };

  roles.push(newRole);
  RoleRepository.save(roles);
  return res.status(201).json({ success: true, data: newRole });
};

const updateRole = (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, permisos } = req.body;

  const roles = RoleRepository.findAll();
  const idx   = roles.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
  }

  if (nombre && roles.some(r => r.id !== id && r.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
    return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre.' });
  }

  const current = roles[idx];
  roles[idx] = {
    ...current,
    nombre:      nombre      ? nombre.trim()      : current.nombre,
    descripcion: descripcion !== undefined ? descripcion.trim() : current.descripcion,
    permisos:    permisos !== undefined ? buildPermisos(permisos) : current.permisos
  };

  RoleRepository.save(roles);
  return res.status(200).json({ success: true, data: roles[idx] });
};

module.exports = { listRoles, createRole, updateRole };
