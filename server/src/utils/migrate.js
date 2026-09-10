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

    // Cierre de caja diario. La fecha es DATE y no DATETIME a propósito: es el
    // día del negocio, no un instante, y así no depende de la zona horaria.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cierres_caja (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        fecha      DATE          NOT NULL UNIQUE,
        caja_chica DECIMAL(10,2) NOT NULL DEFAULT 0,
        notas      TEXT          DEFAULT NULL,
        created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
  } catch (err) {
    console.error('[migrate] Error en migración:', err.message)
  }
}

module.exports = { runMigrations }
