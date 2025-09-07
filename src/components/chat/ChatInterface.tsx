'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatInterfaceProps, ErrorResponse, TopicCategory } from '@/types';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import TypingIndicator from './TypingIndicator';
import ChatErrorHandler from '../error/ChatErrorHandler';
import { ModeIndicator } from '../mode';
import { 
  getClientLineConfig, 
  shouldRecommendLineHandoff, 
  generateLineHandoffMessage,
  openLineUrl 
} from '@/services/lineService';

export default function ChatInterface({ onLineClick, mode = 'conversation', onModeChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [lineConfig] = useState(() => getClientLineConfig());
  const [currentError, setCurrentError] = useState<ErrorResponse | Error | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessages = {
      conversation: 'สวัสดีค่ะคุณผู้ดูแล ดิฉันใบบุญจากจีรัง เวลเนสค่ะ ยินดีที่ได้พูดคุยกันนะคะ\n\nมีเรื่องอะไรให้ใบบุญช่วยดูแลหรือแนะนำได้บ้างคะ\n\nใบบุญเข้าใจดีค่ะว่าการดูแลผู้สูงอายุอาจมีเรื่องให้กังวลใจบ้าง อย่าลังเลที่จะเล่าให้ฟังนะคะ เราจะดูแลกันไปค่ะ',
      intelligence: 'ยินดีต้อนรับสู่ระบบวิเคราะห์สุขภาพอัจฉริยะของ Jirung\n\nระบบนี้ใช้เทคโนโลยี AI ขั้นสูงในการวิจัย วิเคราะห์ และให้คำแนะนำด้านสุขภาพที่อิงหลักฐานทางวิทยาศาสตร์\n\nคุณสามารถถามเกี่ยวกับ:\n• การวิเคราะห์ข้อมูลสุขภาพ\n• การเปรียบเทียบตัวเลือกการรักษา\n• การวิจัยข้อมูลทางการแพทย์\n• การวางแผนการดูแลระยะยาว\n\nโปรดระบุคำถามของคุณเพื่อเริ่มการวิเคราะห์'
    };

    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: welcomeMessages[mode],
      sender: 'assistant',
      timestamp: new Date(),
      topic: 'general'
    };
    setMessages([welcomeMessage]);
  }, [mode]);

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
    setCurrentError(null); // Clear any previous errors

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
        // Try to parse error response
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
        return;
      }

      const data = await response.json();

      // Check if response contains an error
      if (data.error) {
        setCurrentError(data);
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

      // Enhanced LINE handoff logic with contextual recommendations
      const userMessages = messages.filter(m => m.sender === 'user').length + 1;
      const handoffRecommendation = shouldRecommendLineHandoff(
        userMessage.text,
        data.topic,
        userMessages
      );

      // Show LINE option if recommended by API or by our contextual logic
      const shouldShowLine = data.showLineOption || handoffRecommendation.shouldRecommend;
      
      if (shouldShowLine && lineConfig.isEnabled) {
        setTimeout(() => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.sender === 'assistant') {
              // Generate contextual LINE message
              const lineMessage = generateLineHandoffMessage(
                handoffRecommendation.reason,
                handoffRecommendation.urgency,
                'th'
              );
              
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
      
      // Set error for the error handler to display
      setCurrentError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      setInputValue(lastUserMessage);
      setCurrentError(null);
      // Focus input for user to retry
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleDismissError = () => {
    setCurrentError(null);
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

    // Open LINE URL with proper tracking
    openLineUrl(
      sessionId,
      (topic as TopicCategory) || 'general',
      reason || 'manual',
      () => {
        // Additional tracking callback
        console.log('LINE handoff initiated:', { sessionId, topic, reason });
      }
    );

    // Call the provided onLineClick handler for backward compatibility
    onLineClick();
  };

  return (
    <div className="relative flex flex-col h-screen bg-white overflow-hidden">


      {/* Premium Chat Container - Tailwind v3 Compatible */}
      <div className="relative flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 min-h-0">
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Premium Health-Focused Chat Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
            {/* Mode Indicator */}
            <div className="mb-4">
              <ModeIndicator 
                mode={mode} 
                onModeChange={onModeChange}
                showChangeButton={!!onModeChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              {/* Avatar and Title Section */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Premium Avatar with Elder Care Icon */}
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    mode === 'conversation' ? 'bg-blue-600' : 'bg-green-600'
                  }`}>
                    {/* Mode-specific Icon */}
                    {mode === 'conversation' ? (
                      <img 
                        src="https://img.icons8.com/?size=100&id=67639&format=png&color=FFFFFF" 
                        alt="ใบบุญ"
                        className="w-8 h-8"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Title Section */}
                <div className="flex flex-col min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 font-prompt leading-relaxed py-1">
                    {mode === 'conversation' ? 'ใบบุญ - ผู้ช่วยดูแลผู้สูงอายุ' : 'ระบบวิเคราะห์สุขภาพอัจฉริยะ'}
                  </h1>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {/* Settings Button */}
                <div className="relative group">
                  <button 
                    className="w-10 h-10 bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-primary-100/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    aria-label="การตั้งค่า"
                  >
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    การตั้งค่า
                  </div>
                </div>

                {/* Info Button */}
                <div className="relative group">
                  <button 
                    className="w-10 h-10 bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-primary-100/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    aria-label="ข้อมูลเพิ่มเติม"
                  >
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    ข้อมูลเพิ่มเติม
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto chat-scrollbar px-4 sm:px-6 py-6 min-h-0">
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
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Modern Premium Input Area */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4">
            <form onSubmit={handleSubmit} className="flex items-start gap-3">
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
                  placeholder={mode === 'conversation' 
                    ? "พิมพ์คำถามเกี่ยวกับการดูแลผู้สูงอายุ..." 
                    : "พิมพ์คำถามสำหรับการวิเคราะห์และวิจัยข้อมูลสุขภาพ..."
                  }
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
                  style={{ 
                    height: '52px',
                    lineHeight: '1.6'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '52px';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                
                {/* Character Counter */}
                {inputValue.length > 0 && (
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400 font-prompt">
                    {inputValue.length}
                  </div>
                )}
              </div>
              
              {/* Modern Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className={`
                  relative overflow-hidden
                  flex-shrink-0 w-[52px] h-[52px] mb-0
                  ${mode === 'conversation' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                  disabled:bg-gray-400
                  text-white rounded-2xl
                  flex items-center justify-center
                  hover:shadow-lg
                  transform hover:scale-105 active:scale-95 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2
                  disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100
                `}
                aria-label="ส่งข้อความ"
                onClick={(e) => {
                  // Ripple effect
                  const button = e.currentTarget;
                  const ripple = document.createElement('div');
                  const rect = button.getBoundingClientRect();
                  const size = Math.max(rect.width, rect.height);
                  const x = e.clientX - rect.left - size / 2;
                  const y = e.clientY - rect.top - size / 2;
                  
                  ripple.style.width = ripple.style.height = size + 'px';
                  ripple.style.left = x + 'px';
                  ripple.style.top = y + 'px';
                  ripple.classList.add('absolute', 'bg-white/30', 'rounded-full', 'animate-ping');
                  
                  button.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                      strokeWidth={2.5} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                )}
              </button>
            </form>
            
            {/* Enhanced Helper Text Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 px-1 space-y-2 sm:space-y-0">
              {/* Keyboard Shortcuts */}
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs text-gray-500 font-prompt">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono transition-all duration-200">
                    Enter
                  </kbd>
                  <span>ส่ง</span>
                </div>
                <div className="hidden sm:flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono transition-all duration-200">
                    Shift+Enter
                  </kbd>
                  <span>บรรทัดใหม่</span>
                </div>
              </div>
              
              {/* AI Status Indicator */}
              <div className="flex items-center justify-center sm:justify-end">

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}