// src/app/layout.tsx

import './globals.css';

export const metadata = {
  title: 'Chatworkタスクメモ',
  description: 'Chatworkのタスクを簡単に管理できるメモアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}