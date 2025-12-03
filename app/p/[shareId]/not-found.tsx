import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileX } from "lucide-react"

export default function ProjectNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <FileX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          This project link is invalid or the project has been deactivated. Please contact the person who shared this
          link with you.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Homepage</Button>
        </Link>
      </div>
    </div>
  )
}
