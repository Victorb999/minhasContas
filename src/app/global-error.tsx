"use client";

// Último recurso: substitui o layout raiz inteiro, então não depende de CSS nem de componentes do app.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          margin: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ color: "#666", marginBottom: 20 }}>O app encontrou um erro inesperado.</p>
          <button
            onClick={() => retry()}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "12px 20px",
              fontSize: 16,
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
