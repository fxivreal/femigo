import { NextResponse } from "next/server"
import { headers } from "next/headers"

async function getDb() {
  const { getDbInstance } = await import("@/lib/firebase")
  return getDbInstance()
}

async function verifyAuth() {
  const { getAuthInstance } = await import("@/lib/firebase")
  const auth = await getAuthInstance()
  const headerList = await headers()
  // In a real app, verify the Firebase ID token from Authorization header
  // For now, we use the userId from the request body / query
  return auth
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const db = await getDb()
    const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore")
    const q = query(
      collection(db, "whatsapp_recipients"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    const snap = await getDocs(q)
    const recipients = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ recipients })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch recipients"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, phoneNumber, label } = body

    if (!userId || !phoneNumber) {
      return NextResponse.json({ error: "userId and phoneNumber required" }, { status: 400 })
    }

    const db = await getDb()
    const { addDoc, collection, serverTimestamp } = await import("firebase/firestore")
    const ref = await addDoc(collection(db, "whatsapp_recipients"), {
      userId,
      phoneNumber,
      label: label || phoneNumber,
      createdAt: serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create recipient"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, phoneNumber, label } = body

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const db = await getDb()
    const { updateDoc, doc } = await import("firebase/firestore")
    const updateData: Record<string, string> = {}
    if (phoneNumber) updateData.phoneNumber = phoneNumber
    if (label) updateData.label = label

    await updateDoc(doc(db, "whatsapp_recipients", id), updateData)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update recipient"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const db = await getDb()
    const { deleteDoc, doc } = await import("firebase/firestore")
    await deleteDoc(doc(db, "whatsapp_recipients", id))

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete recipient"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
