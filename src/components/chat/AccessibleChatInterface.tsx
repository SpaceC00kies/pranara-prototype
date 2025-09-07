/**
 * Accessibility-enhanced Chat Interface
 * WCAG 2.1 AA compliant chat component with screen reader support
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ChatInterfaceProps, ErrorResponse, TopicCategory } from '@/types';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import TypingIndicator from './TypingIndicator';
import ChatErrorHandler from '../error/ChatErrorHandler';
import { 
  getClientLineConfig, 
  shouldRecommendLineHandoff, 
  generateLineHandoffMessage,
  openLineUrl 
} from '@/services/lineService';
import { 
  focusManagement, 
  screenReader, 
  keyboardNavigation,
  touchAccessibility,
  reducedMotion 
} from '@/utils/accessibility';

export default function AccessibleChatInterface({ onLineClick }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [lineConfig] = useState(() => getClientLineConfig());
  const [currentError, setCurrentError] = useState<ErrorResponse | Error | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  
  // Accessibility refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Live region for announcements
  const liveRegionRef = useRef<ReturnType<typeof screenReader.createLiveRegion> | null>(null);

  // Initialize live region for screen reader announcements
  useEffect(() => {
    liveRegionRef.current = screenReader.createLiveRegion('chat-announcements', 'polite');
    
    return () => {
      liveRegionRef.current?.remove();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use smooth scrolling only if motion is not reduced
      const behavior = reducedMotion.prefersReducedMotion() ? 'auto' : 'smooth';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [messages, isLoading]);

  // Focus input on mount and announce chat ready
  useEffect(() => {
    inputRef.current?.focus();
    liveRegionRef.current?.announce('แชทพร้อมใช้งาน กรุณาพิมพ์คำถามของคุณ');
  }, []);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: 'สวัสดีค่ะคุณผู้ดูแล ดิฉันใบบุญจากจีรัง เวลเนสค่ะ ยินดีที่ได้พูดคุยกันนะคะ\n\nมีเรื่องอะไรให้ใบบุญช่วยดูแลหรือแนะนำได้บ้างคะ\n\nใบบุญเข้าใจดีค่ะว่าการดูแลผู้สูงอายุอาจมีเรื่องให้กังวลใจบ้าง อย่าลังเลที่จะเล่าให้ฟังนะคะ เราจะดูแลกันไปค่ะ',
      sender: 'assistant',
      timestamp: new Date(),
      topic: 'general'
    };
    setMessages([welcomeMessage]);
    
    // Announce welcome message to screen readers
    setTimeout(() => {
      liveRegionRef.current?.announce('ใบบุญพร้อมให้คำแนะนำแล้ว');
    }, 1000);
  }, []);

  // Handle keyboard navigation in chat
  const handleChatKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in input
    if (document.activeElement === inputRef.current) return;
    
    // Focus input when user starts typing
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      inputRef.current?.focus();
    }
    
    // Navigate to input with Escape
    if (e.key === 'Escape') {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleChatKeyDown);
    return () => document.removeEventListener('keydown', handleChatKeyDown);
  }, [handleChatKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLastUserMessage(userMessage.text);
    setInputValue('');
    setIsLoading(true);
    setCurrentError(null);

    // Announce message sent to screen readers
    liveRegionRef.current?.announce('ส่งข้อความแล้ว กำลังรอคำตอบ');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            error: `HTTP ${response.status}`,
            code: response.status >= 500 ? 'GEMINI_UNAVAILABLE' : 'NETWORK_ERROR',
            fallbackMessage: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
            showLineOption: true,
            timestamp: new Date()
          };
        }
        
        setCurrentError(errorData);
        liveRegionRef.current?.announce('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      const data = await response.json();

      if (data.error) {
        setCurrentError(data);
        liveRegionRef.current?.announce('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        text: data.response,
        sender: 'assistant',
        timestamp: new Date(),
        topic: data.topic
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Announce response received
      liveRegionRef.current?.announce('ได้รับคำตอบจากใบบุญแล้ว');

      // Enhanced LINE handoff logic
      const userMessages = messages.filter(m => m.sender === 'user').length + 1;
      const handoffRecommendation = shouldRecommendLineHandoff(
        userMessage.text,
        data.topic,
        userMessages
      );

      const shouldShowLine = data.showLineOption || handoffRecommendation.shouldRecommend;
      
      if (shouldShowLine && lineConfig.isEnabled) {
        setTimeout(() => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.sender === 'assistant') {
              const lineMessage = generateLineHandoffMessage(
                handoffRecommendation.reason,
                handoffRecommendation.urgency,
                'th'
              );
              
              // Announce LINE option available
              liveRegionRef.current?.announce('มีตัวเลือกติดต่อทีม Jirung ทาง LINE');
              
              return [
                ...prev.slice(0, -1),
                { 
                  ...lastMessage, 
                  showLineOption: true,
                  lineHandoffReason: handoffRecommendation.reason,
                  lineHandoffUrgency: handoffRecommendation.urgency,
                  lineHandoffMessage: lineMessage
                }
              ];
            }
            return prev;
          });
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setCurrentError(error as Error);
      liveRegionRef.current?.announce('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      setInputValue(lastUserMessage);
      setCurrentError(null);
      liveRegionRef.current?.announce('เตรียมส่งข้อความใหม่');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleDismissError = () => {
    setCurrentError(null);
    liveRegionRef.current?.announce('ปิดข้อความแสดงข้อผิดพลาดแล้ว');
  };

  const handleLineClick = (topic?: string, reason?: string) => {
    // Track LINE click for analytics
    fetch('/api/chat/line-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        topic: topic || 'general',
        reason: reason || 'manual',
        timestamp: new Date().toISOString()
      }),
    }).catch(console.error);

    // Announce LINE handoff
    liveRegionRef.current?.announce('กำลังเปิด LINE เพื่อติดต่อทีม Jirung');

    openLineUrl(
      sessionId,
      (topic as TopicCategory) || 'general',
      reason || 'manual',
      () => {
        console.log('LINE handoff initiated:', { sessionId, topic, reason });
      }
    );

    onLineClick();
  };

  // Handle input auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    const target = e.target;
    target.style.height = '52px';
    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
  };

  // Handle keyboard shortcuts in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
    
    // Announce keyboard shortcuts to screen readers on first focus
    if (e.key === 'F1') {
      e.preventDefault();
      liveRegionRef.current?.announce(
        'คีย์ลัด: Enter เพื่อส่งข้อความ, Shift+Enter เพื่อขึ้นบรรทัดใหม่, Escape เพื่อล้างข้อความ'
      );
    }
    
    // Clear input with Escape
    if (e.key === 'Escape') {
      setInputValue('');
      liveRegionRef.current?.announce('ล้างข้อความแล้ว');
    }
  };

  return (
    <div 
      ref={chatContainerRef}
      className="relative flex flex-col h-screen bg-white overflow-hidden"
      role="main"
      aria-label="แชทกับใบบุญ ผู้ช่วยดูแลผู้สูงอายุ"
    >
      {/* Skip to main content link for screen readers */}
      <a 
        href="#chat-input"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        ข้ามไปยังช่องพิมพ์ข้อความ
      </a>

      {/* Chat Container */}
      <div className="relative flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 min-h-0">
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          
          {/* Chat Header with proper heading structure */}
          <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <div 
                    className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center"
                    role="img"
                    aria-label="ใบบุญ ผู้ช่วยดูแลผู้สูงอายุ"
                  >
                    <img 
                      src="https://img.icons8.com/?size=100&id=67639&format=png&color=FFFFFF" 
                      alt=""
                      className="w-8 h-8"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 font-prompt leading-relaxed py-1">
                    ใบบุญ - ผู้ช่วยดูแลผู้สูงอายุ
                  </h1>
                </div>
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <button 
                  className="w-10 h-10 bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-primary-100/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  aria-label="การตั้งค่า"
                  type="button"
                >
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                <button 
                  className="w-10 h-10 bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-primary-100/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  aria-label="ข้อมูลเพิ่มเติม กด F1 เพื่อดูคีย์ลัด"
                  type="button"
                  onClick={() => {
                    liveRegionRef.current?.announce(
                      'คีย์ลัด: Enter เพื่อส่งข้อความ, Shift+Enter เพื่อขึ้นบรรทัดใหม่, Escape เพื่อล้างข้อความ, F1 เพื่อฟังคีย์ลัดอีกครั้ง'
                    );
                  }}
                >
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto chat-scrollbar px-4 sm:px-6 py-6 min-h-0"
            role="log"
            aria-label="ประวัติการสนทนา"
            aria-live="polite"
            aria-atomic="false"
          >
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Error Handler */}
              <ChatErrorHandler
                error={currentError}
                onRetry={handleRetry}
                onDismiss={handleDismissError}
                onLineClick={() => handleLineClick('general', 'error')}
              />

              {messages.map((message, index) => (
                <div key={message.id}>
                  {message.sender === 'user' ? (
                    <UserMessage message={message} />
                  ) : (
                    <AssistantMessage 
                      message={message}
                      showLineOption={message.showLineOption}
                      onLineClick={() => handleLineClick(
                        message.topic, 
                        (message as { lineHandoffReason?: string }).lineHandoffReason
                      )}
                      lineHandoffMessage={(message as { lineHandoffMessage?: string }).lineHandoffMessage}
                      lineHandoffUrgency={(message as { lineHandoffUrgency?: 'low' | 'medium' | 'high' }).lineHandoffUrgency}
                    />
                  )}
                </div>
              ))}
              
              <TypingIndicator isVisible={isLoading} />
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4">
            <form onSubmit={handleSubmit} role="search" aria-label="ส่งข้อความถามใบบุญ">
              <div className="flex items-start gap-3">
                <div className="flex-1 relative">
                  <label htmlFor="chat-input" className="sr-only">
                    พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ
                  </label>
                  <textarea
                    id="chat-input"
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ..."
                    className="
                      w-full px-4 py-3.5
                      bg-gray-50/80 backdrop-blur-sm hover:bg-white/80
                      border border-gray-200/50 rounded-2xl
                      font-sarabun text-[15px] chat-message-content
                      placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                      resize-none overflow-hidden
                      min-h-[52px] max-h-32
                      transition-all duration-200
                    "
                    rows={1}
                    disabled={isLoading}
                    aria-describedby="input-help"
                    aria-invalid={currentError ? 'true' : 'false'}
                    style={{ 
                      height: '52px',
                      lineHeight: '1.6'
                    }}
                  />
                  
                  <div id="input-help" className="sr-only">
                    กด Enter เพื่อส่งข้อความ หรือ Shift+Enter เพื่อขึ้นบรรทัดใหม่
                  </div>
                  
                  {inputValue.length > 0 && (
                    <div 
                      className="absolute bottom-2 right-3 text-xs text-gray-400 font-prompt"
                      aria-label={`จำนวนตัวอักษร ${inputValue.length}`}
                    >
                      {inputValue.length}
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="
                    relative overflow-hidden
                    flex-shrink-0 w-[52px] h-[52px] mb-0
                    bg-blue-600 
                    hover:bg-blue-700 
                    disabled:bg-gray-400
                    text-white rounded-2xl
                    flex items-center justify-center
                    hover:shadow-lg
                    transform hover:scale-105 active:scale-95 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2
                    disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100
                  "
                  aria-label={isLoading ? 'กำลังส่งข้อความ' : 'ส่งข้อความ'}
                >
                  {isLoading ? (
                    <div 
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                      />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Helper Text */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 px-1 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2 sm:space-x-4 text-xs text-gray-500 font-prompt">
                  <div className="flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
                      Enter
                    </kbd>
                    <span>ส่ง</span>
                  </div>
                  <div className="hidden sm:flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
                      Shift+Enter
                    </kbd>
                    <span>บรรทัดใหม่</span>
                  </div>
                  <div className="hidden sm:flex items-center space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
                      F1
                    </kbd>
                    <span>คีย์ลัด</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}