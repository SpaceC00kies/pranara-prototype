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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typing animation placeholders
  const placeholders = [
    'วันนี้เครียดจังเลย...',
    'ที่ทำงาน Toxic มาก!',
    'ทะเลาะกับแฟนมา...',
  ];

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

  // Typing animation effect for placeholder
  useEffect(() => {
    if (hasStartedChat) return; // Don't run animation in chat mode

    let currentText = '';
    let currentIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const typeText = () => {
      const fullText = placeholders[placeholderIndex];

      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
      } else {
        currentText = fullText.substring(0, currentIndex + 1);
        currentIndex++;
      }

      setCurrentPlaceholder(currentText);

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && currentText === fullText) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
        currentIndex = 0;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        typeSpeed = 500; // Pause before next text
      }

      timeoutId = setTimeout(typeText, typeSpeed);
    };

    typeText();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [placeholderIndex, hasStartedChat]);

  // Start with empty messages - no greeting for professional feel
  // Users will initiate conversation naturally

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure sessionId is not null before sending
    if (!inputValue.trim() || isLoading || !sessionId) return;

    // Transition to chat mode on first message
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

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

  if (!hasStartedChat) {
    // Initial landing page - Claude-style centered input
    return (
      <div className="h-dvh bg-primary-100 flex flex-col">
        {/* Centered Welcome Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full">
          {/* Pranara Logo/Title */}
          <div className="text-center mb-6 md:mb-8">
            <div className="flex items-center justify-center">
              <img
                src="/Logo.png"
                alt="Pranara Logo"
                className="w-14 h-14 md:w-24 md:h-24 mr-1"
              />
              <h1
                className="text-5xl md:text-8xl font-bold text-primary-300 tracking-tight"
                style={{ fontFamily: 'Boska, ui-serif, Georgia, serif' }}
              >
                Pranara
              </h1>
            </div>
          </div>

          {/* Main Input Box */}
          <div className="w-full max-w-2xl relative">
            <form onSubmit={handleSubmit} className="relative">
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
                placeholder={currentPlaceholder}
                className="
                  w-full px-3 md:px-6 py-2 md:py-4 pr-10 md:pr-14
                  bg-white/90 backdrop-blur-sm border-2 border-gray-200 rounded-2xl
                  font-sarabun text-sm md:text-lg
                  placeholder-gray-400
                  focus:outline-none focus:border-primary-300
                  resize-none overflow-hidden
                  min-h-[48px] md:min-h-[60px] max-h-40
                  transition-colors duration-150
                "
                rows={1}
                disabled={isLoading}
                style={{
                  height: '60px',
                  lineHeight: '1.5'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '60px';
                  target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || !sessionId}
                className={`
                  absolute right-3 top-[30px] -translate-y-1/2
                  w-10 h-10 rounded-xl
                  ${inputValue.trim() && !isLoading && sessionId
                    ? 'bg-primary-300 hover:bg-primary-400 text-gray-800'
                    : 'bg-gray-200 text-gray-400'
                  }
                  flex items-center justify-center
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-200
                  disabled:cursor-not-allowed
                `}
                aria-label="ส่งข้อความ"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </form>
            
            {/* Model Selection - Bottom Right */}
            <div className="absolute -bottom-8 right-0">
              <div className="relative">
                <select 
                  className="
                    appearance-none bg-transparent text-xs text-gray-400
                    pr-4 cursor-pointer focus:outline-none
                  "
                  defaultValue="pnr-g"
                >
                  <option value="pnr-g">PNR-G</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface after first message
  return (
    <div className="h-dvh bg-primary-100 flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-primary-200 px-6 py-4">
        <div className="flex items-center justify-center max-w-4xl mx-auto">
          <button
            onClick={() => {
              setMessages([]);
              setHasStartedChat(false);
              setInputValue('');
            }}
            className="flex items-center space-x-1 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <img
              src="/Logo.png"
              alt="Pranara Logo"
              className="w-8 h-8"
            />
            <div>
              <h1 className="text-lg font-semibold text-primary-300" style={{ fontFamily: 'Boska, ui-serif, Georgia, serif' }}>
                Pranara
              </h1>
            </div>
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id}>
                {message.sender === 'user' ? (
                  /* User Message */
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-3">
                        <div className="font-sarabun text-base leading-relaxed">
                          {message.text}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Pranara Message */
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded-full bg-white border border-primary-200 flex items-center justify-center flex-shrink-0 p-1">
                          <img
                            src="/Logo.png"
                            alt="Pranara"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-sarabun text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                            {message.text}
                          </div>
                          {/* Claude-style warning - only show on the last assistant message */}
                          {message.text && message.id === messages.filter(m => m.sender === 'assistant').slice(-1)[0]?.id && (
                            <div className="mt-2 text-xs text-gray-400 font-sarabun">
                              ปราณาราสามารถผิดพลาดได้ โปรดพิจารณาคำตอบอีกครั้ง
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-white border border-primary-200 flex items-center justify-center flex-shrink-0 p-1">
                    <img
                      src="/Logo.png"
                      alt="Pranara"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-6 py-4">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
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
              placeholder="พิมพ์คุยกับปราณารา"
              className="
                w-full px-4 py-3 pr-12
                bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl
                font-sarabun text-base
                placeholder-gray-400
                focus:outline-none focus:border-primary-300
                resize-none overflow-hidden
                min-h-[48px] max-h-32
                transition-colors duration-150
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

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || !sessionId}
              className={`
                absolute right-2 md:right-3 top-[24px] md:top-[30px] -translate-y-1/2
                w-7 h-7 md:w-8 md:h-8 rounded-lg
                ${inputValue.trim() && !isLoading && sessionId
                  ? 'bg-primary-300 hover:bg-primary-400 text-gray-800'
                  : 'bg-gray-200 text-gray-400'
                }
                flex items-center justify-center
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-200
                disabled:cursor-not-allowed
              `}
              aria-label="ส่งข้อความ"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}