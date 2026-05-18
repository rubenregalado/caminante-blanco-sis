# Despliegue en Hostinger — Node.js Web App

Punto de partida: el repositorio ya está en GitHub (`https://github.com/rubenregalado/caminante-blanco-sis`).

---

## Arquitectura en producción

El servidor Express hace dos cosas a la vez:
- Sirve la API en `/api/v1/...`
- Sirve el frontend React (build estático) para todas las demás rutas

No se necesita configuración extra en el cliente porque la `baseURL` ya es relativa (`/api/v1`).

---

## Paso 1 — Crear la base de datos MySQL en hPanel

1. Entra a **hPanel → Bases de datos → Bases de datos MySQL**
2. Crea una nueva base de datos. Hostinger asignará nombres como:
   - Base de datos: `u632233585_caminante`
   - Usuario: `u632233585_caminante`
   - Contraseña: C@minantebl4nc02026
3. Anota los tres datos, los necesitarás en el Paso 3.
4. El **host** de la base de datos en Hostinger es siempre `127.0.0.1` (localhost interno).

---

## Paso 2 — Crear la aplicación Node.js

1. Al crear un nuevo sitio en Hostinger, elige la opción **"Node.js Web App"** (la última de la lista, con el ícono de Node.js y el texto *"Deploy your app from GitHub or upload files"*).
2. Selecciona el dominio o subdominio donde vivirá la app.
3. En la siguiente pantalla elige **"Import from GitHub"** e ingresa:
   | Campo | Valor |
   |---|---|
   | Repositorio | `https://github.com/rubenregalado/caminante-blanco-sis` |
   | Rama | `main` |
   | Versión de Node.js | **20.x** |
   | Comando de build | `npm run build` |
   | Comando de inicio | `npm start` |

4. Haz clic en **Importar / Crear**. Hostinger clonará el repositorio, ejecutará el build y levantará el servidor.

---

## Paso 3 — Configurar las variables de entorno

Dentro de la configuración de la app Node.js en hPanel, busca la sección **Variables de entorno** y agrega las siguientes:

```
NODE_ENV=production
PORT=                     ← Hostinger lo asigna automáticamente, deja vacío o no lo pongas
DATABASE_URL=mysql://u632233585_caminante:C@minantebl4nc02026@127.0.0.1:3306/u632233585_caminante
JWT_SECRET=K8mP2nR7vY4wZ9xB3cF6hJ1kL5mN8pQ0sT2uV4wX6yZ9aC2eF5hJ7kM0nP3qR6sT8uV1wX4
JWT_EXPIRES_IN=7d
ADMIN_USER=caminante
ADMIN_PASSWORD=Caminante2026$
COLAB_USER=colaborador2026
COLAB_PASSWORD=Zapatos2026#
RESEND_API_KEY=re_KSDczonZ_CcMBVvQj6zzDu5bk9cc6YS2c
RESEND_FROM=Caminante Blanco <caminanteblanco@proasa.com.gt>
```

> **Importante:** En Hostinger no uses el archivo `.env` del proyecto. Las variables se configuran directamente en hPanel y llegan como `process.env` al servidor.

---

## Paso 4 — Conectar el repositorio de GitHub

1. En hPanel, ve a **Avanzado → Git**
2. Si aún no has configurado SSH con GitHub, hPanel te muestra una clave pública SSH. Cópiala y agrégala en:
   - GitHub → Settings → SSH and GPG keys → New SSH key
3. De vuelta en hPanel, completa:
   | Campo | Valor |
   |---|---|
   | URL del repositorio | `git@github.com:rubenregalado/caminante-blanco-sis.git` |
   | Rama | `main` |
   | Ruta de despliegue | `/home/tu_usuario/caminante-blanco-sis` |
4. Haz clic en **Crear** y luego en **Hacer pull** para descargar el código.

---

## Paso 5 — Compilar el proyecto (build)

El servidor necesita el build del cliente React para servir el frontend. Esto se hace **una sola vez** (y cada vez que hagas deploy de cambios en el cliente).

Abre el **Terminal de hPanel** (Avanzado → Terminal) o conéctate por SSH:

```bash
# Ir al directorio del proyecto
cd ~/caminante-blanco-sis

# Instalar dependencias del servidor
cd server && npm install && cd ..

# Instalar dependencias del cliente y construir
cd client && npm install && npm run build && cd ..
```

Esto genera la carpeta `client/dist/` que Express sirve automáticamente en producción.

---

## Paso 6 — Ejecutar las migraciones de base de datos

Desde el mismo terminal SSH, con las variables de entorno ya configuradas en hPanel:

```bash
cd ~/caminante-blanco-sis/server

# Aplicar todas las migraciones al schema de producción
DATABASE_URL="mysql://u632233585_caminante:TU_PASSWORD@127.0.0.1:3306/u632233585_caminante" \
npx prisma migrate deploy
```

> Usa `migrate deploy` (no `migrate dev`) en producción. Solo aplica las migraciones ya creadas, no genera nuevas.

---

## Paso 7 — Iniciar la aplicación

De vuelta en **hPanel → Node.js**, haz clic en el botón **Reiniciar** (o **Iniciar**).

Hostinger ejecutará automáticamente el script `start` del `package.json` raíz:
```
node server/src/index.js
```

Verifica en los **logs de la aplicación** que aparezca:
```
Servidor corriendo en puerto XXXX
Ambiente: production
```

---

## Deployar cambios futuros

Cada vez que hagas cambios y los subas a GitHub:

```bash
# En el Terminal de hPanel / SSH
cd ~/caminante-blanco-sis

# Obtener los últimos cambios
git pull origin main

# Si cambiaste el cliente (React), reconstruir
cd client && npm run build && cd ..

# Si agregaste migraciones de base de datos
cd server && DATABASE_URL="..." npx prisma migrate deploy && cd ..

# Reiniciar el servidor desde hPanel → Node.js → Reiniciar
# (o desde SSH si tienes PM2 configurado)
```

---

## Solución de problemas comunes

**La app carga pero la API devuelve 404**
- Verifica que `NODE_ENV=production` esté configurado en las variables de entorno.
- Confirma que el Entry point en hPanel sea `server/src/index.js`.

**Error de conexión a la base de datos**
- Confirma que `DATABASE_URL` use `127.0.0.1` como host, no `localhost`.
- Verifica usuario, contraseña y nombre de base de datos en hPanel → MySQL.

**La página carga en blanco (frontend)**
- El build del cliente no existe o está desactualizado. Vuelve a ejecutar el paso 5.
- Revisa que `client/dist/index.html` exista en el servidor.

**Error: "Cannot find module" o "prisma generate"**
- El `postinstall` del `server/package.json` corre `prisma generate` automáticamente al hacer `npm install`. Si falla, ejecútalo manualmente:
  ```bash
  cd ~/caminante-blanco-sis/server && npx prisma generate
  ```

**Puerto en uso / app no inicia**
- No fuerces un puerto fijo. Hostinger asigna el puerto vía `process.env.PORT`. El servidor ya está preparado: `const PORT = process.env.PORT || 3001`.
