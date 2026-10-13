"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { validateLogin, type LoginErrors } from "@/lib/auth/validation";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace("/board");
      router.refresh();
    } catch (error) {
      // Keep the entered email so the user only has to fix the password.
      if (error instanceof ApiError && error.statusCode === 401) {
        setFormError("Incorrect email or password. Please try again.");
      } else if (error instanceof ApiError) {
        setFormError(error.messages.join(" "));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mb-6 text-gray-600">
        Welcome back. Sign in to see your tasks.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
        aria-label="Log in"
      >
        {formError ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        ) : null}

        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-blue-600 underline">
          Register
        </Link>
      </p>
    </main>
  );
}
