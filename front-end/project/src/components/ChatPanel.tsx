import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChatMessage, Citation } from '@/types';
import * as api from '@/api/client';

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ChatPanel({
  claimId,
  initialMessages,
  disabled,
}: {
  claimId: string;
  initialMessages: ChatMessage[];
  disabled?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const disconnect = api.connectChat(claimId, (msg) => {
      if (msg.isTyping) {
        setIsAiTyping(true);
      } else {
        setIsAiTyping(false);
        setMessages((prev) => [...prev, msg]);
      }
    });
    return disconnect;
  }, [claimId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isAiTyping]);

  async function handleSend(text: string) {
    if (!text.trim() || disabled) return;
    setError('');
    setIsAiTyping(true);
    setInput('');
    try {
      const updated = await api.sendChatMessage(claimId, text.trim());
      setMessages(updated.chat);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message');
    } finally {
      setIsAiTyping(false);
      inputRef.current?.focus();
    }
  }

  async function handleQuickReply(reply: string) {
    setMessages((prev) => prev.map((m) => ({ ...m, quickReplies: undefined })));
    await handleSend(reply);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-2.5 bg-slate-50">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-white"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onQuickReply={handleQuickReply}
          />
        ))}

        {isAiTyping && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 bg-white">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            disabled={disabled}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || disabled}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onQuickReply,
}: {
  message: ChatMessage;
  onQuickReply: (reply: string) => void;
}) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
          <span className="h-1 w-1 rounded-full bg-slate-400" />
          <FormattedMessage text={message.text} />
          <span className="text-slate-300">·</span>
          {formatTime(message.timestamp)}
        </div>
      </div>
    );
  }

  const isAI = message.role === 'ai';

  return (
    <div
      className={`flex items-start gap-2 animate-slide-up ${
        isAI ? 'justify-start' : 'justify-end'
      }`}
    >
      {isAI && (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-600 flex-shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-[75%] ${isAI ? '' : 'items-end'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isAI
              ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
              : 'bg-brand-600 text-white rounded-tr-sm'
          }`}
        >
          {message.text}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((cit) => (
              <CitationCard key={cit.id} citation={cit} />
            ))}
          </div>
        )}

        {/* Quick replies */}
        {message.quickReplies && message.quickReplies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => onQuickReply(reply)}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors animate-fade-in"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        <p className={`mt-1 text-[10px] text-slate-400 ${isAI ? 'text-left' : 'text-right'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function FormattedMessage({ text }: { text: string }) {
  const sections = text
    .replace(/\s+(?=\d+\.\s+)/g, '\n')
    .split('\n')
    .map((section) => section.trim())
    .filter(Boolean);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < sections.length) {
    const section = sections[index];
    if (section.startsWith('|') && sections[index + 1]?.includes('|')) {
      const rows: string[][] = [];
      while (index < sections.length && sections[index].startsWith('|')) {
        const row = sections[index];
        if (!/^\|?\s*:?-{2,}/.test(row.replace(/\|/g, '').trim())) {
          rows.push(row.split('|').slice(1, -1).map((cell) => cell.trim()));
        }
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="overflow-hidden rounded-lg border border-slate-200 text-xs">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className={`grid grid-cols-2 gap-3 px-3 py-2 ${rowIndex === 0 ? 'bg-slate-50 font-semibold text-slate-700' : 'border-t border-slate-100 text-slate-600'}`}>
              {row.map((cell, cellIndex) => <span key={cellIndex}><FormattedInlineText text={cell} /></span>)}
            </div>
          ))}
        </div>
      );
      continue;
    }

    const heading = section.match(/^#{2,3}\s+(.+)/);
    if (heading) {
      blocks.push(<h4 key={`heading-${index}`} className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-700"><FormattedInlineText text={heading[1]} /></h4>);
    } else if (/^[-*]\s+/.test(section)) {
      blocks.push(<div key={`bullet-${index}`} className="flex gap-2"><span className="text-brand-500">•</span><span><FormattedInlineText text={section.replace(/^[-*]\s+/, '')} /></span></div>);
    } else {
      blocks.push(<p key={`paragraph-${index}`}><FormattedInlineText text={section} /></p>);
    }
    index += 1;
  }

  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}

function FormattedInlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function CitationCard({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{citation.docName}</p>
          <p className="text-[10px] text-slate-500">{citation.section}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 animate-fade-in">
          <p className="text-xs text-slate-600 leading-relaxed">{citation.clauseText}</p>
        </div>
      )}
    </div>
  );
}
