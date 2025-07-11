import './globals.css'

export const metadata = {
  title: 'Chatwork Task Memo',
  description: 'Chatwork task management tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}