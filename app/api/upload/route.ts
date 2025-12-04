import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected application/json with file metadata." },
        { status: 400 },
      )
    }

    const { projectId, fileId, fileName, fileType, fileUrl, isNewVersion } = await request.json()

    if (!projectId || !fileName || !fileType || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, fileName, fileType, fileUrl" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    if (isNewVersion && fileId) {
      // Create new version for existing file
      const { data: versionRecord, error: versionError } = await supabase
        .from("file_versions")
        .insert({
          file_id: fileId,
          file_url: fileUrl,
        })
        .select()
        .single()

      if (versionError) {
        console.error("Version record error:", versionError)
        return NextResponse.json({ error: versionError.message }, { status: 500 })
      }

      // Update file with new current version and reset status to pending
      const { error: updateError } = await supabase
        .from("files")
        .update({
          current_version_id: versionRecord.id,
          status: "pending", // Reset status for new version
        })
        .eq("id", fileId)

      if (updateError) {
        console.error("File update error:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        fileId: fileId,
        versionId: versionRecord.id,
      })
    }

    // Create new file record
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .insert({
        project_id: projectId,
        name: fileName,
        file_type: fileType,
        status: "pending",
      })
      .select()
      .single()

    if (fileError) {
      console.error("File record error:", fileError)
      return NextResponse.json({ error: fileError.message }, { status: 500 })
    }

    // Create file version with the URL from Supabase Storage
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
    console.error("Upload API error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
