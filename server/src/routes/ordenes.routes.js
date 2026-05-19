const express = require('express')
const { verificarToken, verificarAdmin } = require('../middleware/auth.middleware')
const {
  previsualizarNumero,
  listarOrdenes,
  obtenerOrden,
  buscarPorNumero,
  crearOrden,
  actualizarOrden,
  cambiarEstado,
  eliminarOrden,
  actualizarFechaEntrega,
} = require('../controllers/ordenes.controller')

const router = express.Router()

router.use(verificarToken)

router.get('/', listarOrdenes)
router.get('/siguiente-numero', previsualizarNumero)
router.get('/numero/:numero', buscarPorNumero)
router.get('/:id', obtenerOrden)
router.post('/', crearOrden)
router.put('/:id', actualizarOrden)
router.patch('/:id/estado', cambiarEstado)
router.patch('/:id/fecha-entrega', verificarAdmin, actualizarFechaEntrega)
router.delete('/:id', eliminarOrden)

module.exports = router
