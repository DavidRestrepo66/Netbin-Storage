/**
 * roleController.js
 * Responsabilidad: gestionar el CRUD de roles del sistema.
 *
 * Cada rol tiene un conjunto de permisos booleanos que determinan
 * a qué secciones del dashboard puede acceder el usuario que lo tenga.
 * Los permisos válidos son los definidos en PERMISOS_KEYS.
 */

const { v4: uuidv4 } = require('uuid');
const RoleRepository = require('../repositories/roleRepository');

/** Claves de permiso reconocidas por el sistema. */
const PERMISOS_KEYS = ['acceso_activos', 'acceso_reportes', 'acceso_usuarios', 'acceso_roles'];

/**
 * Construye el objeto `permisos` normalizando a booleanos estrictos.
 * Cualquier clave no incluida en PERMISOS_KEYS se descarta.
 *
 * @param {Object} [permisos={}] - Permisos enviados desde el cliente.
 * @returns {Object} Objeto con exactamente las 4 claves de permiso en boolean.
 */
const buildPermisos = (permisos = {}) =>
  PERMISOS_KEYS.reduce((acc, key) => { acc[key] = permisos[key] === true; return acc; }, {});

/**
 * GET /api/roles
 * Lista todos los roles almacenados en data/roles.json.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {200} Array de roles.
 */
const listRoles = (req, res) => {
  return res.status(200).json({ success: true, data: RoleRepository.findAll() });
};

/**
 * POST /api/roles
 * Crea un nuevo rol. El nombre debe ser único (comparación case-insensitive).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @body {{ nombre: string, descripcion?: string, permisos?: Object }} req.body
 * @returns {201} El rol creado.
 * @returns {400} Si falta el nombre.
 * @returns {409} Si ya existe un rol con ese nombre.
 */
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

/**
 * PUT /api/roles/:id
 * Actualiza nombre, descripción y/o permisos de un rol existente.
 * Si `permisos` no viene en el body, se conservan los permisos actuales.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.id - ID del rol a actualizar.
 * @body {{ nombre?: string, descripcion?: string, permisos?: Object }} req.body
 * @returns {200} El rol actualizado.
 * @returns {404} Si el rol no existe.
 * @returns {409} Si el nuevo nombre ya lo usa otro rol.
 */
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
