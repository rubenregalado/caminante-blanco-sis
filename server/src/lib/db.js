const mysql = require('mysql2')
const { drizzle } = require('drizzle-orm/mysql2')
const schema = require('./schema')

function parseMysqlUrl(url) {
  const u = new URL(url)
  return {
    host:     u.hostname,
    port:     parseInt(u.port) || 3306,
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

const pool = mysql.createPool({
  ...parseMysqlUrl(process.env.DATABASE_URL),
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Sin esto mysql2 escribe los Date de JavaScript en UTC, mientras que MySQL
  // llena created_at con la hora local del servidor. Quedaban dos convenciones
  // en la misma tabla, con 6 horas de diferencia en Guatemala: una entrega de
  // las 7 PM se guardaba con fecha del día siguiente y se caía del cierre.
  timezone:           'local',
  typeCast(field, next) {
    if (field.type === 'NEWDECIMAL' || field.type === 'DECIMAL') {
      const val = field.string()
      return val === null ? null : parseFloat(val)
    }
    return next()
  },
})

const db = drizzle(pool, { schema, mode: 'default' })

module.exports = { db, pool }
