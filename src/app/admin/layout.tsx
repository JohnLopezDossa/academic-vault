import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Each page below this layout performs its own server-side role/capability
  // check so a reviewer can reach only the review route they are granted.
  return children;
}
