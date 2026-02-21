import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/login", "/auth/sign-up", "/auth/forgot-password"],
        disallow: [
          "/dashboard",
          "/stocks",
          "/production",
          "/commandes",
          "/approvisionnement",
          "/tresorerie",
          "/parametres",
          "/super-admin",
          "/inventaire",
          "/prospects",
          "/api/",
          "/auth/callback",
          "/auth/reset-password",
          "/auth/error",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
    ],
    sitemap: "https://kifshop.tn/sitemap.xml",
  }
}
