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

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analisi Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tasso di Completamento:</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <span className="text-green-600 font-medium">{completionRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tasso di Rifiuto:</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${rejectionRate}%` }}
                  ></div>
                </div>
                <span className="text-red-600 font-medium">{rejectionRate}%</span>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Trade Attivi:</span>
              <span className="font-medium text-blue-600">
                {stats.pending + stats.accepted}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-blue-600 text-lg">📋</span>
                <div>
                  <div className="font-medium text-blue-900">Esporta Report</div>
                  <div className="text-sm text-blue-600">Scarica report dettagliato dei trade</div>
                </div>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-green-600 text-lg">⚡</span>
                <div>
                  <div className="font-medium text-green-900">Approva Tutti Validi</div>
                  <div className="text-sm text-green-600">Approva automaticamente trade bilanciati</div>
                </div>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-purple-600 text-lg">🔧</span>
                <div>
                  <div className="font-medium text-purple-900">Gestisci Fasi</div>
                  <div className="text-sm text-purple-600">Apri/Chiudi periodi di scambio</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}