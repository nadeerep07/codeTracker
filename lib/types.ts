export type Role = "student" | "admin"

export type SubmissionStatus = "pending" | "verified" | "rejected"

export interface UserDoc {
  uid: string
  email: string
  name?: string
  role: Role
  createdAt: number
}

export interface Submission {
  id?: string
  uid: string
  dateKey: string // YYYY-MM-DD
  createdAt: number
  imageUrl: string
  status: SubmissionStatus
}

export interface LeaveRequest {
  id?: string
  uid: string
  month: string // YYYY-MM
  dateKey: string // leave date
  reason?: string
  status: "pending" | "approved" | "rejected"
  requestedAt: number
}

export interface BonusLeave {
  id?: string
  uid: string
  weekStartKey: string // YYYY-MM-DD (Monday)
  awardedAt: number
}
