"use client";

import { AuthProvider, useAuth } from "@/components/auth/auth-context";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { loading, error } = useAuth();

  if (loading) {
    return <Loading fullPage message="Loading your dashboard..." />;
  }

  if (error) {
    return <div className="mx-auto max-w-lg p-8"><ErrorMessage message={error} /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </AuthProvider>
  );
}
