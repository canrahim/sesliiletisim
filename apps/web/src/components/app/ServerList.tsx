import React from 'react';
import { Plus } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string;
}

interface ServerListProps {
  servers: Server[];
  selectedServer: Server | null;
  onSelectServer: (server: Server) => void;
  onCreateServer: () => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  onCreateServer,
}) => {
  return (
    <div className="w-20 bg-neutral-800 flex flex-col items-center py-3 space-y-2">
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg transition-all hover:rounded-xl ${
            selectedServer?.id === server.id
              ? 'bg-blue-600 rounded-xl'
              : 'bg-neutral-700 hover:bg-blue-600'
          }`}
          title={server.name}
        >
          {server.icon || server.name.charAt(0).toUpperCase()}
        </button>
      ))}
      
      <button
        onClick={onCreateServer}
        className="w-14 h-14 rounded-2xl bg-neutral-700 hover:bg-green-600 hover:rounded-xl flex items-center justify-center text-green-500 hover:text-white transition-all"
        title="Sunucu Oluştur"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};




