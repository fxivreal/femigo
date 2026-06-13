import { getDbInstance } from "@/lib/firebase"
import { doc, increment, updateDoc, setDoc, getDoc } from "firebase/firestore"

export async function incrementMetric(userId: string, field: string): Promise<void> {
  try {
    const db = await getDbInstance()
    const userRef = doc(db, "users", userId)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      await updateDoc(userRef, { [field]: increment(1) })
    } else {
      await setDoc(userRef, { [field]: 1 }, { merge: true })
    }
  } catch {
    // silent
  }
}
