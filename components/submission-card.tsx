"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Submission } from "@/lib/types"

export default function SubmissionCard({ sub }: { sub: Submission }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{sub.dateKey}</span>
          <span
            className={
              sub.status === "verified"
                ? "text-green-700"
                : sub.status === "rejected"
                  ? "text-red-700"
                  : "text-gray-600"
            }
          >
            {sub.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <img
          src={sub.imageUrl || "/placeholder.svg?height=300&width=500&query=leetcode%20screenshot"}
          alt={`Submission on ${sub.dateKey}`}
          className="w-full h-auto"
        />
      </CardContent>
    </Card>
  )
}
