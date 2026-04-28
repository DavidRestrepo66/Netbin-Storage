const { v4: uuidv4 }   = require('uuid');
const UserRepository   = require('../repositories/userRepository');
const RoleRepository   = require('../repositories/roleRepository');

const strip = ({ password, ...u }) => u;

const listUsers = (req, res) => {
  const users = UserRepository.findAll().map(strip);
  return res.status(200).json({ success: true, data: users });
};

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
    id:           `usr-${uuidv4().split('-')[0]}`,
    username:     username.trim(),
    password,
    nombre:       nombre.trim(),
    email:        email.trim(),
    rol:          role.nombre,
    rol_id,
    activo:       true,
    fechaRegistro: new Date().toISOString(),
    fechaBaja:    null
  };

  users.push(newUser);
  UserRepository.save(users);
  return res.status(201).json({ success: true, data: strip(newUser) });
};

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

const disableUser = (req, res) => {
  const { id } = req.params;

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
