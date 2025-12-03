import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Check, FileCheck, Link2, Upload, Sparkles, Zap, Shield, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
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

      {/* Hero - Centered content */}
      <main className="flex-1">
        <section className="max-w-[1280px] mx-auto px-6 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Simple file delivery for creative teams
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance leading-[1.1]">
              Deliver work.
              <br />
              <span className="text-muted-foreground">Get approvals.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground text-pretty max-w-xl mx-auto">
              The simplest way for freelancers and agencies to share files with clients and collect feedback. No client
              login required.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 h-12 px-6 text-base">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y border-border bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Trusted by <strong className="text-foreground">500+</strong> creative teams
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">10,000+</strong> files delivered
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">2x faster</strong> approval cycles
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-background">
          <div className="max-w-[1280px] mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Three simple steps to streamline your client workflow
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="relative text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div
                  className="absolute top-8 left-1/2 w-full h-px bg-border hidden md:block"
                  style={{ transform: "translateX(50%)" }}
                />
                <h3 className="text-xl font-semibold mb-2">Upload files</h3>
                <p className="text-muted-foreground">
                  Drag and drop images, videos, and PDFs. Organize them into projects.
                </p>
              </div>
              <div className="relative text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <div
                  className="absolute top-8 left-1/2 w-full h-px bg-border hidden md:block"
                  style={{ transform: "translateX(50%)" }}
                />
                <h3 className="text-xl font-semibold mb-2">Share a link</h3>
                <p className="text-muted-foreground">Generate a secure link. Add password protection if needed.</p>
              </div>
              <div className="relative text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <FileCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Get approvals</h3>
                <p className="text-muted-foreground">Clients review and approve or request changes instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-[1280px] mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Powerful features wrapped in a simple, intuitive interface
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "No client login", desc: "Clients review with just a link - no account needed" },
                { icon: Shield, title: "Password protection", desc: "Add passwords to sensitive projects" },
                { icon: FileCheck, title: "Version control", desc: "Track changes and manage file versions" },
                { icon: Upload, title: "Bulk upload", desc: "Upload multiple files at once, including ZIP files" },
                { icon: Sparkles, title: "Beautiful interface", desc: "Clean, modern UI your clients will love" },
                { icon: Users, title: "Feedback collection", desc: "Gather structured feedback on each file" },
              ].map((feature, i) => (
                <div key={i} className="bg-background rounded-xl p-6 border border-border">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview Card */}
        <section className="max-w-[1280px] mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Track every approval</h2>
              <p className="text-muted-foreground mb-6">
                See the status of all your files at a glance. Know exactly what's approved and what needs attention.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Green = Approved by client</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm">Amber = Needs changes</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm">Gray = Pending review</span>
                </li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="text-sm font-medium text-muted-foreground mb-4">Project: Brand Redesign</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                  <div className="h-10 w-10 rounded bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Homepage Design v2</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                  <div className="h-10 w-10 rounded bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Logo Variations</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                  <div className="h-10 w-10 rounded bg-amber-500/20 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Product Photos</div>
                    <div className="text-xs text-muted-foreground">Needs changes</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">2 of 3 approved</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "66%" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join hundreds of creative teams already using Delivr.
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
        <div className="max-w-[1280px] mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Delivr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
