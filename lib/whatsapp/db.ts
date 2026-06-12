import type {
  WACampaignInput,
  WAStatusInput,
  WABroadcastInput,
  WAFunnelInput,
  WAFollowUpInput,
  WACampaignDoc,
  WAStatusDoc,
  WABroadcastDoc,
  WAFunnelDoc,
  WAFollowUpDoc,
} from "./types"
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

// ── Helpers ──

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

// ── Campaigns ──

export async function createCampaign(
  userId: string,
  input: WACampaignInput
): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_campaigns"), {
    ...input,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCampaign(
  campaignId: string,
  input: Partial<WACampaignInput>
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_campaigns", campaignId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const db = await getDb()
  await deleteDoc(doc(db, "whatsapp_campaigns", campaignId))
}

export async function getCampaign(campaignId: string): Promise<WACampaignDoc | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, "whatsapp_campaigns", campaignId))
  if (!snap.exists()) return null
  return snapshotToDoc<WACampaignDoc>(snap)
}

export async function listCampaigns(userId: string): Promise<WACampaignDoc[]> {
  const db = await getDb()
  const q = query(
    collection(db, "whatsapp_campaigns"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<WACampaignDoc>(d))
}

// ── Statuses ──

export async function createStatus(
  userId: string,
  input: WAStatusInput
): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_statuses"), {
    ...input,
    userId,
    status: "draft",
    sentAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function createStatuses(
  userId: string,
  items: WAStatusInput[]
): Promise<string[]> {
  return Promise.all(items.map((item) => createStatus(userId, item)))
}

export async function updateStatus(
  statusId: string,
  data: { status?: string; messageId?: string; sentAt?: unknown }
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_statuses", statusId), data)
}

export async function listStatuses(
  userId: string,
  campaignId?: string
): Promise<WAStatusDoc[]> {
  const db = await getDb()
  const base = [where("userId", "==", userId)]
  if (campaignId) {
    const q = query(collection(db, "whatsapp_statuses"), ...base, where("campaignId", "==", campaignId), orderBy("order", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapshotToDoc<WAStatusDoc>(d))
  }
  const q = query(collection(db, "whatsapp_statuses"), ...base, orderBy("order", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<WAStatusDoc>(d))
}

// ── Broadcasts ──

export async function createBroadcast(
  userId: string,
  input: WABroadcastInput
): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_broadcasts"), {
    ...input,
    userId,
    status: "draft",
    sentAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function createBroadcasts(
  userId: string,
  items: WABroadcastInput[]
): Promise<string[]> {
  return Promise.all(items.map((item) => createBroadcast(userId, item)))
}

export async function updateBroadcast(
  broadcastId: string,
  data: { status?: string; messageId?: string; sentAt?: unknown }
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_broadcasts", broadcastId), data)
}

export async function listBroadcasts(
  userId: string,
  campaignId?: string
): Promise<WABroadcastDoc[]> {
  const db = await getDb()
  const base = [where("userId", "==", userId)]
  if (campaignId) {
    const q = query(collection(db, "whatsapp_broadcasts"), ...base, where("campaignId", "==", campaignId), orderBy("createdAt", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapshotToDoc<WABroadcastDoc>(d))
  }
  const q = query(collection(db, "whatsapp_broadcasts"), ...base, orderBy("createdAt", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<WABroadcastDoc>(d))
}

// ── Funnels ──

export async function createFunnelStep(
  userId: string,
  input: WAFunnelInput
): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_funnels"), {
    ...input,
    userId,
    status: "draft",
    sentAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function createFunnelSteps(
  userId: string,
  items: WAFunnelInput[]
): Promise<string[]> {
  return Promise.all(items.map((item) => createFunnelStep(userId, item)))
}

export async function updateFunnelStep(
  funnelId: string,
  data: { status?: string; messageId?: string; sentAt?: unknown }
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_funnels", funnelId), data)
}

export async function listFunnelSteps(
  userId: string,
  campaignId?: string
): Promise<WAFunnelDoc[]> {
  const db = await getDb()
  const base = [where("userId", "==", userId)]
  if (campaignId) {
    const q = query(collection(db, "whatsapp_funnels"), ...base, where("campaignId", "==", campaignId), orderBy("order", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapshotToDoc<WAFunnelDoc>(d))
  }
  const q = query(collection(db, "whatsapp_funnels"), ...base, orderBy("order", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<WAFunnelDoc>(d))
}

// ── Follow-ups ──

export async function createFollowUp(
  userId: string,
  input: WAFollowUpInput
): Promise<string> {
  const db = await getDb()
  const ref = await addDoc(collection(db, "whatsapp_followups"), {
    ...input,
    userId,
    status: "draft",
    sentAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function createFollowUps(
  userId: string,
  items: WAFollowUpInput[]
): Promise<string[]> {
  return Promise.all(items.map((item) => createFollowUp(userId, item)))
}

export async function updateFollowUp(
  followUpId: string,
  data: { status?: string; messageId?: string; sentAt?: unknown }
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, "whatsapp_followups", followUpId), data)
}

export async function listFollowUps(
  userId: string,
  campaignId?: string
): Promise<WAFollowUpDoc[]> {
  const db = await getDb()
  const base = [where("userId", "==", userId)]
  if (campaignId) {
    const q = query(collection(db, "whatsapp_followups"), ...base, where("campaignId", "==", campaignId), orderBy("createdAt", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapshotToDoc<WAFollowUpDoc>(d))
  }
  const q = query(collection(db, "whatsapp_followups"), ...base, orderBy("createdAt", "asc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapshotToDoc<WAFollowUpDoc>(d))
}
