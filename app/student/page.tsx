"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import UploadScreenshot from "@/components/upload-screenshot"
import LeaveRequestDialog from "@/components/leave-request-dialog"
import SubmissionCard from "@/components/submission-card"
import { formatDateKey, isMonToSat, monthKey } from "@/lib/date-utils"
import type { Submission } from "@/lib/types"
import Link from "next/link"

export default function StudentPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [approvedLeavesCount, setApprovedLeavesCount] = useState(0)
  const [bonusesCount, setBonusesCount] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/"
      } else {
        setUserId(u.uid)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!userId) return
    const qSubs = query(collection(db, "submissions"), where("uid", "==", userId))
    const unsub = onSnapshot(qSubs, (snap) => {
      const list: Submission[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) }))
      list.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
      setSubs(list)
    })
    return () => unsub()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const currentMonth = monthKey(new Date())
    const leavesQ = query(
      collection(db, "leaves"),
      where("uid", "==", userId),
      where("month", "==", currentMonth),
      where("status", "==", "approved"),
    )
    const unsubLeaves = onSnapshot(leavesQ, (snap) => setApprovedLeavesCount(snap.size))

    const bonusQ = query(collection(db, "bonuses"), where("uid", "==", userId))
    const unsubBonus = onSnapshot(bonusQ, (snap) => setBonusesCount(snap.size))

    return () => {
      unsubLeaves()
      unsubBonus()
    }
  }, [userId])

  const monthlyBaseLeaves = 2
  const availableLeaves = Math.max(0, monthlyBaseLeaves + bonusesCount - approvedLeavesCount)

  const [fineAmount, setFineAmount] = useState(0)
  useEffect(() => {
    async function computeFine() {
      if (!userId) return setFineAmount(0)
      const now = new Date()
      const month = monthKey(now)
      const subsSet = new Set(subs.filter((s) => s.dateKey.slice(0, 7) === month).map((s) => s.dateKey))
      const leaveDates = new Set<string>()
      const leavesQ = query(
        collection(db, "leaves"),
        where("uid", "==", userId),
        where("month", "==", month),
        where("status", "==", "approved"),
      )
      const leaveSnap = await getDocs(leavesQ)
      leaveSnap.docs.forEach((d) => leaveDates.add(d.data().dateKey))
      const start = new Date(`${month}-01T00:00:00`)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      let missing = 0
      for (let dt = new Date(start); dt <= yesterday; dt.setDate(dt.getDate() + 1)) {
        if (!isMonToSat(dt)) continue
        const key = formatDateKey(dt)
        const hasSub = subsSet.has(key)
        const isLeave = leaveDates.has(key)
        if (!hasSub && !isLeave) missing++
      }
      setFineAmount(missing * 10)
    }
    computeFine()
  }, [subs, userId])

  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-blue-700">LeetTrack — Student</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Admin?
            </Link>
            <Button variant="outline" onClick={() => signOut(auth)}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-4 grid gap-6">
        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">Daily Upload</h2>
          <p className="text-sm text-gray-600">Upload your LeetCode screenshot for today. One upload per day.</p>
          <UploadScreenshot />
        </div>

        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">Leaves & Fines</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Monthly base leaves</p>
              <p className="text-2xl font-semibold">2</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Bonus leaves awarded</p>
              <p className="text-2xl font-semibold text-teal-700">{bonusesCount}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Approved leaves used</p>
              <p className="text-2xl font-semibold">{approvedLeavesCount}</p>
            </div>
            <div className="rounded-lg border p-4 md:col-span-2">
              <p className="text-sm text-gray-600">Leaves available this month</p>
              <p className="text-2xl font-semibold text-blue-700">{availableLeaves}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Current fine total</p>
              <p className="text-2xl font-semibold text-red-700">₹{fineAmount}</p>
            </div>
          </div>
          <div className="mt-2">
            <LeaveRequestDialog availableLeaves={availableLeaves} />
          </div>
        </div>

        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">Your Submissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subs.length === 0 ? (
              <p className="text-sm text-gray-600">No submissions yet.</p>
            ) : (
              subs.map((s) => <SubmissionCard key={s.id} sub={s} />)
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
