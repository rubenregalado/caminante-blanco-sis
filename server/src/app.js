const express = require('express')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.routes')
const clientesRoutes = require('./routes/clientes.routes')
const ordenesRoutes = require('./routes/ordenes.routes')
const notificacionesRoutes = require('./routes/notificaciones.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Hostinger sirve la app detrás de un proxy: sin esto req.ip sería siempre la IP
// del proxy y el limitador de login metería a todos en el mismo contador.
app.set('trust proxy', 1)

// En producción el SPA se sirve desde este mismo origen, así que no hace falta
// CORS abierto. CORS_ORIGIN permite habilitar orígenes puntuales si algún día se
// separa el frontend. En desarrollo Vite hace proxy, pero se deja permisivo para
// poder probar desde el teléfono en la red local.
const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors(
  process.env.NODE_ENV === 'production'
    ? { origin: origenesPermitidos.length ? origenesPermitidos : false }
    : {}
))

app.use(express.json())

app.get('/api/v1/salud', (req, res) => {
  res.json({ estado: 'ok' })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/clientes', clientesRoutes)
app.use('/api/v1/ordenes', ordenesRoutes)
app.use('/api/v1/notificaciones', notificacionesRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
  })
}

app.use(errorHandler)

module.exports = app
