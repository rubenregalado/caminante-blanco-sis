import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const IconOrdenes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1.5"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)

const IconNuevaOrden = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
)

const IconClientes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const enlaces = [
  { to: '/dashboard',     Icono: IconDashboard,  etiqueta: 'Dashboard'   },
  { to: '/ordenes',       Icono: IconOrdenes,    etiqueta: 'Órdenes'     },
  { to: '/ordenes/nueva', Icono: IconNuevaOrden, etiqueta: 'Nueva Orden' },
  { to: '/clientes',      Icono: IconClientes,   etiqueta: 'Clientes'    },
]

export default function Sidebar() {
  const { logout, usuario, rol } = useAuth()

  return (
    <>
      {/* Sidebar — solo visible en desktop */}
      <aside
        className="hidden lg:flex w-60 shrink-0 flex-col min-h-screen"
        style={{ backgroundColor: '#3B30D0' }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/logo-white.png" alt="Caminante Blanco" className="w-36" />
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {enlaces.map(({ to, Icono, etiqueta }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: '#ffffff', color: '#3B30D0' }
                  : { color: 'rgba(255,255,255,0.7)' }
              }
              onMouseEnter={e => {
                if (!e.currentTarget.style.backgroundColor.includes('255, 255, 255')) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.color = '#ffffff'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.style.backgroundColor.includes('255, 255, 255')) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }
              }}
            >
              <Icono />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
              style={{ backgroundColor: '#3DDBA0', color: '#3B30D0' }}
            >
              {usuario?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{usuario}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {rol === 'admin' ? 'Administrador' : 'Colaborador'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
          >
            Cerrar sesión →
          </button>
        </div>
      </aside>

      {/* Barra de navegación inferior — solo en móvil */}
      <nav
        className="fixed bottom-0 left-0 right-0 lg:hidden z-50 flex border-t"
        style={{ backgroundColor: '#3B30D0', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        {enlaces.map(({ to, Icono, etiqueta }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
            style={({ isActive }) =>
              isActive
                ? { color: '#3DDBA0' }
                : { color: 'rgba(255,255,255,0.55)' }
            }
          >
            <Icono />
            <span className="text-[10px] font-medium">{etiqueta}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
