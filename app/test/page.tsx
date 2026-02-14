export default function TestPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>KIFSHOP - Test</h1>
      <p>Si vous voyez ce message, le serveur Next.js fonctionne correctement.</p>
      <p style={{ marginTop: "1rem" }}>
        <a href="/auth/login" style={{ color: "blue", textDecoration: "underline" }}>
          Aller a la page de connexion
        </a>
      </p>
    </div>
  )
}
