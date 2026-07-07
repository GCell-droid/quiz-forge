"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorMessage } from "@/components/shared/error-message";
import { UserIcon, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  
  // Profile Form State
  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);

    try {
      await api.put("/user/profile", { name });
      await refresh();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      if (isAxiosError(err)) {
        setProfileError(err.response?.data?.message || "Failed to update profile");
      } else {
        setProfileError("An unexpected error occurred");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess(false);

    try {
      await api.put("/user/password", { currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      if (isAxiosError(err)) {
        setPasswordError(err.response?.data?.message || "Failed to update password");
      } else {
        setPasswordError("An unexpected error occurred");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  const isOAuth = user.oauthProvider === 'google';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Account Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and security preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* General Information */}
        <Card className="border-border/50 shadow-sm h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">General Info</CardTitle>
                <CardDescription>Update your basic profile details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {profileError && <ErrorMessage message={profileError} />}
              {profileSuccess && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile updated successfully!
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email Address (Read-only)</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted opacity-70 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-muted-foreground">Account Role (Read-only)</Label>
                <Input
                  id="role"
                  value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  disabled
                  className="bg-muted opacity-70 cursor-not-allowed"
                />
              </div>

              <Button type="submit" disabled={profileLoading || name === user.name} className="w-full mt-2">
                {profileLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security / Password */}
        <Card className="border-border/50 shadow-sm h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Security</CardTitle>
                <CardDescription>Manage your password.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isOAuth ? (
              <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground mb-2">
                  You signed in using your Google account. 
                </p>
                <p className="text-xs text-muted-foreground">
                  Password changes are handled directly through Google.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {passwordError && <ErrorMessage message={passwordError} />}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Password updated successfully!
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} 
                  variant="destructive" 
                  className="w-full mt-2"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
