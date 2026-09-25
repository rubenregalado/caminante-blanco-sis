// Normalización de datos de cliente.
//
// El teléfono se escribe de mil formas en el mostrador: "5555-1234",
// "+502 5555 1234", "55551234". Si no lo reducimos todo a dígitos, el buscador
// no encuentra al cliente, el colaborador cree que no existe y lo vuelve a
// crear. De ahí salían los duplicados.

// Deja solo los dígitos y quita el código de país de Guatemala, para que
// "+502 5555-1234" y "55551234" se comparen como iguales.
const normalizarTelefono = (valor) => {
  if (!valor) return null
  const digitos = String(valor).replace(/\D/g, '')
  if (!digitos) return null
  return digitos.length === 11 && digitos.startsWith('502')
    ? digitos.slice(3)
    : digitos
}

// Colapsa espacios repetidos y recorta. "  Juan   Pérez " -> "Juan Pérez"
const normalizarNombre = (valor) => {
  if (!valor) return null
  const limpio = String(valor).trim().replace(/\s+/g, ' ')
  return limpio || null
}

const normalizarCorreo = (valor) => {
  if (!valor) return null
  const limpio = String(valor).trim().toLowerCase()
  return limpio || null
}

// Expresión SQL que normaliza la columna telefono del lado de MySQL, para
// poder compararla contra un teléfono ya normalizado en JavaScript.
const SQL_TELEFONO_DIGITOS =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefono,'-',''),' ',''),'(',''),')',''),'+','')"

module.exports = {
  normalizarTelefono,
  normalizarNombre,
  normalizarCorreo,
  SQL_TELEFONO_DIGITOS,
}
