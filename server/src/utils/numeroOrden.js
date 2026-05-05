const prisma = require('../lib/prisma')

const NUMERO_INICIAL = 547

async function generarNumeroOrden() {
  const ultimaOrden = await prisma.orden.findFirst({
    orderBy: { id: 'desc' },
    select: { numeroOrden: true }
  })

  if (!ultimaOrden) {
    return NUMERO_INICIAL.toString().padStart(6, '0')
  }

  const ultimoNumero = parseInt(ultimaOrden.numeroOrden, 10)
  const siguiente = ultimoNumero + 1
  return siguiente.toString().padStart(6, '0')
}

module.exports = { generarNumeroOrden }
