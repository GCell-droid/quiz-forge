"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/shared/error-message";
import { UserRole } from "@/lib/enums";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call backend to update role and issue new JWT
      await api.patch("/auth/role", { role });
      
      // Refresh the user context so the new role is picked up locally
      await refresh();
      
      // Navigate to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to update role");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-heading">Complete Your Profile</CardTitle>
          <CardDescription>
            You signed in with Google. Please tell us how you plan to use Quiz Forge before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <ErrorMessage message={error} />}
            
            <div className="space-y-4">
              <Label className="text-base">Select your role:</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={role === UserRole.TEACHER ? "default" : "outline"}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setRole(UserRole.TEACHER)}
                >
                  <span className="text-xl">👨‍🏫</span>
                  Teacher
                </Button>
                <Button
                  type="button"
                  variant={role === UserRole.STUDENT ? "default" : "outline"}
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setRole(UserRole.STUDENT)}
                >
                  <span className="text-xl">🎓</span>
                  Student
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !role}>
              {loading ? "Saving..." : "Continue to Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
