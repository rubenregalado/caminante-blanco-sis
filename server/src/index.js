const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Sin estas variables la app arranca pero falla en el primer login o consulta,
// con errores que no dicen nada. Mejor caer de una vez con un mensaje claro.
const REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD']
const faltantes = REQUERIDAS.filter(v => !process.env[v])

if (faltantes.length) {
  console.error(`[arranque] Faltan variables de entorno: ${faltantes.join(', ')}`)
  process.exit(1)
}

const app = require('./app')
const { iniciarJobCumpleanos } = require('./jobs/cumpleanos.job')
const { runMigrations } = require('./utils/migrate')

const PORT = process.env.PORT || 3001

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
  await runMigrations()
  iniciarJobCumpleanos()
})
