import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth } from "../firebase";
import AdminTabs from "../components/admin/AdminTabs";
import TrackManager from "../components/admin/TrackManager";
import PlaylistManager from "../components/admin/PlaylistManager";
import SiteConfigManager from "../components/admin/SiteConfigManager";
import UserRewardManager from "../components/admin/UserRewardManager";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

const normalizeRewardIds = (rewards) => {
  if (!Array.isArray(rewards) || rewards.length === 0) return new Set();
  if (typeof rewards[0] === "string") return new Set(rewards.filter(Boolean));
  return new Set(rewards.map((r) => r?.id).filter(Boolean));
};

const asObjectRewards = (rewards) => {
  if (!Array.isArray(rewards)) return [];
  if (rewards.length === 0) return [];
  if (typeof rewards[0] === "object") return rewards.filter(Boolean);
  const year = new Date().getFullYear();
  const nowTs = Timestamp.fromMillis(Date.now());
  return rewards
    .filter((x) => typeof x === "string" && x.trim())
    .map((id) => ({ id, unlockedAt: nowTs, year, meta: { migratedFromAdmin: true } }));
};

const addRewardObject = (rewards, id, meta = {}) => {
  const base = asObjectRewards(rewards);
  const ids = normalizeRewardIds(base);
  if (ids.has(id)) return base;
  const year = new Date().getFullYear();
  return [...base, { id, unlockedAt: Timestamp.fromMillis(Date.now()), year, meta }];
};

const removeRewardById = (rewards, id) => {
  const base = asObjectRewards(rewards);
  return base.filter((r) => r?.id !== id);
};

const HERO_SLIDE_TYPES = [
  { value: "exhibition_ost", label: "Exhibition OST" },
  { value: "new_album", label: "New Album" },
  { value: "featured_playlist", label: "Featured Playlist" },
];

const DEFAULT_HERO_SLIDES = [
  {
    id: "hero-exhibition-ost",
    type: "exhibition_ost",
    eyebrow: "Exhibition OST",
    title: "Sound For The Space",
    subtitle: "전시의 공기를 음악으로 확장하는 큐레이션",
    description: "현재 전시의 무드와 서사를 사운드로 이어주는 OST 셀렉션입니다.",
    buttonLabel: "Play OST",
    backgroundImage: "",
    coverImage: "",
    linkedPlaylistId: "",
    trackIds: [],
    isActive: true,
  },
  {
    id: "hero-new-album",
    type: "new_album",
    eyebrow: "New Release",
    title: "New Album",
    subtitle: "UNFRAME PLAYLIST",
    description: "지금 가장 먼저 보여주고 싶은 최신 사운드를 전면에 배치합니다.",
    buttonLabel: "Play Release",
    backgroundImage: "",
    coverImage: "",
    linkedPlaylistId: "",
    trackIds: [],
    isActive: true,
  },
  {
    id: "hero-featured-playlist",
    type: "featured_playlist",
    eyebrow: "Featured Playlist",
    title: "Curated Collection",
    subtitle: "Curated by UNFRAME",
    description: "분위기와 흐름을 고려해 선별한 대표 플레이리스트입니다.",
    buttonLabel: "Open Playlist",
    backgroundImage: "",
    coverImage: "",
    linkedPlaylistId: "",
    trackIds: [],
    isActive: true,
  },
];

const normalizeHeroSlides = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_HERO_SLIDES;
  return raw.map((slide, idx) => ({
    ...DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length],
    ...slide,
    id: slide?.id || DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length].id || `hero-slide-${idx + 1}`,
    trackIds: Array.isArray(slide?.trackIds) ? slide.trackIds.filter(Boolean) : [],
    isActive: slide?.isActive !== false,
  }));
};

const tracksCollectionRef = (db, appId) =>
  collection(db, "artifacts", appId, "public", "data", "tracks");

const trackDocRef = (db, appId, id) =>
  doc(db, "artifacts", appId, "public", "data", "tracks", id);

const playlistsCollectionRef = (db, appId) =>
  collection(db, "artifacts", appId, "public", "data", "playlists");

const playlistDocRef = (db, appId, id) =>
  doc(db, "artifacts", appId, "public", "data", "playlists", id);

