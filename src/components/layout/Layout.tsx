import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      <Header />
      <main 
        className={`flex-1 flex flex-col min-h-0 ${className}`}
        role="main"
        aria-label="หน้าหลัก"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;