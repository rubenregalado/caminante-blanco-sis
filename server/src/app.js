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
