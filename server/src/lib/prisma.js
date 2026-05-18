// Compatibility shim — Prisma has been replaced by Drizzle ORM + mysql2.
// Any remaining code that imports this file will receive the db and pool exports.
module.exports = require('./db')
