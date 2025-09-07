/**
 * Admin Page
 * Simple page to access the admin dashboard with lazy loading
 */

import { Suspense, lazy } from 'react';

// Lazy load admin dashboard since it's not frequently accessed
const AdminDashboard = lazy(() => import('../../components/admin/AdminDashboard'));

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-sarabun">กำลังโหลดแดชบอร์ด...</p>
        </div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}

export const metadata = {
  title: 'Jirung Admin Dashboard',
  description: 'Analytics and statistics for Jirung Senior Advisor',
  robots: 'noindex, nofollow' // Prevent search engine indexing
};