'use client';

import { useState, useRef, useEffect } from 'react';
import FeedbackModal from '../components/feedback/FeedbackModal';

export default function Home() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Feedback system state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackMessageText, setFeedbackMessageText] = useState<string>('');
  const [feedbackMode, setFeedbackMode] = useState<'detailed' | 'positive' | 'quick'>('detailed');

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<'pnr-g' | 'pnr-g2'>('pnr-g');



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
    setIsTextareaExpanded(false);
    setIsLoading(true); // 1. Turn ON the main loading indicator
    setIsStreaming(true); // Also turn ON streaming state

    try {
      console.log(`🎯 Frontend: Sending message with model ${selectedModel.toUpperCase()}`);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId,
          mode: 'intelligence',
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let isFirstChunk = true;
      let assistantMessageId = '';

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
                  if (isFirstChunk) {
                    // 2. On the FIRST chunk, turn OFF the indicator and CREATE the message bubble
                    setIsLoading(false);
                    isFirstChunk = false;
                    assistantMessageId = crypto.randomUUID();
                    const newAssistantMessage = {
                      id: assistantMessageId,
                      text: data.chunk, // Start with the first chunk of text
                      sender: 'assistant' as const,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, newAssistantMessage]);
                  } else {
                    // 3. For ALL SUBSEQUENT chunks, just update the existing message bubble
                    setMessages(prev => prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, text: msg.text + data.chunk }
                        : msg
                    ));
                  }
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        } finally {
          reader.releaseLock();
          setIsStreaming(false); // Turn OFF streaming when done
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
      // Ensure loading is always turned off in the end
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Feedback system functions
  const handleQuickFeedback = async (messageId: string, type: 'helpful' | 'unhelpful') => {
    if (!sessionId) return;

    try {
      if (type === 'helpful') {
        // For positive feedback, show positive aspects selector
        openFeedbackModal(messageId, '', 'positive');
      } else {
        // Submit negative feedback immediately
        await submitFeedback({
          messageId,
          sessionId,
          feedbackType: type,
          timestamp: new Date()
        });
        
        // Show brief success message (optional)
        console.log('✅ Quick feedback submitted:', type);
      }
    } catch (error) {
      console.error('❌ Error submitting quick feedback:', error);
    }
  };

  const openFeedbackModal = (messageId: string, messageText: string, mode: 'detailed' | 'positive' | 'quick') => {
    setFeedbackMessageId(messageId);
    setFeedbackMessageText(messageText);
    setFeedbackMode(mode);
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackMessageId(null);
    setFeedbackMessageText('');
    setFeedbackMode('detailed');
  };

  const submitFeedback = async (feedbackData: {
    messageId: string;
    sessionId: string;
    feedbackType: string;
    selectedText?: string;
    userComment?: string;
    emotionalTone?: string;
    responseLength?: string;
    culturalSensitivity?: string;
    positiveAspects?: string[];
    timestamp: Date;
  }) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const result = await response.json();
      console.log('✅ Feedback submitted successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      throw error;
    }
  };

  if (!hasStartedChat) {
    // Initial landing page - Claude-style centered input
    return (
      <div className="min-h-dvh bg-primary-100 flex flex-col">
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
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus={false}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as React.FormEvent);
                    }
                  }}
                  placeholder="วันนี้อยากระบายอะไรคะ?"
                  className="
                    w-full px-4 md:px-6 py-4 md:py-5 pr-16 md:pr-20
                    bg-gray-50 border border-gray-200 rounded-2xl
                    font-sarabun text-base md:text-lg
                    placeholder-gray-400
                    focus:outline-none focus:border-primary-300 focus:bg-white
                    resize-none overflow-hidden
                    min-h-[80px] md:min-h-[100px] max-h-48
                    transition-colors duration-200
                  "
                  disabled={isLoading}
                  style={{
                    height: '100px',
                    lineHeight: '1.5'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    const newHeight = Math.max(Math.min(target.scrollHeight, 192), 100);
                    target.style.height = newHeight + 'px';
                  }}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading || !sessionId}
                  className={`
                    absolute right-3 bottom-3
                    w-8 h-8 rounded-lg
                    ${inputValue.trim() && !isLoading && sessionId
                      ? 'bg-primary-300 hover:bg-primary-400 text-gray-800'
                      : 'bg-gray-200 text-gray-400'
                    }
                    flex items-center justify-center
                    transition-all duration-300 ease-out
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
                        d="M12 19V5m-7 7l7-7 7 7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            {/* Model Selection - Smaller and Closer */}
            <div className="absolute -bottom-5 right-0">
              <div className="relative flex items-center gap-1">
                {/* Active Model Indicator */}
                <div className={`w-2 h-2 rounded-full ${selectedModel === 'pnr-g2' ? 'bg-pink-400' : 'bg-blue-400'}`} 
                     title={`Active: ${selectedModel.toUpperCase()}`}></div>
                
                <select
                  className="
                    appearance-none bg-transparent text-xs text-gray-400
                    pr-3 cursor-pointer focus:outline-none
                  "
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'pnr-g' | 'pnr-g2')}
                >
                  <option value="pnr-g">PNR-G (Professional)</option>
                  <option value="pnr-g2">PNR-G2 (Playful) 😊</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-dvh bg-primary-100 flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-primary-200 px-6 py-4">
        <div className="flex items-center justify-center max-w-4xl mx-auto">
          <button
            onClick={() => {
              setMessages([]);
              setHasStartedChat(false);
              setInputValue('');
              setIsTextareaExpanded(false);
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
                        <div className="flex-1 min-w-0 group">
                          <div className="font-sarabun text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                            {message.text}
                          </div>
                          
                          {/* Feedback Buttons - appear first, right aligned */}
                          {message.text && !isLoading && !isStreaming && message.id === messages.filter(m => m.sender === 'assistant').slice(-1)[0]?.id && (
                            <div className="flex justify-end mt-2">
                              <div className="flex items-center space-x-0.5 animate-fade-in">
                                <button 
                                  onClick={() => handleQuickFeedback(message.id, 'helpful')}
                                  className="p-0.5 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors opacity-50 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                  title="This response was helpful"
                                  aria-label="Mark as helpful"
                                >
                                  <img src="/like.png" alt="Like" className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => openFeedbackModal(message.id, message.text, 'negative')}
                                  className="p-0.5 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors opacity-50 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                  title="This response was not helpful - provide feedback"
                                  aria-label="Provide negative feedback"
                                >
                                  <img src="/dont-like.png" alt="Don't like" className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => openFeedbackModal(message.id, message.text, 'detailed')}
                                  className="p-0.5 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors opacity-50 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                  title="Provide detailed feedback"
                                  aria-label="Provide feedback"
                                >
                                  <img src="/form.png" alt="Feedback form" className="w-3.5 h-3.5" />
                                </button>

                              </div>
                            </div>
                          )}
                          
                          {/* Disclaimer - appears after buttons, right aligned */}
                          {message.text && !isLoading && !isStreaming && message.id === messages.filter(m => m.sender === 'assistant').slice(-1)[0]?.id && (
                            <div className="flex justify-end mt-1">
                              <div className="text-xs text-gray-400 font-sarabun animate-fade-in-delayed">
                                ปราณาราสามารถผิดพลาดได้ โปรดพิจารณาคำตอบอีกครั้ง
                              </div>
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
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as React.FormEvent);
                  }
                }}
                placeholder="พิมพ์คุยกับปราณารา"
                className="
                  w-full px-4 py-3 pr-12
                  bg-gray-50 border border-gray-200 rounded-xl
                  font-sarabun text-base
                  placeholder-gray-400
                  focus:outline-none focus:border-primary-300 focus:bg-white
                  resize-none overflow-hidden
                  min-h-[60px] max-h-32
                  transition-colors duration-200
                "
                disabled={isLoading}
                style={{
                  height: '60px',
                  lineHeight: '1.5'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  // Reset to minimum height first to get accurate scrollHeight
                  target.style.height = '60px';
                  const newHeight = Math.max(Math.min(target.scrollHeight, 128), 60);
                  target.style.height = newHeight + 'px';
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || !sessionId}
                className={`
                  absolute right-3 bottom-3
                  w-7 h-7 rounded-lg
                  ${inputValue.trim() && !isLoading && sessionId
                    ? 'bg-primary-300 hover:bg-primary-400 text-gray-800'
                    : 'bg-gray-200 text-gray-400'
                  }
                  flex items-center justify-center
                  transition-all duration-300 ease-out
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
                      d="M12 19V5m-7 7l7-7 7 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackMessageId && (
        <FeedbackModal
          messageId={feedbackMessageId}
          messageText={feedbackMessageText}
          onClose={closeFeedbackModal}
          onSubmit={async (feedbackData) => {
            await submitFeedback({
              ...feedbackData,
              sessionId: sessionId || ''
            });
          }}
          mode={feedbackMode}
        />
      )}
    </div>
  );
}