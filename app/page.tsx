import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Check, FileCheck, Link2, Upload } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Delivr
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              Deliver work.
              <br />
              Get approvals.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground text-pretty max-w-xl mx-auto">
              The simplest way for freelancers and agencies to share files with clients and collect feedback. No client
              login required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-24">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Upload files</h3>
                <p className="text-muted-foreground">
                  Upload images, videos, and PDFs. Organize them into projects and manage versions with ease.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Share a link</h3>
                <p className="text-muted-foreground">
                  Generate a secure, shareable link for your client. Optional password protection available.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Get approvals</h3>
                <p className="text-muted-foreground">
                  Clients review and approve files or request changes. Track progress in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why choose Delivr?</h2>
            <ul className="space-y-4">
              {[
                "No client login required - they just click and review",
                "Track approval progress across all your projects",
                "Version control keeps your work organized",
                "Clean, professional interface your clients will love",
                "Email notifications when clients provide feedback",
                "Works on any device - desktop, tablet, or phone",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-status-approved/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-status-approved" />
                  </div>
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-24 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-muted-foreground mb-8">Start delivering work and collecting approvals in minutes.</p>
            <Link href="/auth/sign-up">
              <Button size="lg">Create free account</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Delivr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
