# CONTEXT.md — Caminante Blanco SIS

Documento de contexto completo para el desarrollo del sistema de gestión de órdenes de lavandería de tenis. Cualquier desarrollador o sesión de Claude debe leer este archivo antes de continuar el desarrollo.

---

## 1. DESCRIPCIÓN DEL NEGOCIO

| Campo       | Detalle                                              |
|-------------|------------------------------------------------------|
| Nombre      | Caminante Blanco                                     |
| Rubro       | Lavandería especializada en tenis (sneakers)         |
| Dirección   | 8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala |
| Teléfono    | 5747-5054                                            |
| Instagram   | @caminanteblancog                                    |

El negocio actualmente lleva el control de sus servicios mediante proformas físicas en papel. La última proforma utilizada fue la **No. 000546**. Este sistema digital reemplaza ese flujo completamente.

---

## 2. DESCRIPCIÓN DEL SISTEMA

Aplicación web fullstack para gestionar órdenes de servicio de lavado de tenis, con las siguientes capacidades principales:

- **Registro de clientes**: datos básicos + historial de órdenes.
- **Órdenes de servicio**: equivalente digital de la proforma física.
- **Control de pagos**: anticipo al ingreso, saldo al entregar.
- **Cambio de estado**: seguimiento del ciclo de vida de cada orden.
- **Avisos automáticos por correo**: notificación al cliente cuando sus tenis estén listos.
- **Dashboard operacional**: resumen en tiempo real del estado del negocio.

---

## 3. STACK TECNOLÓGICO

### Frontend
| Tecnología   | Rol                          |
|--------------|------------------------------|
| React        | Biblioteca UI                |
| Vite         | Bundler y dev server         |
| Tailwind CSS | Estilos utilitarios          |
| React Router | Enrutamiento SPA             |
| Axios        | Peticiones HTTP al backend   |

### Backend
| Tecnología              | Rol                                          |
|-------------------------|----------------------------------------------|
| Node.js                 | Runtime del servidor                         |
| Express                 | Framework HTTP                               |
| Prisma                  | ORM para MySQL                               |
| MySQL                   | Base de datos relacional                     |
| JWT                     | Autenticación sin estado                     |
| Nodemailer              | Envío de correos electrónicos                |
| dotenv                  | Gestión de variables de entorno              |

### Infraestructura y despliegue
| Tecnología                  | Rol                                              |
|-----------------------------|--------------------------------------------------|
| GitHub                      | Repositorio de código fuente                     |
| Hostinger Node.js Web App   | Hosting y ejecución del servidor en producción   |
| Hostinger MySQL             | Base de datos en producción (incluida en el plan)|

### Estrategia de build para producción

En producción **no hay dos servidores separados**. El flujo es:

1. `npm run build` compila el frontend React/Vite y genera `/client/dist`.
2. Express sirve esa carpeta como archivos estáticos.
3. Un único proceso Node.js atiende tanto la API (`/api/v1/*`) como el frontend (`*`).

```
Navegador → Hostinger → Express
                          ├── /api/v1/*  → lógica de negocio
                          └── /*         → client/dist/index.html (SPA)
```

---

## 4. ESTRUCTURA DE CARPETAS DEL PROYECTO

Arquitectura **monorepo**: un solo repositorio GitHub con `client/` y `server/` como subcarpetas. El `package.json` raíz orquesta el build y el arranque para Hostinger.

