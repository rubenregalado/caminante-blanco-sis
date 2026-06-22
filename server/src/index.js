const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

console.log('=== DIAGNÓSTICO DE ARRANQUE ===')
console.log('CWD:', process.cwd())
console.log('__dirname:', __dirname)
console.log('NODE_ENV:', process.env.NODE_ENV || '(no definido)')
console.log('PORT:', process.env.PORT || '(no definido — usará 3001)')
console.log('DATABASE_URL definida:', !!process.env.DATABASE_URL)
console.log('JWT_SECRET definida:', !!process.env.JWT_SECRET)
console.log('ADMIN_USER definida:', !!process.env.ADMIN_USER)
console.log('ADMIN_PASSWORD definida:', !!process.env.ADMIN_PASSWORD)
console.log('COLAB_USER definida:', !!process.env.COLAB_USER)
console.log('COLAB_PASSWORD definida:', !!process.env.COLAB_PASSWORD)
console.log('================================')

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
