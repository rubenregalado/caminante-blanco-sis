import api from './index'

export const obtenerResumen = () => api.get('/dashboard')
export const obtenerAnaliticas = (params = {}) => api.get('/dashboard/analiticas', { params })
