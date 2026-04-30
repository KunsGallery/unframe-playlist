import { ListMusic, Music, Settings2, Users } from "lucide-react";

const TABS = [
  { id: "tracks", label: "Tracks", icon: Music },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "config", label: "Config", icon: Settings2 },
  { id: "users", label: "Users", icon: Users },
];

export default function AdminTabs({ activeTab, setActiveTab }) {
  return (
    <div className="flex flex-wrap gap-3 mb-10">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
