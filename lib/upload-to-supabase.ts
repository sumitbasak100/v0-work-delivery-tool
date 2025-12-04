// Direct upload to Supabase Storage from client
// This bypasses serverless function body limits (supports up to 50MB)

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export async function uploadToSupabaseStorage(
  file: File,
  projectId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration missing")
  }

  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filePath = `${projectId}/${timestamp}-${sanitizedName}`
  const uploadUrl = `${supabaseUrl}/storage/v1/object/project-files/${filePath}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/project-files/${filePath}`
        resolve(publicUrl)
      } else {
        let errorMsg = `Upload failed (${xhr.status})`
        try {
          const response = JSON.parse(xhr.responseText)
          errorMsg = response.error || response.message || errorMsg
        } catch {
          if (xhr.statusText) errorMsg = xhr.statusText
        }
        reject(new Error(errorMsg))
      }
    }

    xhr.onerror = () => {
      reject(new Error("Network error during upload"))
    }

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out"))
    }

    xhr.open("POST", uploadUrl, true)
    xhr.setRequestHeader("Authorization", `Bearer ${supabaseAnonKey}`)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.setRequestHeader("x-upsert", "true")
    xhr.timeout = 300000 // 5 minutes timeout
    xhr.send(file)
  })
}

export function getFileType(mimeType: string): "image" | "pdf" | "video" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  return "pdf"
}