```
caminante-blanco/               ← raíz del repositorio GitHub
├── CONTEXT.md
├── .gitignore
├── .env                        ← variables de entorno (no se sube al repo)
├── package.json                ← scripts raíz: build y start para Hostinger
│
├── client/                     ← proyecto React + Vite (frontend)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── .env                    ← solo para desarrollo local
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   ├── clientes.js
│       │   ├── ordenes.js
│       │   └── notificaciones.js
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── OrdenCard.jsx
│       │   ├── EstadoBadge.jsx
│       │   └── ModalConfirmar.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Clientes.jsx
│       │   ├── ClienteDetalle.jsx
│       │   ├── Ordenes.jsx
│       │   ├── OrdenDetalle.jsx
│       │   ├── OrdenNueva.jsx
│       │   └── Login.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   └── useOrdenes.js
│       └── utils/
│           ├── formatters.js
│           └── validators.js
│
└── server/                     ← proyecto Node.js + Express (backend)
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── src/
        ├── index.js
        ├── app.js
        ├── routes/
        │   ├── clientes.routes.js
        │   ├── ordenes.routes.js
        │   └── notificaciones.routes.js
        ├── controllers/
        │   ├── clientes.controller.js
        │   ├── ordenes.controller.js
        │   └── notificaciones.controller.js
        ├── middleware/
        │   ├── auth.middleware.js
        │   └── errorHandler.js
        ├── services/
        │   └── email.service.js
        └── utils/
            └── numeroOrden.js
```

### `package.json` raíz (orquestador para Hostinger)

```json
{
  "name": "caminante-blanco",
  "version": "1.0.0",
  "scripts": {
    "build": "cd client && npm install && npm run build",
    "start": "node server/src/index.js",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev"
  }
}
```

---

## 4.1 CONFIGURACIÓN PARA HOSTINGER

### Cómo Express sirve el frontend en producción

En `server/src/app.js`, después de registrar todas las rutas de la API, agregar:

```js
const path = require('path')

// Servir archivos estáticos del build de Vite
app.use(express.static(path.join(__dirname, '../../client/dist')))

// Cualquier ruta no reconocida devuelve el index.html (necesario para React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})
```

> **Importante:** estas dos líneas deben ir DESPUÉS de `app.use('/api/v1', ...)` para que las rutas de la API tengan prioridad.

### Puerto dinámico

Hostinger asigna el puerto en la variable de entorno `PORT`. El servidor debe usarla:

