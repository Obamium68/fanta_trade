export default function PendingTrades() {
    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Gestione Scambi in Corso</h1>
            <p className="text-gray-600 mb-6">Qui puoi gestire gli scambi in corso tra le squadre.</p>
            {/* Placeholder for pending trades content */}
            <div className="bg-white p-4 rounded-lg shadow-md">
                <p>Qui verranno mostrati gli scambi in corso e le loro informazioni.</p>
            </div>
        </div>
    );
}