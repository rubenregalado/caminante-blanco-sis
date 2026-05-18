const { db } = require('../lib/db')
const { ordenes } = require('../lib/schema')
const { desc } = require('drizzle-orm')

const NUMERO_INICIAL = 547

async function generarNumeroOrden() {
  const rows = await db
    .select({ numeroOrden: ordenes.numeroOrden })
    .from(ordenes)
    .orderBy(desc(ordenes.id))
    .limit(1)

  if (!rows.length) {
    return NUMERO_INICIAL.toString().padStart(6, '0')
  }

  const ultimoNumero = parseInt(rows[0].numeroOrden, 10)
  const siguiente = ultimoNumero + 1
  return siguiente.toString().padStart(6, '0')
}

module.exports = { generarNumeroOrden }
