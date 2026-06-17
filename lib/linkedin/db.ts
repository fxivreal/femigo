import { getDbInstance } from "@/lib/firebase"
import { doc, getDoc, setDoc, deleteDoc, Timestamp } from "firebase/firestore"
import type { LinkedInAuth } from "./types"

export async function saveLinkedInAuth(userId: string, auth: LinkedInAuth): Promise<void> {
  const db = await getDbInstance()
  await setDoc(doc(db, "users", userId, "linkedin", "auth"), {
    accessToken: auth.accessToken,
    expiresAt: auth.expiresAt,
    personId: auth.personId,
    name: auth.name || null,
    email: auth.email || null,
    connectedAt: Timestamp.now(),
  })
}

export async function getLinkedInAuth(userId: string): Promise<LinkedInAuth | null> {
  const db = await getDbInstance()
  const snap = await getDoc(doc(db, "users", userId, "linkedin", "auth"))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    accessToken: data.accessToken,
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    personId: data.personId,
    name: data.name,
    email: data.email,
  }
}

export async function deleteLinkedInAuth(userId: string): Promise<void> {
  const db = await getDbInstance()
  const ref = doc(db, "users", userId, "linkedin", "auth")
  await deleteDoc(ref)
}
