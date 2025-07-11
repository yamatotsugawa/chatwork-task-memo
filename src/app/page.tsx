// src/app/page.tsx

// 'use client' ディレクティブは、このコンポーネントがクライアントサイドで実行されることを示します。
// 状態管理やイベントハンドリングを行うために必須です。
'use client';

// Reactのフックをインポートします。
import { useState, useEffect, useRef } from 'react';

// Next.jsのAPIルートを呼び出すためのベースURLを定義します。
// これは、Chatwork APIへのリクエストをプロキシするNext.jsのAPIルートのパスです。
const PROXY_BASE_URL = '/api/chatwork';

// ローカルストレージで使用するキャッシュキーと有効期限を定義します。
const CACHE_KEY_API_TOKEN = 'chatworkApiToken'; // APIトークンを保存するキー
const CACHE_KEY_ROOMS = 'chatworkRoomsCache'; // ルーム一覧のキャッシュを保存するキー
const CACHE_KEY_ROOMS_TIMESTAMP = 'chatworkRoomsCacheTimestamp'; // ルーム一覧キャッシュのタイムスタンプを保存するキー
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // キャッシュの有効期限: 24時間 (ミリ秒)

// Homeコンポーネントをデフォルトエクスポートします。これがアプリケーションのメインページになります。
export default function Home() {
  // --- 状態管理 ---
  // APIトークンを保持するstate
  const [apiToken, setApiToken] = useState<string>('');
  // 取得したルーム一覧を保持するstate
  const [rooms, setRooms] = useState<{ room_id: number; name: string }[]>([]);
  // 選択されたルームIDを保持するstate
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  // タスクメモの内容を保持するstate
  const [memoContent, setMemoContent] = useState<string>('');
  // ユーザーへのステータスメッセージと、そのメッセージのタイプ（成功、エラーなど）を保持するstate
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // --- DOM要素への参照 ---
  // textarea要素への参照を保持するためのref。直接DOMを操作するのではなく、Reactの流儀に従います。
  const memoTextRef = useRef<HTMLTextAreaElement>(null);

  // --- ルーム一覧読み込み関数 ---
  // Chatwork APIからルーム一覧を取得し、プルダウンに表示する非同期関数です。
  // キャッシュがあればそれを利用し、必要に応じてAPIから再取得します。
  // @param token - Chatwork APIトークン
  // @param forceFetch - trueの場合、キャッシュを無視してAPIから強制的に取得します。
  const loadRooms = async (token: string, forceFetch = false) => {
    // APIトークンがない場合はエラーメッセージを表示して処理を中断
    if (!token) {
      setStatusMessage({ text: 'APIトークンが設定されていません。', type: 'error' });
      setRooms([]); // ルーム一覧をクリア
      setSelectedRoomId(''); // 選択中のルームをクリア
      return;
    }

    // キャッシュからの読み込みを試みる
    if (!forceFetch) {
      const cachedRooms = localStorage.getItem(CACHE_KEY_ROOMS);
      const cachedTimestamp = localStorage.getItem(CACHE_KEY_ROOMS_TIMESTAMP);

      // キャッシュが存在し、有効期限内の場合
      if (cachedRooms && cachedTimestamp) {
        const now = Date.now();
        const timestamp = parseInt(cachedTimestamp, 10);

        if (now - timestamp < CACHE_DURATION_MS) {
          try {
            const parsedRooms = JSON.parse(cachedRooms);
            setRooms(parsedRooms); // キャッシュからルーム一覧をセット
            setStatusMessage({ text: 'キャッシュからルーム一覧を読み込みました。', type: 'success' });
            return; // キャッシュから読み込んだので、APIからの取得は行わない
          } catch (e) {
            // キャッシュデータが破損している場合はエラーをログに出し、APIから再取得を試みる
            console.error('Cached rooms data is corrupted, fetching new data.', e);
          }
        } else {
          // キャッシュが期限切れの場合
          setStatusMessage({ text: 'ルーム一覧のキャッシュが期限切れです。更新中...', type: '' });
        }
      }
    }

    // APIからルーム一覧を取得中のメッセージを表示
    setStatusMessage({ text: 'ルーム一覧をChatwork APIから取得中...', type: '' });
    setRooms([]); // ロード中はルーム一覧をクリア

    try {
      // Next.js APIルート (/api/chatwork/rooms) を呼び出し
      const response = await fetch(`${PROXY_BASE_URL}/rooms`, {
        method: 'GET', // GETリクエスト
        headers: {
          'X-ChatWorkToken': token, // APIトークンをヘッダーに設定
          'Accept': 'application/json' // JSON形式のレスポンスを要求
        }
      });

      // レスポンスが成功 (HTTPステータス2xx) だった場合
      if (response.ok) {
        const fetchedRooms = await response.json(); // レスポンスをJSONとしてパース
        setRooms(fetchedRooms); // 取得したルーム一覧をstateにセット
        setStatusMessage({ text: 'ルーム一覧の取得が完了しました。', type: 'success' });
        // 取得したルーム一覧とタイムスタンプをローカルストレージにキャッシュ
        localStorage.setItem(CACHE_KEY_ROOMS, JSON.stringify(fetchedRooms));
        localStorage.setItem(CACHE_KEY_ROOMS_TIMESTAMP, Date.now().toString());
      } else {
        // レスポンスがエラーだった場合
        const errorData = await response.json(); // エラーレスポンスをJSONとしてパース
        throw new Error(`Chatwork APIエラー（ルーム一覧取得）: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (error: any) {
      // API呼び出し中にエラーが発生した場合
      console.error('エラー:', error);
      setStatusMessage({ text: `ルーム一覧の取得に失敗しました: ${error.message}`, type: 'error' });
      setRooms([]); // エラー時はルーム一覧をクリア
    }
  };

  // --- 初期化処理 ---
  // コンポーネメントがマウントされた時に一度だけ実行されます (useEffectの第二引数が空配列のため)。
  useEffect(() => {
    // ローカルストレージからAPIトークンを読み込む
    const storedApiToken = localStorage.getItem(CACHE_KEY_API_TOKEN);
    if (storedApiToken) {
      setApiToken(storedApiToken); // 読み込んだトークンをstateにセット
      loadRooms(storedApiToken); // ルーム一覧を読み込む
    } else {
      // トークンがない場合はメッセージを表示し、ルーム選択を無効化
      setStatusMessage({ text: 'Chatwork APIトークンを入力してください。', type: '' });
      setRooms([]);
    }
  }, []); // 空の配列を渡すと、コンポーネメントの初回レンダリング時のみ実行されます。

  // --- イベントハンドラ ---

  // 「トークンを保存してルーム一覧を取得」ボタンがクリックされた時の処理
  const handleSaveToken = async () => {
    const newToken = apiToken.trim(); // 入力されたトークンの前後の空白を削除
    if (!newToken) {
      setStatusMessage({ text: 'APIトークンを入力してください。', type: 'error' });
      return;
    }
    localStorage.setItem(CACHE_KEY_API_TOKEN, newToken); // 新しいトークンをローカルストレージに保存
    // stateのapiTokenは既に最新なので、そのままloadRoomsに渡す
    await loadRooms(newToken, true); // 強制的にAPIからルーム一覧を取得
  };

  // 「ルーム一覧を更新」ボタンがクリックされた時の処理
  const handleRefreshRooms = async () => {
    const token = localStorage.getItem(CACHE_KEY_API_TOKEN); // ローカルストレージからトークンを取得
    if (!token) {
      setStatusMessage({ text: 'APIトークンが設定されていません。先にトークンを保存してください。', type: 'error' });
      return;
    }
    await loadRooms(token, true); // 強制的にAPIからルーム一覧を取得
  };

  // 「Chatworkにタスクとして送信」ボタンがクリックされた時の処理
  const handleSendTask = async () => {
    const token = apiToken; // 現在のAPIトークンをstateから取得
    const roomId = selectedRoomId; // 選択されたルームIDをstateから取得
    const message = memoContent.trim(); // メモ内容の前後の空白を削除

    // 各入力フィールドのバリデーション
    if (!token) {
      setStatusMessage({ text: 'APIトークンが設定されていません。', type: 'error' });
      return;
    }
    if (!roomId) {
      setStatusMessage({ text: 'タスクを飛ばすルームを選択してください。', type: 'error' });
      return;
    }
    if (!message) {
      setStatusMessage({ text: 'メモが空です。何か入力してください。', type: 'error' });
      return;
    }

    setStatusMessage({ text: 'タスクを送信中...', type: '' }); // 送信中のメッセージを表示

    try {
      // 自分のChatwork IDを取得するためのAPI呼び出し
      // タスクの担当者として自分自身を設定するために必要です。
      const myInfoResponse = await fetch(`${PROXY_BASE_URL}/me`, { // Next.js APIルート (/api/chatwork/me)
        method: 'GET',
        headers: {
          'X-ChatWorkToken': token, // APIトークンをヘッダーに設定
          'Accept': 'application/json' // JSON形式のレスポンスを要求
        }
      });

      // 自分の情報取得が失敗した場合
      if (!myInfoResponse.ok) {
        const errorData = await myInfoResponse.json();
        throw new Error(`Chatwork APIエラー（自分の情報取得）: ${myInfoResponse.status} - ${JSON.stringify(errorData)}`);
      }
      const myInfo = await myInfoResponse.json(); // 自分の情報をJSONとしてパース
      const myChatworkId = myInfo.account_id; // 自分のChatwork IDを取得

      console.log('My Chatwork ID (from /me API):', myChatworkId); // 取得したIDをログで確認

      // タスクをChatwork APIに送信するためのAPI呼び出し
      const response = await fetch(`${PROXY_BASE_URL}/rooms/${roomId}/tasks`, { // Next.js APIルート (/api/chatwork/rooms/[roomId]/tasks)
        method: "POST", // POSTリクエスト
        headers: {
          "X-ChatWorkToken": token, // APIトークンをヘッダーに設定
          // ★★★ ここが重要: APIルートがformData()で受け取るため、application/x-www-form-urlencodedで送信 ★★★
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json" // JSON形式のレスポンスを要求
        },
        // ★★★ ここが重要: URLSearchParamsを使ってフォームデータ形式の文字列を生成して送信 ★★★
        body: new URLSearchParams({
          body: message, // タスク内容
          to_ids: myChatworkId.toString(), // 担当者ID (文字列に変換)
          // タスクの期限を現在時刻の1週間後に設定 (Unixタイムスタンプ、文字列に変換)
          limit: (Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)).toString()
        }).toString()
      });

      // タスク送信のレスポンスが成功 (HTTPステータス2xx) だった場合
      if (response.ok) {
        setStatusMessage({ text: "✅ タスクを送信しました！", type: "success" });
        setMemoContent(""); // 送信後、メモ内容をクリア
      } else {
        // レスポンスがエラーだった場合
        const errorData = await response.json(); // エラーレスポンスをJSONとしてパース
        throw new Error(`Chatwork APIエラー: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (err: any) {
      // API呼び出し中にエラーが発生した場合
      console.error("タスク送信失敗", err);
      let errorMessage = `❌ タスク送信に失敗しました: ${err.message}`;
      // エラーメッセージが長すぎる場合は切り詰める
      if (errorMessage.length > 100) {
        errorMessage = errorMessage.substring(0, 97) + '...';
      }
      setStatusMessage({ text: errorMessage, type: "error" });
    }
  };

  // --- JSX (UI) 部分 ---
  // コンポーネントのレンダリング内容を定義します。
  return (
    // ページ全体を中央に配置し、背景色を設定
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      {/* メインのフォームコンテナ */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        {/* タイトル */}
        <h1 className="text-2xl font-bold text-center text-emerald-600 mb-6">
          Chatworkタスクメモ
        </h1>

        {/* Chatwork APIトークン入力欄 */}
        <div className="mb-4">
          <label htmlFor="apiTokenInput" className="block mb-1 text-sm font-medium">Chatwork APIトークン：</label>
          <input
            id="apiTokenInput"
            type="text"
            placeholder="APIトークンを入力"
            className="w-full border rounded px-3 py-2 focus:ring focus:ring-emerald-300 focus:border-emerald-500"
            value={apiToken} // stateと入力値を紐付け
            onChange={(e) => setApiToken(e.target.value)} // 入力値の変更をstateに反映
          />
        </div>

        {/* ボタン群 (トークン保存/ルーム一覧取得、ルーム一覧更新) */}
        <div className="mb-4 flex gap-2">
          <button
            id="saveTokenButton"
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 flex-grow"
            onClick={handleSaveToken} // クリックイベントハンドラを紐付け
          >
            トークンを保存してルーム一覧を取得
          </button>
          <button
            id="refreshRoomsButton"
            className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 flex-grow"
            onClick={handleRefreshRooms} // クリックイベントハンドラを紐付け
          >
            ルーム一覧を更新
          </button>
        </div>

        {/* タスクを飛ばすルーム選択プルダウン */}
        <div className="mb-4">
          <label htmlFor="roomSelect" className="block mb-1 text-sm font-medium">タスクを飛ばすルームを選択：</label>
          <select
            id="roomSelect"
            className="w-full border rounded px-3 py-2 focus:ring focus:ring-emerald-300 focus:border-emerald-500"
            value={selectedRoomId} // stateと選択値を紐付け
            onChange={(e) => setSelectedRoomId(e.target.value)} // 選択値の変更をstateに反映
            // ルームがない場合や読み込み中の場合はプルダウンを無効化
            disabled={rooms.length === 0 && !statusMessage.text.includes('取得中')}
          >
            {/* ルームが読み込み中の場合や空の場合の表示 */}
            {rooms.length === 0 ? (
              <option value="">{statusMessage.text.includes('取得中') ? 'ルーム一覧を読み込み中...' : '-- ルームを選択 --'}</option>
            ) : (
              <>
                {/* デフォルトの選択肢 */}
                <option value="">-- ルームを選択 --</option>
                {/* 取得したルーム一覧をオプションとしてマッピング */}
                {rooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* タスク内容入力欄 */}
        <div className="mb-4">
          <label htmlFor="memoText" className="block mb-1 text-sm font-medium">タスク内容を入力：</label>
          <textarea
            id="memoText"
            placeholder="タスク内容を入力"
            className="w-full border rounded px-3 py-2 focus:ring focus:ring-emerald-300 focus:border-emerald-500"
            rows={4}
            value={memoContent} // stateと入力値を紐付け
            onChange={(e) => setMemoContent(e.target.value)} // 入力値の変更をstateに反映
            ref={memoTextRef} // refを紐付け (必要であれば後で直接DOM操作に利用可能)
          ></textarea>
        </div>

        {/* タスク送信ボタン */}
        <button
          id="sendTaskButton"
          className="w-full bg-emerald-600 text-white px-4 py-3 rounded hover:bg-emerald-700 font-bold text-lg"
          onClick={handleSendTask} // クリックイベントハンドラを紐付け
        >
          Chatworkにタスクとして送信
        </button>

        {/* ステータスメッセージの表示エリア */}
        {statusMessage.text && (
          <p className={`text-sm mt-4 p-2 rounded ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {statusMessage.type === 'error' ? '❌ ' : 'ℹ️ '} {/* エラータイプに応じたアイコン */}
            {statusMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
