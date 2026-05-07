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
console.log('ADMIN_PASSWORD definida:', !!process.env.ADMIN_PASSWORD)
console.log('COLAB_USER definida:', !!process.env.COLAB_USER)
console.log('COLAB_PASSWORD definida:', !!process.env.COLAB_PASSWORD)
console.log('================================')

try {
  console.log('Ejecutando migraciones...')
  const fs = require('fs')
  // Buscar prisma/build/index.js en server/node_modules o en la raíz
  const candidates = [
    path.join(__dirname, '../node_modules/prisma/build/index.js'),
    path.join(__dirname, '../../node_modules/prisma/build/index.js'),
  ]
  const prismaJs = candidates.find(p => fs.existsSync(p))
  if (!prismaJs) throw new Error('No se encontró prisma/build/index.js en node_modules')
  console.log('Usando prisma en:', prismaJs)
  const output = execSync(`node "${prismaJs}" migrate deploy --schema prisma/schema.prisma`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    env: process.env
  })
  console.log(output.toString())
  console.log('Migraciones completadas.')
} catch (e) {
  console.error('Error en migraciones:', e.message)
  if (e.stdout && e.stdout.length) console.error('stdout:', e.stdout.toString())
  if (e.stderr && e.stderr.length) console.error('stderr:', e.stderr.toString())
}

const app = require('./app')

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
})
