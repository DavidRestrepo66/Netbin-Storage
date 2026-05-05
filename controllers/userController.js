/**
 * userController.js
 * Responsabilidad: gestionar el CRUD de usuarios del sistema.
 *
 * La contraseña nunca se devuelve en las respuestas HTTP; la función `strip`
 * la elimina del objeto antes de enviarlo al cliente.
 */

const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/userRepository');
const RoleRepository = require('../repositories/roleRepository');

/**
 * Elimina el campo `password` de un objeto usuario antes de exponerlo.
 * Se aplica a todas las respuestas para no filtrar credenciales.
 *
 * @param {{ password: string, [key: string]: any }} user
 * @returns {Object} Usuario sin campo `password`.
 */
const strip = ({ password, ...u }) => u;

/**
 * GET /api/usuarios
 * Lista todos los usuarios sin exponer sus contraseñas.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {200} Array de usuarios (sin campo password).
 */
const listUsers = (req, res) => {
  const users = UserRepository.findAll().map(strip);
  return res.status(200).json({ success: true, data: users });
};

/**
 * POST /api/usuarios
 * Crea un nuevo usuario y lo asocia a un rol existente.
 * Valida que el username no esté ya en uso.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @body {{ username: string, nombre: string, email: string, password: string, rol_id: string }}
 * @returns {201} El usuario creado (sin password).
 * @returns {400} Si faltan campos obligatorios.
 * @returns {404} Si el rol no existe.
 * @returns {409} Si el username ya está en uso.
 */
const createUser = (req, res) => {
  const { username, nombre, email, password, rol_id } = req.body;

  if (!username || !nombre || !email || !password || !rol_id) {
    return res.status(400).json({
      success: false,
      message: 'Username, nombre, email, contraseña y rol son requeridos.'
    });
  }

  const users = UserRepository.findAll();
  if (users.some(u => u.username === username.trim())) {
    return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese username.' });
  }

  const role = RoleRepository.findById(rol_id);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
  }

  const newUser = {
    id:            `usr-${uuidv4().split('-')[0]}`,
    username:      username.trim(),
    password,                          // texto plano en esta etapa de desarrollo
    nombre:        nombre.trim(),
    email:         email.trim(),
    rol:           role.nombre,        // desnormalizado para lectura rápida
    rol_id,
    activo:        true,
    fechaRegistro: new Date().toISOString(),
    fechaBaja:     null
  };

  users.push(newUser);
  UserRepository.save(users);
  return res.status(201).json({ success: true, data: strip(newUser) });
};

/**
 * PUT /api/usuarios/:id
 * Actualiza nombre, email y/o rol de un usuario.
 * Campos omitidos en el body conservan su valor actual.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.id - ID del usuario a actualizar.
 * @body {{ nombre?: string, email?: string, rol_id?: string }}
 * @returns {200} El usuario actualizado (sin password).
 * @returns {404} Si el usuario o el rol no existen.
 */
const updateUser = (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol_id } = req.body;

  const users = UserRepository.findAll();
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
  }

  const current = users[idx];
  let rolFinal  = { nombre: current.rol, id: current.rol_id };

  if (rol_id) {
    const role = RoleRepository.findById(rol_id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }
    rolFinal = { nombre: role.nombre, id: rol_id };
  }

  users[idx] = {
    ...current,
    nombre: nombre !== undefined ? nombre.trim() : current.nombre,
    email:  email  !== undefined ? email.trim()  : current.email,
    rol:    rolFinal.nombre,
    rol_id: rolFinal.id
  };

  UserRepository.save(users);
  return res.status(200).json({ success: true, data: strip(users[idx]) });
};

/**
 * PATCH /api/usuarios/:id/deshabilitar
 * Deshabilita una cuenta de usuario (baja lógica: `activo = false`).
 * Un usuario no puede deshabilitar su propia cuenta.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} req.params.id - ID del usuario a deshabilitar.
 * @returns {200} El usuario deshabilitado (sin password).
 * @returns {403} Si el usuario intenta deshabilitar su propia cuenta.
 * @returns {404} Si el usuario no existe.
 */
const disableUser = (req, res) => {
  const { id } = req.params;

  // Evita que un usuario se deje sin acceso a sí mismo por error
  if (req.user.userId === id) {
    return res.status(403).json({ success: false, message: 'No puedes deshabilitar tu propia cuenta.' });
  }

  const users = UserRepository.findAll();
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
  }

  users[idx] = { ...users[idx], activo: false, fechaBaja: new Date().toISOString() };
  UserRepository.save(users);
  return res.status(200).json({ success: true, data: strip(users[idx]) });
};

module.exports = { listUsers, createUser, updateUser, disableUser };
