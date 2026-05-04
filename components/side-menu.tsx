'use client';

import { useRouter } from 'next/navigation';
import { X, LogOut, LayoutDashboard, Settings, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

export function SideMenu({ open, onClose }: SideMenuProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Header inside sidebar (mobile only) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 lg:hidden">
            <span className="text-lg font-semibold">Menu</span>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            <a
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </a>
            <a
              href="/converter"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100"
            >
              <ArrowRightLeft className="w-5 h-5" />
              Converter
            </a>
            <a
              href="#"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
              Settings
            </a>
          </nav>

          {/* Logout at bottom */}
          <div className="border-t border-gray-200 p-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
