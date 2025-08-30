"use client"

import type React from "react"

import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { ensureUserDoc } from "@/lib/user-helpers"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let userCred
      if (isSignUp) {
        userCred = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(userCred.user, { displayName: name })
        await ensureUserDoc({
          uid: userCred.user.uid,
          email: userCred.user.email || email,
          name,
        })
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password)
      }

      const snap = await getDoc(doc(db, "users", userCred.user.uid))
      const role = snap.exists() ? (snap.data().role as "student" | "admin") : "student"
      router.push(role === "admin" ? "/admin" : "/student")
    } catch (err: any) {
      setError(err?.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md w-full shadow-lg border border-gray-200">
      <CardHeader>
        <CardTitle className="text-pretty text-2xl font-semibold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          {isSignUp && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-700">
            {loading ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{isSignUp ? "Already have an account?" : "New here?"}</p>
        <Button variant="ghost" onClick={() => setIsSignUp((s) => !s)} className="text-teal-600 hover:text-teal-700">
          {isSignUp ? "Sign in" : "Create account"}
        </Button>
      </CardFooter>
    </Card>
  )
}
