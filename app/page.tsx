import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  ArrowRight,
  Check,
  FileCheck,
  Link2,
  Upload,
  MessageSquare,
  Clock,
  Shield,
  MousePointer2,
  Play,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Sendro
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" className="cursor-pointer">
                Login
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="cursor-pointer">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Two Column Layout */}
        <section className="max-w-[1280px] mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Now with visual markup feedback
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1] mb-6">
                Deliver work.
                <br />
                <span className="text-muted-foreground">Get feedback.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground text-pretty max-w-lg mb-8">
                The simplest way for creative teams to share files with clients, collect visual feedback, and get
                approvals. No client login required.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="gap-2 h-12 px-6 text-base cursor-pointer">
                    Start for free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  No credit card required
                </div>
              </div>
            </div>

            {/* Right - Product Preview */}
            <div className="relative">
              <div className="bg-muted/50 rounded-2xl border border-border p-4 shadow-2xl shadow-primary/5">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono">
                      sendro.app/p/brand-redesign
                    </div>
                  </div>
                </div>
                {/* Preview Content */}
                <div className="space-y-3">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/modern-website-mockup.png')] bg-cover bg-center opacity-80" />
                    {/* Markup Pin */}
                    <div className="absolute top-1/3 left-1/4 z-10">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                          1
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-background border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap text-xs">
                          Can we make this bolder?
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-1/4 right-1/3 z-10">
                      <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Homepage Design v2.fig</span>
                    <span className="text-green-500 flex items-center gap-1">
                      <Check className="h-4 w-4" /> Approved
                    </span>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -bottom-4 -left-4 bg-background border border-border rounded-xl px-4 py-3 shadow-lg hidden md:flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">2 files approved</div>
                  <div className="text-xs text-muted-foreground">Just now</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-muted/30">
          <div className="max-w-[1280px] mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1">50%</div>
                <div className="text-sm text-muted-foreground">faster approvals</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1">Zero</div>
                <div className="text-sm text-muted-foreground">client logins needed</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1">100%</div>
                <div className="text-sm text-muted-foreground">visual feedback</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-bold mb-1">Free</div>
                <div className="text-sm text-muted-foreground">to get started</div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works - Visual Steps */}
        <section className="max-w-[1280px] mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">How it works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Three simple steps to streamline your client workflow
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {/* Step 1 */}
            <div className="relative group">
              <div className="bg-muted/50 rounded-2xl p-6 border border-border h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="h-32 bg-background rounded-xl border border-border mb-6 flex items-center justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload files</h3>
                <p className="text-muted-foreground text-sm">
                  Drag and drop images, videos, PDFs, and more. Organize them into projects.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="bg-muted/50 rounded-2xl p-6 border border-border h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="h-32 bg-background rounded-xl border border-border mb-6 flex items-center justify-center">
                  <Link2 className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Share a link</h3>
                <p className="text-muted-foreground text-sm">
                  Generate a secure link for your client. Add password protection if needed.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="bg-muted/50 rounded-2xl p-6 border border-border h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="h-px flex-1 bg-border hidden" />
                </div>
                <div className="h-32 bg-background rounded-xl border border-border mb-6 flex items-center justify-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Get approvals</h3>
                <p className="text-muted-foreground text-sm">
                  Clients review, add visual feedback, and approve or request changes instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-[1280px] mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Everything you need</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Powerful features wrapped in a simple, intuitive interface
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Feature 1 - Large */}
              <div className="md:col-span-2 bg-background rounded-2xl p-8 border border-border">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <MousePointer2 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Visual markup feedback</h3>
                    <p className="text-muted-foreground">
                      Clients can click anywhere on images, videos, and PDFs to leave pinned feedback. No more confusing
                      email threads.
                    </p>
                  </div>
                  <div className="w-full md:w-64 h-40 bg-muted rounded-xl flex items-center justify-center relative">
                    <div className="absolute top-4 left-6 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="absolute bottom-8 right-8 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-background rounded-2xl p-6 border border-border">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Password protection</h3>
                <p className="text-sm text-muted-foreground">Add passwords to sensitive projects for extra security.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-background rounded-2xl p-6 border border-border">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Version control</h3>
                <p className="text-sm text-muted-foreground">
                  Upload revisions and track all file versions in one place.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-background rounded-2xl p-6 border border-border">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Video support</h3>
                <p className="text-sm text-muted-foreground">
                  Share videos with timestamp-based feedback from clients.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-background rounded-2xl p-6 border border-border">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Bulk upload</h3>
                <p className="text-sm text-muted-foreground">Upload multiple files at once to save time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Status Preview Section */}
        <section className="max-w-[1280px] mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Track every approval at a glance</h2>
              <p className="text-muted-foreground mb-8">
                See the status of all your files instantly. Know exactly what's approved, what needs changes, and what's
                pending review.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4">
                  <div className="h-4 w-4 rounded-full bg-green-500" />
                  <span>Green = Approved by client</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="h-4 w-4 rounded-full bg-amber-500" />
                  <span>Amber = Needs changes</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="h-4 w-4 rounded-full bg-muted-foreground" />
                  <span>Gray = Pending review</span>
                </li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="text-sm font-medium text-muted-foreground mb-4">Project: Brand Redesign</div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-background rounded-xl p-4 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Homepage Design v2</div>
                    <div className="text-sm text-muted-foreground">Approved 2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-background rounded-xl p-4 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Logo Variations</div>
                    <div className="text-sm text-muted-foreground">Approved yesterday</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-background rounded-xl p-4 border border-border">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Product Photos</div>
                    <div className="text-sm text-muted-foreground">2 feedback items</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">2 of 3 approved</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: "66%" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Ready to streamline your workflow?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join creative teams already using Sendro to deliver work and get approvals faster.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" className="h-12 px-8 cursor-pointer">
                Create free account <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sendro. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/auth/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
