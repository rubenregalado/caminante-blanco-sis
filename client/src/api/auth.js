import api from './index'

export const login = (datos) => api.post('/auth/login', datos)
