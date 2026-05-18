# Diagnóstico de Deploy — Hostinger Node.js

Fecha: 2026-05-06  
Repositorio: `https://github.com/rubenregalado/caminante-blanco-sis`  
Ruta en Hostinger: `public_html/.builds/last-source/`

---

## Resumen ejecutivo

Se encontraron **2 bugs de código** y **3 problemas de configuración** que en conjunto impiden que login, base de datos y frontend funcionen en producción. Ninguno de los problemas requiere restructurar el proyecto — son correcciones puntuales.

| # | Severidad | Problema | Archivo |
|---|---|---|---|
| 1 | 🔴 CRÍTICO | Path de `client/dist` incorrecto — el frontend nunca se sirve | `server/src/app.js` |
| 2 | 🔴 CRÍTICO | Las migraciones nunca corren — la DB tiene el schema vacío | `package.json` raíz |
| 3 | 🟠 ALTO | Variables de entorno no llegan al proceso en runtime | Configuración Hostinger |
| 4 | 🟠 ALTO | `prisma` CLI en devDependencies puede no instalarse en build | `server/package.json` |
| 5 | 🟡 MEDIO | `localhost` en DATABASE_URL falla en Hostinger; debe ser `127.0.0.1` | Variable de entorno |

---

## Análisis archivo por archivo

---

### `server/src/index.js`

```js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
```

**Lo que hace:** resuelve el path del `.env` relativo a `__dirname` (`server/src/`).

**¿El path es correcto?** Sí, matemáticamente:
```
server/src/ + ../../ = project-root/
→ project-root/.env  ✓
```

**¿Funciona en Hostinger?** Parcialmente. El archivo `.env` está en `.gitignore` y no existe en el servidor. `dotenv` falla silenciosamente (no lanza error) y no carga nada. Esto es aceptable **siempre que** Hostinger inyecte las variables como `process.env` antes de que arranque el proceso — que es lo que hace hPanel → Node.js cuando configuras las env vars ahí. Sin embargo, el deploy vía GitHub "Node.js Web App" puede no inyectarlas de la misma forma si la app no está registrada en hPanel → Avanzado → Node.js.

**Variables que lee este archivo:**
- `process.env.PORT` — si está indefinido usa `3001`
- `process.env.NODE_ENV` — determina si sirve el frontend estático

**Startup file correcto para Hostinger:** `server/src/index.js` (relativo a la raíz del proyecto).

---

### `server/src/app.js` — 🔴 BUG CRÍTICO

```js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../client/dist/index.html'))
  })
}
```

**El problema:** `'../../../client/dist'` sube **3 niveles** desde `server/src/`, pero solo debería subir **2**.

Resolución real en Hostinger con la ruta `public_html/.builds/last-source/server/src`:

```
Con '../../../' (actual — INCORRECTO):
  public_html/.builds/last-source/server/src
  → ../  = public_html/.builds/last-source/server
  → ../../  = public_html/.builds/last-source
  → ../../../  = public_html/.builds          ← un nivel de más
  Resultado: public_html/.builds/client/dist   ✗ no existe

Con '../../' (correcto):
  → ../  = public_html/.builds/last-source/server
  → ../../  = public_html/.builds/last-source
  Resultado: public_html/.builds/last-source/client/dist  ✓ existe
```

**Consecuencia:** aunque el build de React genera `client/dist` correctamente, Express busca ese directorio en una ruta que no existe → el frontend devuelve 404 en producción.

**Corrección:** cambiar `'../../../client/dist'` → `'../../client/dist'` (en ambas líneas).

---

### `server/src/controllers/auth.controller.js`

```js
const USUARIOS = [
  { usuario: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD, rol: 'admin' },
  { usuario: process.env.COLAB_USER, password: process.env.COLAB_PASSWORD, rol: 'colaborador' },
]
const user = USUARIOS.find(
  u => u.usuario && u.password && u.usuario === usuario && u.password === password
)
```

**Variables requeridas:**
- `ADMIN_USER` — nombre de usuario admin
- `ADMIN_PASSWORD` — contraseña admin
- `COLAB_USER` — nombre usuario colaborador
- `COLAB_PASSWORD` — contraseña colaborador
- `JWT_SECRET` — para firmar el token

**¿Hay condición de seguridad?** Sí: `u.usuario && u.password` previene que un usuario con variable `undefined` haga match con cualquier credencial vacía. Si las env vars no están definidas, simplemente no habrá usuarios válidos y el login devolverá 401 siempre.

