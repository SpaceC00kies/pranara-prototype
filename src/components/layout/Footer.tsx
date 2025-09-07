import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="w-full bg-white border-t border-border-light mt-auto"
      role="contentinfo"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Clean minimal footer like HAJOBJA */}
        <div className="grid place-items-center gap-4 max-w-lg mx-auto">
          
          {/* Navigation Links */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-x-1 font-prompt text-sm">
              <Link 
                href="/about" 
                className="hover:text-primary-500 transition-colors px-2 py-1 text-text-secondary"
              >
                เกี่ยวกับเรา
              </Link>
              <span className="text-text-muted">|</span>
              <Link 
                href="/safety" 
                className="hover:text-primary-500 transition-colors px-2 py-1 text-text-secondary"
              >
                ความปลอดภัย
              </Link>
              <span className="text-text-muted">|</span>
              <Link 
                href="/privacy" 
                className="hover:text-primary-500 transition-colors px-2 py-1 text-text-secondary"
              >
                ความเป็นส่วนตัว
              </Link>
            </div>
          </div>

          {/* Brand Attribution */}
          <div className="text-center">
            <div className="flex items-center justify-center text-xs">
              <span className="font-prompt text-text-muted">© {currentYear} Jirung Senior Advisor • </span>
              <span className="font-prompt text-text-muted ml-1">
                Made with ❤️ for Thai families
              </span>
            </div>
          </div>

          {/* Health Disclaimer */}
          <div className="text-center">
            <p className="font-sarabun text-xs text-text-muted max-w-md leading-relaxed">
              ไม่ทดแทนคำแนะนำทางการแพทย์ • ให้คำแนะนำที่ปลอดภัยเท่านั้น • ไม่เก็บข้อมูลส่วนตัว
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;