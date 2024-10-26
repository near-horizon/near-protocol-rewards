import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { HomeIcon, CodeIcon, ChartIcon, CogIcon, SunIcon, MoonIcon } from '@heroicons/react/solid';

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className: string }>;
  href: string;
  current: boolean;
}

const navigation: NavItem[] = [
  {
    name: 'Overview',
    icon: HomeIcon,
    href: '#',
    current: true,
  },
  {
    name: 'GitHub Metrics',
    icon: CodeIcon,
    href: '#',
    current: false,
  },
  {
    name: 'NEAR Metrics',
    icon: ChartIcon,
    href: '#',
    current: false,
  },
  {
    name: 'Settings',
    icon: CogIcon,
    href: '#',
    current: false,
  },
];

export const Sidebar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-white dark:bg-near-black border-r border-gray-200 dark:border-gray-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <img
                className="h-8 w-auto"
                src="/assets/images/near-icon.svg"
                alt="NEAR Protocol"
              />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                Developer Portal
              </span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${item.current
                      ? 'bg-near-offwhite text-near-black dark:bg-gray-800 dark:text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 flex-shrink-0 h-6 w-6
                      ${item.current
                        ? 'text-near-green'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }
                    `}
                  />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
            <button
              onClick={toggleTheme}
              className="flex-shrink-0 group block"
            >
              {isDark ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
