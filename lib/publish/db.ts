import type { PublishJob, Recipient } from "./types"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import type { Firestore } from "firebase/firestore"
import { getDbInstance } from "@/lib/firebase"

async function getDb(): Promise<Firestore> {
  return getDbInstance()
}

function snapshotToDoc<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  const data = snap.data()
  const parsed: Record<string, unknown> = { id: snap.id }
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Timestamp) {
      parsed[k] = v.toDate()
    } else {
      parsed[k] = v
    }
  }
  return parsed as T
}

// ── Publish Jobs ──

export async function createPublishJob(input: {
  userId: string
  platform: string
  content: string
  label?: string
  platformType?: string
  recipientPhone?: string | null
  status: string
  attempt: number
  scheduledAt: Date
}): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "publish_jobs"), {
    ...input,
    scheduledAt: input.scheduledAt,
    sentAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePublishJob(
  jobId: string,
  data: {
    status?: string
    messageId?: string
    error?: string
    attempt?: number
    sentAt?: Date | null
  }
): Promise<void> {
  const db = await getDb()
  const updateData: Record<string, unknown> = { ...data }
  if (data.sentAt) {
    updateData.sentAt = data.sentAt
  }
  await updateDoc(doc(db, "publish_jobs", jobId), updateData)
}

export async function getPublishJob(jobId: string): Promise<PublishJob | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, "publish_jobs", jobId))
  if (!snap.exists()) return null
  return snapshotToDoc<PublishJob>(snap)
}

export async function listPublishJobs(userId: string): Promise<PublishJob[]> {
  const db = await getDb()
  const q = query(
    collection(db, "publish_jobs"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<PublishJob>(d))
}

// ── Recipients ──

export async function createRecipient(input: {
  userId: string
  phoneNumber: string
  label: string
}): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_recipients"), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRecipient(
  recipientId: string,
  data: { phoneNumber?: string; label?: string }
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_recipients", recipientId), data)
}

export async function deleteRecipient(recipientId: string): Promise<void> {
  const db = await getDb()
  await deleteDoc(doc(db, "whatsapp_recipients", recipientId))
}

export async function listRecipients(userId: string): Promise<Recipient[]> {
  const db = await getDb()
  const q = query(
    collection(db, "whatsapp_recipients"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<Recipient>(d))
}
