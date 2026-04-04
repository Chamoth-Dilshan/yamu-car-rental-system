import { createContext, useContext, useEffect, useState } from 'react'
import API from '../api/axios'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const hasPermission = (permission) => Boolean(user?.permissions?.includes(permission))
  const hasAnyPermission = (...permissions) => permissions.some((permission) => hasPermission(permission))
  const hasAllPermissions = (...permissions) => permissions.every((permission) => hasPermission(permission))

  const clearSession = () => {
    localStorage.removeItem('uprm_token')
    localStorage.removeItem('uprm_user')
    setUserState(null)
    setNotifications([])
    setUnreadNotificationCount(0)
  }

  const setUser = (nextUser) => {
    setUserState(nextUser)

    if (nextUser) {
      localStorage.setItem('uprm_user', JSON.stringify(nextUser))
    } else {
      localStorage.removeItem('uprm_user')
    }
  }

  const syncUnreadCount = (nextUnreadCount, baseUser = null) => {
    setUnreadNotificationCount(nextUnreadCount)
    setUserState((currentUser) => {
      const sourceUser = baseUser || currentUser

      if (!sourceUser) {
        return sourceUser
      }

      const nextUser = { ...sourceUser, unreadNotificationCount: nextUnreadCount }
      localStorage.setItem('uprm_user', JSON.stringify(nextUser))
      return nextUser
    })
  }

  const refreshNotifications = async () => {
    try {
      const res = await API.get('/users/notifications')
      setNotifications(res.data.notifications || [])
      syncUnreadCount(res.data.unreadCount || 0)
      return res.data
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        clearSession()
      }

      throw error
    }
  }

  const markNotificationRead = async (notificationId) => {
    try {
      const res = await API.put(`/users/notifications/${notificationId}/read`)
      setNotifications(res.data.notifications || [])
      syncUnreadCount(res.data.unreadCount || 0)
      return res.data
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        clearSession()
      }

      throw error
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      const res = await API.put('/users/notifications/read-all')
      setNotifications(res.data.notifications || [])
      syncUnreadCount(res.data.unreadCount || 0)
      return res.data
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        clearSession()
      }

      throw error
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('uprm_token')
    const storedUser = localStorage.getItem('uprm_user')
    const hasStoredUser = Boolean(storedUser)

    if (!token) {
      setLoading(false)
      return
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUserState(parsedUser)
      setUnreadNotificationCount(parsedUser.unreadNotificationCount || 0)
      setLoading(false)
    }

    let active = true

    const hydrateNotifications = async (baseUser = null) => {
      try {
        const notificationRes = await API.get('/users/notifications')

        if (!active) {
          return
        }

        setNotifications(notificationRes.data.notifications || [])
        syncUnreadCount(notificationRes.data.unreadCount || baseUser?.unreadNotificationCount || 0, baseUser)
      } catch (error) {
        if (active && [401, 403].includes(error?.response?.status)) {
          clearSession()
        }
      }
    }

    const hydrateSession = async () => {
      try {
        const meRes = await API.get('/auth/me')

        if (!active) {
          return
        }

        const nextUser = meRes.data
        setUserState(nextUser)
        localStorage.setItem('uprm_user', JSON.stringify(nextUser))

        if (!hasStoredUser) {
          setLoading(false)
        }

        hydrateNotifications(nextUser)
      } catch {
        if (!active) {
          return
        }

        clearSession()

        if (active) {
          setLoading(false)
        }
      }
    }

    hydrateSession()

    const intervalId = setInterval(() => {
      if (!localStorage.getItem('uprm_token')) {
        return
      }

      API.get('/users/notifications')
        .then((res) => {
          if (!active) {
            return
          }

          setNotifications(res.data.notifications || [])
          syncUnreadCount(res.data.unreadCount || 0)
        })
        .catch((error) => {
          if (active && [401, 403].includes(error?.response?.status)) {
            clearSession()
          }
        })
    }, 30000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [])

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password })
    const { token, ...userData } = res.data
    localStorage.setItem('uprm_token', token)
    setUser(userData)
    await refreshNotifications().catch(() => {})
    return userData
  }

  const register = async (payload) => {
    const res = await API.post('/auth/register', payload)
    const { token, ...userData } = res.data
    localStorage.setItem('uprm_token', token)
    setUser(userData)
    await refreshNotifications().catch(() => {})
    return userData
  }

  const switchRole = async (role) => {
    const res = await API.put('/auth/switch-role', { role })
    const { token, ...userData } = res.data
    localStorage.setItem('uprm_token', token)
    setUser(userData)
    await refreshNotifications().catch(() => {})
    return userData
  }

  const refreshMe = async () => {
    try {
      const res = await API.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        clearSession()
      }

      throw error
    }
  }

  const logout = () => {
    clearSession()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        notifications,
        unreadNotificationCount,
        login,
        register,
        logout,
        switchRole,
        refreshMe,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
