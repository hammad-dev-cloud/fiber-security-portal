import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('fsp_token')
    const saved = localStorage.getItem('fsp_user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('fsp_token', data.access_token)
    localStorage.setItem('fsp_user',  JSON.stringify(data.user))
    setUser(data.user)
    toast.success(`Welcome back, ${data.user.full_name || data.user.username}`)
    navigate('/')
    return data
  }

  const logout = () => {
    localStorage.removeItem('fsp_token')
    localStorage.removeItem('fsp_user')
    setUser(null)
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
