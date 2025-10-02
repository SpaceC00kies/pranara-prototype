'use client';

/**
 * Register Form Component
 * Simple registration form matching Pranara's design
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
}

export default function RegisterForm({ onSuccess, onSwitchToLogin, onClose }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.username.trim()) {
      return 'กรุณากรอกชื่อผู้ใช้';
    }
    
    if (formData.username.length < 3) {
      return 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
    }
    
    if (formData.username.length > 50) {
      return 'ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร';
    }

    if (!formData.password) {
      return 'กรุณากรอกรหัสผ่าน';
    }
    
    if (formData.password.length < 8) {
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'รหัสผ่านไม่ตรงกัน';
    }

    if (!formData.displayName.trim()) {
      return 'กรุณากรอกชื่อที่แสดง';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await register(
      formData.username.trim(),
      formData.password,
      formData.displayName.trim()
    );
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'สมัครสมาชิกไม่สำเร็จ');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const isFormValid = () => {
    return formData.username.trim() && 
           formData.password && 
           formData.confirmPassword && 
           formData.displayName.trim() &&
           formData.password === formData.confirmPassword &&
           formData.password.length >= 8 &&
           formData.username.length >= 3;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>สมัครสมาชิก</h2>
        <p className="text-gray-600 text-sm" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>สร้างบัญชีเพื่อบันทึกการสนทนาของคุณ</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
            ชื่อผู้ใช้
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 focus:bg-white transition-colors font-sarabun"

            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        {/* Display Name Field */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
            ชื่อที่แสดง
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 focus:bg-white transition-colors font-sarabun"

            disabled={isLoading}
            autoComplete="name"
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 focus:bg-white transition-colors font-sarabun"

            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
            ยืนยันรหัสผ่าน
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-300 focus:bg-white transition-colors font-sarabun"

            disabled={isLoading}
            autoComplete="new-password"
          />
          {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>รหัสผ่านไม่ตรงกัน</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !isFormValid()}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none"
          style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              กำลังสมัครสมาชิก...
            </div>
          ) : (
            'สมัครสมาชิก'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
          มีบัญชีอยู่แล้ว?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-teal-600 hover:text-teal-700 font-medium hover:underline focus:outline-none"
            style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
            disabled={isLoading}
          >
            เข้าสู่ระบบ
          </button>
        </p>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
          disabled={isLoading}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}