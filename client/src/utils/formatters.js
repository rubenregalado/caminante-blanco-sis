export const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatearMoneda = (valor) => {
  const num = parseFloat(valor || 0)
  return `Q${num.toFixed(2)}`
}

export const formatearEstado = (estado) => {
  const mapa = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    listo: 'Listo',
    entregado: 'Entregado'
  }
  return mapa[estado] || estado
}
