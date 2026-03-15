import "./globals.css";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata = {
  title: "NeroCare AI",
  description: "AI physiotherapy platform",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.className} ${sourceSerif.variable} bg-background text-foreground antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
