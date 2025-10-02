'use client';

import { useState, useRef, useEffect } from 'react';
import FeedbackModal from '../components/feedback/FeedbackModal';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';

// Helper function to clean up markdown formatting from AI responses
function formatMessageText(text: string): string {
  if (!text) return text;
  
  // Remove markdown bullet points and make them proper text
  let formatted = text
    // Remove asterisk bullet points and replace with proper spacing
    .replace(/^\* /gm, '• ')
    // Remove double asterisk bold formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove single asterisk italic formatting  
    .replace(/\*(.*?)\*/g, '$1')
    // Clean up any remaining standalone asterisks
    .replace(/^\*\s*$/gm, '')
    // Remove extra line breaks
    .replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

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

  // Authentication state
  const { user, isAuthenticated, isLoading: authLoading, logout, chatSessions, createSession, deleteSession, renameSession } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Close session menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSessionMenu) {
        const target = event.target as Element;
        // Only close if clicking outside the dropdown and not on the trigger button
        if (!target.closest('.session-dropdown') && !target.closest('.session-trigger')) {
          setShowSessionMenu(false);
        }
      }
    };

    if (showSessionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSessionMenu]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'เมื่อไหร่';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'วันนี้';
      } else if (diffDays === 2) {
        return 'เมื่อวาน';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} วันที่แล้ว`;
      } else {
        return date.toLocaleDateString('th-TH', { 
          day: 'numeric', 
          month: 'short' 
        });
      }
    } catch (error) {
      return 'เมื่อไหร่';
    }
  };

  // Load chat history for authenticated users
  const loadChatHistory = async (sessionId: string) => {
    if (!isAuthenticated || !user || loadingHistory === sessionId) return;

    setLoadingHistory(sessionId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/history/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          // Convert API messages to UI message format
          const uiMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(uiMessages);
          setHasStartedChat(true);
          console.log('📚 Loaded chat history:', uiMessages.length, 'messages');
        } else {
          // No messages in this session
          setMessages([]);
          setHasStartedChat(false);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingHistory(null);
    }
  };

  // Handle new chat creation
  const handleNewChat = async () => {
    if (chatSessions.length >= 3) {
      alert('คุณมีแชทครบ 3 แชทแล้ว กรุณาลบแชทเก่าก่อนสร้างใหม่');
      return;
    }

    const result = await createSession('New Chat');
    if (result.success && result.session) {
      // Clear current chat and switch to new session
      setMessages([]);
      setHasStartedChat(false);
      setInputValue('');
      setCurrentSessionId(result.session.id);
      setSessionId(result.session.id);
      setShowSessionMenu(false); // Close session menu
      console.log('✨ Created new session:', result.session.id);
    } else {
      alert('ไม่สามารถสร้างแชทใหม่ได้: ' + (result.error || 'เกิดข้อผิดพลาด'));
    }
  };

  // Session ID management for authenticated and anonymous users
  useEffect(() => {
    if (isAuthenticated && chatSessions.length > 0 && !currentSessionId) {
      // Only set initial session if we don't have one already
      const mostRecentSession = chatSessions[0];
      setCurrentSessionId(mostRecentSession.id);
      setSessionId(mostRecentSession.id);
      console.log('🔑 Using authenticated session:', mostRecentSession.id);
      
      // Load chat history for this session and show chat interface if there are messages
      if (mostRecentSession.message_count > 0) {
        loadChatHistory(mostRecentSession.id);
        setHasStartedChat(true);
      }
    } else if (!isAuthenticated && !currentSessionId) {
      // Anonymous user - use client-side session ID
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
      setCurrentSessionId(sid);
      console.log('🔑 Anonymous session ID established:', sid);
    }
  }, [isAuthenticated, chatSessions, currentSessionId]);





  // Start with empty messages - no greeting for professional feel
  // Users will initiate conversation naturally

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure sessionId is not null before sending
    const activeSessionId = currentSessionId || sessionId;
    if (!inputValue.trim() || isLoading || !activeSessionId) return;

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
    setIsLoading(true); // 1. Turn ON the main loading indicator
    setIsStreaming(true); // Also turn ON streaming state

    try {
      console.log(`🎯 Frontend: Sending message with model ${selectedModel.toUpperCase()}`);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Add auth header for authenticated users
      if (isAuthenticated) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.text,
          sessionId: activeSessionId,
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
        {/* Header with Auth Buttons */}
        <div className="flex-shrink-0 px-6 py-4">
          <div className="flex justify-end max-w-4xl mx-auto">
            {!authLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
                      สวัสดี, {user?.display_name}
                    </span>
                    <button
                      onClick={logout}
                      className="text-sm text-gray-500 hover:text-teal-600 transition-colors focus:outline-none"
                      style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      }}
                      className="text-sm text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                      style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                    >
                      เข้าสู่ระบบ
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setShowAuthModal(true);
                      }}
                      className="text-sm text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                      style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                    >
                      สมัครสมาชิก
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

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

          {/* Session Quick Access for Authenticated Users - MINIMAL */}
          {isAuthenticated && chatSessions.length > 0 && (
            <div className="mt-12 w-full max-w-2xl space-y-2">
              {chatSessions.slice(0, 3).map((session) => (
                <button
                  key={session.id}
                  onClick={async () => {
                    setCurrentSessionId(session.id);
                    setSessionId(session.id);
                    await loadChatHistory(session.id);
                    if (session.message_count > 0) {
                      setHasStartedChat(true);
                    }
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-700 text-sm" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
                      {session.title}
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </div>
    );
  }

  // Chat interface after first message
  return (
    <div className="min-h-dvh bg-primary-100 flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-primary-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Logo and Session Info */}
          <div className="flex items-center space-x-4">
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
            
            {/* Session Management for Authenticated Users */}
            {isAuthenticated && (
              <div className="flex items-center space-x-3">
                {/* Current Session Display & Menu */}
                {chatSessions.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSessionMenu(!showSessionMenu)}
                      className="session-trigger flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-400 rounded px-3 py-1 transition-colors focus:outline-none focus:ring-0 focus:border-gray-400"
                      style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                    >
                      <span>{chatSessions.find(s => s.id === currentSessionId)?.title || 'New Chat'}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Session Dropdown Menu */}
                    {showSessionMenu && (
                      <div 
                        className="session-dropdown absolute top-full left-0 mt-1 w-64 bg-teal-50 border border-teal-200 rounded-lg shadow-lg z-50"
                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing when clicking inside
                      >
                        <div className="py-2">
                          {chatSessions.map((session) => (
                            <div key={session.id} className="group">
                              {renamingSessionId === session.id ? (
                                /* Rename Input */
                                <div className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={newSessionTitle}
                                    onChange={(e) => setNewSessionTitle(e.target.value)}
                                    onKeyDown={async (e) => {
                                      e.stopPropagation(); // Prevent event bubbling
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (newSessionTitle.trim()) {
                                          const result = await renameSession(session.id, newSessionTitle.trim());
                                          if (result.success) {
                                            console.log('✅ Session renamed successfully');
                                          } else {
                                            alert('ไม่สามารถเปลี่ยนชื่อแชทได้: ' + (result.error || 'เกิดข้อผิดพลาด'));
                                          }
                                        }
                                        setRenamingSessionId(null);
                                        setNewSessionTitle('');
                                      } else if (e.key === 'Escape') {
                                        setRenamingSessionId(null);
                                        setNewSessionTitle('');
                                      }
                                    }}
                                    onBlur={async (e) => {
                                      e.stopPropagation(); // Prevent event bubbling
                                      if (newSessionTitle.trim() && newSessionTitle.trim() !== session.title) {
                                        const result = await renameSession(session.id, newSessionTitle.trim());
                                        if (!result.success) {
                                          alert('ไม่สามารถเปลี่ยนชื่อแชทได้: ' + (result.error || 'เกิดข้อผิดพลาด'));
                                        }
                                      }
                                      setRenamingSessionId(null);
                                      setNewSessionTitle('');
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Prevent event bubbling on input click
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-300"
                                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                /* Session Item */
                                <div className="flex items-center justify-between px-3 py-2 hover:bg-teal-100 focus:outline-none">
                                  <button
                                    onClick={async () => {
                                      if (currentSessionId !== session.id && loadingHistory !== session.id) {
                                        // Clear current messages first
                                        setMessages([]);
                                        setCurrentSessionId(session.id);
                                        setSessionId(session.id);
                                        // Load new session's chat history
                                        await loadChatHistory(session.id);
                                        // Show chat interface if session has messages
                                        if (session.message_count > 0) {
                                          setHasStartedChat(true);
                                        } else {
                                          setHasStartedChat(false);
                                        }
                                        console.log('🔄 Switched to session:', session.id);
                                      }
                                      setShowSessionMenu(false);
                                    }}
                                    className={`flex-1 text-left text-sm focus:outline-none ${
                                      currentSessionId === session.id ? 'text-teal-600 font-medium' : 'text-gray-700'
                                    }`}
                                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                                  >
                                    <div>{session.title}</div>
                                  </button>
                                  
                                  {/* Session Actions */}
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent event bubbling
                                        setRenamingSessionId(session.id);
                                        setNewSessionTitle(session.title);
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                      title="เปลี่ยนชื่อ"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    
                                    {chatSessions.length > 1 && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation(); // Prevent event bubbling
                                          if (confirm('คุณต้องการลบแชทนี้หรือไม่?')) {
                                            const result = await deleteSession(session.id);
                                            if (result.success) {
                                              // If we deleted the current session, switch to another one
                                              if (currentSessionId === session.id) {
                                                const remainingSession = chatSessions.find(s => s.id !== session.id);
                                                if (remainingSession) {
                                                  setCurrentSessionId(remainingSession.id);
                                                  setSessionId(remainingSession.id);
                                                  await loadChatHistory(remainingSession.id);
                                                }
                                              }
                                              setShowSessionMenu(false);
                                            } else {
                                              alert('ไม่สามารถลบแชทได้: ' + (result.error || 'เกิดข้อผิดพลาด'));
                                            }
                                          }
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                                        title="ลบแชท"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* New Chat Button */}
                {chatSessions.length < 3 && (
                  <button
                    onClick={handleNewChat}
                    className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded transition-colors focus:outline-none"
                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                  >
                    + แชทใหม่
                  </button>
                )}
                
                {/* Session Limit Indicator */}
                {chatSessions.length >= 3 && (
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
                    (สูงสุด 3 แชท)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          {!authLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
                    {user?.display_name}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-teal-600 transition-colors focus:outline-none"
                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="text-sm text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setShowAuthModal(true);
                    }}
                    className="text-sm text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                    style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
                  >
                    สมัครสมาชิก
                  </button>
                </div>
              )}
            </>
          )}
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
                            {formatMessageText(message.text)}
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
                                  onClick={() => openFeedbackModal(message.id, message.text, 'detailed')}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}