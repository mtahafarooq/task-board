import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Task Board</h1>
      <p className="max-w-md text-lg text-gray-600">
        Register, log in, and manage your own tasks &mdash; all in one place.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
