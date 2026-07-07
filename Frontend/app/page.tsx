import Link from "next/link";
import {
  Sparkles,
  Zap,
  Users,
  Trophy,
  ArrowRight,
  Brain,
  Clock,
  BarChart3,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                QF
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight font-heading">
              Quiz Forge
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient bg orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[300px] w-[400px] rounded-full bg-chart-2/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Powered by AI
            </div>

            <h1 className="text-4xl font-bold tracking-tight font-heading sm:text-5xl lg:text-6xl">
              Create Quizzes.{" "}
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Engage Students.
              </span>{" "}
              Track Results.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Quiz Forge is a real-time quiz platform that lets teachers create,
              schedule, and host live quiz sessions — with AI-powered question
              generation and instant leaderboards.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-muted hover:-translate-y-0.5"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight font-heading sm:text-4xl">
              Everything you need for{" "}
              <span className="text-primary">interactive quizzes</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              From question banks to real-time sessions — Quiz Forge handles it
              all.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Brain,
                title: "AI Generation",
                desc: "Generate quiz questions from any topic using Gemini AI. Just describe your topic and get professional questions instantly.",
                color: "text-chart-1",
                bg: "bg-chart-1/10",
              },
              {
                icon: Zap,
                title: "Real-Time Sessions",
                desc: "Host live quiz sessions with WebSocket-powered real-time answer submission and instant feedback.",
                color: "text-chart-2",
                bg: "bg-chart-2/10",
              },
              {
                icon: Users,
                title: "Question Bundles",
                desc: "Organize questions into reusable bundles. Share them publicly or keep them private for your classes.",
                color: "text-chart-3",
                bg: "bg-chart-3/10",
              },
              {
                icon: Trophy,
                title: "Leaderboards",
                desc: "Automatic scoring and leaderboards. Students get ranked by accuracy and speed.",
                color: "text-chart-4",
                bg: "bg-chart-4/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold font-heading">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight font-heading sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Brain,
                title: "Create Questions",
                desc: "Write questions manually, import from bundles, or generate with AI. Supports MCQ, True/False, and Short Answer formats.",
              },
              {
                step: "02",
                icon: Clock,
                title: "Schedule a Session",
                desc: "Pick a quiz, set a start time and time limit. Share the 6-digit join code with your students.",
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Track Results",
                desc: "Students join with the code and answer in real-time. View scores, leaderboards, and analytics instantly.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mb-4 inline-flex items-center justify-center">
                  <span className="text-5xl font-bold text-primary/10 font-heading">
                    {item.step}
                  </span>
                </div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold font-heading">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight font-heading sm:text-4xl">
            Ready to forge your first quiz?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join teachers and students already using Quiz Forge to create
            engaging quiz experiences.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Create Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">
                QF
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Quiz Forge
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
