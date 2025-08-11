"use client";
import AdminTeamList from "@/app/components/admin/TeamAdminTable";

export default function TeamList(){
    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
            
            <AdminTeamList/>
        </div>
    );
}