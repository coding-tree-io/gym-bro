"use client";

import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "@/SignInForm";
import { SignOutButton } from "@/SignOutButton";
import { Toaster } from "sonner";
import { LifterDashboard } from "@/lifter/LifterDashboard";
import { AdminDashboard } from "@/admin/AdminDashboard";
import { UserSetup } from "@/usersetup/UserSetup";

export default function Page() {
  const currentUser = useQuery(api.users.getCurrentUser);

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <img src="/logo.png" alt="Savage Barbell" className="h-12 w-auto" />
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <Unauthenticated>
            <div className="max-w-md mx-auto mt-16">
              <div className="text-center mb-8">
                <img
                  src="/logo.png"
                  alt="Savage Barbell"
                  className="h-24 w-auto mx-auto mb-4"
                />
                <p className="text-xl text-gray-600">
                  Professional gym session booking with quota management
                </p>
              </div>
              <SignInForm />
            </div>
          </Unauthenticated>

          <Authenticated>
            {currentUser === undefined ? (
              <div className="flex justify-center items-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
              </div>
            ) : !currentUser ? (
              <UserSetup />
            ) : currentUser.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <LifterDashboard />
            )}
          </Authenticated>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
