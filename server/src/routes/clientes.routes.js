const express = require('express')
const { verificarToken } = require('../middleware/auth.middleware')
const {
  listarClientes,
  obtenerCliente,
  obtenerOrdenesCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/clientes.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', listarClientes)
router.get('/:id', obtenerCliente)
router.get('/:id/ordenes', obtenerOrdenesCliente)
router.post('/', crearCliente)
router.put('/:id', actualizarCliente)
router.delete('/:id', eliminarCliente)

module.exports = router
