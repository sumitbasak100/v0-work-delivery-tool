import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null
    const fileType = formData.get("fileType") as string | null

    if (!file || !projectId || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${projectId}/${timestamp}-${sanitizedName}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(filePath)
    const fileUrl = urlData.publicUrl

    // Create file record in database
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .insert({
        project_id: projectId,
        name: file.name,
        file_type: fileType,
        status: "pending",
      })
      .select()
      .single()

    if (fileError) {
      console.error("File record error:", fileError)
      return NextResponse.json({ error: fileError.message }, { status: 500 })
    }

    // Create file version
    const { data: versionRecord, error: versionError } = await supabase
      .from("file_versions")
      .insert({
        file_id: fileRecord.id,
        file_url: fileUrl,
      })
      .select()
      .single()

    if (versionError) {
      console.error("Version record error:", versionError)
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }

    // Update file with current version
    await supabase.from("files").update({ current_version_id: versionRecord.id }).eq("id", fileRecord.id)

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      versionId: versionRecord.id,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
