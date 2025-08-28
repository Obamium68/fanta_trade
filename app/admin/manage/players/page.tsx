"use client";
import PlayerAdminTable from "@/app/components/admin/PlayerAdminTable";
import UploadTeamPlayers from "@/app/components/admin/UploadTeamPlayers";
export default function PlayerList() {
    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
            <PlayerAdminTable />
        </div>
    );
}