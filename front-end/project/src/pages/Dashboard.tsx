import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  function handleChooseImage() {
    fileInputRef.current?.click();
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      console.log('Selected file:', file);
    }
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: trimmedQuestion,
      },
    ]);

    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'RAG request failed');
      }

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: data.answer,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Something went wrong while contacting the backend.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === 'Enter') {
      handleAsk();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Bill Claim RAG
            </h1>

            <p className="text-sm text-gray-500">
              Welcome, {user?.name}
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Dashboard
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RAG CHAT */}
          <section className="bg-white rounded-xl shadow-sm border p-6 min-h-[500px]">
            <h3 className="text-lg font-semibold text-gray-900">
              Policy Assistant
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Ask questions about company policies and travel claims.
            </p>

            <div className="mt-6 h-80 rounded-lg bg-gray-50 border p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">
                    Ask a question to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={
                        message.role === 'user'
                          ? 'text-right'
                          : 'text-left'
                      }
                    >
                      <div
                        className={
                          message.role === 'user'
                            ? 'inline-block max-w-[85%] rounded-lg bg-blue-600 px-4 py-2 text-white'
                            : 'inline-block max-w-[85%] rounded-lg bg-white border px-4 py-2 text-gray-800'
                        }
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="text-left">
                      <div className="inline-block rounded-lg bg-white border px-4 py-2 text-gray-500">
                        Asking the policy assistant...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </section>

          {/* BILL UPLOAD */}
          <section className="bg-white rounded-xl shadow-sm border p-6 min-h-[500px]">
            <h3 className="text-lg font-semibold text-gray-900">
              Bill Analyzer
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Upload a bill or receipt for analysis.
            </p>

            <div className="mt-6 h-80 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
              <p className="text-gray-500 mb-4">
                Choose an image to upload
              </p>

              <button
                type="button"
                onClick={handleChooseImage}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Choose Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Image processing endpoint will be connected later.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}