// src/app/api/chatwork/rooms/[roomId]/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Chatwork APIのベースURLを定数として定義
const CHATWORK_API_BASE_URL = 'https://api.chatwork.com/v2';

/**
 * Chatworkにタスクを送信するAPIルートハンドラー (POSTメソッド)
 * クライアントからのリクエストを受け取り、Chatwork APIにプロキシとしてリクエストを転送します。
 *
 * @param {NextRequest} request - Next.jsのリクエストオブジェクト
 * @param {Object} context - Next.jsのコンテキストオブジェクト。動的ルートパラメータを含む。
 * @param {Object} context.params - 動的ルートパラメータのオブジェクト。
 * @param {string} context.params.roomId - URLから取得されるルームID。
 * @returns {NextResponse} - Next.jsのレスポンスオブジェクト
 */
export async function POST(request: NextRequest, { params }: { params: { roomId: string } }) {
  // URLパラメータからルームIDを取得
  const { roomId } = params;
  // リクエストヘッダーからChatwork APIトークンを取得
  const apiToken = request.headers.get('X-ChatWorkToken');

  // APIトークンがない場合のチェック
  if (!apiToken) {
    console.error('API Route Error: Chatwork API Token is missing.');
    return NextResponse.json({ error: 'Chatwork API Token is missing.' }, { status: 400 });
  }

  // ルームIDがない場合のチェック (URLパラメータから取得されるため、通常は発生しないが念のため)
  if (!roomId) {
    console.error('API Route Error: Room ID is missing from URL parameters.');
    return NextResponse.json({ error: 'Room ID is missing from URL.' }, { status: 400 });
  }

  let message: string | null = null;
  let to_ids: string | null = null;
  let limit: string | null = null;

  try {
    // クライアントから送られてくるフォームデータをパース
    // page.tsx側で `Content-Type: "application/x-www-form-urlencoded"` と `body: new URLSearchParams({...}).toString()`
    // で送信しているため、ここでは `request.formData()` を使用します。
    const formData = await request.formData();

    // FormDataから各パラメータを取得し、文字列に変換。値がない場合はnull。
    message = formData.get('body')?.toString() || null;
    to_ids = formData.get('to_ids')?.toString() || null;
    limit = formData.get('limit')?.toString() || null;

    // 取得したフォームデータをログに出力して確認
    console.log('API Route Received Form Data:', { message, to_ids, limit });

  } catch (error) {
    // フォームデータパース失敗時のハンドリング
    console.error('Failed to parse request form data:', error);
    return NextResponse.json({ error: 'Invalid form data format.' }, { status: 400 });
  }

  // 必須パラメータのチェック
  // これらのパラメータがnullの場合、Chatwork APIへのリクエストを続行できないため、ここでエラーを返す
  if (!message) {
    console.error("API Route Error: Parameter 'body' (message) is required.");
    return NextResponse.json({ error: "Parameter 'body' (message) is required." }, { status: 400 });
  }
  if (!to_ids) {
    console.error("API Route Error: Parameter 'to_ids' is required.");
    return NextResponse.json({ error: "Parameter 'to_ids' is required." }, { status: 400 });
  }
  if (!limit) {
    console.error("API Route Error: Parameter 'limit' is required.");
    return NextResponse.json({ error: "Parameter 'limit' is required." }, { status: 400 });
  }

  // Chatwork APIのタスク作成エンドポイントのURLを構築
  const chatworkApiUrl = `${CHATWORK_API_BASE_URL}/rooms/${roomId}/tasks`;

  // Chatwork APIへのリクエストボディを構築 (application/x-www-form-urlencoded 形式)
  // Chatwork APIがこの形式を要求するため、URLSearchParamsを使用
  const chatworkApiBody = new URLSearchParams();
  chatworkApiBody.append('body', message);
  chatworkApiBody.append('to_ids', to_ids);
  chatworkApiBody.append('limit', limit);

  // Chatwork APIへのリクエスト内容をログに出力して確認
  console.log('Sending to Chatwork API:', {
      url: chatworkApiUrl,
      method: 'POST',
      headers: {
          'X-ChatWorkToken': apiToken ? '********' : 'undefined', // セキュリティのためトークンは伏字に
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
      },
      body: chatworkApiBody.toString(),
  });

  try {
    // Chatwork APIへリクエストを送信
    const chatworkResponse = await fetch(chatworkApiUrl, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded', // Chatwork APIはこれ
        'Accept': 'application/json',
      },
      body: chatworkApiBody.toString(), // URLSearchParamsオブジェクトを文字列に変換して送信
    });

    // Chatwork APIからのレスポンスボディをテキストとして取得
    const chatworkResponseText = await chatworkResponse.text();
    // 取得した生レスポンスとステータスコードをログに出力して確認
    console.log('Raw Chatwork API Response Text:', chatworkResponseText);
    console.log('Chatwork API Response Status:', chatworkResponse.status);

    let chatworkData;
    // レスポンスがJSON形式であるかパースを試みる
    try {
      chatworkData = JSON.parse(chatworkResponseText);
    } catch (parseError: any) { // parseErrorの型をanyにする
      // JSONパースに失敗した場合のエラーハンドリング
      console.error('Chatwork API response is NOT valid JSON:', parseError);
      console.error('Original non-JSON response:', chatworkResponseText);

      // Chatwork APIがJSONではないエラー（例: HTML）を返した場合
      // そのステータスコードと内容をそのままクライアントに返す
      return NextResponse.json(
          {
              error: 'Chatwork API returned non-JSON response.',
              details: chatworkResponseText.substring(0, 200) + (chatworkResponseText.length > 200 ? '...' : ''), // 長すぎる場合は切り詰める
              statusFromChatwork: chatworkResponse.status
          },
          { status: chatworkResponse.status || 500 } // Chatwork APIのステータスコードを優先
      );
    }

    // Chatwork APIからのレスポンスが成功 (2xx) だった場合
    if (chatworkResponse.ok) {
      console.log('Chatwork API Success Response:', chatworkData);
      return NextResponse.json(chatworkData, { status: chatworkResponse.status });
    } else {
      // Chatwork APIからのエラーレスポンスをそのままクライアントに返す
      console.error('Chatwork API error response (parsed JSON):', chatworkData);
      return NextResponse.json(chatworkData, { status: chatworkResponse.status });
    }
  } catch (error: any) { // errorの型をanyにする
    // ネットワークエラーなど、Chatwork APIへのリクエスト自体が失敗した場合
    console.error('Error calling Chatwork API (network/fetch error):', error);
    return NextResponse.json({ error: 'Failed to connect to Chatwork API or network error.', details: error.message }, { status: 500 });
  }
}