```js
// server/src/index.js
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`))
```

### Ciclo de vida en Hostinger

Cuando se hace `git push origin main`, Hostinger detecta el push y ejecuta automáticamente:

```
npm install        ← instala dependencias del package.json raíz
npm run build      ← entra a /client, instala sus deps y genera /client/dist
npm start          ← node server/src/index.js
```

No es necesario configurar ningún paso de build adicional en el panel; los scripts del `package.json` raíz lo manejan todo.

---

## 5. ESQUEMA DE BASE DE DATOS

### Base de datos en producción: Hostinger MySQL

Hostinger incluye MySQL en el plan de hosting compartido con Node.js Web App. Detalles clave:

- Se administra desde **phpMyAdmin** en el panel de Hostinger (sección *Databases > Management*).
- La base de datos y el usuario se crean manualmente desde ese panel; ambos reciben el prefijo `u632233585_` seguido del nombre que elijas.
- Cuando la app corre en el mismo servidor de Hostinger, el host de conexión es `localhost`.
- Prisma se conecta usando `provider = "mysql"` y la variable `DATABASE_URL` con formato MySQL.

```
DATABASE_URL="mysql://u632233585_caminante:tupassword@localhost:3306/u632233585_caminante"
```

Solo se deben ejecutar las migraciones de Prisma tras el primer deploy (`npx prisma migrate deploy`).

### Schema de Prisma (`server/prisma/schema.prisma`)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Tabla: `clientes`
| Columna    | Tipo           | Notas                    |
|------------|----------------|--------------------------|
| id         | SERIAL PK      |                          |
| nombre     | VARCHAR(150)   | NOT NULL                 |
| telefono   | VARCHAR(20)    |                          |
| nit        | VARCHAR(20)    | "CF" si consumidor final |
| direccion  | TEXT           |                          |
| correo     | VARCHAR(150)   | Para envío de avisos     |
| created_at | TIMESTAMP      | DEFAULT NOW()            |

### Tabla: `ordenes`
| Columna        | Tipo           | Notas                                          |
|----------------|----------------|------------------------------------------------|
| id             | SERIAL PK      |                                                |
| numero_orden   | VARCHAR(10)    | UNIQUE, formato 000547, 000548, …              |
| cliente_id     | INT FK         | Referencia a clientes.id                       |
| fecha_ingreso  | DATE           | NOT NULL                                       |
| fecha_entrega  | DATE           |                                                |
| forma_pago     | VARCHAR(20)    | efectivo / transferencia / mixto               |
| anticipo       | DECIMAL(10,2)  | DEFAULT 0                                      |
| total          | DECIMAL(10,2)  |                                                |
| estado         | VARCHAR(20)    | pendiente / en_proceso / listo / entregado     |
| notas          | TEXT           | Observaciones generales                        |
| created_at     | TIMESTAMP      | DEFAULT NOW()                                  |

### Tabla: `items_orden`
| Columna    | Tipo           | Notas                                      |
|------------|----------------|--------------------------------------------|
| id         | SERIAL PK      |                                            |
| orden_id   | INT FK         | Referencia a ordenes.id                    |
| servicio   | VARCHAR(100)   | Ej: "Lavado básico", "Lavado premium"      |
| tipo_zapato| VARCHAR(100)   | Ej: "Running", "Basketball", "Casual"      |
| color      | VARCHAR(50)    |                                            |
| talla      | VARCHAR(10)    |                                            |
| marca      | VARCHAR(50)    |                                            |
| extras     | TEXT           | Servicios adicionales, observaciones       |
| precio     | DECIMAL(10,2)  |                                            |

### Tabla: `notificaciones`
| Columna     | Tipo           | Notas                         |
|-------------|----------------|-------------------------------|
| id          | SERIAL PK      |                               |
| orden_id    | INT FK         | Referencia a ordenes.id       |
| tipo        | VARCHAR(20)    | correo / whatsapp             |
| mensaje     | TEXT           |                               |
| enviado_at  | TIMESTAMP      |                               |
| estado      | VARCHAR(20)    | enviado / fallido / pendiente |

---

## 6. ENDPOINTS DE LA API REST

**Base URL:** `/api/v1`

### Clientes

| Método | Ruta                  | Descripción                        |
|--------|-----------------------|------------------------------------|
| GET    | `/clientes`           | Listar todos los clientes          |
| GET    | `/clientes/:id`       | Obtener un cliente por ID          |
| GET    | `/clientes/:id/ordenes` | Historial de órdenes del cliente |
| POST   | `/clientes`           | Crear nuevo cliente                |
| PUT    | `/clientes/:id`       | Actualizar datos del cliente       |
| DELETE | `/clientes/:id`       | Eliminar cliente (soft delete)     |

### Órdenes

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/ordenes`                    | Listar todas las órdenes             |
| GET    | `/ordenes/:id`                | Obtener orden por ID                 |
| GET    | `/ordenes/numero/:numero`     | Buscar por número de orden           |
| GET    | `/ordenes?estado=pendiente`   | Filtrar por estado                   |
| POST   | `/ordenes`                    | Crear nueva orden con sus items      |
| PUT    | `/ordenes/:id`                | Actualizar datos de la orden         |
| PATCH  | `/ordenes/:id/estado`         | Cambiar estado de la orden           |
| DELETE | `/ordenes/:id`                | Eliminar orden                       |

### Notificaciones

| Método | Ruta                              | Descripción                         |
|--------|-----------------------------------|-------------------------------------|
| POST   | `/notificaciones/correo/:ordenId` | Enviar correo de aviso al cliente   |
| GET    | `/notificaciones/:ordenId`        | Ver historial de notificaciones     |

### Dashboard

