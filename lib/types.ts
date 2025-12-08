export type FileStatus = "pending" | "approved" | "needs_changes"

export interface User {
  id: string
  name: string | null
  email: string
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  share_id: string
  password: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  name: string
  file_type: "image" | "video" | "pdf"
  status: FileStatus
  current_version_id: string | null
  created_at: string
  updated_at: string
}

export interface FileVersion {
  id: string
  file_id: string
  file_url: string
  thumbnail_url: string | null
  created_at: string
}

export interface Feedback {
  id: string
  file_id: string
  file_version_id: string | null
  text: string
  created_at: string
  markup_x?: number | null
  markup_y?: number | null
  markup_timestamp?: number | null
  markup_page?: number | null // Add markup_page field for PDF page markups
}

export interface ProjectWithStats extends Project {
  total_files: number
  approved_files: number
}

export interface FileWithDetails extends ProjectFile {
  current_version?: FileVersion
  versions?: FileVersion[]
  feedback?: Feedback[]
}
