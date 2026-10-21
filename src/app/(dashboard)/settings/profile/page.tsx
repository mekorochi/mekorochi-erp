"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, User, Lock } from "lucide-react";
import Link from "next/link";
import { updateProfileAction, changePasswordAction } from "../actions";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [profilePending, setProfilePending] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfilePending(true);
    setProfileSaved(false);
    setProfileError("");
    const formData = new FormData(e.currentTarget);
    const result = await updateProfileAction(formData);
    setProfilePending(false);
    if (result?.success) {
      setProfileSaved(true);
    } else if (result?.error) {
      setProfileError(result.error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordPending(true);
    setPasswordSaved(false);
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordPending(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      setPasswordPending(false);
      return;
    }

    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    const result = await changePasswordAction(formData);
    setPasswordPending(false);
    if (result?.success) {
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else if (result?.error) {
      setPasswordError(result.error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account details and password.
          </p>
        </div>
      </div>

      {/* Profile Details */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {profileSaved && (
          <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg">
            Profile updated successfully.
          </div>
        )}
        {profileError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {profileError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={profile.name || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile.phone || ""}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={profile.role ? String(profile.role).toLowerCase().replace("_", " ") : ""}
                  disabled
                  className="bg-muted capitalize"
                />
                <p className="text-xs text-muted-foreground">Role is managed by administrators.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={profilePending}>
          <Save className="h-4 w-4 mr-2" />
          {profilePending ? "Saving..." : "Save Profile"}
        </Button>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        {passwordSaved && (
          <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg">
            Password changed successfully.
          </div>
        )}
        {passwordError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {passwordError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="outline"
          disabled={passwordPending || !currentPassword || !newPassword || !confirmPassword}
        >
          <Lock className="h-4 w-4 mr-2" />
          {passwordPending ? "Changing..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