| Método | Ruta              | Descripción                                               |
|--------|-------------------|-----------------------------------------------------------|
| GET    | `/dashboard`      | Resumen: totales por estado, ingresos del día, etc.       |

---

## 7. FUNCIONALIDADES PRINCIPALES

1. **Nueva orden digital**: formulario equivalente a la proforma física. Permite registrar cliente, hasta 5 pares de tenis, anticipo y fecha estimada de entrega.
2. **Búsqueda de órdenes**: por número de orden, nombre de cliente o estado.
3. **Gestión de estados**: botones de acción para avanzar el estado de la orden en su ciclo de vida.
4. **Aviso automático por correo**: al cambiar estado a `listo`, el sistema envía automáticamente el correo al cliente.
5. **Dashboard operacional**: tarjetas con conteo de órdenes por estado, ingresos del día, órdenes próximas a entregar.
6. **Historial por cliente**: ficha del cliente con todas sus órdenes anteriores.

---

## 8. REGLAS DE NEGOCIO

| Regla | Detalle |
|-------|---------|
| Numeración correlativa | El número de orden comienza en **000547** y es autoincremental, con padding de 6 dígitos. |
| Máximo de items | Una orden puede contener **hasta 5 pares de tenis**. |
| Estados posibles | `pendiente` → `en_proceso` → `listo` → `entregado` (flujo unidireccional). |
| Disparo de correo | Al cambiar el estado a `listo`, se dispara automáticamente el correo de aviso. |
| Anticipo | Se registra al crear la orden. El saldo (`total - anticipo`) se cobra al entregar. |
| Formas de pago | `efectivo`, `transferencia`, `mixto` (combinación de ambas). |
| NIT por defecto | Si el cliente no tiene NIT, se registra como `CF` (consumidor final). |

---

## 9. TEMPLATE DE NOTIFICACIÓN AL CLIENTE

### Correo electrónico

**Asunto:** `Tus tenis están listos - Caminante Blanco`

**Cuerpo:**

```
Hola [nombre],

Tus tenis de la orden No. [numero_orden] ya están listos para recoger.

📅 Fecha: [fecha_actual]
💰 Total pendiente de pago: Q[total - anticipo]
💳 Forma de pago acordada: [forma_pago]

📍 Dirección:
8va. Ave. Calzada 2 Hector Zona 2, Chiquimula, Guatemala

📞 Teléfono: 5747-5054
📸 Instagram: @caminanteblancog

¡Gracias por confiar en Caminante Blanco!
```

---

## 10. VARIABLES DE ENTORNO

### Desarrollo local — `/.env` (raíz del monorepo)

```env
# Servidor (dev local usa 3001; en Hostinger PORT lo asigna la plataforma)
PORT=3001
NODE_ENV=development

# Base de datos local (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/caminante_blanco"

# JWT
JWT_SECRET=clave_secreta_muy_larga_y_segura
JWT_EXPIRES_IN=7d

# Nodemailer (Gmail con contraseña de aplicación)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=correo@gmail.com
EMAIL_PASS=app_password_de_gmail
EMAIL_FROM="Caminante Blanco <correo@gmail.com>"
```

### Producción — Panel de variables de entorno en Hostinger

Estas variables se configuran en el panel de Hostinger **antes del primer deploy**. Nunca se suben al repositorio.

| Variable         | Valor / Origen                                                                    |
|------------------|-----------------------------------------------------------------------------------|
| `PORT`           | **No definir** — Hostinger lo asigna automáticamente                              |
| `NODE_ENV`       | `production`                                                                      |
| `DATABASE_URL`   | `mysql://u632233585_caminante:PASSWORD@localhost:3306/u632233585_caminante`        |
| `JWT_SECRET`     | Cadena larga y aleatoria (mínimo 32 caracteres)                                   |
| `JWT_EXPIRES_IN` | `7d`                                                                              |
| `EMAIL_HOST`     | `smtp.gmail.com`                                                                  |
| `EMAIL_PORT`     | `587`                                                                              |
| `EMAIL_USER`     | Correo Gmail del negocio                                                          |
| `EMAIL_PASS`     | Contraseña de aplicación generada en Google Account                               |
| `EMAIL_FROM`     | `"Caminante Blanco <correo@gmail.com>"`                                           |

