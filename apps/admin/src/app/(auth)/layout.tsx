export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-start px-4 py-12 sm:justify-center sm:bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] sm:px-6 sm:[background-size:16px_16px]">
      {children}
    </main>
  );
}
