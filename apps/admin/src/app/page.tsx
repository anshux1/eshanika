import { Button } from "@eshanika/ui/components/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              E
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Eshanika</p>
              <p className="text-xs text-muted-foreground">Admin workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to Eshanika Admin
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Manage your workspace from a single place.
          </p>
        </div>

        <section
          aria-labelledby="empty-state-heading"
          className="mt-10 grid overflow-hidden rounded-2xl border bg-background shadow-sm shadow-slate-950/[0.03] md:grid-cols-[minmax(0,1fr)_18rem]"
        >
          <div className="p-6 sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                <path d="M8 9h8M8 13h5" />
              </svg>
            </span>
            <h2
              className="mt-5 text-lg font-semibold tracking-tight"
              id="empty-state-heading"
            >
              Your workspace is ready
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Pages and updates will appear here once you begin setting things
              up.
            </p>
          </div>

          <div className="border-t bg-muted/20 p-6 md:border-l md:border-t-0 sm:p-8">
            <p className="text-sm font-semibold">First step</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create a page to start organizing your workspace.
            </p>
            <Button
              className="mt-5 w-full disabled:opacity-100"
              disabled
              type="button"
              variant="secondary"
            >
              Create your first page
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Page creation is not configured yet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