> El usuario, nombre de base de datos y password se obtienen al crearlos en phpMyAdmin desde el panel de Hostinger. El host es siempre `localhost` porque la app y la BD corren en el mismo servidor.

### Desarrollo local — `/client/.env`

Solo se usa en desarrollo para que Vite apunte al backend local. En producción no existe porque el frontend es un build estático servido por Express.

```env
VITE_API_URL=http://localhost:3001/api/v1
```

---

## 11. COMANDOS DE INSTALACIÓN Y ARRANQUE

### Requisitos previos

- Node.js >= 18
- MySQL >= 8 corriendo localmente (o XAMPP / Laragon)
- npm >= 9
- Cuenta en GitHub con el repositorio creado
- Plan Hostinger con Node.js Web App y MySQL

### Instalación local desde cero

```bash
# 1. Clonar el repositorio
git clone https://github.com/<usuario>/caminante-blanco.git
cd caminante-blanco

# 2. Instalar dependencias del servidor
cd server && npm install && cd ..

# 3. Instalar dependencias del cliente
cd client && npm install && cd ..

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores reales (DATABASE_URL, JWT_SECRET, EMAIL_*)

# 5. Crear la base de datos local en MySQL
mysql -u root -p -e "CREATE DATABASE caminante_blanco;"

# 6. Ejecutar migraciones con Prisma
cd server && npx prisma migrate dev --name init && cd ..

# 7. (Opcional) Seed de datos iniciales
cd server && npx prisma db seed && cd ..

# 8a. Arrancar el backend en una terminal
npm run dev:server

# 8b. Arrancar el frontend en otra terminal
npm run dev:client
```

### URLs en desarrollo local

| Servicio      | URL                                                  |
|---------------|------------------------------------------------------|
| Frontend      | http://localhost:5173                                |
| Backend       | http://localhost:3001                                |
| Prisma Studio | `cd server && npx prisma studio` → http://localhost:5555 |

### Flujo de deploy a Hostinger

```bash
# Paso 1: subir cambios al repositorio
git add .
git commit -m "Descripción del cambio"
git push origin main

# Paso 2: Hostinger detecta el push y ejecuta automáticamente:
#   npm install        → instala deps del package.json raíz
#   npm run build      → cd client && npm install && npm run build
#   npm start          → node server/src/index.js

# Paso 3: la app queda disponible en el dominio configurado en Hostinger
```

### Primer deploy: crear la base de datos y ejecutar migraciones

```bash
# Paso 1: en el panel de Hostinger, ir a Databases > Management
#   - Crear nueva base de datos: u632233585_caminante
#   - Crear usuario:             u632233585_caminante  (con password seguro)
#   - Asignar todos los permisos al usuario sobre esa base de datos
#   - Copiar usuario, password y nombre de DB al .env de producción en Hostinger

# Paso 2: conectarse por SSH al servidor Hostinger y ejecutar las migraciones
cd caminante-blanco/server
npx prisma migrate deploy
# Prisma leerá DATABASE_URL del entorno de Hostinger y creará todas las tablas
```

---

## 12. CONVENCIONES DE CÓDIGO

| Convención              | Regla                                            |
|-------------------------|--------------------------------------------------|
| Idioma del código       | Español para nombres de variables y comentarios  |
| Idioma de archivos      | Inglés para nombres de archivos y carpetas       |
| Commits                 | En español, imperativo: "Agrega endpoint de clientes" |
| Componentes React       | PascalCase: `OrdenCard.jsx`, `EstadoBadge.jsx`   |
| Funciones y variables   | camelCase: `obtenerOrdenes()`, `numeroOrden`     |
| Rutas de API            | kebab-case: `/api/v1/items-orden`                |
| Tablas de BD            | snake_case en plural: `items_orden`, `clientes`  |
| Constantes              | UPPER_SNAKE_CASE: `ESTADOS_ORDEN`                |

