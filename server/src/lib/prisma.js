const { PrismaClient } = require('@prisma/client')
const { PrismaMysql2 } = require('@prisma/adapter-mysql2')
const mysql = require('mysql2/promise')

function parseMysqlUrl(url) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

const pool = mysql.createPool(parseMysqlUrl(process.env.DATABASE_URL))
const adapter = new PrismaMysql2(pool)
const prisma = new PrismaClient({ adapter })

module.exports = prisma
