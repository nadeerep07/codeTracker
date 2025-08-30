"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export default function LeaveRequestDialog({ availableLeaves }: { availableLeaves: number }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSubmit() {
    setMsg(null)
    const user = auth.currentUser
    if (!user) {
      setMsg("Please sign in.")
      return
    }
    if (!date) {
      setMsg("Please choose a date.")
      return
    }
    try {
      setSubmitting(true)
      const month = date.slice(0, 7)
      const approvedQ = query(
        collection(db, "leaves"),
        where("uid", "==", user.uid),
        where("month", "==", month),
        where("status", "==", "approved"),
      )
      const approvedSnap = await getDocs(approvedQ)
      const approvedCount = approvedSnap.size
      if (approvedCount >= availableLeaves) {
        setMsg("You have no remaining leaves this month.")
        setSubmitting(false)
        return
      }

      await addDoc(collection(db, "leaves"), {
        uid: user.uid,
        month,
        dateKey: date,
        reason,
        status: "pending",
        requestedAt: Date.now(),
      })
      setMsg("Leave requested. Waiting for admin approval.")
      setDate("")
      setReason("")
      setOpen(false)
    } catch (e: any) {
      setMsg(e?.message || "Failed to request leave")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50 bg-transparent">
          Request Leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Leave</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="date">Date (YYYY-MM-DD)</Label>
            <Input id="date" placeholder="2025-09-02" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="Taking a day off"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-600">Remaining this month: {availableLeaves}</p>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
