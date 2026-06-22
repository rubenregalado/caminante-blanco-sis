const { pool } = require('../lib/db')

async function runMigrations() {
  const conn = pool.promise()
  try {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordenes' AND COLUMN_NAME = 'pago_efectivo'`
    )
    if (rows[0].cnt === 0) {
      await conn.query(`
        ALTER TABLE ordenes
          ADD COLUMN pago_efectivo      DECIMAL(10,2) DEFAULT 0,
          ADD COLUMN pago_transferencia DECIMAL(10,2) DEFAULT 0,
          ADD COLUMN pago_tarjeta       DECIMAL(10,2) DEFAULT 0,
          ADD COLUMN fecha_entregado    DATETIME      DEFAULT NULL
      `)
      console.log('[migrate] Columnas de pago y fecha_entregado agregadas a ordenes')
    }
  } catch (err) {
    console.error('[migrate] Error en migración:', err.message)
  }
}

module.exports = { runMigrations }
