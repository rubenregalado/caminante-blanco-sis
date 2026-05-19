const cron = require('node-cron')
const { pool } = require('../lib/db')
const { enviarCorreoCumpleanos } = require('../services/email.service')

// Corre todos los días a las 8:00 AM hora Guatemala (UTC-6 = 14:00 UTC)
const CRON_SCHEDULE = '0 14 * * *'

async function enviarFelicitacionesCumpleanos() {
  console.log('[cumpleaños] Verificando cumpleaños del día...')

  const [rows] = await pool.promise().query(
    `SELECT id, nombre, correo, fecha_nacimiento
     FROM clientes
     WHERE correo IS NOT NULL
       AND correo != ''
       AND fecha_nacimiento IS NOT NULL
       AND MONTH(fecha_nacimiento) = MONTH(CURDATE())
       AND DAY(fecha_nacimiento) = DAY(CURDATE())`
  )

  if (rows.length === 0) {
    console.log('[cumpleaños] Sin cumpleaños hoy.')
    return
  }

  console.log(`[cumpleaños] ${rows.length} cliente(s) cumplen años hoy.`)

  for (const row of rows) {
    const cliente = {
      id:     row.id,
      nombre: row.nombre,
      correo: row.correo,
    }
    try {
      await enviarCorreoCumpleanos(cliente)
      console.log(`[cumpleaños] Correo enviado a ${cliente.correo} (${cliente.nombre})`)
    } catch (err) {
      console.error(`[cumpleaños] Error al enviar a ${cliente.correo}:`, err.message)
    }
  }
}

function iniciarJobCumpleanos() {
  cron.schedule(CRON_SCHEDULE, enviarFelicitacionesCumpleanos, {
    timezone: 'America/Guatemala',
  })
  console.log('[cumpleaños] Job programado — corre diariamente a las 8:00 AM (Guatemala)')
}

module.exports = { iniciarJobCumpleanos }
