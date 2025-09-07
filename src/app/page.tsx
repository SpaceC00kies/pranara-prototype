'use client';

import { Layout } from '@/components/layout';
import { useState, lazy, Suspense, useEffect } from 'react';
import { ModeSelection } from '@/components/mode';
import { AppMode, UserProfile } from '@/types';

// Lazy load components for better initial page load
const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));
const UserProfileForm = lazy(() => import('@/components/profile/UserProfileForm'));

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<AppMode | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Check for existing profile on mount
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const response = await fetch(`/api/profile?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            setUserProfile(data.profile);
          }
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
      }
    };

    checkExistingProfile();
  }, [sessionId]);

  const handleModeSelect = (mode: AppMode) => {
    setSelectedMode(mode);
    
    // Show profile form if no profile exists, otherwise go directly to chat
    if (!userProfile) {
      setShowProfileForm(true);
    } else {
      setShowChat(true);
    }
  };

  const handleModeChange = () => {
    setShowChat(false);
    setShowProfileForm(false);
    setSelectedMode(null);
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setShowProfileForm(false);
    setShowChat(true);
  };

  const handleSkipProfile = () => {
    setShowProfileForm(false);
    setShowChat(true);
  };

  const handleLineClick = () => {
    console.log('LINE handoff clicked');
    // Get LINE URL from environment variable
    const lineUrl = process.env.NEXT_PUBLIC_LINE_URL;
    if (lineUrl) {
      window.open(lineUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.error('LINE URL not configured');
      // Fallback - could show a message to user
      alert('LINE integration is not configured. Please contact support.');
    }
  };

  // Show mode selection if no mode is selected
  if (!selectedMode) {
    return (
      <ModeSelection 
        onModeSelect={handleModeSelect}
        selectedMode={selectedMode || undefined}
      />
    );
  }

  // Show profile form if mode is selected but profile is incomplete
  if (showProfileForm) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 font-sarabun">กำลังโหลด...</p>
          </div>
        </div>
      }>
        <UserProfileForm
          sessionId={sessionId}
          existingProfile={userProfile}
          onProfileComplete={handleProfileComplete}
          onSkip={handleSkipProfile}
          mode={selectedMode}
          isOptional={true}
        />
      </Suspense>
    );
  }

  // Show chat interface
  if (showChat) {
    return (
      <Suspense fallback={
        <Layout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-text-secondary font-sarabun">กำลังโหลด...</p>
            </div>
          </div>
        </Layout>
      }>
        <ChatInterface 
          onLineClick={handleLineClick}
          mode={selectedMode || 'conversation'}
          onModeChange={handleModeChange}
        />
      </Suspense>
    );
  }

  // Fallback to mode selection
  return (
    <ModeSelection 
      onModeSelect={handleModeSelect}
      selectedMode={selectedMode || undefined}
    />
  );
}
