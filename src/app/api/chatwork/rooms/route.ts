// src/app/api/chatwork/rooms/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Chatwork APIのベースURLを定数として定義
const CHATWORK_API_BASE_URL = 'https://api.chatwork.com/v2';

/**
 * Chatworkのルーム一覧を取得するAPIルートハンドラー (GETメソッド)
 * クライアントからのリクエストを受け取り、Chatwork APIにプロキシとしてリクエストを転送します。
 *
 * @param {NextRequest} request - Next.jsのリクエストオブジェクト
 * @returns {NextResponse} - Next.jsのレスポンスオブジェクト
 */
export async function GET(request: NextRequest) {
  // リクエストヘッダーからChatwork APIトークンを取得
  const apiToken = request.headers.get('X-ChatWorkToken');

  // APIトークンがない場合は400エラーを返す
  if (!apiToken) {
    console.error('API Route Error: Chatwork API Token is missing for /rooms.');
    return NextResponse.json({ error: 'Chatwork API Token is missing.' }, { status: 400 });
  }

  try {
    // Chatwork APIのルーム一覧エンドポイントにリクエストを送信
    const chatworkResponse = await fetch(`${CHATWORK_API_BASE_URL}/rooms`, {
      method: 'GET', // GETリクエスト
      headers: {
        'X-ChatWorkToken': apiToken, // 取得したAPIトークンをヘッダーに設定
        'Accept': 'application/json' // JSON形式のレスポンスを要求
      }
    });

    // Chatwork APIからのレスポンスボディをテキストとして取得
    const chatworkResponseText = await chatworkResponse.text();
    let chatworkData;

    // レスポンスがJSON形式であるかパースを試みる
    try {
      chatworkData = JSON.parse(chatworkResponseText);
    } catch (parseError) {
      // JSONパースに失敗した場合のエラーハンドリング
      console.error('Chatwork API response for /rooms is not valid JSON or empty:', chatworkResponseText);
      return NextResponse.json(
          { error: 'Chatwork API returned non-JSON response or empty response for /rooms.', details: chatworkResponseText },
          { status: chatworkResponse.status || 500 } // Chatwork APIのステータスコードを優先、なければ500
      );
    }

    // Chatwork APIからのレスポンスが成功 (2xx) だった場合
    if (chatworkResponse.ok) {
      console.log('Chatwork API Success Response for /rooms:', chatworkData);
      return NextResponse.json(chatworkData, { status: chatworkResponse.status });
    } else {
      // Chatwork APIからのエラーレスポンスをそのままクライアントに返す
      console.error('Chatwork API error response for /rooms:', chatworkData);
      return NextResponse.json(chatworkData, { status: chatworkResponse.status });
    }
  } catch (error) {
    // ネットワークエラーなど、Chatwork APIへのリクエスト自体が失敗した場合
    console.error('Error calling Chatwork API for rooms:', error);
    return NextResponse.json({ error: 'Failed to connect to Chatwork API for rooms.' }, { status: 500 });
  }
}
