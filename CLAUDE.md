# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # instalar dependencias
npm start         # producción: node server.js
npm run dev       # desarrollo: nodemon server.js (hot-reload)
```

El servidor escucha en `http://localhost:3000`. No hay suite de tests configurada en esta etapa.

## Restricciones inamovibles del proyecto

- **Persistencia**: no usar bases de datos. Todos los datos se almacenan como archivos `.json` dentro de `data/`. Seguir el patrón de `repositories/userRepository.js` (leer con `fs.readFileSync`, escribir con `fs.writeFileSync`).
- **Frontend**: SPA con JavaScript Vanilla puro. No introducir React, Vue ni ningún framework JS. Los únicos externos permitidos son Boxicons (iconos CSS, vía CDN) y `uuid` (backend).
- **Paleta de colores**: usar exclusivamente las variables CSS ya definidas en `frontend/css/styles.css`:
  - `--color-primary` → `#007b99` (azul petróleo)
  - `--color-accent` → `#f39200` (naranja)
  - `--color-gray` → `#848585` (gris)

## Arquitectura

### Backend (Node.js + Express)

Sigue una separación en capas estricta:

```
server.js → routes/ → controllers/ → repositories/ → data/*.json
                  ↘ middleware/
```

- `server.js`: solo monta middlewares globales, sirve el `frontend/` como estático, registra `authRoutes` bajo `/api/auth` y tiene un catch-all `GET *` que devuelve `login.html`.
- `routes/authRoutes.js`: define los dos únicos endpoints actuales. `POST /login` es público; `POST /logout` pasa primero por `authMiddleware.protect`.
- `controllers/authController.js`: mantiene las sesiones activas en un `Map` en memoria (`activeSessions`). Al reiniciar el servidor todas las sesiones se pierden. Exporta `verifyToken` para que el middleware pueda usarlo sin acoplarse al `Map` directamente.
- `middleware/authMiddleware.js`: extrae el Bearer token del header `Authorization` y llama a `verifyToken`. Si es válido adjunta `req.user` y llama `next()`.
- `repositories/`: única capa que toca `data/*.json`. Los controladores nunca leen archivos directamente.

### Frontend (SPA Vanilla)

Dos páginas HTML con una separación clara de responsabilidades por script:

| Script | Responsabilidad |
|---|---|
| `authGuard.js` | Se carga **primero** en `index.html`. Si no hay `nb_token` en localStorage redirige y lanza un `throw` para detener el resto de scripts. Si hay sesión, inyecta `window.NB_SESSION = { token, user, logout }`. |
| `login.js` | Maneja el formulario de login: `POST /api/auth/login`, guarda `nb_token` y `nb_user` en localStorage, redirige a `index.html`. Si ya hay token, va directo al dashboard. |
| `dashboard.js` | Consume `window.NB_SESSION` (inyectado por authGuard). Gestiona la navegación entre secciones con `navigateTo(sectionId)`, el reloj y las tablas. |

La navegación entre secciones es puramente de DOM: `navigateTo()` añade/quita la clase `hidden` sobre los `<section id="section-*">` sin recargar la página.

### Flujo de autenticación de extremo a extremo

```
1. GET /index.html → authGuard.js detecta sin token → redirige a login.html
2. Formulario → POST /api/auth/login → authController crea UUID, lo guarda en activeSessions
3. login.js guarda nb_token + nb_user en localStorage → redirige a index.html
4. authGuard.js detecta token → expone window.NB_SESSION → dashboard.js se inicializa
5. Logout: window.NB_SESSION.logout() → POST /api/auth/logout (Bearer token) → authMiddleware valida → activeSessions.delete → localStorage limpio → login.html
```

### Añadir un nuevo módulo (patrón a seguir)

1. Crear `data/nombreModulo.json` con la estructura de datos.
2. Crear `repositories/nombreModuloRepository.js` con funciones `findAll` / `save`.
3. Crear `controllers/nombreModuloController.js` que use el repositorio.
4. Añadir rutas en `routes/` y montarlas en `server.js` bajo `/api/nombreModulo`.
5. En el frontend, agregar la `<section id="section-nombreModulo">` en `index.html` y su lógica en un JS independiente que consuma `window.NB_SESSION.token` para las llamadas `fetch`.

## Credenciales de prueba

Definidas en `data/users.json` (contraseñas en texto plano, intencionalmente para esta etapa):

- `admin` / `admin123`
- `monitor` / `monitor123`
