"use client"
import React from 'react';
import { TeamWithEditing, TeamsResponse, TeamUpdateRequest, TeamUpdateResponse, GironeMap } from '@/app/lib/types/teams';
import { Team, Girone, TeamMember } from '@prisma/client';
import { useState, useEffect } from 'react';
import { FaEdit, FaSave, FaTimes, FaEye, FaTrash, FaSpinner, FaUsers, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { redirect, RedirectType } from 'next/navigation'

// Estendo il tipo per includere i membri
interface TeamWithMembersAndEditing {
    id: number;
    name: string;
    passwordHash?: string;
    girone: Girone;
    credits: number;
    createdAt: string;
    updatedAt: string;
    members: TeamMember[];
    _count: {
        members: number;
        players: number;
    };
    isEditing: boolean;
    originalData?: TeamWithMembersAndEditing;
    showMembers?: boolean;
}

export default function TeamAdminTable() {
    const [squadre, setSquadre] = useState<TeamWithMembersAndEditing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => { fetchSquadre(); }, []);

    const fetchSquadre = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/teams/get-teams');
            if (!response.ok) throw new Error('Errore nel caricamento delle squadre');

            const data: TeamsResponse = await response.json();
            setSquadre(data.teams.map(s => ({
                id: s.id,
                name: s.name,
                passwordHash: s.passwordHash,
                girone: s.girone,
                credits: s.credits,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                members: s.members || [],
                _count: s._count || { members: 0, players: 0 },
                isEditing: false,
                showMembers: false
            })));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id: number) => {
        setSquadre(squadre.map(s =>
            s.id === id
                ? { ...s, isEditing: true, originalData: { ...s } }
                : { ...s, isEditing: false }
        ));
    };

    const handleSave = async (id: number) => {
        try {
            setSavingId(id);
            const squadra = squadre.find(s => s.id === id);
            if (!squadra) throw new Error('Squadra non trovata');

            const updateData: TeamUpdateRequest = {
                name: squadra.name,
                girone: GironeMap[squadra.girone],
                credits: squadra.credits
            };
            const response = await fetch(`/api/teams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel salvataggio');
            }

            const result: TeamUpdateResponse = await response.json();
            setSquadre(squadre.map(s =>
                s.id === id
                    ? { ...s, ...result.team, isEditing: false, originalData: { ...s, ...result.team } }
                    : s
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
            handleCancel(id);
        } finally {
            setSavingId(null);
        }
    };

    const handleCancel = (id: number) => {
        setSquadre(squadre.map(s =>
            s.id === id && s.originalData
                ? { ...s.originalData, isEditing: false }
                : s
        ));
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminare questa squadra?')) return;
        try {
            const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Errore nell\'eliminazione');
            }
            setSquadre(squadre.filter(s => s.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        }
    };

    const handleInputChange = (id: number, field: keyof TeamWithMembersAndEditing, value: string | number | Girone) => {
        setSquadre(squadre.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    };

    const handleViewRosa = (id: number) => {
        redirect(`/admin/manage/roster?teamId=${id}`, RedirectType.push);
    };

    const toggleMembers = (id: number) => {
        setSquadre(squadre.map(s =>
            s.id === id ? { ...s, showMembers: !s.showMembers } : s
        ));
    };

    // Messaggio di errore
    const ErrorMessage = () => {
        if (!error) return null;
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <div className="flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    };

    // Componente per visualizzare i membri
    const MembersRow = ({ members }: { members: TeamMember[] }) => {
        if (!members || members.length === 0) {
            return (
                <tr className="bg-gray-50">
                    <td colSpan={7} className="p-3 px-5 text-center text-gray-500 italic">
                        Nessun membro trovato
                    </td>
                </tr>
            );
        }

        return (
            <>
                {members.map((member, idx) => (
                    <tr key={member.id} className="bg-blue-50 border-l-4 border-blue-300">
                        <td className="p-3 px-5"></td>
                        <td className="p-3 px-5 pl-8">
                            <div className="flex items-center">
                                <FaUsers className="text-blue-500 mr-2" />
                                <span className="font-medium">{member.name}</span>
                                {idx === 0 && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Membro 1</span>}
                                {idx === 1 && <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Membro 2</span>}
                            </div>
                        </td>
                        <td className="p-3 px-5 text-sm text-gray-600">{member.email}</td>
                        <td className="p-3 px-5 text-sm text-gray-600">{member.phone}</td>
                        <td className="p-3 px-5"></td>
                        <td className="p-3 px-5"></td>
                        <td className="p-3 px-5"></td>
                    </tr>
                ))}
            </>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <FaSpinner className="animate-spin text-4xl text-blue-500" />
                <span className="ml-2 text-xl">Caricamento squadre...</span>
            </div>
        );
    }

    return (
        <div className="text-gray-900 h-fit bg-gray-50">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-white shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Squadre</h1>
                <div className="flex gap-2">
                    <span className="text-sm text-gray-600 self-center">
                        Totale: {squadre.length} squadre
                    </span>
                    <button
                        onClick={fetchSquadre}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        disabled={loading}
                    >
                        <span>🔄</span>
                        Aggiorna
                    </button>
                </div>
            </div>

            <div className="p-4">
                <ErrorMessage />

                {/* Table Container */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-md">
                                <thead className="sticky top-0 bg-gray-100 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="p-3 px-5 text-left font-semibold">ID</th>
                                        <th className="p-3 px-5 text-left font-semibold">Nome Squadra</th>
                                        <th className="p-3 px-5 text-left font-semibold">Campionato</th>
                                        <th className="p-3 px-5 text-left font-semibold">Crediti</th>
                                        <th className="p-3 px-5 text-left font-semibold">Membri</th>
                                        <th className="p-3 px-5 text-center font-semibold">Rosa</th>
                                        <th className="p-3 px-5 text-center font-semibold">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {squadre.map((s, idx) => (
                                        <React.Fragment key={s.id}>
                                            <tr
                                                className={`
                                                    ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                                                    ${s.isEditing ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
                                                    hover:bg-gray-100 transition-colors
                                                `}
                                            >
                                                <td className="p-3 px-5 font-medium">{s.id}</td>
                                                <td className="p-3 px-5">
                                                    {s.isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={s.name}
                                                            onChange={e => handleInputChange(s.id, 'name', e.target.value)}
                                                            className="p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <span>{s.name}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 px-5">
                                                    {s.isEditing ? (
                                                        <select
                                                            value={s.girone}
                                                            onChange={e => handleInputChange(s.id, 'girone', e.target.value as Girone)}
                                                            className="p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        >
                                                            <option value={Girone.A}>A</option>
                                                            <option value={Girone.B}>B</option>
                                                            <option value={Girone.C}>C</option>
                                                        </select>
                                                    ) : (
                                                        s.girone
                                                    )}
                                                </td>
                                                <td className="p-3 px-5">
                                                    {s.isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={s.credits}
                                                            onChange={e => handleInputChange(s.id, 'credits', Number(e.target.value))}
                                                            className="w-24 p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    ) : (
                                                        <span className="font-medium">{s.credits.toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 px-5">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleMembers(s.id)}
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                                        >
                                                            {s.showMembers ? <FaChevronDown /> : <FaChevronRight />}
                                                            <span className="font-medium">{s._count.members}</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 px-5 text-center">
                                                    <button
                                                        className="text-purple-500 hover:text-purple-700 transition-colors"
                                                        onClick={() => handleViewRosa(s.id)}
                                                        title="Visualizza rosa"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                </td>
                                                <td className="p-3 px-5">
                                                    <div className="flex justify-center space-x-2">
                                                        {s.isEditing ? (
                                                            <>
                                                                <button
                                                                    className='text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors flex items-center space-x-1'
                                                                    onClick={() => handleSave(s.id)}
                                                                    disabled={savingId === s.id}
                                                                >
                                                                    {savingId === s.id ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                                                </button>
                                                                <button
                                                                    className='text-sm bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors'
                                                                    onClick={() => handleCancel(s.id)}
                                                                    disabled={savingId === s.id}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    className='text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors flex items-center space-x-1'
                                                                    onClick={() => handleEdit(s.id)}
                                                                    title="Modifica squadra"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    className='text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors'
                                                                    onClick={() => handleDelete(s.id)}
                                                                    title="Elimina squadra"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {s.showMembers && <MembersRow members={s.members} />}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>

                            {squadre.length === 0 && !loading && (
                                <div className="text-center py-12 text-gray-500">
                                    <FaSpinner className="mx-auto text-4xl mb-4 text-gray-300" />
                                    <p className="text-xl">Nessuna squadra trovata</p>
                                    <button
                                        onClick={fetchSquadre}
                                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                                    >
                                        Ricarica
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}