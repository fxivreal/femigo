import { initializeApp, getApps } from "firebase/app"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let _auth: any = null
let _db: any = null

const _import = (path: string) => eval(`import("${path}")`)

export async function getAuthInstance(): Promise<any> {
  if (!_auth) {
    const mod = await _import("firebase/auth")
    _auth = mod.getAuth(app)
    if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
      mod.connectAuthEmulator(_auth, `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`)
    }
  }
  return _auth
}

export async function getDbInstance(): Promise<any> {
  if (!_db) {
    const mod = await _import("firebase/firestore")
    _db = mod.getFirestore(app)
    if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
      mod.connectFirestoreEmulator(_db, process.env.NEXT_PUBLIC_EMULATOR_HOST, 8080)
    }
  }
  return _db
}

export default app
