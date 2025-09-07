'use client';

import React from 'react';
import { AppMode, ModeSelectionProps } from '@/types';

const MODE_CONFIG = {
  conversation: {
    title: 'Chat with ใบบุญ',
    titleTh: 'คุยกับใบบุญ',
    description: 'Warm, caring conversations with emotional support and basic guidance',
    descriptionTh: 'สนทนาอบอุ่น ให้กำลังใจ และคำแนะนำเบื้องต้น',
    icon: '💬',
    features: [
      'การสนทนาที่อบอุ่นและเข้าใจ',
      'การให้กำลังใจและสนับสนุนทางอารมณ์',
      'คำแนะนำเบื้องต้นในการดูแลผู้สูงอายุ',
      'บริบททางวัฒนธรรมไทย'
    ],
    perfectFor: 'เหมาะสำหรับ: ความสบายใจ, คำถามประจำวัน, ความต้องการทางอารมณ์'
  },
  intelligence: {
    title: 'Health Intelligence',
    titleTh: 'ระบบวิเคราะห์สุขภาพ',
    description: 'MCP-powered research, analysis & decision support',
    descriptionTh: 'การวิจัย วิเคราะห์ และสนับสนุนการตัดสินใจด้วย AI',
    icon: '🔬',
    features: [
      'การวิจัยและวิเคราะห์ด้วย AI ขั้นสูง',
      'ข้อมูลสุขภาพที่อิงหลักฐานทางวิทยาศาสตร์',
      'การสนับสนุนการตัดสินใจระดับมืออาชีพ',
      'การเปรียบเทียบและวิเคราะห์ต้นทุน'
    ],
    perfectFor: 'เหมาะสำหรับ: การตัดสินใจ, การวางแผน, การวิจัยเชิงลึก'
  }
};

export default function ModeSelection({ onModeSelect, selectedMode }: ModeSelectionProps) {
  const handleModeSelect = (mode: AppMode) => {
    onModeSelect(mode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 10.5V19L13.5 17.5V10.5M5.5 7.5C4.67 7.5 4 8.17 4 9S4.67 10.5 5.5 10.5 7 9.83 7 9 6.33 7.5 5.5 7.5M5.5 12C4.67 12 4 12.67 4 13.5S4.67 15 5.5 15 7 14.33 7 13.5 6.33 12 5.5 12M5.5 16.5C4.67 16.5 4 17.17 4 18S4.67 19.5 5.5 19.5 7 18.83 7 18 6.33 16.5 5.5 16.5M11 20C9.89 20 9 19.1 9 18V16L11 14L13 16V18C13 19.1 12.11 20 11 20Z"/>
              </svg>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 font-prompt mb-4">
              ยินดีต้อนรับสู่ Jirung
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 font-sarabun mb-2">
              แพลตฟอร์มดูแลสุขภาพผู้สูงอายุอัจฉริยะ
            </p>
            <p className="text-lg text-gray-500 font-sarabun">
              เลือกโหมดที่เหมาะสมกับความต้องการของคุณวันนี้
            </p>
          </div>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Conversation Mode */}
          <div 
            className={`
              relative group cursor-pointer transform transition-all duration-300 hover:scale-105
              ${selectedMode === 'conversation' ? 'scale-105' : ''}
            `}
            onClick={() => handleModeSelect('conversation')}
          >
            <div className={`
              bg-white rounded-3xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300
              border-2 ${selectedMode === 'conversation' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}
            `}>
              {/* Mode Icon and Title */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{MODE_CONFIG.conversation.icon}</div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 font-prompt mb-2">
                  {MODE_CONFIG.conversation.titleTh}
                </h2>
                <p className="text-lg text-gray-600 font-sarabun">
                  {MODE_CONFIG.conversation.descriptionTh}
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-6">
                {MODE_CONFIG.conversation.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 font-sarabun text-sm lg:text-base">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Perfect For */}
              <div className="bg-blue-50 rounded-2xl p-4 mb-6">
                <p className="text-blue-800 font-sarabun text-sm lg:text-base font-medium">
                  {MODE_CONFIG.conversation.perfectFor}
                </p>
              </div>

              {/* Action Button */}
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect('conversation');
                }}
              >
                เริ่มสนทนากับใบบุญ
              </button>
            </div>

            {/* Selection Indicator */}
            {selectedMode === 'conversation' && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Intelligence Mode */}
          <div 
            className={`
              relative group cursor-pointer transform transition-all duration-300 hover:scale-105
              ${selectedMode === 'intelligence' ? 'scale-105' : ''}
            `}
            onClick={() => handleModeSelect('intelligence')}
          >
            <div className={`
              bg-white rounded-3xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300
              border-2 ${selectedMode === 'intelligence' ? 'border-green-500 ring-4 ring-green-100' : 'border-gray-200 hover:border-green-300'}
            `}>
              {/* Mode Icon and Title */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{MODE_CONFIG.intelligence.icon}</div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 font-prompt mb-2">
                  {MODE_CONFIG.intelligence.titleTh}
                </h2>
                <p className="text-lg text-gray-600 font-sarabun">
                  {MODE_CONFIG.intelligence.descriptionTh}
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-6">
                {MODE_CONFIG.intelligence.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 font-sarabun text-sm lg:text-base">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Perfect For */}
              <div className="bg-green-50 rounded-2xl p-4 mb-6">
                <p className="text-green-800 font-sarabun text-sm lg:text-base font-medium">
                  {MODE_CONFIG.intelligence.perfectFor}
                </p>
              </div>

              {/* Action Button */}
              <button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-prompt font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect('intelligence');
                }}
              >
                เริ่มใช้ระบบวิเคราะห์
              </button>
            </div>

            {/* Selection Indicator */}
            {selectedMode === 'intelligence' && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto border border-gray-200">
            <p className="text-gray-600 font-sarabun text-sm lg:text-base mb-4">
              <strong>หมายเหตุ:</strong> คุณสามารถเปลี่ยนโหมดได้ตลอดเวลาระหว่างการใช้งาน
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span>🔒 ปลอดภัย</span>
              <span>•</span>
              <span>🇹🇭 ภาษาไทย</span>
              <span>•</span>
              <span>⚡ ตอบสนองเร็ว</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}