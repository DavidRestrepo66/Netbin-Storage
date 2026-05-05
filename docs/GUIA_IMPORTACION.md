# Guía de Importación Masiva — Netbin Storage

Esta guía explica paso a paso cómo preparar y subir los archivos Excel del laboratorio para importar inventario a Netbin Storage.

---

## ¿Qué tipos de archivo se aceptan?

| Formato | Extensión |
|---|---|
| Excel moderno | `.xlsx` |
| Excel legacy | `.xls` |
| Texto separado por comas | `.csv` |

**Tamaño máximo:** 10 MB por archivo.

---

## Paso 1 — Seleccionar el tipo de inventario

Antes de subir el archivo, el sistema necesita saber qué tipo de inventario contiene. Los tipos disponibles son:

| Tipo en el sistema | Descripción | Cabecera distintiva buscada |
|---|---|---|
| `hardware` | PCs, servidores, switches, routers, etc. | columna `id_hw` |
| `software` | Licencias y aplicaciones instaladas | columna `id_sw` |
| `tools` | Herramientas del laboratorio | columna `id_tool` |
| `cmdb` | Base de datos de configuración (CMDB) | columna `equipo` |

> **Consumibles** no tienen plantilla de importación Excel. Para registrarlos use el botón **"Nuevo Activo"** en la sección Activos.

---

## Paso 2 — Formato esperado del archivo

Los archivos institucionales de la universidad tienen **varias filas de encabezado** antes de los datos (logo, nombre de la institución, título del documento, fecha, etc.). El sistema las salta automáticamente.

### ¿Cómo lo hace el sistema?

El importador lee el archivo en modo `array-of-arrays` y escanea las primeras **20 filas** buscando la columna que identifica el tipo seleccionado (ej. `id_hw`). Todas las filas anteriores a esa fila se descartan.

### Columnas esperadas por tipo

#### Hardware (`id_hw`)

| Columna en el Excel | Campo guardado en JSON |
|---|---|
| `id_hw` | `id_hw` |
| `Categoria` | `categoria` |
| `Marca` | `marca` |
| `Modelo` | `modelo` |
| `# de Serie` | `numero_serie` |
| `Procesador` | `procesador` |
| `Memoria RAM` | `memoria_ram` |
| `Almacenamiento` | `almacenamiento` |
| `Sistema Operativo` | `sistema_operativo` |
| `Estado` | `estado` |
| `Ubicacion` | `ubicacion` |
| `Fecha Adquisicion` | `fecha_adquisicion` |
| `Proveedor` | `proveedor` |
| `Garantia` | `garantia` |
| `Observaciones` | `observaciones` |

#### Software (`id_sw`)

| Columna en el Excel | Campo guardado en JSON |
|---|---|
| `id_sw` | `id_sw` |
| `Nombre SW` | `nombre_sw` |
| `Categoria` | `categoria` |
| `Version` | `version` |
| `Tipo de Licencia` | `tipo_licencia` |
| `# Licencias` | `numero_licencias` |
| `Licencias en Uso` | `licencias_en_uso` |
| `Clave de Producto` | `clave_producto` |
| `Fecha Compra` | `fecha_compra` |
| `Fecha Vencimiento` | `fecha_vencimiento` |
| `Proveedor` | `proveedor` |
| `Instalado En` | `instalado_en` |
| `Estado` | `estado` |
| `Observaciones` | `observaciones` |

#### Herramientas (`id_tool`)

| Columna en el Excel | Campo guardado en JSON |
|---|---|
| `id_tool` | `id_tool` |
| `Nombre` | `nombre` |
| `Categoria` | `categoria` |
| `Marca` | `marca` |
| `Modelo` | `modelo` |
| `# de Serie` | `numero_serie` |
| `Cantidad Total` | `cantidad_total` |
| `Unidad de Medida` | `unidad_medida` |
| `Estado` | `estado` |
| `Ubicacion` | `ubicacion` |
| `Fecha Adquisicion` | `fecha_adquisicion` |
| `Proveedor` | `proveedor` |
| `Observaciones` | `observaciones` |

