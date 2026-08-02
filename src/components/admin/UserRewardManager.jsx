import { Loader2, Search, Star } from "lucide-react";
import {
  ACHIEVEMENT_CATALOG,
  COLLECTIVE_CATALOG,
} from "../../constants/rewardCatalog";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

export default function UserRewardManager({
  allUsers,
  filteredUsers,
  userSearchTerm,
  setUserSearchTerm,
  isLoadingUsers,
  fetchUsers,
  selectedUserForSticker,
  setSelectedUserForSticker,
  nicknameDraft,
  setNicknameDraft,
  levelOverrideName,
  setLevelOverrideName,
  levelOverrideColor,
  setLevelOverrideColor,
  handleSaveNicknameAndLevel,
  handleToggleRankingHidden,
  selectedUserRewardIds,
  toggleSticker,
  settleYear,
  setSettleYear,
  isSettling,
  runAnnualSettlement,
}) {
  void allUsers;

  return (
    <div className="grid lg:grid-cols-[0.48fr_0.52fr] gap-10">
      <div className={`${glass} rounded-[3rem] p-8 lg:p-10 space-y-6`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black uppercase">Users</h2>
          <button onClick={fetchUsers} className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">
            Reload
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            placeholder="Search nickname, displayName, uid"
            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-5 outline-none"
          />
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar">
          {isLoadingUsers ? (
            <div className="flex items-center gap-3 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-zinc-500">No users found.</p>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserForSticker(u)}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  selectedUserForSticker?.id === u.id
                    ? "border-[#004aad] bg-[#004aad]/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <p className="font-black uppercase truncate">{u.nickname || u.displayName || "Unnamed User"}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">{u.id}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
                  {u.listenCount || 0} listens • {u.xp || 0} xp
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${glass} rounded-[3rem] p-8 lg:p-10 space-y-8`}>
        {!selectedUserForSticker ? (
          <div className="text-zinc-500">Select a user to edit profile and rewards.</div>
        ) : (
          <>
            <div>
              <h2 className="text-3xl font-black uppercase">{selectedUserForSticker.nickname || selectedUserForSticker.displayName || "User"}</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">{selectedUserForSticker.id}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <input
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                placeholder="Nickname"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
              <input
                value={levelOverrideName}
                onChange={(e) => setLevelOverrideName(e.target.value)}
                placeholder="Level Override Name"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
              <input
                value={levelOverrideColor}
                onChange={(e) => setLevelOverrideColor(e.target.value)}
                placeholder="Level Override Color (#hex)"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none lg:col-span-2"
              />
            </div>

            <button
              onClick={handleSaveNicknameAndLevel}
              className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
            >
              Save User Profile
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Hide from Ranking</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                  Exclude this user from Home rankings
                </p>
              </div>
              <button
                onClick={handleToggleRankingHidden}
                className={`px-5 py-3 rounded-full font-black uppercase tracking-widest text-[10px] transition-all ${
                  selectedUserForSticker?.isRankingHidden
                    ? "bg-[#004aad] text-white hover:bg-white hover:text-black"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {selectedUserForSticker?.isRankingHidden ? "Hidden" : "Visible"}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black uppercase">Achievements & Stickers</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries({ ...ACHIEVEMENT_CATALOG, ...COLLECTIVE_CATALOG }).map(([id, meta]) => {
                  const Icon = meta.icon || Star;
                  const active = selectedUserRewardIds.has(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleSticker(id)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active ? "border-[#004aad] bg-[#004aad]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-tight">{meta.title}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                            {meta.type === "achievement" ? "Auto achievement" : "Collectible sticker"} · {id}
                          </p>
                        </div>
                      </div>
                      <p className="mb-3 text-xs leading-relaxed text-zinc-500">{meta.desc}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-[#8db4ff]" : "text-zinc-600"}`}>
                        {active ? "Granted" : "Not Granted"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 space-y-4">
              <h3 className="text-xl font-black uppercase">Annual Settlement</h3>
              <p className="text-xs leading-relaxed text-zinc-500">
                해당 연도 자동 어치브먼트 5개는 Bronze, 10개는 Silver, 20개는 Gold 스티커를 지급합니다.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={settleYear}
                  onChange={(e) => setSettleYear(e.target.value)}
                  placeholder="2026"
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <button
                  onClick={runAnnualSettlement}
                  disabled={isSettling}
                  className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {isSettling ? "Settling..." : "Run Settlement"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
