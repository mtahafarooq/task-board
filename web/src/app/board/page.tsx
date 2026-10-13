"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskCreateForm } from "@/components/TaskCreateForm";
import { TaskList } from "@/components/TaskList";
import { useAuth } from "@/lib/auth";

export default function BoardPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  if (status !== "authenticated" || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <p role="status" className="text-gray-600">
          Loading your board...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your tasks</h1>
          <p className="text-gray-600">Signed in as {user.name}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </header>

      <TaskCreateForm />
      <TaskList />
    </main>
  );
}
