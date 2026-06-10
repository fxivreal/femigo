import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Lazy init — only in browser to prevent SSR prerender errors
export const auth = typeof window !== "undefined" ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>)
export const db = typeof window !== "undefined" ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>)

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_EMULATOR_HOST) {
  connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`)
  connectFirestoreEmulator(db, process.env.NEXT_PUBLIC_EMULATOR_HOST, 8080)
}

export default app
