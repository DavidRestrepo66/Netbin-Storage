# Netbin Storage

Sistema de inventario para el **Laboratorio de Redes y Telecomunicaciones** — Universidad Católica Luis Amigó.
Permite registrar, importar masivamente y consultar los activos del laboratorio (hardware, software, herramientas, consumibles y CMDB), con autenticación por sesión, gestión de usuarios/roles y generación de reportes.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Node.js 18+ + Express 4 |
| Frontend | HTML5, CSS3, JavaScript Vanilla (sin frameworks) |
| Persistencia | Archivos `.json` en `data/` (lectura/escritura con `fs` nativo) |
| Íconos | Boxicons 2.1.4 (CDN) |
| Generación de IDs | `uuid` v4 |
| Lectura de Excel/CSV | `xlsx` (SheetJS) |
| Subida de archivos | `multer` (memoria RAM, sin disco) |

---

## Cómo ejecutar

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo con hot-reload (nodemon)
npm start          # producción (node server.js)
```

El servidor escucha en `http://localhost:3000`.  
La aplicación redirige automáticamente a `login.html` si no hay sesión activa.

### Credenciales de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `monitor` | `monitor123` | Monitor |

---

## Estructura del proyecto

```
Netbin-Storage/
│
├── server.js                    # Punto de entrada: monta middlewares y rutas
│
├── controllers/
│   ├── authController.js        # Login, logout, verificación de tokens (Map en memoria)
│   ├── importController.js      # Importación masiva desde .xlsx / .csv con SheetJS
│   ├── inventoryController.js   # CRUD por tipo de inventario (hardware/software/tools/consumable/cmdb)
│   ├── reportController.js      # Generación de reportes sobre el inventario unificado
│   ├── roleController.js        # CRUD de roles con permisos de acceso
│   └── userController.js        # CRUD de usuarios + deshabilitación
│
├── middleware/
│   └── authMiddleware.js        # Extrae y valida el Bearer token en rutas protegidas
│
├── repositories/
│   ├── cmdbRepository.js        # Lee/escribe data/cmdb.json
│   ├── consumableRepository.js  # Lee/escribe data/consumables.json
│   ├── hardwareRepository.js    # Lee/escribe data/hardware.json
│   ├── reportRepository.js      # Lee/escribe data/reports.json (definiciones)
│   ├── roleRepository.js        # Lee/escribe data/roles.json
│   ├── softwareRepository.js    # Lee/escribe data/software.json
│   ├── toolRepository.js        # Lee/escribe data/tools.json
│   └── userRepository.js        # Lee/escribe data/users.json
│
├── routes/
│   ├── authRoutes.js            # POST /api/auth/login|logout
│   ├── importRoutes.js          # POST /api/import (multer + XLSX)
│   ├── inventoryRoutes.js       # GET/POST /api/inventory/:tipo
│   ├── reportRoutes.js          # GET/POST/DELETE /api/reports
│   ├── roleRoutes.js            # GET/POST/PUT /api/roles
│   └── userRoutes.js            # GET/POST/PUT/PATCH /api/usuarios
│
├── data/                        # Base de datos en archivos JSON (persistencia)
│   ├── cmdb.json                # Registros CMDB (equipo, modelo, rol, serial)
│   ├── consumables.json         # Consumibles (cables, tornillos, etc.)
│   ├── hardware.json            # Hardware de red y cómputo
│   ├── reports.json             # Definiciones de reportes disponibles
│   ├── roles.json               # Roles del sistema con permisos
│   ├── software.json            # Licencias y software instalado
│   ├── tools.json               # Herramientas del laboratorio
│   └── users.json               # Usuarios del sistema
│
├── frontend/
│   ├── index.html               # SPA principal (dashboard, activos, reportes, usuarios, roles, importación)
│   ├── login.html               # Pantalla de autenticación
│   ├── css/
│   │   └── styles.css           # Estilos globales (paleta definida, componentes, modales)
│   └── js/
│       ├── authGuard.js         # Protección de rutas: redirige si no hay sesión
│       ├── login.js             # Flujo de login con fetch
│       ├── dashboard.js         # Navegación entre secciones y reloj topbar
│       ├── assets.js            # Módulo de Activos: tabla unificada + modal Nuevo Activo
│       ├── import.js            # Módulo de Importación masiva (xlsx/csv)
│       ├── reports.js           # Módulo de Reportes
│       ├── roles.js             # Módulo de Roles
│       └── usuarios.js          # Módulo de Usuarios
│
└── docs/
    └── GUIA_IMPORTACION.md      # Guía paso a paso para importar archivos Excel
```

