import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
export const metadata = {
  title: "R&K Dashboard",
  description: "AI Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

