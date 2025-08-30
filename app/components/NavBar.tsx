import { link } from 'fs';
import {
    FaGlobe,
    FaUsers,
    FaHistory,
    FaInbox,
    FaFutbol,
    FaLock,
    FaKey
} from 'react-icons/fa';

export default function NavBar() {
    const items = [
        { icon: FaGlobe, label: "Scambia globalmente", link: "/global" }, // Icona per scambi globali
        { icon: FaUsers, label: "Scambia localmente", link: "/local" }, // Meglio di FaLayerGroup per gruppi
        { icon: FaInbox, label: "Scambi in arrivo", link: "/incoming" }, // Inbox per le richieste
        { icon: FaFutbol, label: "Squadra", link: "/team" }, // Pallone da calcio per la squadra
        { icon: FaLock, label: "Admin", link: "/admin/" }, // Gestione squadre
        { icon: FaKey, label: "Cambio password", link: "/change-pwd" } //
    ];

    return (
        <div className="w-full mb-6 py-4 bg-white text-gray-900 shadow-lg">
            <div className="flex flex-row items-center justify-center space-x-4 px-4 py-2">
                {items.map(({ icon: Icon, label, link }, index) => (
                    <a
                        key={index}
                        className="flex items-center space-x-2 cursor-pointer hover:text-gray-700"
                        href={link}
                    >
                        <Icon className="p-3 bg-gray-200 rounded-full w-10 h-10" />
                        <span className="hidden md:inline text-lg">{label}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}
