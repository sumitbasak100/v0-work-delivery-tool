import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Check, FileCheck, Link2, Upload, Zap, Shield, Globe } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Delivr
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-3.5 w-3.5" />
                Simple. Fast. Professional.
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Deliver work.
                <br />
                <span className="text-primary">Get approvals.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground text-pretty max-w-xl mx-auto">
                The simplest way for freelancers and agencies to share files with clients and collect feedback. No
                client login required.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="gap-2 h-12 px-6">
                    Start for free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="h-12 px-6 bg-transparent">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Three simple steps to streamline your client approval workflow
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">1</div>
                <div className="relative bg-background rounded-xl p-6 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload files</h3>
                  <p className="text-muted-foreground">
                    Upload images, videos, and PDFs. Organize them into projects and manage versions easily.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">2</div>
                <div className="relative bg-background rounded-xl p-6 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Share a link</h3>
                  <p className="text-muted-foreground">
                    Generate a secure, shareable link for your client. Optional password protection available.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">3</div>
                <div className="relative bg-background rounded-xl p-6 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Get approvals</h3>
                  <p className="text-muted-foreground">
                    Clients review and approve files or request changes. Track progress in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-border">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Built for creative professionals</h2>
                <ul className="space-y-4">
                  {[
                    { icon: Globe, text: "No client login required - they just click and review" },
                    { icon: Zap, text: "Track approval progress across all your projects" },
                    { icon: Shield, text: "Version control keeps your work organized" },
                    { icon: FileCheck, text: "Clean, professional interface your clients will love" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-muted/50 rounded-2xl p-8 border border-border">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">homepage-v3.png</p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">logo-concept.pdf</p>
                      <p className="text-sm text-muted-foreground">Needs changes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">banner-design.png</p>
                      <p className="text-sm text-muted-foreground">Pending review</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start delivering work and collecting approvals in minutes. Free to get started.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" className="h-12 px-8">
                Create free account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Delivr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
