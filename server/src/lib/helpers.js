const { db } = require('./db')
const { clientes, ordenes, itemsOrden, notificaciones } = require('./schema')
const { eq, inArray } = require('drizzle-orm')

async function _attachRelations(ordenRows, with_) {
  if (!ordenRows.length || !Object.keys(with_).length) return ordenRows

  const ordenIds  = ordenRows.map(o => o.id)
  const clienteIds = [...new Set(ordenRows.map(o => o.clienteId))]

  const [clientesRows, itemsRows, notifRows] = await Promise.all([
    with_.cliente && clienteIds.length
      ? db.select().from(clientes).where(inArray(clientes.id, clienteIds))
      : [],
    with_.items && ordenIds.length
      ? db.select().from(itemsOrden).where(inArray(itemsOrden.ordenId, ordenIds))
      : [],
    with_.notificaciones && ordenIds.length
      ? db.select().from(notificaciones).where(inArray(notificaciones.ordenId, ordenIds))
      : [],
  ])

  const clienteMap = Object.fromEntries(clientesRows.map(c => [c.id, c]))
  const itemsMap   = itemsRows.reduce((m, i) => { ;(m[i.ordenId] = m[i.ordenId] || []).push(i); return m }, {})
  const notifMap   = notifRows.reduce((m, n) => { ;(m[n.ordenId] = m[n.ordenId] || []).push(n); return m }, {})

  return ordenRows.map(o => ({
    ...o,
    ...(with_.cliente        ? { cliente:        clienteMap[o.clienteId] || null } : {}),
    ...(with_.items          ? { items:           itemsMap[o.id]         || []   } : {}),
    ...(with_.notificaciones ? { notificaciones:  notifMap[o.id]         || []   } : {}),
  }))
}

async function findOrden(where, with_ = {}) {
  const rows = await db.select().from(ordenes).where(where).limit(1)
  if (!rows.length) return null
  const [result] = await _attachRelations(rows, with_)
  return result
}

async function findOrdenes({ where, orderBy, limit, with: with_ } = {}) {
  let q = db.select().from(ordenes).where(where)
  if (orderBy && orderBy.length) q = q.orderBy(...orderBy)
  if (limit) q = q.limit(limit)
  const rows = await q
  return _attachRelations(rows, with_ || {})
}

module.exports = { findOrden, findOrdenes }
