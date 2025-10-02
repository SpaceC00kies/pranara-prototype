'use client';

/**
 * Login Form Component
 * Simple, clean login form matching Pranara's design
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onClose?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister, onClose }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    const result = await login(formData.username.trim(), formData.password);
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
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

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>เข้าสู่ระบบ</h2>
        <p className="text-gray-600 text-sm" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>เข้าสู่ระบบเพื่อบันทึกการสนทนาของคุณ</p>
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
            autoComplete="current-password"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !formData.username.trim() || !formData.password}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none"
          style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              กำลังเข้าสู่ระบบ...
            </div>
          ) : (
            'เข้าสู่ระบบ'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm" style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}>
          ยังไม่มีบัญชี?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-teal-600 hover:text-teal-700 font-medium hover:underline focus:outline-none"
            style={{ fontFamily: 'IBM Plex Sans Thai, system-ui, sans-serif' }}
            disabled={isLoading}
          >
            สมัครสมาชิก
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