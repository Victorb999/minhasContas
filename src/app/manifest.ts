import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minhas Contas",
    short_name: "Contas",
    description: "Controle simples de receitas e despesas",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9fe",
    theme_color: "#7c3aed",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