---

## PRÓXIMOS PASOS

Orden recomendado de desarrollo, de menor a mayor complejidad:

### Fase 0 — Preparación del repositorio y Hostinger (hacer PRIMERO)
1. Crear el repositorio en GitHub con el nombre `caminante-blanco`.
2. Conectar el repositorio a Hostinger Node.js Web App desde el panel de control.
3. Ir a **Databases > Management** en el panel de Hostinger y:
   - Crear la base de datos MySQL: `u632233585_caminante` (o el nombre que elijas con el prefijo del plan).
   - Crear el usuario MySQL con el mismo prefijo y asignarle todos los permisos sobre esa BD.
   - Copiar el nombre de DB, usuario y password — se necesitan para el siguiente paso.
4. Configurar **todas** las variables de entorno de producción en el panel de Hostinger (`DATABASE_URL` con formato `mysql://u632233585_caminante:PASSWORD@localhost:3306/u632233585_caminante`, `JWT_SECRET`, `NODE_ENV=production`, `EMAIL_*`) **antes de hacer el primer push**.
5. Crear el `package.json` raíz con los scripts `build` y `start` correctos.
6. Verificar que Hostinger tiene acceso al repo y que el branch de deploy es `main`.

### Fase 1 — Infraestructura base
6. Inicializar proyecto `server/` con Express y configurar `app.js` e `index.js` (con `process.env.PORT`).
7. Configurar Prisma con `schema.prisma` y ejecutar la primera migración local.
8. Inicializar proyecto `client/` con Vite + React + Tailwind CSS.
9. Configurar proxy de Vite hacia el backend para desarrollo local.
10. Agregar la lógica de archivos estáticos en `app.js` para producción (`express.static` + catch-all).

### Fase 2 — Autenticación
11. Implementar endpoint de login con JWT.
12. Crear middleware `auth.middleware.js` para proteger rutas.
13. Crear página `Login.jsx` en el frontend.

### Fase 3 — CRUD de clientes
14. Implementar endpoints CRUD de clientes en el backend.
15. Crear páginas `Clientes.jsx` y `ClienteDetalle.jsx` en el frontend.

### Fase 4 — CRUD de órdenes
16. Implementar lógica de generación de número correlativo (`numeroOrden.js`).
17. Implementar endpoints CRUD de órdenes + items en el backend.
18. Crear formulario `OrdenNueva.jsx` (el corazón del sistema).
19. Crear páginas `Ordenes.jsx` y `OrdenDetalle.jsx`.

### Fase 5 — Gestión de estados
20. Implementar endpoint `PATCH /ordenes/:id/estado`.
21. Agregar botones de cambio de estado en `OrdenDetalle.jsx`.

### Fase 6 — Notificaciones por correo
22. Configurar Nodemailer en `email.service.js`.
23. Implementar endpoint de envío de correo.
24. Conectar el disparo automático al cambio de estado a `listo`.

### Fase 7 — Dashboard
25. Implementar endpoint `/dashboard` con agregaciones SQL vía Prisma.
26. Crear página `Dashboard.jsx` con tarjetas de resumen.

### Fase 8 — Pulido y primer deploy a producción
27. Manejo global de errores (`errorHandler.js`).
28. Validaciones de formularios en frontend.
29. Responsive design y pruebas en móvil.
30. `git push origin main` → Hostinger despliega automáticamente.
31. Conectar por SSH a Hostinger y ejecutar `npx prisma migrate deploy` para crear las tablas en la BD de producción.
32. Verificar el dominio, probar el flujo completo de creación de órdenes y envío de correo.
