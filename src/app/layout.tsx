import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bin Rush",
  description: "A 60-second daily game: segregate falling waste into Wet, Dry and Hazardous bins.",
};

export const viewport: Viewport = {
  themeColor: "#eef1ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#6d4aff",
              fontFamily: "var(--font-fredoka), system-ui, sans-serif",
              borderRadius: "16px",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
