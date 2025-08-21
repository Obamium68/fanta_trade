"use client"
import AdminRosterPage from '@/app/components/admin/RosterPage';
import { useSearchParams } from 'next/navigation';


export default function RosterPage() {
    const searchParams = useSearchParams();
    const id:number = Number(searchParams.get("teamId")) | 0;
    
    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
        <AdminRosterPage teamId={id} />
        </div>
    );
}