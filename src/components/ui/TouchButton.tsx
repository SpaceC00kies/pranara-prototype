/**
 * Touch-optimized button component for mobile accessibility
 * Ensures minimum 44px touch target and provides haptic feedback
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { touchAccessibility } from '@/utils/accessibility';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
}

export default function TouchButton({
  children,
  variant = 'primary',
  size = 'md',
  hapticFeedback = true,
  rippleEffect = true,
  className = '',
  onClick,
  ...props
}: TouchButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Add touch feedback effects
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const cleanup = touchAccessibility.addTouchFeedback(button);
    return cleanup;
  }, []);

  // Validate touch target size in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && buttonRef.current) {
      const isValidSize = touchAccessibility.validateTouchTarget(buttonRef.current);
      if (!isValidSize) {
        console.warn('TouchButton: Touch target size is less than 44px', buttonRef.current);
      }
    }
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback for supported devices
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }

    // Ripple effect
    if (rippleEffect) {
      const button = e.currentTarget;
      const ripple = document.createElement('div');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add(
        'absolute', 
        'bg-white/30', 
        'rounded-full', 
        'pointer-events-none',
        'animate-ping'
      );
      
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    onClick?.(e);
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30 text-white';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-500/30 text-gray-900';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500/30 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm';
      case 'md':
        return 'min-h-[48px] min-w-[48px] px-4 py-3 text-base';
      case 'lg':
        return 'min-h-[52px] min-w-[52px] px-6 py-4 text-lg';
      default:
        return 'min-h-[48px] min-w-[48px] px-4 py-3 text-base';
    }
  };

  return (
    <button
      ref={buttonRef}
      className={`
        relative overflow-hidden
        ${getSizeClasses()}
        ${getVariantClasses()}
        font-prompt font-medium rounded-xl
        transition-all duration-200
        transform hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed 
        disabled:transform-none disabled:hover:scale-100
        select-none
        ${className}
      `}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}