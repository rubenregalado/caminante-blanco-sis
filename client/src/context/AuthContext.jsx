import { createContext, useContext, useState } from 'react'
import { login as loginApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(() => localStorage.getItem('usuario'))
  const [rol, setRol]         = useState(() => localStorage.getItem('rol'))

  const login = async (credenciales) => {
    const { data } = await loginApi(credenciales)
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', data.usuario)
    localStorage.setItem('rol', data.rol)
    setToken(data.token)
    setUsuario(data.usuario)
    setRol(data.rol)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    localStorage.removeItem('rol')
    setToken(null)
    setUsuario(null)
    setRol(null)
  }

  return (
    <AuthContext.Provider value={{
      token,
      usuario,
      rol,
      esAdmin: rol === 'admin',
      login,
      logout,
      autenticado: !!token
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
