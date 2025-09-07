'use client';

import React, { useState, useEffect } from 'react';
import { ErrorResponse, ErrorCode } from '@/types';

interface ChatErrorHandlerProps {
  error: ErrorResponse | Error | null;
  onRetry: () => void;
  onDismiss: () => void;
  onLineClick?: () => void;
  className?: string;
}

/**
 * Specialized error handler for chat interface
 */
export default function ChatErrorHandler({
  error,
  onRetry,
  onDismiss,
  onLineClick,
  className = ''
}: ChatErrorHandlerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      // Auto-retry for certain error types
      const shouldAutoRetry = isRetryableError(error) && autoRetryCount < 2;
      
      if (shouldAutoRetry) {
        setIsAutoRetrying(true);
        const retryDelay = Math.min(1000 * Math.pow(2, autoRetryCount), 5000);
        
        setTimeout(() => {
          setAutoRetryCount(prev => prev + 1);
          setIsAutoRetrying(false);
          onRetry();
        }, retryDelay);
      }
    } else {
      setIsVisible(false);
      setAutoRetryCount(0);
      setIsAutoRetrying(false);
    }
  }, [error, autoRetryCount, onRetry]);

  if (!error || !isVisible) {
    return null;
  }

  const errorInfo = getErrorInfo(error);

  return (
    <div className={`chat-error-handler ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 animate-slide-down">
        <div className="flex items-start space-x-3">
          {/* Error Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              {isAutoRetrying ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg 
                  className="w-4 h-4 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-red-800 font-sarabun">
              {errorInfo.title}
            </h4>
            <p className="mt-1 text-sm text-red-700 font-sarabun">
              {errorInfo.message}
            </p>

            {/* Auto-retry indicator */}
            {isAutoRetrying && (
              <p className="mt-2 text-xs text-red-600 font-sarabun">
                กำลังลองใหม่อัตโนมัติ... ({autoRetryCount + 1}/3)
              </p>
            )}

            {/* Action Buttons */}
            {!isAutoRetrying && (
              <div className="mt-3 flex flex-wrap gap-2">
                {errorInfo.showRetry && (
                  <button
                    onClick={() => {
                      setAutoRetryCount(0);
                      onRetry();
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 font-sarabun"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    ลองใหม่
                  </button>
                )}

                {errorInfo.showLineOption && onLineClick && (
                  <button
                    onClick={onLineClick}
                    className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded-lg text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 font-sarabun"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.628-.629.628M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    คุยกับทีม Jirung
                  </button>
                )}

                <button
                  onClick={onDismiss}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 font-sarabun"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          {!isAutoRetrying && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-full p-1 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: ErrorResponse | Error): boolean {
  if ('code' in error) {
    const retryableCodes: ErrorCode[] = [
      'NETWORK_ERROR',
      'GEMINI_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED',
      'DATABASE_ERROR'
    ];
    return retryableCodes.includes(error.code);
  }
  
  // For generic Error objects, check message
  const retryableMessages = ['network', 'timeout', 'unavailable', 'rate limit'];
  return retryableMessages.some(msg => 
    error.message.toLowerCase().includes(msg)
  );
}

/**
 * Get user-friendly error information
 */
function getErrorInfo(error: ErrorResponse | Error): {
  title: string;
  message: string;
  showRetry: boolean;
  showLineOption: boolean;
} {
  // Handle ErrorResponse objects
  if ('code' in error) {
    const errorResponse = error as ErrorResponse;
    
    switch (errorResponse.code) {
      case 'NETWORK_ERROR':
        return {
          title: 'ปัญหาการเชื่อมต่อ',
          message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
          showRetry: true,
          showLineOption: true
        };
        
      case 'GEMINI_UNAVAILABLE':
        return {
          title: 'บริการชั่วคราวไม่พร้อมใช้งาน',
          message: 'ระบบ AI กำลังมีปัญหา กรุณาลองใหม่อีกครั้งหรือติดต่อทีมสนับสนุน',
          showRetry: true,
          showLineOption: true
        };
        
      case 'RATE_LIMIT_EXCEEDED':
        return {
          title: 'ใช้งานเกินขีดจำกัด',
          message: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
          showRetry: true,
          showLineOption: false
        };
        
      case 'SAFETY_VIOLATION':
        return {
          title: 'เนื้อหาไม่เหมาะสม',
          message: 'คำถามนี้ไม่เหมาะสมสำหรับระบบ กรุณาลองถามในหัวข้ออื่น',
          showRetry: false,
          showLineOption: true
        };
        
      case 'INVALID_INPUT':
        return {
          title: 'ข้อมูลไม่ถูกต้อง',
          message: 'กรุณาตรวจสอบข้อความและลองใหม่',
          showRetry: false,
          showLineOption: false
        };
        
      case 'DATABASE_ERROR':
        return {
          title: 'ปัญหาระบบฐานข้อมูล',
          message: 'เกิดปัญหาในการบันทึกข้อมูล แต่การสนทนายังคงใช้งานได้',
          showRetry: true,
          showLineOption: false
        };
        
      default:
        return {
          title: 'เกิดข้อผิดพลาด',
          message: errorResponse.fallbackMessage || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
          showRetry: true,
          showLineOption: errorResponse.showLineOption
        };
    }
  }
  
  // Handle generic Error objects
  return {
    title: 'เกิดข้อผิดพลาด',
    message: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    showRetry: true,
    showLineOption: true
  };
}