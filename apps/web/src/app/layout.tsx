import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export const metadata: Metadata = {
  title: "Afield — Room for curiosity",
  description:
    "Explore a question. Follow what matters. Read or listen in the time you have.",
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
