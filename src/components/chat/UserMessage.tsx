'use client';

import React from 'react';
import { ChatMessage } from '@/types';

interface UserMessageProps {
  message: ChatMessage;
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end" role="group" aria-label="ข้อความจากคุณ">
      <div className="group max-w-[85%] sm:max-w-md lg:max-w-lg">
        {/* Premium Message Bubble */}
        <div className="relative">
          {/* Main Message Bubble */}
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-4">
            <div 
              className="text-[15px] font-sarabun chat-message-content break-words whitespace-pre-wrap"
              role="text"
            >
              {message.text}
            </div>
            
            {/* Message Tail Triangle */}
            <div 
              className="absolute bottom-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-primary-600 transform translate-x-0 translate-y-full"
              aria-hidden="true"
            ></div>
          </div>
        </div>
        
        {/* Timestamp Section with Read Indicator */}
        <div className="flex items-center justify-end space-x-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <time 
            className="text-xs text-neutral-400 font-prompt"
            dateTime={message.timestamp.toISOString()}
            aria-label={`ส่งเมื่อ ${message.timestamp.toLocaleTimeString('th-TH', { 
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
          
          {/* Read Indicator Checkmark */}
          <div className="flex items-center" aria-label="ข้อความถูกส่งแล้ว">
            <svg 
              className="w-4 h-4 text-primary-500" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}