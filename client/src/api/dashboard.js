import api from './index'

export const obtenerResumen = () => api.get('/dashboard')
export const obtenerAnaliticas = (params = {}) => api.get('/dashboard/analiticas', { params })
export const obtenerCierreDiario = (fecha) => api.get('/dashboard/cierre', { params: fecha ? { fecha } : {} })
export const guardarCierreDiario = (datos) => api.post('/dashboard/cierre', datos)
