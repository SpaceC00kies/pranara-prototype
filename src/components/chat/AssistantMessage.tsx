'use client';

import React from 'react';
import { ChatMessage } from '@/types';

interface AssistantMessageProps {
  message: ChatMessage;
  showLineOption?: boolean;
  onLineClick?: () => void;
  lineHandoffMessage?: string;
  lineHandoffUrgency?: 'high' | 'medium' | 'low';
}

export default function AssistantMessage({ 
  message, 
  showLineOption = false, 
  onLineClick,
  lineHandoffMessage,
  lineHandoffUrgency = 'low'
}: AssistantMessageProps) {
  return (
    <div className="flex justify-start" role="group" aria-label="ข้อความจากใบบุญ">
      <div className="group max-w-[85%] sm:max-w-md lg:max-w-2xl">
        {/* Avatar and Message */}
        <div className="flex items-start space-x-3">
          {/* Premium Health-Focused Avatar */}
          <div className="flex-shrink-0 relative">
            <div 
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center"
              role="img"
              aria-label="ใบบุญ ผู้ช่วยดูแลผู้สูงอายุ"
            >
              <img 
                src="https://img.icons8.com/?size=100&id=67639&format=png&color=FFFFFF" 
                alt=""
                className="w-6 h-6"
                aria-hidden="true"
              />
            </div>
          </div>
          
          <div className="flex-1">
            {/* Premium Message Bubble */}
            <div className="relative">
              {/* AI Label */}
              <div className="mb-1">
                <span className="text-xs font-medium text-primary-600 font-prompt">ใบบุญ</span>
              </div>
              
              {/* Message Bubble */}
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl rounded-tl-sm px-4 py-4 shadow-md hover:shadow-lg transition-all duration-200">
                <div 
                  className="text-[15px] font-sarabun chat-message-content text-text-primary whitespace-pre-line"
                  role="text"
                >
                  {message.text}
                </div>
                
                {/* Enhanced LINE button integration with contextual messaging */}
                {showLineOption && onLineClick && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {/* Contextual handoff message */}
                    {lineHandoffMessage && (
                      <div className={`mb-3 p-3 rounded-lg text-sm font-sarabun ${
                        lineHandoffUrgency === 'high' 
                          ? 'bg-red-50 text-red-800 border border-red-200' 
                          : lineHandoffUrgency === 'medium'
                          ? 'bg-orange-50 text-orange-800 border border-orange-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {lineHandoffUrgency === 'high' && (
                          <div className="flex items-center mb-1">
                            <svg className="w-4 h-4 mr-1 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">เร่งด่วน</span>
                          </div>
                        )}
                        {lineHandoffMessage}
                      </div>
                    )}
                    
                    <button
                      onClick={onLineClick}
                      className={`inline-flex items-center justify-center px-4 py-2 text-white text-sm font-prompt font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95 min-h-[44px] min-w-[44px] ${
                        lineHandoffUrgency === 'high'
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30 animate-pulse'
                          : lineHandoffUrgency === 'medium'
                          ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500/30'
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500/30'
                      }`}
                      type="button"
                      aria-label={`ติดต่อทีม Jirung ผ่าน LINE ${lineHandoffUrgency === 'high' ? 'เร่งด่วน' : ''}`}
                      aria-describedby={lineHandoffMessage ? 'line-handoff-description' : undefined}
                    >
                      {/* LINE icon */}
                      <svg 
                        className="w-4 h-4 mr-2" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      {lineHandoffUrgency === 'high' ? 'ติดต่อทีม Jirung ด่วน!' : 'คุยกับทีม Jirung ทาง LINE'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Message Tail Triangle */}
              <div className="absolute top-6 left-0 w-0 h-0 border-r-[8px] border-r-white/90 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent transform -translate-x-full"></div>
            </div>
            
            {/* Timestamp and Topic Pills */}
            <div className="flex items-center justify-between mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <time 
                className="text-xs text-neutral-400 font-prompt"
                dateTime={message.timestamp.toISOString()}
                aria-label={`ตอบเมื่อ ${message.timestamp.toLocaleTimeString('th-TH', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false
                })}`}
              >
                {message.timestamp.toLocaleTimeString('th-TH', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false
                })}
              </time>
              
              {message.topic && (
                <div className="flex items-center space-x-2">
                  {/* Pulsing Dot Indicator */}
                  <div 
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    aria-hidden="true"
                  ></div>
                  
                  {/* Topic Pill */}
                  <span 
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
                    aria-label={`หมวดหมู่: ${getTopicLabel(message.topic)}`}
                  >
                    {getTopicLabel(message.topic)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTopicLabel(topic: string): string {
  const topicLabels: Record<string, string> = {
    alzheimer: 'อัลไซเมอร์',
    fall: 'การล้ม',
    sleep: 'การนอน',
    diet: 'อาหาร',
    night_care: 'ดูแลกลางคืน',
    post_op: 'หลังผ่าตัด',
    diabetes: 'เบาหวาน',
    mood: 'อารมณ์',
    medication: 'ยา',
    emergency: 'ฉุกเฉิน',
    general: 'ทั่วไป'
  };
  
  return topicLabels[topic] || 'ทั่วไป';
}