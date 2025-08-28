'use client';

interface AdminTradeStatsProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    approved: number;
    needsApproval: number;
  };
}

export default function AdminTradeStats({ stats }: AdminTradeStatsProps) {
  const statCards = [
    {
      title: 'Trade Totali',
      value: stats.total,
      icon: '📊',
      color: 'bg-gray-100 text-gray-800',
      description: 'Numero totale di trade nel sistema'
    },
    {
      title: 'In Attesa',
      value: stats.pending,
      icon: '⏳',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Trade in attesa di risposta dai team'
    },
    {
      title: 'Da Approvare',
      value: stats.needsApproval,
      icon: '🚨',
      color: 'bg-red-100 text-red-800',
      description: 'Trade accettati che richiedono la tua approvazione',
      highlight: stats.needsApproval > 0
    },
    {
      title: 'Approvati',
      value: stats.approved,
      icon: '✅',
      color: 'bg-green-100 text-green-800',
      description: 'Trade completati con successo'
    },
    {
      title: 'Rifiutati',
      value: stats.rejected,
      icon: '❌',
      color: 'bg-red-100 text-red-800',
      description: 'Trade rifiutati dai team o dall\'admin'
    }
  ];

  const completionRate = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : '0';
  const rejectionRate = stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Alert per trade da approvare */}
      {stats.needsApproval > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">🚨</span>
            <div>
              <h3 className="text-red-800 font-medium">
                Attenzione: {stats.needsApproval} trade richiedono la tua approvazione
              </h3>
              <p className="text-red-600 text-sm">
                Vai alla sezione "Da Approvare" per gestirli immediatamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.title} 
            className={`bg-white p-6 rounded-lg shadow ${stat.highlight ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              {stat.highlight && (
                <span className="animate-pulse text-red-500 text-xs font-medium">
                  AZIONE RICHIESTA
                </span>
              )}
            </div>
            <div className="mb-2">
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-gray-700">{stat.title}</div>
            </div>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </div>
        ))}
      </div>


    </div>
  );
}