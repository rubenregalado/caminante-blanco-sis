import api from './index'

export const siguienteNumeroOrden = () => api.get('/ordenes/siguiente-numero')

export const listarOrdenes = (params) => api.get('/ordenes', { params })

export const obtenerOrden = (id) => api.get(`/ordenes/${id}`)

export const buscarPorNumero = (numero) => api.get(`/ordenes/numero/${numero}`)

export const crearOrden = (datos) => api.post('/ordenes', datos)

export const actualizarOrden = (id, datos) => api.put(`/ordenes/${id}`, datos)

export const cambiarEstado = (id, estado, extras = {}) =>
  api.patch(`/ordenes/${id}/estado`, { estado, ...extras })

export const eliminarOrden = (id) => api.delete(`/ordenes/${id}`)
