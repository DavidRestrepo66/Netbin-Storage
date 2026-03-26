# Netbin Storage (Primera entrega)

Netbin Storage es un sistema de inventario para el laboratorio de Redes y Telecomunicaciones.
Esta es una **primera entrega** enfocada en cumplir funcionalidad basica y una arquitectura clara para continuar mejorando.

## Tecnologias

- Backend: Node.js + Express
- Frontend: HTML5, CSS3 y JavaScript Vanilla
- Persistencia: Archivo JSON simulado (`data/users.json`)

## Estructura del proyecto

- `server.js`: punto de entrada del servidor (API + recursos estaticos)
- `routes/`: rutas REST de autenticacion
- `controllers/`: controladores (login/logout/token validation)
- `middleware/`: `AuthGuard` en backend (`protect`) para proteger endpoints privados
- `repositories/`: acceso a datos (lectura de `users.json`)
- `data/`: datos de prueba (ej. usuarios)
- `frontend/`: SPA
- `frontend/login.html`: pantalla de login
- `frontend/index.html`: dashboard principal
- `frontend/css/styles.css`: estilos (paleta definida por el prompt)
- `frontend/js/authGuard.js`: proteccion de rutas en frontend mediante `localStorage`
- `frontend/js/login.js`: flujo de login con `fetch`
- `frontend/js/dashboard.js`: interaccion del dashboard (navegacion por secciones y tabla inicial)

## Funcionalidad implementada

### 1. Login (backend)

- Endpoint: `POST /api/auth/login`
- Valida credenciales contra `data/users.json` (users simulados).
- Si es exitoso: retorna un `token` de sesion.
- Si es exitoso: retorna los datos del usuario (para mostrar en el dashboard).

### 2. Token y Logout

- En el frontend se guarda `nb_token` en `localStorage`.
- En el frontend se guarda `nb_user` en `localStorage` (JSON).
- Logout: endpoint `POST /api/auth/logout`.
- Logout: el frontend envia `Authorization: Bearer <token>`.
- Logout: el backend invalida el token y el frontend limpia `localStorage`.

### 3. Proteccion de rutas (frontend AuthGuard)

- Archivo: `frontend/js/authGuard.js`
- Si no existe `nb_token` en `localStorage`, redirige a `login.html`.
- Si existe, inyecta `window.NB_SESSION` (token + usuario) para que el resto de scripts lo usen.

### 4. Dashboard (frontend)

- Archivo: `frontend/index.html`
- Muestra cards/opciones para acceder a `Usuarios`, `Revison de Activos`, `Reportes` y `Roles`.
- Incluye barra superior con hora, rol y nombre de usuario.
- Incluye boton de salida (logout) en la parte superior.
- Secciones “Activos/Reportes/Usuarios/Roles” existen como placeholders en esta entrega inicial.

### 5. Ajuste de UI solicitado

- Logo de la empresa incluido en `frontend/assets/netbin-logo.png` y usado en `login.html` y el dashboard.
- En la tabla de activos se elimino la columna **Ubicacion** (ya no se maneja en la aplicacion).

## Paleta de colores

Los estilos del proyecto usan la paleta indicada en el prompt:

- Azul Petroleo: `#007b99`
- Naranja: `#f39200`
- Gris: `#848585`

## Como ejecutar el proyecto

1. Instalar dependencias: `npm install`
2. Levantar el servidor: `npm start`
3. Abrir en el navegador: `http://localhost:3000/login.html`
4. Entrar al dashboard: `http://localhost:3000/index.html` o `http://localhost:3000/` (redirige al login si no hay sesion)

## Usuario de prueba

El archivo `data/users.json` incluye usuarios de ejemplo.
Ejemplo (segun el JSON actual):

- `admin` / `admin123`
- `monitor` / `monitor123`

## Endpoints API (resumen)

- `POST /api/auth/login`
- `POST /api/auth/logout` (requiere `Authorization: Bearer <token>`)

## Nota de alcance (para la siguente mejora)

Esta entrega esta pensada como base. Proximas mejoras tipicas:

- Persistencia real (BD) en lugar de JSON plano
- Manejo mas robusto de tokens/sesiones (ej. JWT firmado + expiracion real)
- Hash de contrasenas (bcrypt/argon2)
- Render dinamico real de modulos (activos/reportes/usuarios/roles) con endpoints correspondientes
- Tests basicos (unitarios e integracion)

