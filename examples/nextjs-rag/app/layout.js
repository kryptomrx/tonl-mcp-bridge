export const metadata = {
  title: 'RAG Chat with TONL',
  description: 'Next.js RAG application with 40-60% token savings',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
