import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <span className="text-[10px] font-bold text-primary-foreground">
              QF
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Quiz Forge. All rights reserved.
          </span>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
}
