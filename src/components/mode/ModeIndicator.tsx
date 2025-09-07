'use client';

import React from 'react';
import { AppMode } from '@/types';

interface ModeIndicatorProps {
  mode: AppMode;
  onModeChange?: () => void;
  showChangeButton?: boolean;
}

const MODE_INFO = {
  conversation: {
    title: 'โหมดสนทนา',
    subtitle: 'คุยกับใบบุญ',
    icon: '💬',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  intelligence: {
    title: 'โหมดวิเคราะห์',
    subtitle: 'ระบบวิเคราะห์สุขภาพ',
    icon: '🔬',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  }
};

export default function ModeIndicator({ mode, onModeChange, showChangeButton = true }: ModeIndicatorProps) {
  const modeInfo = MODE_INFO[mode];

  return (
    <div className={`
      flex items-center justify-between p-3 rounded-xl border
      ${modeInfo.bgColor} ${modeInfo.borderColor}
    `}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{modeInfo.icon}</div>
        <div>
          <div className={`font-prompt font-semibold text-sm ${modeInfo.textColor}`}>
            {modeInfo.title}
          </div>
          <div className={`font-sarabun text-xs ${modeInfo.textColor} opacity-80`}>
            {modeInfo.subtitle}
          </div>
        </div>
      </div>

      {showChangeButton && onModeChange && (
        <button
          onClick={onModeChange}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-prompt font-medium
            bg-white hover:bg-gray-50 ${modeInfo.textColor}
            border ${modeInfo.borderColor}
            transition-all duration-200 hover:scale-105
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${mode === 'conversation' ? 'focus:ring-blue-300' : 'focus:ring-green-300'}
          `}
        >
          เปลี่ยนโหมด
        </button>
      )}
    </div>
  );
}