**Diagnóstico del problema de login:** si las env vars no llegan al proceso, `ADMIN_USER` es `undefined` y el array de usuarios queda sin entradas válidas → todo login falla con 401 aunque las credenciales sean correctas.

**Los nombres de variables en el código coinciden exactamente con lo que debe configurarse en Hostinger:**

| Variable en código | Variable en Hostinger panel |
|---|---|
| `process.env.ADMIN_USER` | `ADMIN_USER` |
| `process.env.ADMIN_PASSWORD` | `ADMIN_PASSWORD` |
| `process.env.COLAB_USER` | `COLAB_USER` |
| `process.env.COLAB_PASSWORD` | `COLAB_PASSWORD` |
| `process.env.JWT_SECRET` | `JWT_SECRET` |

No hay typos ni discrepancias en el código. El problema es de inyección, no de nombre.

---

### `server/src/middleware/auth.middleware.js`

Sin problemas. Usa `process.env.JWT_SECRET` que debe coincidir con el del login. Si `JWT_SECRET` es `undefined` en runtime, `jwt.verify` lanzará error en cada request autenticado.

---

### `server/src/lib/prisma.js`

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
```

**Momento de lectura de `DATABASE_URL`:** PrismaClient lee `process.env.DATABASE_URL` al instanciarse. Este módulo se carga cuando cualquier ruta hace su primer request — **después** de que dotenv ya corrió en `index.js`. Si `DATABASE_URL` no está definida en ese momento, PrismaClient lanza un error y el servidor crashea.

**No hay hardcodeo** — PrismaClient lee exclusivamente de la variable de entorno, lo cual es correcto.

---

### `server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

**Formato esperado de `DATABASE_URL`:**
```
mysql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_DB
```

**Problema conocido de Hostinger con `localhost`:** MySQL en Hostinger a veces no responde en `localhost` (resuelve como IPv6 `::1`) pero sí en `127.0.0.1`. La variable debe usar `127.0.0.1` explícitamente:

```
DATABASE_URL=mysql://u632233585_usuario:password@127.0.0.1:3306/u632233585_dbname
```

**No hay configuración SSL en el schema** — Hostinger en hosting compartido no requiere SSL para conexiones locales, así que esto está bien.

**Migraciones:** hay 4 archivos de migración en `server/prisma/migrations/`. Ninguno se ejecuta automáticamente. Sin `prisma migrate deploy`, las tablas no existen en la DB nueva y **todos los queries fallarán**.

---

### `server/package.json` — 🟠 PROBLEMA ALTO

```json
{
  "scripts": {
    "start": "node src/index.js",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
```

**Problema:** el CLI de `prisma` (necesario para `prisma generate` y `prisma migrate deploy`) está en `devDependencies`. Si Hostinger tiene `NODE_ENV=production` al momento de ejecutar `npm install` en el server, las devDependencies se omiten y `postinstall` falla.

**En los logs de build actuales `prisma generate` sí funcionó**, lo que indica que Hostinger no tenía `NODE_ENV=production` durante el build. Pero esto podría variar entre deploys.

**Solución:** mover `prisma` de `devDependencies` a `dependencies`.

---

### `package.json` raíz — 🔴 PROBLEMA CRÍTICO (migraciones)

```json
{
  "scripts": {
    "build": "cd server && npm install && cd ../client && npm install --include=dev && npm run build",
    "start": "node server/src/index.js"
  }
}
```

**`build`:** instala deps del server y del cliente, construye React. ✓ Correcto.

**`start`:** solo arranca el servidor. Las migraciones **no se ejecutan en ningún momento del proceso de deploy**.

**Consecuencia:** en una DB nueva (como la que creaste), las tablas no existen. El servidor arranca, acepta conexiones, pero cualquier query de Prisma falla con `Table 'X' doesn't exist`.

**Hostinger no permite terminal para correr migraciones manualmente**, por lo que deben incorporarse al proceso automático.

---

## Diagnóstico: ¿Por qué las variables de entorno no llegan?

Hay dos mecanismos distintos en Hostinger:

| Mecanismo | ¿Inyecta env vars? |
|---|---|
| **hPanel → Avanzado → Node.js** (configuración tradicional) | ✅ Sí, como `process.env` reales |
| **"Node.js Web App" vía GitHub** (deployment wizard) | ⚠️ Depende — puede que solo haga el build pero no configure el proceso Node.js |

