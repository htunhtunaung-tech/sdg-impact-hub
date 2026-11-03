import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/sdgs", "/projects", "/volunteer", "/organizations"], disallow: ["/api/", "/admin", "/settings", "/messages", "/certificate"] }] };
}
