import api from './index'

export const listarOrdenes = (params) => api.get('/ordenes', { params })

export const obtenerOrden = (id) => api.get(`/ordenes/${id}`)

export const buscarPorNumero = (numero) => api.get(`/ordenes/numero/${numero}`)

export const crearOrden = (datos) => api.post('/ordenes', datos)

export const actualizarOrden = (id, datos) => api.put(`/ordenes/${id}`, datos)

export const cambiarEstado = (id, estado) =>
  api.patch(`/ordenes/${id}/estado`, { estado })

export const eliminarOrden = (id) => api.delete(`/ordenes/${id}`)