**Diagnóstico probable:** el deploy de GitHub construyó el proyecto correctamente (`npm run build` exitoso), pero el servidor Node.js **no está registrado como proceso en hPanel → Node.js**. Hostinger podría estar sirviendo solo los archivos estáticos de `client/dist` en `public_html`, sin correr `node server/src/index.js`. Esto explicaría por qué el login no funciona: no hay backend.

---

## Logs de diagnóstico recomendados

Agregar al inicio de `server/src/index.js`, después de `dotenv.config()`:

```js
console.log('=== DIAGNÓSTICO DE ARRANQUE ===')
console.log('CWD:', process.cwd())
console.log('__dirname:', __dirname)
console.log('NODE_ENV:', process.env.NODE_ENV || '(no definido)')
console.log('PORT:', process.env.PORT || '(no definido, usará 3001)')
console.log('DATABASE_URL definida:', !!process.env.DATABASE_URL)
console.log('JWT_SECRET definida:', !!process.env.JWT_SECRET)
console.log('ADMIN_USER definida:', !!process.env.ADMIN_USER)
console.log('================================')
```

Estos logs aparecen en los logs de Hostinger al arrancar y confirman si las env vars llegan o no, sin exponer sus valores.

---

## Checklist de acciones en orden

### En el código (cambios a hacer y pushear a GitHub)

- [ ] **1. Corregir path de `client/dist` en `server/src/app.js`**
  - Cambiar `'../../../client/dist'` → `'../../client/dist'` (2 ocurrencias)

- [ ] **2. Agregar `prisma migrate deploy` al script `start` del `package.json` raíz**
  - Cambiar `"start": "node server/src/index.js"` por uno que primero corra las migraciones
  - Ejemplo: `"start": "cd server && node_modules/.bin/prisma migrate deploy && cd .. && node server/src/index.js"`

- [ ] **3. Mover `prisma` de devDependencies a dependencies en `server/package.json`**
  - Asegura que el CLI de Prisma siempre esté disponible, independientemente de `NODE_ENV`

- [ ] **4. Agregar logs de diagnóstico en `server/src/index.js`** (temporales, remover después)

### En hPanel de Hostinger

- [ ] **5. Verificar que existe una app en hPanel → Avanzado → Node.js**
  - Si no existe, crear una apuntando a `public_html/.builds/last-source`
  - Startup file: `server/src/index.js`
  - Node.js version: 20.x

- [ ] **6. Configurar las variables de entorno en esa app Node.js**
  ```
  NODE_ENV=production
  DATABASE_URL=mysql://USUARIO:PASSWORD@127.0.0.1:3306/NOMBRE_DB
  JWT_SECRET=cadena_aleatoria_minimo_32_chars
  JWT_EXPIRES_IN=7d
  ADMIN_USER=admin
  ADMIN_PASSWORD=tu_password
  COLAB_USER=colaborador
  COLAB_PASSWORD=tu_password_colab
  RESEND_API_KEY=re_xxxxx
  RESEND_FROM=Caminante Blanco <correo@dominio.com>
  ```
  - ⚠️ Usar `127.0.0.1`, no `localhost` en DATABASE_URL

- [ ] **7. Verificar que la DB y el usuario MySQL tienen los permisos correctos**
  - En hPanel → MySQL: el usuario debe tener todos los permisos sobre la base de datos

- [ ] **8. Hacer redeploy desde GitHub o reiniciar la app Node.js**
  - Esto corre el nuevo `start` script que incluye las migraciones

### Verificación

- [ ] **9. Revisar los logs de la app** después del reinicio
  - Confirmar que los logs de diagnóstico muestran todas las vars como `true`
  - Confirmar que aparece `Servidor corriendo en puerto XXXX`
  - Confirmar que no hay errores de Prisma

- [ ] **10. Remover los logs de diagnóstico** del código una vez verificado que todo funciona

---

## Orden de prioridad

```
1 → Corrección path client/dist   (el frontend no carga sin esto)
2 → Migraciones en start script   (la DB no funciona sin esto)
3 → Verificar app en hPanel Node.js  (el backend puede no estar corriendo)
4 → Variables de entorno en hPanel   (login no funciona sin esto)
5 → prisma en dependencies           (estabiliza futuros builds)
```
