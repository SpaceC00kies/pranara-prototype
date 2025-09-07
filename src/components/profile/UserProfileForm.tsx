'use client';

import React, { useState } from 'react';
import { 
  UserProfile, 
  UserProfileRequest, 
  AgeRange, 
  Gender, 
  Location,
  AppMode 
} from '@/types';

interface UserProfileFormProps {
  sessionId: string;
  existingProfile?: UserProfile | null;
  onProfileComplete: (profile: UserProfile) => void;
  onSkip?: () => void;
  mode?: AppMode;
  isOptional?: boolean;
}

const AGE_RANGES: { value: AgeRange; label: string; description: string }[] = [
  { value: '18-29', label: '18-29 ปี', description: 'วัยหนุ่มสาว' },
  { value: '30-39', label: '30-39 ปี', description: 'วัยทำงาน' },
  { value: '40-49', label: '40-49 ปี', description: 'วัยกลางคน' },
  { value: '50-59', label: '50-59 ปี', description: 'วัยก่อนเกษียณ' },
  { value: '60-69', label: '60-69 ปี', description: 'วัยผู้สูงอายุตอนต้น' },
  { value: '70-79', label: '70-79 ปี', description: 'วัยผู้สูงอายุ' },
  { value: '80+', label: '80+ ปี', description: 'วัยสูงอายุมาก' }
];

const GENDERS: { value: Gender; label: string; description: string }[] = [
  { value: 'male', label: 'ชาย', description: '' },
  { value: 'female', label: 'หญิง', description: '' },
  { value: 'transgender', label: 'ทรานส์เจนเดอร์', description: '' },
  { value: 'non-binary', label: 'เพศที่สาม', description: '' },
  { value: 'prefer-not-to-say', label: 'ไม่ระบุ', description: 'เราเคารพความเป็นส่วนตัวของคุณ' }
];

const LOCATIONS: { value: Location; label: string; description: string }[] = [
  { value: 'bangkok', label: 'กรุงเทพมหานคร', description: 'และปริมณฑล' },
  { value: 'central', label: 'ภาคกลาง', description: 'นอกเหนือจากกรุงเทพฯ' },
  { value: 'north', label: 'ภาคเหนือ', description: 'เชียงใหม่, เชียงราย, ลำปาง' },
  { value: 'northeast', label: 'ภาคตะวันออกเฉียงเหนือ', description: 'อีสาน' },
  { value: 'south', label: 'ภาคใต้', description: 'ภูเก็ต, สงขลา, สุราษฎร์ธานี' },
  { value: 'other', label: 'อื่นๆ', description: 'หรือไม่อยู่ในประเทศไทย' }
];

const CAREGIVING_ROLES = [
  { value: 'primary', label: 'ผู้ดูแลหลัก', description: 'รับผิดชอบการดูแลเป็นหลัก' },
  { value: 'secondary', label: 'ผู้ดูแลรอง', description: 'ช่วยเหลือเป็นครั้งคราว' },
  { value: 'family-member', label: 'สมาชิกครอบครัว', description: 'ต้องการเข้าใจและช่วยเหลือ' },
  { value: 'professional', label: 'ผู้เชี่ยวชาญ', description: 'นักสังคมสงเคราะห์, พยาบาล, แพทย์' }
];

