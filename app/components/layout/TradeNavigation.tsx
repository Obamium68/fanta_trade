'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TradeNavigation() {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Scambi Locali',
      href: '/trades/local',
      description: 'Scambia con squadre del tuo girone',
      icon: '🏠'
    },
    {
      name: 'Scambi Globali', 
      href: '/trades/global',
      description: 'Scambia con squadre di tutti i gironi',
      icon: '🌍'
    },
    {
      name: 'In Arrivo',
      href: '/incoming',
      description: 'Scambi proposti da altri team',
      icon: '📥'
    },
    {
      name: 'Stato Scambi',
      href: '/trades-status',
      description: 'Visualizza tutti i tuoi scambi',
      icon: '📊'
    }
  ];

  return (
    <nav className="bg-white shadow-sm border-b mb-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex space-x-8 overflow-x-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="hidden sm:block">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.description}</div>
                </div>
                <div className="sm:hidden">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
