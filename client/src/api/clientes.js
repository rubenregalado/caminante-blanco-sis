import api from './index'

export const listarClientes = (buscar) =>
  api.get('/clientes', { params: buscar ? { buscar } : {} })

export const obtenerCliente = (id) => api.get(`/clientes/${id}`)

export const obtenerOrdenesCliente = (id) => api.get(`/clientes/${id}/ordenes`)

export const obtenerDuplicados = (id) => api.get(`/clientes/${id}/duplicados`)

// `forzar` crea el cliente aunque el servidor haya detectado uno parecido.
export const crearCliente = (datos, forzar = false) =>
  api.post('/clientes', datos, { params: forzar ? { forzar: '1' } : {} })

export const actualizarCliente = (id, datos) => api.put(`/clientes/${id}`, datos)

export const eliminarCliente = (id) => api.delete(`/clientes/${id}`)
