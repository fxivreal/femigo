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

export async function getAuthInstance(): Promise<any> {
  if (!_auth) {
    const { auth } = await import("./firebase-auth-init")
    _auth = auth
  }
  return _auth
}

export async function getDbInstance(): Promise<any> {
  if (!_db) {
    const { db } = await import("./firebase-db-init")
    _db = db
  }
  return _db
}

export default app
