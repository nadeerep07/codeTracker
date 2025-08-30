import { db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import type { UserDoc } from "./types"

export async function ensureUserDoc({
  uid,
  email,
  name,
}: {
  uid: string
  email: string
  name?: string
}) {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const userDoc: UserDoc = {
      uid,
      email,
      name,
      role: "student", // default
      createdAt: Date.now(),
    }
    await setDoc(ref, userDoc)
    return userDoc
  }
  return snap.data() as UserDoc
}
