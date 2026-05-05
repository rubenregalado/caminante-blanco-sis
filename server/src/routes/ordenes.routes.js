const express = require('express')
const { verificarToken } = require('../middleware/auth.middleware')
const {
  listarOrdenes,
  obtenerOrden,
  buscarPorNumero,
  crearOrden,
  actualizarOrden,
  cambiarEstado,
  eliminarOrden
} = require('../controllers/ordenes.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', listarOrdenes)
router.get('/numero/:numero', buscarPorNumero)
router.get('/:id', obtenerOrden)
router.post('/', crearOrden)
router.put('/:id', actualizarOrden)
router.patch('/:id/estado', cambiarEstado)
router.delete('/:id', eliminarOrden)

module.exports = router
