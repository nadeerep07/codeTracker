"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { auth, db } from "@/lib/firebase"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { formatDateKey, datesMonToSatContaining } from "@/lib/date-utils"
import type { Submission } from "@/lib/types"

export default function UploadScreenshot() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function ensureNoDuplicateToday(uid: string) {
    const todayKey = formatDateKey(new Date())
    const q = query(collection(db, "submissions"), where("uid", "==", uid), where("dateKey", "==", todayKey))
    const snap = await getDocs(q)
    if (!snap.empty) throw new Error("You already uploaded today.")
  }

  async function maybeAwardBonus(uid: string) {
    const today = new Date()
    const weekDates = datesMonToSatContaining(today)
    const dateKeys = weekDates.map(formatDateKey)

    // Note: Firestore "in" supports up to 10 values. We have 6.
    const subsQ = query(collection(db, "submissions"), where("uid", "==", uid), where("dateKey", "in", dateKeys))
    const subsSnap = await getDocs(subsQ)
    const keysSet = new Set(subsSnap.docs.map((d) => d.data().dateKey as string))

    if (dateKeys.every((k) => keysSet.has(k))) {
      const checkQ = query(collection(db, "bonuses"), where("uid", "==", uid), where("weekStartKey", "==", dateKeys[0]))
      const checkSnap = await getDocs(checkQ)
      if (checkSnap.empty) {
        await addDoc(collection(db, "bonuses"), {
          uid,
          weekStartKey: dateKeys[0],
          awardedAt: Date.now(),
        })
      }
    }
  }

  async function handleUpload() {
    setMessage(null)
    if (!file) {
      setMessage("Please select a screenshot file.")
      return
    }
    const user = auth.currentUser
    if (!user) {
      setMessage("Please sign in first.")
      return
    }

    try {
      setUploading(true)
      await ensureNoDuplicateToday(user.uid)

      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        body: JSON.stringify({ folder: `leetcode-screenshots/${user.uid}` }),
      })
      const sign = await signRes.json()
      if (!signRes.ok) throw new Error(sign?.error || "Failed to sign upload.")

      const form = new FormData()
      form.append("file", file)
      form.append("api_key", sign.apiKey)
      form.append("timestamp", String(sign.timestamp))
      form.append("signature", sign.signature)
      form.append("folder", sign.folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
        method: "POST",
        body: form,
      })
      const data = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(data?.error?.message || "Upload failed")

      const sub: Submission = {
        uid: user.uid,
        dateKey: formatDateKey(new Date()),
        createdAt: Date.now(),
        imageUrl: data.secure_url,
        status: "pending",
      }
      await addDoc(collection(db, "submissions"), sub)
      await maybeAwardBonus(user.uid)

      setMessage("Uploaded successfully! Awaiting admin verification.")
      setFile(null)
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
        {uploading ? "Uploading..." : "Upload Screenshot"}
      </Button>
      {message && <p className="text-sm text-gray-700">{message}</p>}
    </div>
  )
}
