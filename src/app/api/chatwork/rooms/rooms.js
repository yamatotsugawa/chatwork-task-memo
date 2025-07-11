// pages/api/rooms.ts (または .js)
// Next.jsのAPIルートはexpressを使いません
// node-fetchもNext.js環境ではfetchがグローバルに利用できるため不要です

// req.headers.authorizationからトークンを取得する処理
// 通常、Next.jsのAPIルートは関数をエクスポートします
export default async function handler(req, res) {
  // GETリクエスト以外は受け付けないなどの処理も可能
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "APIトークンが必要です" });
  }

  try {
    // Next.js環境ではグローバルのfetchが利用可能
    const chatworkToken = token.replace('Bearer ', '');
    const chatworkApiUrl = 'https://api.chatwork.com/v2/rooms'; // Chatworkの実際のAPIエンドポイントに修正してください

    const response = await fetch(chatworkApiUrl, {
      headers: {
        'X-ChatWorkToken': chatworkToken
      }
    });

    if (!response.ok) {
      // Chatwork APIからのエラーも適切に処理
      const errorData = await response.json();
      return res.status(response.status).json({
        error: "Chatwork APIエラー",
        detail: errorData.errors ? errorData.errors.join(', ') : '不明なエラー'
      });
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    console.error("API Route Error:", err); // サーバー側でエラーをログに出す
    res.status(500).json({ error: "サーバー内部エラー", detail: err.message });
  }
}