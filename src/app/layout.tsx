import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "AP Academia · Pagamentos",
  description: "Gestão de folha de pagamento dos colaboradores da AP Academia",
};

// aplica o tema salvo antes da primeira pintura, evitando "flash" de tema errado
const themeInit = `(function(){try{var t=localStorage.getItem("pagtos_theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
