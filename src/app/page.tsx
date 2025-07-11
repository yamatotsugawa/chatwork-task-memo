    // src/app/page.tsx
    'use client'; // クライアントコンポーネントとして実行することを明示

    import { useState, useEffect, useRef } from 'react';

    const PROXY_BASE_URL = '/api/chatwork';

    const CACHE_KEY_API_TOKEN = 'chatworkApiToken';
    const CACHE_KEY_ROOMS = 'chatworkRoomsCache';
    const CACHE_KEY_ROOMS_TIMESTAMP = 'chatworkRoomsCacheTimestamp';
    const CACHE_DURATION_MS = 1000 * 60 * 60 * 24;

    export default function Home() { // ★ここが重要: export default function Home() { ... }
      const [apiToken, setApiToken] = useState<string>('');
      const [rooms, setRooms] = useState<{ room_id: number; name: string }[]>([]);
      const [selectedRoomId, setSelectedRoomId] = useState<string>('');
      const [memoContent, setMemoContent] = useState<string>('');
      const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

      const memoTextRef = useRef<HTMLTextAreaElement>(null);

      const loadRooms = async (token: string, forceFetch = false) => { /* ... */ };
      useEffect(() => { /* ... */ }, []);
      const handleSaveToken = async () => { /* ... */ };
      const handleRefreshRooms = async () => { /* ... */ };
      const handleSendTask = async () => { /* ... */ };

      return (
        // ... JSXの記述
        <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
          {/* ... UI elements ... */}
        </div>
      );
    }
    