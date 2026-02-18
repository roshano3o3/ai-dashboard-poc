export default function EnvCheckPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main style={{ padding: 24 }}>
      <h1>Env Check</h1>

      <p>
        URL loaded: <b>{url ? "YES" : "NO"}</b>
      </p>
      <p>
        KEY loaded: <b>{key ? "YES" : "NO"}</b>
      </p>

      <pre style={{ marginTop: 16 }}>
        URL value: {String(url)}
        {"\n"}
        KEY value (first 10 chars): {key ? key.slice(0, 10) : "undefined"}
      </pre>
    </main>
  );
}
