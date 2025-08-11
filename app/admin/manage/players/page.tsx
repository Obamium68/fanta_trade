import UploadPlayers from "@/app/components/admin/UploadPlayers";

export default function PlayerList() {
    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Gestione Giocatori</h1>
            <p className="text-gray-600 mb-6">Qui puoi gestire i giocatori del fantacalcio.</p>
            {/* Placeholder for player management content */}
            <div className="bg-white p-4 rounded-lg shadow-md">
                <p>Qui verranno mostrati i giocatori e le loro informazioni.</p>
            </div>
            <UploadPlayers/>
        </div>
    );
}