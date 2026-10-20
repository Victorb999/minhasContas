// Sessão sem estado: cookie "exp.assinatura" (HMAC-SHA256 com AUTH_SECRET).
// Usa só Web Crypto para funcionar tanto no proxy quanto no servidor.

export const SESSION_COOKIE = "mc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 dias

const encoder = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET ausente ou muito curto (mín. 16 caracteres)");
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return `${exp}.${await hmac(`session:${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(`session:${exp}`));
}

export async function checkPassword(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD não configurada");
  // Compara os HMACs para não vazar o tamanho/conteúdo por tempo de resposta.
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}
