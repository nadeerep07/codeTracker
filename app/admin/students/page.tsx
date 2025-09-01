"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import type { UserDoc, Submission } from "@/lib/types"
import { formatDateKey, isMonToSat, monthKey } from "@/lib/date-utils"

interface Row {
  user: UserDoc
  bonuses: number
  approvedLeaves: number
  availableLeaves: number
  fine: number
  lastSubmission?: string
}

export default function AdminStudentsListPage() {
  const [role, setRole] = useState<"admin" | "student" | null>(null)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return (window.location.href = "/")
      const snap = await getDoc(doc(db, "users", u.uid))
      const r = snap.exists() ? (snap.data().role as "admin" | "student") : "student"
      setRole(r)
      if (r !== "admin") window.location.href = "/student"
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (role !== "admin") return
    ;(async () => {
      const usersSnap = await getDocs(query(collection(db, "users")))
      const students = usersSnap.docs.map((d) => d.data() as UserDoc).filter((u) => u.role === "student")

      const month = monthKey(new Date())
      const results: Row[] = []
      for (const u of students) {
        const subsSnap = await getDocs(query(collection(db, "submissions"), where("uid", "==", u.uid)))
        const subs = subsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) }))
        subs.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
        const lastSubmission = subs[0]?.dateKey

        const bonusesSnap = await getDocs(query(collection(db, "bonuses"), where("uid", "==", u.uid)))
        const bonuses = bonusesSnap.size

        const leavesSnap = await getDocs(
          query(collection(db, "leaves"), where("uid", "==", u.uid), where("month", "==", month)),
        )
        const leaves = leavesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))

        // Only count approved regular leaves toward monthly allowance
        const approvedRegularLeaves = leaves.filter(
          (l) => l.status === "approved" && (l.kind || "regular") !== "skip-next-day",
        ).length

        const base = 2
        const availableLeaves = Math.max(0, base + bonuses - approvedRegularLeaves)

        // For fines, any approved leave (regular or skip-next-day) exempts that date
        const subsSet = new Set(subs.filter((s) => s.dateKey.slice(0, 7) === month).map((s) => s.dateKey))
        const approvedLeaveDates = new Set<string>(leaves.filter((l) => l.status === "approved").map((l) => l.dateKey))

        const start = new Date(`${month}-01T00:00:00`)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        let missing = 0
        for (let dt = new Date(start); dt <= yesterday; dt.setDate(dt.getDate() + 1)) {
          if (!isMonToSat(dt)) continue
          const key = formatDateKey(dt)
          if (!subsSet.has(key) && !approvedLeaveDates.has(key)) missing++
        }
        const fine = missing * 10

        results.push({
          user: u,
          bonuses,
          approvedLeaves: approvedRegularLeaves,
          availableLeaves,
          fine,
          lastSubmission,
        })
      }
      setRows(results)
    })()
  }, [role])

  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-blue-700">LeetTrack — Students</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
              Back to Admin
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <div key={r.user.uid} className="rounded-lg border p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 text-pretty">{r.user.name || r.user.email}</h3>
                    {r.user.name && <p className="text-xs text-gray-600">{r.user.email}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => (window.location.href = "/admin")}>
                    Manage
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded border p-2">
                    <p className="text-xs text-gray-600">Bonuses</p>
                    <p className="text-lg font-semibold text-teal-700">{r.bonuses}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-xs text-gray-600">Approved Leaves (regular)</p>
                    <p className="text-lg font-semibold">{r.approvedLeaves}</p>
                  </div>
                  <div className="rounded border p-2 col-span-2">
                    <p className="text-xs text-gray-600">Leaves Available</p>
                    <p className="text-lg font-semibold text-blue-700">{r.availableLeaves}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-xs text-gray-600">Fine</p>
                    <p className="text-lg font-semibold text-red-700">₹{r.fine}</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-xs text-gray-600">Last Submission</p>
                    <p className="text-lg font-semibold">{r.lastSubmission || "-"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