#### CMDB (`equipo`)

| Columna en el Excel | Campo guardado en JSON |
|---|---|
| `Equipo` | `equipo` |
| `Modelo` | `modelo` |
| `Rol` | `rol` |
| `Serial` | `serial` |

> **Nota sobre nombres de columna:** el sistema normaliza las cabeceras antes de compararlas (elimina acentos, convierte a minúsculas, ignora espacios extra), así que `Categoría`, `CATEGORIA` y `categoria` se tratan igual.

---

## Paso 3 — Subir el archivo

1. En el panel lateral izquierdo, haga clic en **Importación**.
2. Seleccione el **Tipo de inventario** en el desplegable.
3. Haga clic en **"Seleccionar archivo"** y elija el Excel o CSV.
4. Haga clic en **"Importar archivo"**.
5. El sistema mostrará un mensaje de confirmación indicando cuántos registros se importaron y cuántos hay en total.

---

## Comportamiento de la importación

- **Acumulativo (append):** cada importación agrega los nuevos registros al final del JSON existente. Los registros anteriores no se borran.
- **UUID interno:** a cada registro importado se le asigna un `id` único (UUID) de forma automática, además del `id_hw`/`id_sw`/etc. que traiga el archivo.
- **Origen:** los registros importados quedan marcados con `"origen": "importacion"` para distinguirlos de los registros ingresados manualmente (que tienen `"origen": "manual"`).

---

## Errores comunes y soluciones

| Error | Causa probable | Solución |
|---|---|---|
| *"No se encontró la fila de encabezados"* | El archivo no tiene la columna distintiva (`id_hw`, `id_sw`, etc.) en las primeras 20 filas, o el tipo seleccionado no coincide con el contenido. | Verifique que el tipo seleccionado corresponda al archivo. Abra el Excel y confirme que la fila de cabeceras existe y que el nombre de la columna es correcto. |
| *"El archivo no contiene filas de datos"* | La fila de encabezados se encontró pero no hay datos debajo de ella (el archivo puede estar vacío o tener solo filas en blanco). | Verifique que el archivo tenga al menos una fila de datos después de los encabezados. |
| *"Solo se aceptan archivos .csv, .xlsx o .xls"* | Se intentó subir un archivo en otro formato (PDF, ODT, etc.). | Exporte el archivo desde Excel o LibreOffice en formato `.xlsx` o `.csv`. |
| *"El archivo supera el tamaño máximo de 10 MB"* | El archivo es demasiado grande. | Divida el archivo en partes más pequeñas e impórtelas por separado. |
| Los registros importados no aparecen en la tabla de Activos | La importación fue exitosa pero se quedó en el JSON. | Recargue la sección Activos usando el menú lateral. |

---

## Verificar lo importado

Después de importar, diríjase a la sección **Activos**, filtre por la categoría correspondiente y verifique que los registros aparecen en la tabla. Puede hacer clic en el botón <i class="bx bx-show"></i> de cualquier fila para ver el detalle completo del registro, incluyendo la **fecha de importación** y el **origen** (importación Excel vs. registro manual).

---

## Ejemplo de estructura de un archivo de Hardware válido

```
Fila 1: Universidad Católica Luis Amigó
Fila 2: Laboratorio de Redes y Telecomunicaciones
Fila 3: Inventario de Hardware - 2026
Fila 4: (vacía)
Fila 5: id_hw | Categoria | Marca | Modelo | # de Serie | Procesador | ...
Fila 6: HW-001 | Servidor Rack | HP | ProLiant DL160 | 2M2614056R | Xeon E5 | ...
Fila 7: HW-002 | PC | Dell | Pro Micro OCM2SS | D784SF4 | Ryzen 7 | ...
...
```

El sistema detecta la fila 5 como cabecera y procesa desde la fila 6 en adelante. Las filas 1 a 4 se descartan automáticamente.
