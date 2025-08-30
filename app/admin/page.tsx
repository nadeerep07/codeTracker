"use client"

import { useEffect, useMemo, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore"
import type { Submission, UserDoc } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import SubmissionCard from "@/components/submission-card"
import { formatDateKey, isMonToSat, monthKey } from "@/lib/date-utils"

export default function AdminPage() {
  const [role, setRole] = useState<"admin" | "student" | null>(null)
  const [students, setStudents] = useState<UserDoc[]>([])
  const [selected, setSelected] = useState<UserDoc | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [bonuses, setBonuses] = useState<any[]>([])

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
    const qUsers = query(collection(db, "users"))
    const unsub = onSnapshot(qUsers, (snap) => {
      const list = snap.docs.map((d) => d.data() as UserDoc).filter((u) => u.role === "student")
      setStudents(list)
    })
    return () => unsub()
  }, [role])

async function openStudent(u: UserDoc) {
  setSelected(u)

  // 1. fetch submissions
  const qSubs = query(
    collection(db, "submissions"),
    where("uid", "==", u.uid),
    orderBy("dateKey", "desc")
  )
  const subsSnap = await getDocs(qSubs)
  setSubs(subsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) })))

  // 2. fetch leaves
  const lq = query(collection(db, "leaves"), where("uid", "==", u.uid))
  const lSnap = await getDocs(lq)
  setLeaves(lSnap.docs.map((d) => ({ id: d.id, ...d.data() })))

  // 3. fetch bonuses
  const bq = query(collection(db, "bonuses"), where("uid", "==", u.uid))
  const bSnap = await getDocs(bq)
  setBonuses(bSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
}


  async function setStatus(id: string, status: "verified" | "rejected") {
    await updateDoc(doc(db, "submissions", id), { status })
    if (selected) await openStudent(selected)
  }

  const fineAmount = useMemo(() => {
    if (!selected) return 0
    const now = new Date()
    const month = monthKey(now)
    const subsSet = new Set(subs.filter((s) => s.dateKey.slice(0, 7) === month).map((s) => s.dateKey))
    const leaveDates = new Set(
      leaves.filter((l) => l.status === "approved" && l.month === month).map((l) => l.dateKey as string),
    )
    const start = new Date(`${month}-01T00:00:00`)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    let missing = 0
    for (let dt = new Date(start); dt <= yesterday; dt.setDate(dt.getDate() + 1)) {
      if (!isMonToSat(dt)) continue
      const key = formatDateKey(dt)
      if (!subsSet.has(key) && !leaveDates.has(key)) missing++
    }
    return missing * 10
  }, [subs, leaves, selected])

  const approvedLeavesCount = useMemo(
    () => leaves.filter((l) => l.status === "approved" && l.month === monthKey(new Date())).length,
    [leaves],
  )

  const availableLeaves = useMemo(() => {
    const base = 2
    const bonus = bonuses.length
    return Math.max(0, base + bonus - approvedLeavesCount)
  }, [approvedLeavesCount, bonuses])

  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-blue-700">LeetTrack — Admin</h1>
          <Button variant="outline" onClick={() => (window.location.href = "/student")}>
            Go to Student
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-4 grid gap-6">
        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">Students</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {students.map((u) => (
              <Card key={u.uid}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{u.name || u.email}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => openStudent(u)}>
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{u.name || u.email}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded border p-3">
                            <p className="text-xs text-gray-600">Bonus leaves</p>
                            <p className="text-lg font-semibold">{bonuses.length}</p>
                          </div>
                          <div className="rounded border p-3">
                            <p className="text-xs text-gray-600">Approved leaves (this month)</p>
                            <p className="text-lg font-semibold">{approvedLeavesCount}</p>
                          </div>
                          <div className="rounded border p-3">
                            <p className="text-xs text-gray-600">Available leaves</p>
                            <p className="text-lg font-semibold text-blue-700">{availableLeaves}</p>
                          </div>
                          <div className="rounded border p-3">
                            <p className="text-xs text-gray-600">Fine (est.)</p>
                            <p className="text-lg font-semibold text-red-700">₹{fineAmount}</p>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <h3 className="font-semibold">Submissions</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {subs.length === 0 ? (
                              <p className="text-sm text-gray-600">No submissions.</p>
                            ) : (
                              subs.map((s) => (
                                <div key={s.id} className="grid gap-2">
                                  <SubmissionCard sub={s} />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-teal-600 hover:bg-teal-700"
                                      onClick={() => setStatus(s.id!, "verified")}
                                    >
                                      Verify
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setStatus(s.id!, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <h3 className="font-semibold">Leaves</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {leaves.length === 0 ? (
                              <p className="text-sm text-gray-600">No leave requests.</p>
                            ) : (
                              leaves.map((l) => (
                                <Card key={l.id}>
                                  <CardHeader className="py-2">
                                    <CardTitle className="text-sm">
                                      {l.dateKey} — {l.status}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-sm text-gray-700">
                                    <p>Month: {l.month}</p>
                                    {l.reason && <p>Reason: {l.reason}</p>}
                                    {l.status === "pending" && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-teal-600 hover:bg-teal-700"
                                          onClick={async () => {
                                            await updateDoc(doc(db, "leaves", l.id), { status: "approved" })
                                            await openStudent(u)
                                          }}
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={async () => {
                                            await updateDoc(doc(db, "leaves", l.id), { status: "rejected" })
                                            await openStudent(u)
                                          }}
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
