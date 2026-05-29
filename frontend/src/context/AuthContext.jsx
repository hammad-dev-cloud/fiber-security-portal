import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// =====================================================================
// SESSION CONFIG
// =====================================================================
// 15 minutes of inactivity → automatic sign-out
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

// We use sessionStorage (NOT localStorage) so that:
//   • Closing the browser/tab → automatic sign-out
//   • Refreshing the same tab → stays logged in (good UX)
const STORAGE_TOKEN = 'fsp_token'
const STORAGE_USER  = 'fsp_user'

const session = {
  get token() { return sessionStorage.getItem(STORAGE_TOKEN) },
  get user()  { try { return JSON.parse(sessionStorage.getItem(STORAGE_USER) || 'null') } catch { return null } },
  save(token, user) {
    sessionStorage.setItem(STORAGE_TOKEN, token)
    sessionStorage.setItem(STORAGE_USER,  JSON.stringify(user))
  },
  clear() {
    sessionStorage.removeItem(STORAGE_TOKEN)
    sessionStorage.removeItem(STORAGE_USER)
  },
}

// =====================================================================
// PROVIDER
// =====================================================================
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()
  const timerRef              = useRef(null)

  // ---------------------------------------------------------------
  // Restore session on mount (only from sessionStorage)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (session.token && session.user) {
      setUser(session.user)
    }
    setLoading(false)
  }, [])

  // ---------------------------------------------------------------
  // Logout — used by user action AND by inactivity timer
  // ---------------------------------------------------------------
  const logout = useCallback((reason = 'manual') => {
    session.clear()
    setUser(null)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Different toast based on reason
    if (reason === 'inactivity') {
      toast('Signed out due to 15 minutes of inactivity', {
        icon: '⏰',
        duration: 5000,
        style: { background: '#27304a', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)' },
      })
    } else if (reason !== 'silent') {
      toast.success('Signed out')
    }

    navigate('/login')
  }, [navigate])

  // ---------------------------------------------------------------
  // Inactivity timer — resets on any user activity
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!user) return  // Only run when logged in

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout('inactivity')
      }, INACTIVITY_TIMEOUT_MS)
    }

    // Events that count as "activity"
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()  // Start initial timer

    // Cleanup on logout/unmount
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [user, logout])

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------
  const login = async (username, password) => {
    const data = await authApi.login(username, password)
    session.save(data.access_token, data.user)
    setUser(data.user)
    toast.success(`Welcome back, ${data.user.full_name || data.user.username}`)
    navigate('/')
    return data
  }

  // ---------------------------------------------------------------
  // Update user info in storage (called by Settings page)
  // ---------------------------------------------------------------
  const updateLocalUser = (patch) => {
    const merged = { ...(session.user || {}), ...patch }
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(merged))
    setUser(merged)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
