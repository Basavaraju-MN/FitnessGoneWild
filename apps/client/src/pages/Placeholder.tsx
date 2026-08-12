export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>This client-side page is reserved for the next UI phase.</p>
      <a className="btn" href="/">Back to home</a>
    </div>
  );
}
