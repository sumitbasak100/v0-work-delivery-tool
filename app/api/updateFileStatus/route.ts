import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId, status } = await request.json()
    const supabase = await createClient()

    const { error } = await supabase.from("files").update({ status }).eq("id", fileId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
