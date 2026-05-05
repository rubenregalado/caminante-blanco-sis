import api from './index'

export const enviarCorreo = (ordenId) =>
  api.post(`/notificaciones/correo/${ordenId}`)

export const obtenerNotificaciones = (ordenId) =>
  api.get(`/notificaciones/${ordenId}`)
