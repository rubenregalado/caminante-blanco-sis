const express = require('express')
const { verificarToken, verificarAdmin } = require('../middleware/auth.middleware')
const { obtenerResumen, obtenerAnaliticas } = require('../controllers/dashboard.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', obtenerResumen)
router.get('/analiticas', verificarAdmin, obtenerAnaliticas)

module.exports = router