export default function UserProfileForm({ 
  sessionId, 
  existingProfile, 
  onProfileComplete, 
  onSkip,
  mode = 'conversation',
  isOptional = true 
}: UserProfileFormProps) {
  const [formData, setFormData] = useState<UserProfileRequest>({
    sessionId,
    ageRange: existingProfile?.ageRange,
    gender: existingProfile?.gender,
    location: existingProfile?.location,
    culturalContext: existingProfile?.culturalContext || {
      language: 'th'
    },
    healthContext: existingProfile?.healthContext || {}
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);

  const steps = [
    { id: 'age', title: 'ช่วงอายุ', required: true },
    { id: 'gender', title: 'เพศ', required: true },
    { id: 'location', title: 'ที่อยู่', required: true },
    { id: 'role', title: 'บทบาทการดูแล', required: false }
  ];

  const isStepComplete = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return !!formData.ageRange;
      case 1: return !!formData.gender;
      case 2: return !!formData.location;
      case 3: return !!formData.healthContext?.caregivingRole;
      default: return false;
    }
  };

  const canProceed = (): boolean => {
    return formData.ageRange && formData.gender && formData.location ? true : false;
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        onProfileComplete(data.profile);
      } else {
        console.error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Age Range
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 font-prompt mb-2">
                ช่วงอายุของคุณ
              </h3>
              <p className="text-gray-600 font-sarabun">
                ข้อมูลนี้จะช่วยให้เราให้คำแนะนำที่เหมาะสมกับวัยของคุณ
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGE_RANGES.map((age) => (
                <button
                  key={age.value}
                  onClick={() => setFormData({ ...formData, ageRange: age.value })}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${formData.ageRange === age.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="font-prompt font-semibold text-gray-900">
                    {age.label}
                  </div>
                  <div className="text-sm text-gray-600 font-sarabun">
                    {age.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 1: // Gender
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 font-prompt mb-2">
                เพศ
              </h3>
              <p className="text-gray-600 font-sarabun">
                เราเคารพความหลากหลายและใช้ข้อมูลนี้เพื่อให้คำแนะนำที่เหมาะสม
              </p>
            </div>
            
            <div className="space-y-3">
              {GENDERS.map((gender) => (
                <button
                  key={gender.value}
                  onClick={() => setFormData({ ...formData, gender: gender.value })}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${formData.gender === gender.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="font-prompt font-semibold text-gray-900">
                    {gender.label}
                  </div>
                  {gender.description && (
                    <div className="text-sm text-gray-600 font-sarabun">
                      {gender.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2: // Location
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 font-prompt mb-2">
                ที่อยู่ของคุณ
              </h3>
              <p className="text-gray-600 font-sarabun">
                ข้อมูลนี้จะช่วยให้เราแนะนำทรัพยากรและบริการในพื้นที่ของคุณ
              </p>
            </div>
            
            <div className="space-y-3">
              {LOCATIONS.map((location) => (
                <button
                  key={location.value}
                  onClick={() => setFormData({ ...formData, location: location.value })}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${formData.location === location.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="font-prompt font-semibold text-gray-900">
                    {location.label}
                  </div>
                  <div className="text-sm text-gray-600 font-sarabun">
                    {location.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Caregiving Role
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 font-prompt mb-2">
                บทบาทการดูแลของคุณ
              </h3>
              <p className="text-gray-600 font-sarabun">
                ข้อมูลนี้จะช่วยให้เราปรับคำแนะนำให้เหมาะกับบทบาทของคุณ (ไม่บังคับ)
              </p>
            </div>
            
            <div className="space-y-3">
              {CAREGIVING_ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setFormData({ 
                    ...formData, 
                    healthContext: { 
                      ...formData.healthContext, 
                      caregivingRole: role.value as 'primary' | 'secondary' | 'family-member' | 'professional'
                    }
                  })}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${formData.healthContext?.caregivingRole === role.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}
                >
                  <div className="font-prompt font-semibold text-gray-900">
                    {role.label}
                  </div>
                  <div className="text-sm text-gray-600 font-sarabun">
                    {role.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 font-prompt mb-2">
            ปรับแต่งประสบการณ์ของคุณ
          </h1>
          <p className="text-gray-600 font-sarabun">
            ข้อมูลเหล่านี้จะช่วยให้เราให้คำแนะนำที่เหมาะสมกับคุณมากขึ้น
          </p>
        </div>

        {/* Benefits Toggle */}
        {!showBenefits && (
          <div className="mb-6 text-center">
            <button
              onClick={() => setShowBenefits(true)}
              className="text-blue-600 hover:text-blue-700 font-sarabun text-sm underline"
            >
              ทำไมเราถึงต้องการข้อมูลเหล่านี้?
            </button>
          </div>
        )}

        {/* Benefits Section */}
        {showBenefits && (
          <div className="mb-8 bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-prompt font-semibold text-gray-900 mb-4">
              ประโยชน์ของการให้ข้อมูลส่วนตัว:
            </h3>
            <div className="space-y-3 text-sm font-sarabun text-gray-700">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>คำแนะนำที่เหมาะสมกับช่วงอายุและประสบการณ์ของคุณ</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>ข้อมูลทรัพยากรและบริการในพื้นที่ของคุณ</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>การใช้ภาษาและวัฒนธรรมที่เหมาะสม</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>การวิเคราะห์และคำแนะนำที่ตรงกับบทบาทของคุณ</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-800 font-sarabun">
                🔒 ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยและใช้เพื่อปรับปรุงบริการเท่านั้น
              </p>
            </div>
            <button
              onClick={() => setShowBenefits(false)}
              className="mt-3 text-blue-600 hover:text-blue-700 font-sarabun text-sm underline"
            >
              ซ่อน
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-sarabun text-gray-600">
              ขั้นตอนที่ {currentStep + 1} จาก {steps.length}
            </span>
            <span className="text-sm font-sarabun text-gray-600">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Previous Button */}
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-prompt font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              ย้อนกลับ
            </button>
          )}

          {/* Skip Button (only if optional) */}
          {isOptional && (
            <button
              onClick={onSkip}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-prompt font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              ข้ามไปก่อน
            </button>
          )}

          {/* Next/Complete Button */}
          <button
            onClick={handleNext}
            disabled={!isStepComplete(currentStep) || isSubmitting}
            className={`
              flex-1 font-prompt font-semibold py-3 px-6 rounded-xl transition-all duration-200
              ${isStepComplete(currentStep) && !isSubmitting
                ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังบันทึก...</span>
              </div>
            ) : currentStep === steps.length - 1 ? (
              'เสร็จสิ้น'
            ) : (
              'ถัดไป'
            )}
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 font-sarabun">
            การให้ข้อมูลส่วนตัวเป็นไปตามนโยบายความเป็นส่วนตัวของเรา<br/>
            คุณสามารถแก้ไขหรือลบข้อมูลได้ตลอดเวลา
          </p>
        </div>
      </div>
    </div>
  );
}