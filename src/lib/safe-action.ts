export const CONNECTION_ERROR = "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.";

type Failure = { ok: false; error: string };

/**
 * Chama uma Server Action pelo cliente e transforma falhas inesperadas
 * (sem internet, banco fora do ar, erro 500) em { ok: false, error }.
 * Redirecionamentos do Next (ex.: sessão expirada -> /login) seguem normalmente.
 */
export async function safeAction<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | Failure> {
  try {
    return await fn();
  } catch (e) {
    if (typeof e === "object" && e !== null && "digest" in e && String(e.digest).startsWith("NEXT_")) throw e;
    console.error(e);
    return { ok: false, error: CONNECTION_ERROR };
  }
}
