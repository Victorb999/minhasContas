// Gera os PNGs do PWA a partir de um SVG "full-bleed" (sem cantos arredondados; o SO aplica a máscara).
import sharp from "sharp";
const svg = (pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><g transform="translate(32 32) scale(${pad}) translate(-32 -32)"><rect x="14" y="34" width="8" height="16" rx="3" fill="#fff" opacity=".55"/><rect x="28" y="26" width="8" height="24" rx="3" fill="#fff" opacity=".8"/><rect x="42" y="16" width="8" height="34" rx="3" fill="#34d399"/></g></svg>`);
await sharp(svg(1)).resize(192).png().toFile("public/icon-192.png");
await sharp(svg(1)).resize(512).png().toFile("public/icon-512.png");
await sharp(svg(0.8)).resize(512).png().toFile("public/icon-maskable-512.png");
await sharp(svg(1)).resize(180).png().toFile("src/app/apple-icon.png");
console.log("ícones gerados");
