export const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  // Extraer solo YYYY-MM-DD para evitar desfases de timezone:
  // "2026-05-18T00:00:00.000Z" en UTC-6 mostraría el día anterior sin esto.
  const str = fecha instanceof Date ? fecha.toISOString() : String(fecha)
  const [year, month, day] = str.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-GT', {
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
