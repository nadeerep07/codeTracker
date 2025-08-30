import crypto from "crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const folder = body.folder || "leetcode-screenshots"
    const timestamp = Math.floor(Date.now() / 1000)

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Missing Cloudinary env vars" }, { status: 500 })
    }

    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash("sha1").update(toSign).digest("hex")

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
