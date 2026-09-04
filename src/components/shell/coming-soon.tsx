export function ComingSoon({ title }: { title: string }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1 className="page-header-title">{title}</h1>
        <p className="page-header-description">Deze pagina komt binnenkort.</p>
      </div>
    </header>
  );
}
