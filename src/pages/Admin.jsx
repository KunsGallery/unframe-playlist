// src/pages/Admin.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Trash2,
  Eye,
  Edit2,
  Upload,
  Loader2,
  FileText,
  Sparkles,
  Save,
  Type,
  ListMusic,
  Settings2,
  Plus,
  CheckCircle2,
  Users,
  Search,
  Award,
  Flame,
  Crown,
  Sunrise,
  Target,
  Waves,
  Music,
  Heart,
  Share2,
  Zap,
  Medal,
  Calendar,
  Star,
  Moon,
  Repeat,
  User,
  ArrowRight,
  MousePointer2,
  Trophy,
} from "lucide-react";
import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDoc,
  setDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { auth, ADMIN_EMAILS } from "../firebase";
import { LEVELS } from "../levels";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

// ✅ 엔진 ID와 동기화 (업적)
const ACHIEVEMENT_DATA = {
  first_listen: { title: "첫 감상", icon: Music, color: "#a78bfa" },
  first_complete: { title: "첫 완주", icon: Trophy, color: "#fb7185" },
  first_like: { title: "첫 좋아요", icon: Heart, color: "#f87171" },
  first_share: { title: "첫 공유", icon: Share2, color: "#34d399" },
  repeat_10: { title: "반복의 의식", icon: Repeat, color: "#fb7185" },
  complete_10: { title: "10번의 완주", icon: Zap, color: "#fbbf24" },
  complete_50: { title: "50번의 완주", icon: Zap, color: "#f59e0b" },
  daily_like_5: { title: "하루 5좋아요", icon: Heart, color: "#f87171" },
  share_10: { title: "10회 공유", icon: Share2, color: "#22d3ee" },
  all_tracks_liked: { title: "올 컬렉션", icon: Medal, color: "#a78bfa" },
  streak_7: { title: "7일 연속", icon: Calendar, color: "#fb923c" },
  streak_30: { title: "30일 연속", icon: Star, color: "#fef08a" },
  streak_100: { title: "100일 동행", icon: Star, color: "#ffd600" },
  day_and_night: { title: "낮과 밤", icon: Moon, color: "#818cf8" },
  weekend_listener: { title: "주말의 여유", icon: Sparkles, color: "#c084fc" },
  playlist_trinity: { title: "큐레이션 완주", icon: Target, color: "#2dd4bf" },
};

