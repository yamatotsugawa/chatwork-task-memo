import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.headers.get('X-ChatWorkToken');
  
  if (!token) {
    return NextResponse.json({ error: 'APIトークンがありません' }, { status: 401 });
  }

  try {
    const response = await fetch('https://api.chatwork.com/v2/me', {
      headers: {
        'X-ChatWorkToken': token,
      },
    });

    if (!response.ok) {
      throw new Error(`ChatWork API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'APIエラーが発生しました' }, { status: 500 });
  }
}