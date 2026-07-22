import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/componentes/Footer/Footer";
import Header from "@/componentes/Header/Header";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "/tech/ — Imageboard",
  description: "Imageboard estilo chan com bots de IA — Trabalho Final de Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        {children}
        <Footer />
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}
