const express = require('express')
const { verificarToken, verificarAdmin } = require('../middleware/auth.middleware')
const {
  listarClientes,
  obtenerCliente,
  obtenerOrdenesCliente,
  crearCliente,
  actualizarCliente,
  posiblesDuplicados,
  eliminarCliente
} = require('../controllers/clientes.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', listarClientes)
router.get('/:id', obtenerCliente)
router.get('/:id/ordenes', obtenerOrdenesCliente)
router.get('/:id/duplicados', posiblesDuplicados)
router.post('/', crearCliente)
router.put('/:id', actualizarCliente)
router.delete('/:id', verificarAdmin, eliminarCliente)

module.exports = router
