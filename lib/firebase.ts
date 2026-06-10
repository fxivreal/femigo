import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore"

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

export function getAuthInstance(): Auth {
  if (!_auth) _auth = getAuth(app)
  return _auth
}

export function getDbInstance(): Firestore {
  if (!_db) _db = getFirestore(app)
  return _db
}

if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
  connectAuthEmulator(getAuthInstance(), `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`)
  connectFirestoreEmulator(getDbInstance(), process.env.NEXT_PUBLIC_EMULATOR_HOST, 8080)
}

export default app
