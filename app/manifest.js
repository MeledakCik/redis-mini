export default function manifest() {
  return {
    name: "Kasyaf Redis Cloud",
    short_name: "Kasyaf",
    description: "Kasyaf Redis Cloud - Managed Redis & Qdrant Vector DB Console by Cikawan (Kasyaf.id).",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#00e095",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