---

## Paleta de colores

Los estilos usan exclusivamente las variables CSS definidas en `styles.css`:

| Variable | Valor | Uso |
|---|---|---|
| `--color-primary` | `#007b99` | Azul petróleo — acción principal, sidebar activo, botones primarios |
| `--color-accent` | `#f39200` | Naranja — tarjetas accent, hover secundario |
| `--color-gray` | `#848585` | Gris — textos secundarios, hints |

---

## Funcionalidades implementadas

### 1. Autenticación por sesión

- `POST /api/auth/login` — valida credenciales contra `data/users.json` y genera un UUID de sesión almacenado en un `Map` en memoria.
- `POST /api/auth/logout` — elimina la sesión del `Map` e instruye al frontend a limpiar `localStorage`.
- El frontend guarda `nb_token` y `nb_user` en `localStorage`. `authGuard.js` redirige a `login.html` si falta el token, e inyecta `window.NB_SESSION` para el resto de scripts.

### 2. Gestión de Usuarios

- Listar, crear, editar y deshabilitar usuarios.
- Al crear un usuario se asocia a un rol existente.
- El campo `password` nunca se expone en las respuestas (función `strip`).
- Un usuario no puede deshabilitar su propia cuenta.

### 3. Gestión de Roles

- Listar, crear y editar roles.
- Cada rol tiene 4 permisos booleanos: `acceso_activos`, `acceso_reportes`, `acceso_usuarios`, `acceso_roles`.
- Los nombres de rol son únicos (validación case-insensitive).

### 4. Módulo de Activos (inventario unificado)

El módulo gestiona **5 categorías** de activos, cada una con su propio archivo JSON y sus campos específicos:

| Categoría | Archivo | ID autogenerado | Campos clave |
|---|---|---|---|
| Hardware | `hardware.json` | `HW-001`, `HW-002`… | `marca`, `modelo`, `numero_serie`, `procesador`, `memoria_ram`… |
| Software | `software.json` | `SW-001`, `SW-002`… | `nombre_sw`, `tipo_licencia`, `numero_licencias`, `fecha_vencimiento`… |
| Herramienta | `tools.json` | `TL-001`, `TL-002`… | `nombre`, `cantidad_total`, `unidad_medida`… |
| Consumible | `consumables.json` | `CN-001`, `CN-002`… | `nombre`, `cantidad_total`, `stock_minimo`… |
| CMDB | `cmdb.json` | (usa `serial`) | `equipo`, `modelo`, `rol`, `serial` |

El botón **"Nuevo Activo"** abre un modal dinámico: el usuario elige la categoría y el formulario cambia para mostrar los campos exactos de esa categoría. Si el campo de ID se deja vacío, el sistema lo autogenera.

La **tabla de Activos** fusiona los 5 inventarios y permite:
- Filtrar por categoría (Hardware / Software / Herramienta / Consumible / CMDB).
- Buscar por texto libre sobre ID, nombre, ubicación y estado.
- Ver el **detalle completo** de cada registro con el botón <i class="bx bx-show"></i> (todos los campos, con etiquetas legibles y marca de "Sin datos" para campos vacíos).

### 5. Importación masiva desde Excel/CSV

Permite cargar archivos `.xlsx`, `.xls` o `.csv` con datos institucionales. El sistema:

1. Recibe el archivo en memoria con `multer` (sin escribir en disco).
2. Parsea la hoja con `SheetJS` en modo array-of-arrays.
3. **Ignora automáticamente las primeras filas institucionales** (logos, títulos, subtítulos) buscando la primera fila que contenga la cabecera distintiva de cada tipo (ej. `id_hw` para hardware).
4. Mapea las columnas del Excel a los campos JSON usando un esquema de normalización tolerante a mayúsculas y acentos.
5. **Hace append** al JSON existente (no reemplaza), asignando un UUID interno a cada registro importado.