// ✅ 스티커북(콜렉티브/배치스티커)
const COLLECTIVE_DATA = {
  eternal_origin: { title: "The Origin (초기멤버)", icon: Flame, color: "#ef4444" },
  unframe_genesis: { title: "The Genesis", icon: Crown, color: "#fbbf24" },
  new_year_2026: { title: "2026 First Light", icon: Sunrise, color: "#fb7185" },
  pioneer_26: { title: "Pioneer 26", icon: Target, color: "#2dd4bf" },
  insadong_wave: { title: "Insadong Wave", icon: Waves, color: "#3b82f6" },

  annual_bronze_2026: { title: "2026 Bronze", icon: Medal, color: "#cd7f32" },
  annual_silver_2026: { title: "2026 Silver", icon: Medal, color: "#c0c0c0" },
  annual_gold_2026: { title: "2026 Gold", icon: Trophy, color: "#fbbf24" },
};

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

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

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

  const selectedUserRewardIds = useMemo(() => {
    return normalizeRewardIds(selectedUserForSticker?.rewards || []);
  }, [selectedUserForSticker?.rewards]);

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
        await updateDoc(doc(db, "artifacts", appId, "tracks", editingId), payload);
        setToastMessage?.("트랙 수정 완료");
      } else {
        await addDoc(collection(db, "artifacts", appId, "tracks"), payload);
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
      await deleteDoc(doc(db, "artifacts", appId, "tracks", id));
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
        await updateDoc(doc(db, "artifacts", appId, "playlists", editingPlaylistId), payload);
        setToastMessage?.("플레이리스트 수정 완료");
      } else {
        await addDoc(collection(db, "artifacts", appId, "playlists"), payload);
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
      await deleteDoc(doc(db, "artifacts", appId, "playlists", id));
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

  const tabBtn = (id, icon, label) => {
    const Icon = icon;
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
          active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-400 hover:text-white"
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
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

        <div className="flex flex-wrap gap-3 mb-10">
          {tabBtn("tracks", Music, "Tracks")}
          {tabBtn("playlists", ListMusic, "Playlists")}
          {tabBtn("config", Settings2, "Config")}
          {tabBtn("users", Users, "Users")}
        </div>

        {activeTab === "tracks" && (
          <div className="space-y-10">
            <div className={`${glass} rounded-[3rem] p-8 lg:p-12 space-y-6`}>
              <h2 className="text-2xl font-black uppercase">{editingId ? "Edit Track" : "Upload Track"}</h2>

              <div className="grid lg:grid-cols-2 gap-5">
                <input
                  value={newTrack.title}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <input
                  value={newTrack.artist}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, artist: e.target.value }))}
                  placeholder="Artist"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <input
                  value={newTrack.audioUrl}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, audioUrl: e.target.value }))}
                  placeholder="Audio URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none lg:col-span-2"
                />
                <input
                  value={newTrack.image}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Image URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <label className="inline-flex items-center gap-2 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                  {isUploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e.target.files?.[0], (url) => setNewTrack((prev) => ({ ...prev, image: url })), "track")
                    }
                  />
                </label>
                <input
                  value={newTrack.tag}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, tag: e.target.value }))}
                  placeholder="Tag / Genre"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
              </div>

              <textarea
                value={newTrack.description}
                onChange={(e) => setNewTrack((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
              />

              <textarea
                value={newTrack.lyrics}
                onChange={(e) => setNewTrack((prev) => ({ ...prev, lyrics: e.target.value }))}
                placeholder="Lyrics"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-44 resize-none"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveTrack}
                  className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  {editingId ? "Update Track" : "Save Track"}
                </button>
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setNewTrack({
                        title: "",
                        artist: "",
                        image: "",
                        description: "",
                        tag: "Ambient",
                        audioUrl: "",
                        lyrics: "",
                      });
                    }}
                    className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className={`${glass} rounded-[3rem] p-8 lg:p-12`}>
              <h2 className="text-2xl font-black uppercase mb-8">Track Library</h2>
              <div className="space-y-3">
                {tracks.map((track) => (
                  <div key={track.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                      {safeSrc(track.image) ? (
                        <img src={safeSrc(track.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                        {track.artist} • {track.tag || "Ambient"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditTrack(track)} className="p-3 rounded-full bg-white/5 hover:bg-white/10">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTrack(track.id)} className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "playlists" && (
          <div className="space-y-10">
            <div className={`${glass} rounded-[3rem] p-8 lg:p-12 space-y-6`}>
              <h2 className="text-2xl font-black uppercase">{editingPlaylistId ? "Edit Playlist" : "Create Playlist"}</h2>

              <div className="grid lg:grid-cols-2 gap-5">
                <input
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Playlist Title"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <input
                  value={newPlaylist.image}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Cover Image URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <label className="inline-flex items-center gap-2 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                  {isUploadingPLImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Playlist Cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e.target.files?.[0], (url) => setNewPlaylist((prev) => ({ ...prev, image: url })), "playlist")
                    }
                  />
                </label>
              </div>

              <textarea
                value={newPlaylist.desc}
                onChange={(e) => setNewPlaylist((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="Playlist Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
              />

              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">Select Tracks</p>
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto no-scrollbar">
                  {tracks.map((track) => {
                    const active = newPlaylist.trackIds.includes(track.id);
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          setNewPlaylist((prev) => ({
                            ...prev,
                            trackIds: active
                              ? prev.trackIds.filter((id) => id !== track.id)
                              : [...prev.trackIds, track.id],
                          }));
                        }}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500 hover:text-white"
                        }`}
                      >
                        {track.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSavePlaylist}
                  className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  {editingPlaylistId ? "Update Playlist" : "Save Playlist"}
                </button>
                {editingPlaylistId && (
                  <button
                    onClick={() => {
                      setEditingPlaylistId(null);
                      setNewPlaylist({ title: "", desc: "", image: "", trackIds: [] });
                    }}
                    className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className={`${glass} rounded-[3rem] p-8 lg:p-12`}>
              <h2 className="text-2xl font-black uppercase mb-8">Playlist Library</h2>
              <div className="space-y-3">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                      {safeSrc(playlist.image) ? (
                        <img src={safeSrc(playlist.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase truncate">{playlist.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                        {playlist.items?.length || 0} tracks
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPlaylist(playlist)} className="p-3 rounded-full bg-white/5 hover:bg-white/10">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePlaylist(playlist.id)} className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="space-y-10">
            <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-10`}>
              <h3 className="text-xl font-black uppercase text-white flex items-center gap-3">
                <Star className="w-5 h-5 text-[#004aad]" /> Featured Artifact (Directors Pick)
              </h3>

              <div className="grid lg:grid-cols-2 gap-5">
                <input
                  value={featuredData.headline || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Headline"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <input
                  value={featuredData.subHeadline || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, subHeadline: e.target.value }))}
                  placeholder="Sub Headline"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
                <input
                  value={featuredData.quote || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, quote: e.target.value }))}
                  placeholder="Quote"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none lg:col-span-2"
                />
                <textarea
                  value={featuredData.description || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-32 resize-none lg:col-span-2"
                />
                <select
                  value={featuredData.linkedTrackId || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, linkedTrackId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none lg:col-span-2"
                >
                  <option value="">-- SELECT TRACK --</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-8`}>
              <h3 className="text-xl font-black uppercase text-white flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#004aad]" /> Hero Slides
              </h3>
              <div className="space-y-6">
                {normalizeHeroSlides(siteConfig.heroSlides).map((slide, idx) => {
                  const linkedPlaylist = playlists.find((pl) => pl.id === slide.linkedPlaylistId);
                  return (
                    <div key={slide.id} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Slide {idx + 1}</p>
                          <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                            {slide.title || slide.eyebrow || `Hero Slide ${idx + 1}`}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => moveHeroSlide(slide.id, "up")} className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">Move Up</button>
                          <button onClick={() => moveHeroSlide(slide.id, "down")} className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">Move Down</button>
                          <button
                            onClick={() => updateHeroSlide(slide.id, { isActive: !slide.isActive })}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${slide.isActive ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500"}`}
                          >
                            {slide.isActive ? "Active" : "Inactive"}
                          </button>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-4">
                        <select
                          value={slide.type}
                          onChange={(e) => updateHeroSlide(slide.id, { type: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                        >
                          {HERO_SLIDE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>

                        <input value={slide.eyebrow || ""} onChange={(e) => updateHeroSlide(slide.id, { eyebrow: e.target.value })} placeholder="Eyebrow" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                        <input value={slide.title || ""} onChange={(e) => updateHeroSlide(slide.id, { title: e.target.value })} placeholder="Title" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                        <input value={slide.subtitle || ""} onChange={(e) => updateHeroSlide(slide.id, { subtitle: e.target.value })} placeholder="Subtitle" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                        <input value={slide.buttonLabel || ""} onChange={(e) => updateHeroSlide(slide.id, { buttonLabel: e.target.value })} placeholder="Button Label" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />

                        <select
                          value={slide.linkedPlaylistId || ""}
                          onChange={(e) => updateHeroSlide(slide.id, { linkedPlaylistId: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                        >
                          <option value="">-- NO PLAYLIST --</option>
                          {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {linkedPlaylist && (
                        <p className="text-[10px] text-[#004aad] font-black uppercase tracking-widest">
                          {linkedPlaylist.title} linked
                        </p>
                      )}

                      <textarea
                        value={slide.description || ""}
                        onChange={(e) => updateHeroSlide(slide.id, { description: e.target.value })}
                        placeholder="Description"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none h-28 resize-none"
                      />

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <input
                            value={slide.backgroundImage || ""}
                            onChange={(e) => updateHeroSlide(slide.id, { backgroundImage: e.target.value })}
                            placeholder="Background Image URL"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                          />
                          <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                            <Upload className="w-4 h-4" /> Upload Background
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHeroSlideImage(slide.id, "backgroundImage", e.target.files?.[0])} />
                          </label>
                        </div>

                        <div className="space-y-3">
                          <input
                            value={slide.coverImage || ""}
                            onChange={(e) => updateHeroSlide(slide.id, { coverImage: e.target.value })}
                            placeholder="Cover Image URL"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                          />
                          <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                            <Upload className="w-4 h-4" /> Upload Cover
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHeroSlideImage(slide.id, "coverImage", e.target.files?.[0])} />
                          </label>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] aspect-[16/9] flex items-center justify-center">
                          {safeSrc(slide.backgroundImage) ? (
                            <img src={safeSrc(slide.backgroundImage)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Background</p>
                          )}
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] aspect-square max-w-[280px] flex items-center justify-center">
                          {safeSrc(slide.coverImage) ? (
                            <img src={safeSrc(slide.coverImage)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Cover</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-black mb-3 ml-1">Linked Tracks</p>
                        <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto no-scrollbar">
                          {tracks.map((track) => {
                            const active = slide.trackIds.includes(track.id);
                            return (
                              <button
                                key={track.id}
                                type="button"
                                onClick={() => toggleHeroTrack(slide.id, track.id)}
                                className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500 hover:text-white"}`}
                              >
                                {track.title}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold mt-3">
                          Exhibition OST / New Album은 track 연결을 권장, Featured Playlist는 playlist 연결을 권장합니다.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveAllConfig}
              className="w-full bg-[#004aad] text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 shadow-2xl"
            >
              <Save className="w-6 h-6" /> Deploy Site Changes
            </button>
          </div>
        )}

        {activeTab === "users" && (
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

                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase">Achievements & Stickers</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {Object.entries({ ...ACHIEVEMENT_DATA, ...COLLECTIVE_DATA }).map(([id, meta]) => {
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
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{id}</p>
                              </div>
                            </div>
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
        )}
      </div>
    </div>
  );
}