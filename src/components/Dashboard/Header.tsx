import React from 'react';
import { useTheme } from '@/hooks/useTheme';

export const Header: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-near-black dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <img
                className="h-8 w-auto"
                src={`/assets/images/near-logo-${isDark ? 'white' : 'black'}.svg`}
                alt="NEAR Protocol"
              />
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="#"
                className="border-near-green text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="#"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Documentation
              </a>
            </nav>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="bg-near-offwhite dark:bg-gray-800 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-near-green"
            >
              <span className="sr-only">View notifications</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