Los nombres de campo generados por el import son **idénticos** a los del registro manual, garantizando que ambos flujos produzcan JSON intercambiable.

Ver detalles en [`docs/GUIA_IMPORTACION.md`](docs/GUIA_IMPORTACION.md).

### 6. Reportes

Seis tipos de reporte predefinidos sobre el inventario unificado:

| Tipo | Descripción |
|---|---|
| `resumen-general` | Totales por categoría y por estado |
| `por-categoria` | Listado detallado agrupado por categoría |
| `por-estado` | Agrupado por estado (Activo, En Reparación…) |
| `proximos-vencer` | Software con fecha de vencimiento en los próximos 3 meses |
| `bajas` | Activos con estado Deshabilitado |
| `por-responsable` | Agrupado por responsable / equipo donde está instalado |

---

## Endpoints API

Todos los endpoints privados requieren el header:
```
Authorization: Bearer <token>
```

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Inicia sesión, retorna `token` + `user` |
| POST | `/api/auth/logout` | Sí | Invalida el token de sesión |

### Inventario (activos)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/inventory/:tipo` | Sí | Lista todos los registros de un tipo |
| POST | `/api/inventory/:tipo` | Sí | Crea un registro manual en un tipo |

`:tipo` acepta: `hardware`, `software`, `tools`, `consumable`, `cmdb`.

### Importación masiva

| Método | Ruta | Auth | Body | Descripción |
|---|---|---|---|---|
| POST | `/api/import` | Sí | `multipart/form-data`: campo `file` (xlsx/csv) + campo `tipo` | Importa registros desde Excel/CSV |

### Reportes

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/reports` | Sí | Lista las definiciones de reportes disponibles |
| POST | `/api/reports` | Sí | Crea una nueva definición de reporte |
| GET | `/api/reports/:id/generate` | Sí | Ejecuta el reporte y retorna los datos calculados |
| DELETE | `/api/reports/:id` | Sí | Elimina una definición de reporte |

### Roles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/roles` | Sí | Lista todos los roles |
| POST | `/api/roles` | Sí | Crea un nuevo rol |
| PUT | `/api/roles/:id` | Sí | Actualiza nombre, descripción o permisos de un rol |

### Usuarios

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | Sí | Lista todos los usuarios (sin campo `password`) |
| POST | `/api/usuarios` | Sí | Crea un nuevo usuario |
| PUT | `/api/usuarios/:id` | Sí | Actualiza nombre, email o rol de un usuario |
| PATCH | `/api/usuarios/:id/deshabilitar` | Sí | Deshabilita una cuenta de usuario |

---

## Arquitectura y flujo de datos

```
server.js
  └─ routes/
       └─ controllers/   ← lógica de negocio
            └─ repositories/  ← único acceso a data/*.json
                  └─ data/*.json  ← "base de datos"
```

**Principios aplicados:**
- **SRP** — cada capa tiene una sola responsabilidad.
- **DIP** — los controladores dependen de los repositorios (abstracción), nunca leen archivos directamente.
- Las sesiones activas se almacenan en un `Map` en memoria en `authController.js`; se pierden al reiniciar el servidor (comportamiento esperado en esta etapa).

---

## Restricciones del proyecto

- **Sin base de datos**: toda la persistencia es en archivos `.json` dentro de `data/`.
- **Sin frameworks JS en el frontend**: JavaScript Vanilla puro. Solo Boxicons (CSS, CDN) y `uuid` (backend).
- **Sin hash de contraseñas**: las contraseñas se almacenan en texto plano (etapa de desarrollo).
- **Sin JWT**: los tokens son UUIDs simples validados contra el `Map` en memoria.

---

## Notas para futuras mejoras

- Migrar persistencia a una base de datos real (PostgreSQL, SQLite).
- Implementar hash de contraseñas con `bcrypt`.
- Reemplazar tokens UUID con JWT firmado y expiración.
- Agregar edición y eliminación de registros del inventario directamente desde la tabla.
- Tests unitarios e integración (Jest + Supertest).
