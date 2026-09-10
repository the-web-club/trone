export default function WachtwoordInstellenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="login"
      className="flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden bg-bg text-fg"
    >
      {children}
    </div>
  );
}
