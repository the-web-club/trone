export default function InloggenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="login"
      className="flex min-h-dvh flex-1 flex-col bg-bg text-fg"
    >
      {children}
    </div>
  );
}
