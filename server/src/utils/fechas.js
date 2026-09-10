// El corte del día tiene que ser la medianoche de Guatemala, no la del servidor.
// En Hostinger el proceso puede correr en UTC, y sin esto el cierre diario
// cambiaría de día a las 6 de la tarde hora local.
//
// Guatemala no usa horario de verano: es UTC-6 todo el año, así que el offset
// fijo es exacto y no depende de la base de datos de zonas horarias del sistema.

const TZ_NEGOCIO = 'America/Guatemala'
const OFFSET_HORAS = 6

// Fecha actual en Guatemala como 'YYYY-MM-DD' ('en-CA' da justo ese formato).
function hoyEnNegocio() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_NEGOCIO })
}

// Instantes absolutos de inicio y fin de un día de Guatemala. Al convertirlos
// mysql2 los escribe en la hora local del proceso, que es la misma convención
// con la que se guardaron created_at y fecha_entregado, así que la comparación
// es correcta tanto si el servidor corre en UTC como si corre en hora local.
function rangoDelDia(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  const inicio = new Date(Date.UTC(anio, mes - 1, dia, OFFSET_HORAS, 0, 0, 0))
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
  return { inicio, fin }
}

const ES_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

module.exports = { hoyEnNegocio, rangoDelDia, ES_FECHA_ISO, TZ_NEGOCIO }
