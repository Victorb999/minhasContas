/** Lê o parâmetro ?voltar= aceitando só caminhos internos (evita redirecionar para outro site). */
export function parseBackHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Acrescenta ?voltar=<de onde veio> a um link. */
export function withBack(href: string, from: string) {
  return `${href}${href.includes("?") ? "&" : "?"}voltar=${encodeURIComponent(from)}`;
}
