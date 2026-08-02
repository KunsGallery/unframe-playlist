import React from "react";
import { ListMusic, Music, Settings2, Users, Youtube } from "lucide-react";

const TABS = [
  { id: "tracks", label: "Tracks", desc: "음원·메타데이터", icon: Music },
  { id: "playlists", label: "Playlists", desc: "선곡·재생 순서", icon: ListMusic },
  { id: "gatherings", label: "Gatherings", desc: "모임·유튜브 플리", icon: Youtube },
  { id: "config", label: "Page", desc: "홈·히어로·문구", icon: Settings2 },
  { id: "users", label: "Listeners", desc: "회원·리워드", icon: Users },
];

export default function AdminTabs({ activeTab, setActiveTab, counts = {} }) {
  return (
    <div className="up-admin-tabs" role="tablist" aria-label="Admin sections">
      {TABS.map(({ id, label, desc, icon }) => {
        const active = activeTab === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`up-admin-tab ${active ? "is-active" : ""}`}
            role="tab"
            aria-selected={active}
          >
            <span className="up-admin-tab__icon">{React.createElement(icon, { "aria-hidden": true })}</span>
            <span className="up-admin-tab__copy"><strong>{label}</strong><small>{desc}</small></span>
            {counts[id] !== undefined && <span className="up-admin-tab__count">{counts[id]}</span>}
          </button>
        );
      })}
    </div>
  );
}
