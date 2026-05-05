const express = require('express')
const { verificarToken } = require('../middleware/auth.middleware')
const { enviarCorreo, obtenerNotificaciones } = require('../controllers/notificaciones.controller')

const router = express.Router()

router.use(verificarToken)

router.post('/correo/:ordenId', enviarCorreo)
router.get('/:ordenId', obtenerNotificaciones)

module.exports = router
