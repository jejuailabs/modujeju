export default function Loading() {
  return (
    <main className="page skeleton-page" aria-busy="true">
      <div className="skeleton skeleton-title" />
      <div className="place-grid">
        {[0, 1, 2].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </main>
  );
}
