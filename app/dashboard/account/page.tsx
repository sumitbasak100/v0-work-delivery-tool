import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { AccountForm } from "@/components/account/account-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your account settings and preferences.",
}

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 sm:mb-8">Account</h1>
        <AccountForm user={user} />
      </main>
    </div>
  )
}