export default function Admin({
  isAdmin,
  user,
  signInWithPopup,
  tracks = [],
  playlists = [],
  db,
  appId,
  setToastMessage,
  setAuthError,
}) {
  const [activeTab, setActiveTab] = useState("tracks");

  const [newTrack, setNewTrack] = useState({
    title: "",
    artist: "",
    image: "",
    description: "",
    tag: "Ambient",
    audioUrl: "",
    lyrics: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const [newPlaylist, setNewPlaylist] = useState({ title: "", desc: "", image: "", trackIds: [] });
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [isUploadingPLImg, setIsUploadingPLImg] = useState(false);

  const [featuredData, setFeaturedData] = useState({
    headline: "",
    subHeadline: "",
    quote: "",
    description: "",
    linkedTrackId: "",
  });

  const [siteConfig, setSiteConfig] = useState({
    intro_title: "UNFRAME PLAYLIST",
    intro_desc: "감각의 프레임을 넘어선 소리의 아카이브",
    intro_btn: "ENTER SPACE",
    phil_title: "",
    phil_sub: "Philosophy",
    phil_desc: "",
    phil_quote: "",
    guide_1: "",
    guide_2: "",
    guide_3: "",
    guide_4: "",
    heroSlides: DEFAULT_HERO_SLIDES,
  });

  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForSticker, setSelectedUserForSticker] = useState(null);

  const [nicknameDraft, setNicknameDraft] = useState("");
  const [levelOverrideName, setLevelOverrideName] = useState("");
  const [levelOverrideColor, setLevelOverrideColor] = useState("");

  const [settleYear, setSettleYear] = useState(String(new Date().getFullYear()));
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    if (!db || !isAdmin) return;

    const fetchData = async () => {
      try {
        const pickSnap = await getDoc(
          doc(db, "artifacts", appId, "public", "data", "featured", "directors_pick")
        );
        if (pickSnap.exists()) setFeaturedData((prev) => ({ ...prev, ...pickSnap.data() }));

        const configSnap = await getDoc(
          doc(db, "artifacts", appId, "public", "data", "site_config", "main_texts")
        );
        if (configSnap.exists()) {
          const data = configSnap.data();
          setSiteConfig((prev) => ({
            ...prev,
            ...data,
            heroSlides: normalizeHeroSlides(data?.heroSlides),
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [db, isAdmin, appId]);

  const fetchUsers = async () => {
    if (!isAdmin || !db) return;
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "artifacts", appId, "public_stats"));
      const usersData = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllUsers(usersData);
    } catch (e) {
      console.error("유저 로드 실패:", e);
      setAuthError?.("유저 정보를 불러올 수 없습니다.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users" && isAdmin) fetchUsers();
  }, [activeTab, isAdmin]);

  const filteredUsers = useMemo(() => {
    const term = userSearchTerm.toLowerCase().trim();
    if (!term) return allUsers;

    return allUsers.filter((u) => {
      const dn = (u.displayName || "").toLowerCase();
      const nn = (u.nickname || "").toLowerCase();
      const id = (u.id || "").toLowerCase();
      return dn.includes(term) || nn.includes(term) || id.includes(term);
    });
  }, [allUsers, userSearchTerm]);

  const selectedUserRewardIds = useMemo(
    () => normalizeRewardIds(selectedUserForSticker?.rewards || []),
    [selectedUserForSticker?.rewards]
  );

  useEffect(() => {
    const fetchSelectedUserStats = async () => {
      if (!selectedUserForSticker?.id || !db) return;

      try {
        const ref = doc(db, "artifacts", appId, "public_stats", selectedUserForSticker.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const latest = { id: snap.id, ...snap.data() };
        setSelectedUserForSticker(latest);
        setNicknameDraft(latest.nickname || "");
        setLevelOverrideName(latest.levelOverrideName || "");
        setLevelOverrideColor(latest.levelOverrideColor || "");
      } catch (e) {
        console.error("선택 유저 불러오기 실패:", e);
      }
    };

    fetchSelectedUserStats();
  }, [selectedUserForSticker?.id, db, appId]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] px-6">
        <div className={`${glass} rounded-[3rem] p-10 lg:p-16 max-w-xl text-center space-y-8`}>
          <ShieldCheck className="w-16 h-16 mx-auto text-[#004aad]" />
          <div className="space-y-3">
            <h2 className="text-4xl font-black uppercase tracking-tight">Admin Access</h2>
            <p className="text-zinc-500 leading-relaxed">
              Only approved administrators can enter this control room.
            </p>
          </div>
          <button
            onClick={() => signInWithPopup?.(auth)}
            className="px-8 py-4 bg-[#004aad] text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const uploadImageToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result?.success) throw new Error("IMGBB upload failed");
    return result.data.url;
  };

  const updateHeroSlide = (slideId, patch) => {
    setSiteConfig((prev) => ({
      ...prev,
      heroSlides: normalizeHeroSlides(prev.heroSlides).map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide
      ),
    }));
  };

  const toggleHeroTrack = (slideId, trackId) => {
    setSiteConfig((prev) => ({
      ...prev,
      heroSlides: normalizeHeroSlides(prev.heroSlides).map((slide) => {
        if (slide.id !== slideId) return slide;
        const exists = slide.trackIds.includes(trackId);
        return {
          ...slide,
          trackIds: exists
            ? slide.trackIds.filter((id) => id !== trackId)
            : [...slide.trackIds, trackId],
        };
      }),
    }));
  };

  const moveHeroSlide = (slideId, direction) => {
    setSiteConfig((prev) => {
      const list = [...normalizeHeroSlides(prev.heroSlides)];
      const idx = list.findIndex((slide) => slide.id === slideId);
      if (idx === -1) return prev;

      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= list.length) return prev;

      [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
      return { ...prev, heroSlides: list };
    });
  };

  const uploadHeroSlideImage = async (slideId, field, file) => {
    if (!file) return;
    try {
      const url = await uploadImageToImgBB(file);
      updateHeroSlide(slideId, { [field]: url });
      setToastMessage?.("히어로 이미지 업로드 완료 ✨");
    } catch (e) {
      console.error(e);
      setAuthError?.("히어로 이미지 업로드 실패");
    }
  };

  const handleImageUpload = async (file, setter, fieldName) => {
    if (!file) return;
    fieldName === "track" ? setIsUploadingImg(true) : setIsUploadingPLImg(true);

    try {
      const url = await uploadImageToImgBB(file);
      setter(url);
      setToastMessage?.("이미지 업로드 완료 ✨");
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      setAuthError?.("이미지 업로드 실패");
    } finally {
      fieldName === "track" ? setIsUploadingImg(false) : setIsUploadingPLImg(false);
    }
  };

  const handleSaveTrack = async () => {
    if (!newTrack.title || !newTrack.artist || !newTrack.audioUrl) {
      setAuthError?.("제목, 아티스트, 오디오 URL은 필수입니다.");
      return;
    }

    try {
      const payload = {
        ...newTrack,
        createdAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(trackDocRef(db, appId, editingId), payload);
        setToastMessage?.("트랙 수정 완료");
      } else {
        await addDoc(tracksCollectionRef(db, appId), payload);
        setToastMessage?.("트랙 업로드 완료");
      }

      setNewTrack({
        title: "",
        artist: "",
        image: "",
        description: "",
        tag: "Ambient",
        audioUrl: "",
        lyrics: "",
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      setAuthError?.("트랙 저장 실패");
    }
  };

  const handleDeleteTrack = async (id) => {
    if (!window.confirm("이 트랙을 삭제할까요?")) return;
    try {
      await deleteDoc(trackDocRef(db, appId, id));
      setToastMessage?.("트랙 삭제 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("트랙 삭제 실패");
    }
  };

  const handleEditTrack = (track) => {
    setEditingId(track.id);
    setNewTrack({
      title: track.title || "",
      artist: track.artist || "",
      image: track.image || "",
      description: track.description || "",
      tag: track.tag || "Ambient",
      audioUrl: track.audioUrl || "",
      lyrics: track.lyrics || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSavePlaylist = async () => {
    if (!newPlaylist.title) {
      setAuthError?.("플레이리스트 제목은 필수입니다.");
      return;
    }

    try {
      const payload = {
        ...newPlaylist,
        items: (newPlaylist.trackIds || [])
          .map((id) => tracks.find((t) => t.id === id))
          .filter(Boolean),
        createdAt: Timestamp.now(),
      };

      if (editingPlaylistId) {
        await updateDoc(playlistDocRef(db, appId, editingPlaylistId), payload);
        setToastMessage?.("플레이리스트 수정 완료");
      } else {
        await addDoc(playlistsCollectionRef(db, appId), payload);
        setToastMessage?.("플레이리스트 생성 완료");
      }

      setNewPlaylist({ title: "", desc: "", image: "", trackIds: [] });
      setEditingPlaylistId(null);
    } catch (e) {
      console.error(e);
      setAuthError?.("플레이리스트 저장 실패");
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm("이 플레이리스트를 삭제할까요?")) return;
    try {
      await deleteDoc(playlistDocRef(db, appId, id));
      setToastMessage?.("플레이리스트 삭제 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("플레이리스트 삭제 실패");
    }
  };

  const handleEditPlaylist = (playlist) => {
    setEditingPlaylistId(playlist.id);
    setNewPlaylist({
      title: playlist.title || "",
      desc: playlist.desc || "",
      image: playlist.image || "",
      trackIds: Array.isArray(playlist.items) ? playlist.items.map((item) => item.id).filter(Boolean) : [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveAllConfig = async () => {
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "featured", "directors_pick"),
        featuredData
      );
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "site_config", "main_texts"),
        {
          ...siteConfig,
          heroSlides: normalizeHeroSlides(siteConfig.heroSlides),
        }
      );
      setToastMessage?.("사이트 설정 저장 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("설정 저장 실패");
    }
  };

  const saveSelectedUser = async (payload) => {
    if (!selectedUserForSticker?.id) return;
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public_stats", selectedUserForSticker.id),
        payload,
        { merge: true }
      );
      setSelectedUserForSticker((prev) => ({ ...prev, ...payload }));
      setToastMessage?.("유저 정보 저장 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("유저 정보 저장 실패");
    }
  };

  const handleSaveNicknameAndLevel = async () => {
    if (!selectedUserForSticker) return;
    await saveSelectedUser({
      nickname: nicknameDraft,
      levelOverrideName,
      levelOverrideColor,
    });
  };

  const toggleSticker = async (stickerId) => {
    if (!selectedUserForSticker) return;
    const currentRewards = asObjectRewards(selectedUserForSticker.rewards || []);
    const exists = normalizeRewardIds(currentRewards).has(stickerId);

    const nextRewards = exists
      ? removeRewardById(currentRewards, stickerId)
      : addRewardObject(currentRewards, stickerId, { adminGranted: true });

    await saveSelectedUser({ rewards: nextRewards });
  };

  const runAnnualSettlement = async () => {
    if (!settleYear || !db) return;
    setIsSettling(true);
    try {
      setToastMessage?.(`${settleYear} 배치 정산은 현재 구조상 수동 기준으로 운영합니다.`);
    } catch (e) {
      console.error(e);
      setAuthError?.("배치 정산 실패");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 px-6 lg:px-8">
      <div className="container mx-auto pt-28 lg:pt-36">
        <div className="mb-12 lg:mb-16">
          <span className="text-[#004aad] text-[10px] font-black uppercase tracking-[0.35em] block mb-4">
            Control Room
          </span>
          <h1 className={`${h1Title} text-5xl lg:text-8xl`}>
            Admin<br />Panel
          </h1>
          <p className="text-zinc-500 mt-6 max-w-2xl">
            트랙, 플레이리스트, 히어로 슬라이드, 사이트 설정과 유저 메타를 한곳에서 관리합니다.
          </p>
        </div>

        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "tracks" && (
          <TrackManager
            tracks={tracks}
            newTrack={newTrack}
            setNewTrack={setNewTrack}
            editingId={editingId}
            setEditingId={setEditingId}
            isUploadingImg={isUploadingImg}
            handleImageUpload={handleImageUpload}
            handleSaveTrack={handleSaveTrack}
            handleDeleteTrack={handleDeleteTrack}
            handleEditTrack={handleEditTrack}
          />
        )}

        {activeTab === "playlists" && (
          <PlaylistManager
            tracks={tracks}
            playlists={playlists}
            newPlaylist={newPlaylist}
            setNewPlaylist={setNewPlaylist}
            editingPlaylistId={editingPlaylistId}
            setEditingPlaylistId={setEditingPlaylistId}
            isUploadingPLImg={isUploadingPLImg}
            handleImageUpload={handleImageUpload}
            handleSavePlaylist={handleSavePlaylist}
            handleDeletePlaylist={handleDeletePlaylist}
            handleEditPlaylist={handleEditPlaylist}
          />
        )}

        {activeTab === "config" && (
          <SiteConfigManager
            featuredData={featuredData}
            setFeaturedData={setFeaturedData}
            tracks={tracks}
            siteConfig={siteConfig}
            setSiteConfig={setSiteConfig}
            handleSaveAllConfig={handleSaveAllConfig}
            playlists={playlists}
            normalizeHeroSlides={normalizeHeroSlides}
            HERO_SLIDE_TYPES={HERO_SLIDE_TYPES}
            updateHeroSlide={updateHeroSlide}
            toggleHeroTrack={toggleHeroTrack}
            moveHeroSlide={moveHeroSlide}
            uploadHeroSlideImage={uploadHeroSlideImage}
          />
        )}

        {activeTab === "users" && (
          <UserRewardManager
            allUsers={allUsers}
            filteredUsers={filteredUsers}
            userSearchTerm={userSearchTerm}
            setUserSearchTerm={setUserSearchTerm}
            isLoadingUsers={isLoadingUsers}
            fetchUsers={fetchUsers}
            selectedUserForSticker={selectedUserForSticker}
            setSelectedUserForSticker={setSelectedUserForSticker}
            nicknameDraft={nicknameDraft}
            setNicknameDraft={setNicknameDraft}
            levelOverrideName={levelOverrideName}
            setLevelOverrideName={setLevelOverrideName}
            levelOverrideColor={levelOverrideColor}
            setLevelOverrideColor={setLevelOverrideColor}
            handleSaveNicknameAndLevel={handleSaveNicknameAndLevel}
            selectedUserRewardIds={selectedUserRewardIds}
            toggleSticker={toggleSticker}
            settleYear={settleYear}
            setSettleYear={setSettleYear}
            isSettling={isSettling}
            runAnnualSettlement={runAnnualSettlement}
          />
        )}
      </div>
    </div>
  );
}
