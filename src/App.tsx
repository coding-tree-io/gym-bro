import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { LifterDashboard } from "./LifterDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { UserSetup } from "./UserSetup";
import { useEffect } from "react";

export default function App() {
  const initializePolicies = useMutation(api.policies.initializePolicies);

  useEffect(() => {
    // Initialize default policies on app start
    initializePolicies().catch(console.error);
  }, [initializePolicies]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-brand-black">Savage Barbell</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const currentUser = useQuery(api.users.getCurrentUser);

  if (currentUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-brand-black mb-4">Savage Barbell</h1>
            <p className="text-xl text-gray-600">Professional gym session booking with quota management</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        {!currentUser ? (
          <UserSetup />
        ) : currentUser.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <LifterDashboard />
        )}
      </Authenticated>
    </div>
  );
}
