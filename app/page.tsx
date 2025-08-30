import AuthForm from "@/components/auth-form"

export default function Page() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-white">
      <div className="p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-pretty">LeetTrack</h1>
          <p className="text-gray-600 mt-1">
            Track daily LeetCode, leaves, bonus, and fines. Student and Admin modules.
          </p>
        </div>
        <AuthForm />
        <p className="mt-4 text-xs text-center text-gray-500">
          Color palette: blue, teal, white, gray, black. Fonts: Geist Sans, Geist Mono.
        </p>
      </div>
    </main>
  )
}
