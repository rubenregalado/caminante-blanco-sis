import api from './index'

export const listarClientes = (buscar) =>
  api.get('/clientes', { params: buscar ? { buscar } : {} })

export const obtenerCliente = (id) => api.get(`/clientes/${id}`)

export const obtenerOrdenesCliente = (id) => api.get(`/clientes/${id}/ordenes`)

export const crearCliente = (datos) => api.post('/clientes', datos)

export const actualizarCliente = (id, datos) => api.put(`/clientes/${id}`, datos)

export const eliminarCliente = (id) => api.delete(`/clientes/${id}`)
