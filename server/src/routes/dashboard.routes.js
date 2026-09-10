const express = require('express')
const { verificarToken, verificarAdmin } = require('../middleware/auth.middleware')
const { obtenerResumen, obtenerAnaliticas, obtenerCierreDiario, guardarCierreDiario } = require('../controllers/dashboard.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', obtenerResumen)
router.get('/cierre', obtenerCierreDiario)
router.post('/cierre', guardarCierreDiario)
router.get('/analiticas', verificarAdmin, obtenerAnaliticas)

module.exports = router
