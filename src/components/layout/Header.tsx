import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header 
      className="sticky top-0 z-30 w-full bg-white bg-opacity-90 backdrop-blur-sm border-b border-border-light"
      role="banner"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg p-1"
              aria-label="กลับไปหน้าหลัก Jirung Senior Advisor"
            >
              {/* Logo Icon */}
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-health-green rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <svg 
                  className="w-5 h-5 lg:w-6 lg:h-6 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 10.5V19L13.5 17.5V10.5M5.5 7.5C4.67 7.5 4 8.17 4 9S4.67 10.5 5.5 10.5 7 9.83 7 9 6.33 7.5 5.5 7.5M5.5 12C4.67 12 4 12.67 4 13.5S4.67 15 5.5 15 7 14.33 7 13.5 6.33 12 5.5 12M5.5 16.5C4.67 16.5 4 17.17 4 18S4.67 19.5 5.5 19.5 7 18.83 7 18 6.33 16.5 5.5 16.5M11 20C9.89 20 9 19.1 9 18V16L11 14L13 16V18C13 19.1 12.11 20 11 20Z"/>
                </svg>
              </div>
              
              {/* Brand Text - Clean typography like HAJOBJA */}
              <div className="flex flex-col">
                <span className="font-prompt font-bold text-lg lg:text-xl text-primary-500 group-hover:text-primary-600 transition-colors duration-200">
                  Jirung
                </span>
                <span className="font-prompt text-xs lg:text-sm text-text-secondary -mt-1">
                  Senior Advisor
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation - Clean minimal style like HAJOBJA */}
          <nav className="hidden lg:flex items-center space-x-2" role="navigation" aria-label="เมนูหลัก">
            <Link 
              href="/about" 
              className="font-prompt text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              เกี่ยวกับเรา
            </Link>
            <Link 
              href="/safety" 
              className="font-prompt text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              ความปลอดภัย
            </Link>
            <Link 
              href="/privacy" 
              className="font-prompt text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              นโยบายความเป็นส่วนตัว
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-primary-500 hover:bg-primary-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="เปิดเมนู"
            aria-expanded="false"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;