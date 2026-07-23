import CreateEventForm from "@/components/CreateEventForm";
import RecentEvents from "@/components/RecentEvents";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Who Owes What</h1>
        <p className="mt-2 text-muted">
          Split expenses amongst a group
        </p>
      </header>

      <CreateEventForm />
      <RecentEvents />
    </main>
  );
}
