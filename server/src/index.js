const path = require('path')
const { execSync } = require('child_process')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

console.log('=== DIAGNÓSTICO DE ARRANQUE ===')
console.log('CWD:', process.cwd())
console.log('__dirname:', __dirname)
console.log('NODE_ENV:', process.env.NODE_ENV || '(no definido)')
console.log('PORT:', process.env.PORT || '(no definido — usará 3001)')
console.log('DATABASE_URL definida:', !!process.env.DATABASE_URL)
console.log('JWT_SECRET definida:', !!process.env.JWT_SECRET)
console.log('ADMIN_USER definida:', !!process.env.ADMIN_USER)
console.log('COLAB_USER definida:', !!process.env.COLAB_USER)
console.log('================================')

try {
  console.log('Ejecutando migraciones...')
  const prismaBin = path.join(__dirname, '../../node_modules/.bin/prisma')
  execSync(`${prismaBin} migrate deploy --schema prisma/schema.prisma`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  })
  console.log('Migraciones completadas.')
} catch (e) {
  console.error('Error en migraciones:', e.message)
}

const app = require('./app')

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
})
