"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { getAuthInstance } from "@/lib/firebase"

interface AuthContextType {
  user: any
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const authRef = useRef<any>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const auth = await getAuthInstance()
      if (cancelled) return
      authRef.current = auth
      const { onAuthStateChanged } = await import("firebase/auth")
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
        setUser(firebaseUser)
        setLoading(false)
      })
      cleanupRef.current = unsubscribe
    })()
    return () => {
      cancelled = true
      cleanupRef.current?.()
    }
  }, [])

  const signOut = async () => {
    const auth = authRef.current || (await getAuthInstance())
    const { signOut: firebaseSignOut } = await import("firebase/auth")
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
