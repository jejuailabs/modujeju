import Link from "next/link";
export default function NotFound() {
  return (
    <main style={{ padding: 80, textAlign: "center" }}>
      <h1>404</h1>
      <Link href="/ko">같이제주 · Gachi Jeju</Link>
    </main>
  );
}
