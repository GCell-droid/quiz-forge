"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import {
  Menu,
  X,
  LayoutDashboard,
  FolderOpen,
  Compass,
  Sparkles,
  LogOut,
  User as UserIcon,
} from "lucide-react";

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bundles", label: "Bundles", icon: FolderOpen },
  { href: "/quiz/generate", label: "AI Generate", icon: Sparkles },
];

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quiz/join", label: "Join Quiz", icon: Sparkles },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user?.role === "teacher" ? teacherLinks : studentLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">
              QF
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight font-heading">
            Quiz Forge
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 hover:bg-muted/80 transition-colors">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{user.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                  {user.role}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col gap-1 p-4">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {user && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{user.name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1">Logout</span>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
