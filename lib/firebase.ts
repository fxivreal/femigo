import { initializeApp, getApps } from "firebase/app"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let _auth: Auth | null = null
let _db: Firestore | null = null

export async function getAuthInstance(): Promise<Auth> {
  if (!_auth) {
    const { getAuth, connectAuthEmulator } = await import("firebase/auth")
    _auth = getAuth(app)
    if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
      connectAuthEmulator(_auth, `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`)
    }
  }
  return _auth
}

export async function getDbInstance(): Promise<Firestore> {
  if (!_db) {
    const { getFirestore, connectFirestoreEmulator } = await import("firebase/firestore")
    _db = getFirestore(app)
    if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
      connectFirestoreEmulator(_db, process.env.NEXT_PUBLIC_EMULATOR_HOST, 8080)
    }
  }
  return _db
}

export default app
