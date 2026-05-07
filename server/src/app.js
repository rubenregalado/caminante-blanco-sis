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

app.use(cors())
app.use(express.json())

// DIAGNÓSTICO TEMPORAL — remover después de verificar
app.get('/api/v1/diagnostico', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || '(no definido)',
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    ADMIN_USER: process.env.ADMIN_USER || '(no definido)',
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    COLAB_USER: process.env.COLAB_USER || '(no definido)',
    COLAB_PASSWORD: !!process.env.COLAB_PASSWORD,
  })
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
