'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null); // Initialize as null
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Correct way to set session ID only once on the client
  useEffect(() => {
    let sid = localStorage.getItem('pranara-session-id');

    // Validate existing session ID format - if it's not 64-char hex, regenerate
    const isValidFormat = sid && sid.length === 64 && /^[a-f0-9]+$/i.test(sid);

    if (!sid || !isValidFormat) {
      // Generate a proper hex session ID that matches server validation
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      sid = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('pranara-session-id', sid);
    }

    setSessionId(sid);
    console.log('🔑 Pranara session ID established:', sid);
  }, []); // Empty dependency array means this runs only once on mount

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Start with empty messages - no greeting for professional feel
  // Users will initiate conversation naturally

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure sessionId is not null before sending
    if (!inputValue.trim() || isLoading || !sessionId) return;

    const userMessage = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      sender: 'user' as const,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId,
          mode: 'intelligence'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage = {
        id: assistantMessageId,
        text: '',
        sender: 'assistant' as const,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.chunk) {
                  console.log('📥 Received chunk:', data.chunk.substring(0, 30) + '...');
                  
                  // Turn off loading as soon as we get the first chunk
                  if (isLoading) {
                    setIsLoading(false);
                  }
                  
                  // Update the assistant message with new chunk
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, text: msg.text + data.chunk }
                      : msg
                  ));
                }
              } catch (e) {
                // Skip invalid JSON lines
                console.log('❌ Failed to parse line:', line);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        id: crypto.randomUUID(),
        text: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการตอบกลับ กรุณาลองใหม่อีกครั้งค่ะ',
        sender: 'assistant' as const,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-gradient-to-br from-background-secondary via-white to-background-tertiary flex flex-col">
      {/* Header with Pranara */}
      <div className="flex-shrink-0 text-center py-8 md:py-16 px-4">
        <h1 className="font-boska text-6xl md:text-7xl font-bold text-pranara-main mb-2" style={{ fontFamily: 'Boska, ui-serif, Georgia, serif' }}>
          Pranara
        </h1>
        <p className="font-sarabun text-xl text-text-secondary max-w-lg mx-auto leading-relaxed">
          เซฟโซนของคุณ
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 pb-4 md:pb-8">
        {/* Messages Area - Seamless */}
        <div className="flex-1 overflow-y-auto mb-6">
          <div>
            {messages.map((message) => (
              <div key={message.id} className="mb-6">
                {message.sender === 'user' ? (
                  /* User Message - Seamless like ChatGPT */
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="inline-block bg-gray-100 text-gray-800 rounded-2xl px-4 py-3">
                        <div className="font-sarabun text-[16px] leading-relaxed whitespace-normal">
                          {message.text}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Pranara Message - Seamless like Claude */
                  <div className="flex justify-start">
                    <div className="max-w-[80%] sm:max-w-2xl lg:max-w-4xl">
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded-full bg-pranara-main flex items-center justify-center flex-shrink-0">
                          <span className="text-slateGrey text-xs font-bold font-boska">P</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="prose prose-gray max-w-none">
                            <div className="font-sarabun text-[16px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                              {message.text}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator - Seamless */}
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-pranara-main flex items-center justify-center flex-shrink-0">
                    <span className="text-slateGrey text-xs font-bold font-boska">P</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-stretch gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as React.FormEvent);
                  }
                }}
                placeholder="Type a message to Pranara..."
                className="
                  w-full px-4 py-3
                  bg-white border border-neutral-300 rounded-xl
                  font-sarabun text-base
                  placeholder-text-muted
                  focus:outline-none focus:ring-2 focus:ring-pranara-main focus:border-pranara-main
                  resize-none overflow-hidden
                  min-h-[48px] max-h-32
                  transition-all duration-200
                "
                rows={1}
                disabled={isLoading}
                style={{
                  height: '48px',
                  lineHeight: '1.5'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || !sessionId}
              className={`
                flex-shrink-0 h-full aspect-square min-h-[48px] min-w-[48px]
                ${inputValue.trim() && !isLoading && sessionId
                  ? 'bg-pranara-main hover:bg-pranara-dark text-slateGrey'
                  : 'bg-neutral-300 text-neutral-500'
                }
                rounded-xl
                flex items-center justify-center
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-pranara-main/30
                disabled:cursor-not-allowed
              `}
              aria-label="ส่งข้อความ"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5 -rotate-90"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                  />
                </svg>
              )}
            </button>
          </form>

          {/* Subtle version footer */}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-300" style={{
              fontFamily: 'var(--font-space-mono), "Courier New", monospace',
              letterSpacing: '-0.025em',
              wordSpacing: '-0.1em',
              fontSize: '10px'
            }}>
              version : Pranara Genesis (PNR-G)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}