import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// This API route handles email notifications when clients provide feedback
// In production, integrate with SendGrid, Postmark, or Resend

export async function POST(request: NextRequest) {
  try {
    const { type, projectId, fileId, fileName } = await request.json()

    const supabase = await createClient()

    // Get project and owner details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        users(email, name)
      `)
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const ownerEmail = project.users?.email
    const ownerName = project.users?.name || "there"

    if (!ownerEmail) {
      return NextResponse.json({ error: "Owner email not found" }, { status: 404 })
    }

    // In production, send actual emails using SendGrid/Postmark/Resend
    // For now, we'll log the notification
    const notifications = {
      feedback: {
        subject: `New feedback on "${project.name}"`,
        body: `Hi ${ownerName},\n\nYour client has requested changes on "${fileName}" in the project "${project.name}".\n\nView the project: ${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/projects/${projectId}`,
      },
      approved: {
        subject: `File approved in "${project.name}"`,
        body: `Hi ${ownerName},\n\nYour client has approved "${fileName}" in the project "${project.name}".\n\nView the project: ${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/projects/${projectId}`,
      },
      all_approved: {
        subject: `All files approved in "${project.name}"`,
        body: `Hi ${ownerName},\n\nGreat news! Your client has approved all files in the project "${project.name}".\n\nView the project: ${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/projects/${projectId}`,
      },
    }

    const notification = notifications[type as keyof typeof notifications]

    if (!notification) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Log notification (in production, send actual email)
    console.log("📧 Email notification:", {
      to: ownerEmail,
      subject: notification.subject,
      body: notification.body,
    })

    // TODO: Implement actual email sending
    // Example with Resend:
    // await resend.emails.send({
    //   from: "Sendro <notifications@sendro.app>",
    //   to: ownerEmail,
    //   subject: notification.subject,
    //   text: notification.body,
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
