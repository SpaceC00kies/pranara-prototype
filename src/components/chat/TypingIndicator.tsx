'use client';

import React from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-start space-x-3">
        {/* Premium Health-Focused Avatar - Same as AssistantMessage */}
        <div className="flex-shrink-0 relative">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-sarabun font-semibold">บ</span>
          </div>
          
          {/* Pulsing Status Indicator */}
          <div className="absolute -bottom-0.5 -right-0.5">
            <div className="w-3 h-3 bg-health-green rounded-full border border-white animate-pulse"></div>
          </div>
        </div>
        
        {/* Modern Glassmorphism Typing Container */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-4 py-3 shadow-md">
          {/* Three Bouncing Dots with Staggered Animation */}
          <div className="flex space-x-1">
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}