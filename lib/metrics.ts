"use client"

import { getDbInstance } from "@/lib/firebase"

export interface UserMetrics {
  totalGenerations: number
  monthlyGenerations: number
  platformCounts: Record<string, number>
  createdAt: any
  monthlyResetAt: any
}

export async function getUserMetrics(userId: string): Promise<UserMetrics> {
  const { doc, getDoc } = await import("firebase/firestore")
  const db = await getDbInstance()
  const snapshot = await getDoc(doc(db, "users", userId))

  if (!snapshot.exists()) {
    return {
      totalGenerations: 0,
      monthlyGenerations: 0,
      platformCounts: {},
      createdAt: null,
      monthlyResetAt: null,
    }
  }

  const data = snapshot.data()
  const now = new Date()
  const resetAt = data.monthlyResetAt?.toDate?.()
  const isNewMonth =
    resetAt &&
    (resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear())

  return {
    totalGenerations: data.totalGenerations ?? 0,
    monthlyGenerations: isNewMonth ? 0 : (data.monthlyGenerations ?? 0),
    platformCounts: data.platformCounts ?? {},
    createdAt: data.createdAt ?? null,
    monthlyResetAt: data.monthlyResetAt ?? null,
  }
}

export async function updateUserMetrics(userId: string, platforms: string[]) {
  const { doc, increment, serverTimestamp, setDoc, getDoc } = await import("firebase/firestore")
  const db = await getDbInstance()
  const ref = doc(db, "users", userId)

  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) {
    await setDoc(ref, {
      totalGenerations: platforms.length,
      totalSources: 1,
      monthlyGenerations: platforms.length,
      monthlyResetAt: serverTimestamp(),
      platformCounts: Object.fromEntries(platforms.map((p) => [p, 1])),
      createdAt: serverTimestamp(),
    })
    return
  }

  const data = snapshot.data()
  const resetAt = data.monthlyResetAt?.toDate?.()
  const now = new Date()
  const isNewMonth =
    !resetAt ||
    resetAt.getMonth() !== now.getMonth() ||
    resetAt.getFullYear() !== now.getFullYear()

  const updates: Record<string, unknown> = {
    totalGenerations: increment(platforms.length),
    totalSources: increment(1),
  }

  if (isNewMonth) {
    updates.monthlyGenerations = platforms.length
    updates.monthlyResetAt = serverTimestamp()
  } else {
    updates.monthlyGenerations = increment(platforms.length)
  }

  for (const p of platforms) {
    updates[`platformCounts.${p}`] = increment(1)
  }

  await setDoc(ref, updates, { merge: true })
}
