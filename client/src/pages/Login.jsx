import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — marca (solo pantallas grandes) */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: '#3B30D0' }}
      >
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-40"
          style={{ backgroundColor: '#2D24A8' }}
        />
        <div
          className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full opacity-20"
          style={{ backgroundColor: '#3DDBA0' }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/logo-white.png"
            alt="Caminante Blanco"
            className="w-72 mb-8 drop-shadow-xl"
          />
          <p className="text-white/80 text-lg font-medium">
            Sistema de gestión de órdenes
          </p>
          <p className="text-white/50 text-sm mt-2">
            Lavandería especializada en tenis
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { valor: '000547+', etiqueta: 'Órdenes' },
              { valor: '100%',    etiqueta: 'Digital'  },
              { valor: '5★',      etiqueta: 'Servicio' }
            ].map(({ valor, etiqueta }) => (
              <div key={etiqueta} className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-bold" style={{ color: '#3DDBA0' }}>{valor}</p>
                <p className="text-xs mt-1 text-white/60">{etiqueta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm">
          {/* Logo en móvil */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="Caminante Blanco" className="w-48" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-gray-500 text-sm mt-1">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition"
                style={{ '--tw-ring-color': '#3B30D0' }}
                onFocus={e => e.target.style.borderColor = '#3B30D0'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm outline-none transition"
                  onFocus={e => e.target.style.borderColor = '#3B30D0'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                >
                  {verPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              style={{
                backgroundColor: cargando ? '#7B73E0' : '#3B30D0',
                color: '#ffffff'
              }}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-70 shadow-lg"
              onMouseEnter={e => { if (!cargando) e.target.style.backgroundColor = '#2D24A8' }}
              onMouseLeave={e => { if (!cargando) e.target.style.backgroundColor = '#3B30D0' }}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Chiquimula, Guatemala · 5747-5054
          </p>
        </div>
      </div>
    </div>
  )
}
