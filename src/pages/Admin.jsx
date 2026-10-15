import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { auth } from "../firebase";
import AdminTabs from "../components/admin/AdminTabs";
import TrackManager from "../components/admin/TrackManager";
import PlaylistManager from "../components/admin/PlaylistManager";
import GatheringPlaylistManager from "../components/admin/GatheringPlaylistManager";
import SiteConfigManager from "../components/admin/SiteConfigManager";
import UserRewardManager from "../components/admin/UserRewardManager";
import PublicationTools from '../components/admin/PublicationTools';
import { saveContent } from '../utils/contentHistory';
import { settleRewards, normalizeRewards } from '../utils/rewardState';
import { trackUsage } from '../utils/catalog';
import {
  createEmptyGatheringPlaylist,
  extractYouTubePlaylistId,
} from "../utils/youtubePlaylist";
import {
  createEmptyTrack,
  getMissingTrackCurationPatch,
  normalizeTrackCuration,
  normalizeTrackForEditor,
} from "../constants/trackCuration";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

const ADMIN_SECTIONS = {
  tracks: { eyebrow: "Audio Library", title: "Tracks", desc: "음원 파일, 커버, 곡 정보와 큐레이션 태그를 관리합니다." },
  playlists: { eyebrow: "Curation Desk", title: "Playlists", desc: "공개 컬렉션을 만들고 곡의 순서와 대표 이미지를 관리합니다." },
  gatherings: { eyebrow: "Offline Archive", title: "Gatherings", desc: "오프라인 모임의 유튜브 플레이리스트와 홈 노출을 관리합니다." },
  config: { eyebrow: "Exhibition Editor", title: "Page", desc: "홈 히어로, Director’s Pick과 주요 문구를 관리합니다." },
  users: { eyebrow: "Listener Office", title: "Listeners", desc: "회원 정보, 등급과 수집 리워드를 관리합니다." },
};

const normalizeRewardIds = (rewards) => {
  if (!Array.isArray(rewards) || rewards.length === 0) return new Set();
  if (typeof rewards[0] === "string") return new Set(rewards.filter(Boolean));
  return new Set(rewards.map((r) => r?.id).filter(Boolean));
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

const gatheringPlaylistsCollectionRef = (db, appId) =>
  collection(db, "artifacts", appId, "public", "data", "gathering_playlists");

const gatheringPlaylistDocRef = (db, appId, id) =>
  doc(db, "artifacts", appId, "public", "data", "gathering_playlists", id);

const userProfileDocRef = (db, appId, uid) =>
  doc(db, "artifacts", appId, "users", uid, "profile", "stats");

const publicUserDocRef = (db, appId, uid) =>
  doc(db, "artifacts", appId, "public_stats", uid);

export default function Admin({
  isAdmin,
  signInWithPopup,
  tracks = [],
  playlists = [],
  gatheringPlaylists = [],
  db,
  appId,
  setToastMessage,
  setAuthError,
}) {
  const [activeTab, setActiveTab] = useState("tracks");

  const [newTrack, setNewTrack] = useState(createEmptyTrack());
  const [editingId, setEditingId] = useState(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const [newPlaylist, setNewPlaylist] = useState({ title: "", desc: "", image: "", trackIds: [] });
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [isUploadingPLImg, setIsUploadingPLImg] = useState(false);

  const [newGatheringPlaylist, setNewGatheringPlaylist] = useState(createEmptyGatheringPlaylist);
  const [editingGatheringPlaylistId, setEditingGatheringPlaylistId] = useState(null);
  const [isUploadingGatheringImage, setIsUploadingGatheringImage] = useState(false);

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
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [settlementProgress, setSettlementProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const reportError = (message) => { setErrorMessage(message); setAuthError?.(message); };
  const selectedEditor = activeTab === 'tracks' ? { value: newTrack, set: setNewTrack, id: editingId, list: tracks, ref: trackDocRef } : activeTab === 'playlists' ? { value: newPlaylist, set: setNewPlaylist, id: editingPlaylistId, list: playlists, ref: playlistDocRef } : activeTab === 'gatherings' ? { value: newGatheringPlaylist, set: setNewGatheringPlaylist, id: editingGatheringPlaylistId, list: gatheringPlaylists, ref: gatheringPlaylistDocRef } : null;
  const guardedSave = async (action) => {
    if (savingRef.current) return;
    savingRef.current = true; setIsSaving(true); setErrorMessage('');
    try { await action(); } finally { savingRef.current = false; setIsSaving(false); }
  };
  const activeSection = ADMIN_SECTIONS[activeTab] || ADMIN_SECTIONS.tracks;
  const activeTrackCount = tracks.filter((track) => track?.isActive !== false).length;
  const adminCounts = {
    tracks: tracks.length,
    playlists: playlists.length,
    gatherings: gatheringPlaylists.length,
    config: Array.isArray(siteConfig.heroSlides) ? siteConfig.heroSlides.length : 0,
    users: allUsers.length,
  };

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

  const fetchUsers = useCallback(async () => {
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
  }, [isAdmin, db, appId, setAuthError]);

  useEffect(() => {
    if (activeTab === "users" && isAdmin) fetchUsers();
  }, [activeTab, isAdmin, fetchUsers]);

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
  const selectedUserId = selectedUserForSticker?.id;

  useEffect(() => {
    const fetchSelectedUserStats = async () => {
      if (!selectedUserId || !db) return;

      try {
        const ref = userProfileDocRef(db, appId, selectedUserId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const data = snap.data() || {};
        setSelectedUserForSticker((current) => current?.id === selectedUserId ? { ...current, ...data, id: selectedUserId } : current);
        setNicknameDraft(data.nickname || "");
        setLevelOverrideName(data.levelOverrideName || "");
        setLevelOverrideColor(data.levelOverrideColor || "");
      } catch (e) {
        console.error("선택 유저 불러오기 실패:", e);
      }
    };

    fetchSelectedUserStats();
  }, [selectedUserId, db, appId]);

  if (!isAdmin) {
    return (
      <div className="up-themed-page up-admin-page min-h-screen flex items-center justify-center bg-[#050505] px-6">
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
    if (fieldName === "track") setIsUploadingImg(true);
    else if (fieldName === "gathering") setIsUploadingGatheringImage(true);
    else setIsUploadingPLImg(true);

    try {
      const url = await uploadImageToImgBB(file);
      setter(url);
      setToastMessage?.("이미지 업로드 완료 ✨");
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      setAuthError?.("이미지 업로드 실패");
    } finally {
      if (fieldName === "track") setIsUploadingImg(false);
      else if (fieldName === "gathering") setIsUploadingGatheringImage(false);
      else setIsUploadingPLImg(false);
    }
  };

  const handleSaveTrack = async () => {
    if (!newTrack.title || !newTrack.artist || !newTrack.audioUrl) {
      setAuthError?.("제목, 아티스트, 오디오 URL은 필수입니다.");
      return;
    }

    try {
      const selectedGenre = newTrack.genre || newTrack.tag || "Ambient";
      const curationPayload = normalizeTrackCuration(newTrack);

      const payload = {
        ...newTrack,
        genre: selectedGenre,
        tag: selectedGenre,
        ...curationPayload,
        updatedAt: new Date().toISOString(),
      };

      if (!editingId) {
        payload.createdAt = Timestamp.now();
      }

      if (editingId) {
        await saveContent(db, trackDocRef(db, appId, editingId), payload, auth.currentUser?.uid);
        setToastMessage?.("트랙 수정 완료");
      } else {
        await addDoc(tracksCollectionRef(db, appId), payload);
        setToastMessage?.("트랙 업로드 완료");
      }

      setNewTrack(createEmptyTrack());
      setEditingId(null);
    } catch (e) {
      console.error(e);
      setAuthError?.("트랙 저장 실패");
    }
  };

  const handleDeleteTrack = async (id) => {
    const uses = trackUsage(id, playlists, siteConfig.heroSlides || []);
    if (!window.confirm(`이 트랙을 휴지통으로 이동할까요? 나중에 복원할 수 있습니다.${uses.length ? `\n연결된 콘텐츠: ${uses.join(', ')}` : ''}`)) return;
    try {
      await saveContent(db, trackDocRef(db, appId, id), { isHidden: true, status: 'draft', trashedAt: Date.now() }, auth.currentUser?.uid);
      setToastMessage?.("트랙 삭제 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("트랙 삭제 실패");
    }
  };

  const handleEditTrack = (track) => {
    setEditingId(track.id);
    setNewTrack({
      ...normalizeTrackForEditor(track),
      title: track.title || "",
      artist: track.artist || "",
      image: track.image || "",
      description: track.description || "",
      audioUrl: track.audioUrl || "",
      lyrics: track.lyrics || "",
    });
  };

  const handleFillMissingCurationFields = async () => {
    if (!db) {
      setAuthError?.("Firestore 연결이 필요합니다.");
      return;
    }

    if (!window.confirm("Fill missing curation fields for existing tracks?")) return;

    try {
      const updates = (tracks || []).map((track) => {
        if (!track?.id) return null;
        const patch = getMissingTrackCurationPatch(track);
        const patchKeys = Object.keys(patch);
        if (patchKeys.length === 0) return null;

        return updateDoc(trackDocRef(db, appId, track.id), patch);
      });

      const actionableUpdates = updates.filter(Boolean);
      if (actionableUpdates.length === 0) {
        setToastMessage?.("No missing curation fields found");
        return;
      }

      await Promise.all(actionableUpdates);
      setToastMessage?.("Missing curation fields filled");
    } catch (e) {
      console.error(e);
      setAuthError?.("큐레이션 필드 보정 실패");
    }
  };

  const handleSavePlaylist = async () => {
    if (!newPlaylist.title) {
      setAuthError?.("플레이리스트 제목은 필수입니다.");
      return;
    }

    try {
      const payload = {
        ...newPlaylist,
        items: [],
        updatedAt: Timestamp.now(),
      };

      if (!editingPlaylistId) {
        payload.createdAt = Timestamp.now();
      }

      if (editingPlaylistId) {
        await saveContent(db, playlistDocRef(db, appId, editingPlaylistId), payload, auth.currentUser?.uid);
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
      await saveContent(db, playlistDocRef(db, appId, id), { status: 'draft', isPublished: false, trashedAt: Date.now() }, auth.currentUser?.uid);
      setToastMessage?.("플레이리스트 삭제 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("플레이리스트 삭제 실패");
    }
  };

  const handleEditPlaylist = (playlist) => {
    setEditingPlaylistId(playlist.id);
    setNewPlaylist({
      ...playlist,
      title: playlist.title || "",
      desc: playlist.desc || "",
      image: playlist.image || "",
      trackIds: Array.isArray(playlist.trackIds)
        ? playlist.trackIds.filter(Boolean)
        : Array.isArray(playlist.items)
          ? playlist.items.map((item) => item.id).filter(Boolean)
          : [],
    });
  };

  const handleSaveGatheringPlaylist = async () => {
    const youtubePlaylistId = extractYouTubePlaylistId(
      newGatheringPlaylist.youtubeUrl || newGatheringPlaylist.youtubePlaylistId
    );

    if (!youtubePlaylistId) {
      setAuthError?.("유효한 유튜브 플레이리스트 공유주소를 입력해주세요.");
      return;
    }

    try {
      const payload = {
        ...newGatheringPlaylist,
        youtubeUrl: (newGatheringPlaylist.youtubeUrl || "").trim(),
        youtubePlaylistId,
        title: (newGatheringPlaylist.title || "").trim() || "UNFRAME GATHERING PLAYLIST",
        desc: (newGatheringPlaylist.desc || "").trim(),
        location: (newGatheringPlaylist.location || "").trim() || "UNFRAME",
        eventDate: newGatheringPlaylist.eventDate || new Date().toISOString().slice(0, 10),
        image: (newGatheringPlaylist.image || "").trim(),
        isPublished: newGatheringPlaylist.isPublished !== false,
        updatedAt: Timestamp.now(),
      };

      if (editingGatheringPlaylistId) {
        await saveContent(db, gatheringPlaylistDocRef(db, appId, editingGatheringPlaylistId), payload, auth.currentUser?.uid);
        setToastMessage?.("모임 플레이리스트 수정 완료");
      } else {
        await addDoc(gatheringPlaylistsCollectionRef(db, appId), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        setToastMessage?.("모임 플레이리스트 발행 완료");
      }

      setNewGatheringPlaylist(createEmptyGatheringPlaylist());
      setEditingGatheringPlaylistId(null);
    } catch (error) {
      console.error(error);
      setAuthError?.("모임 플레이리스트 저장 실패");
    }
  };

  const handleDeleteGatheringPlaylist = async (id) => {
    if (!window.confirm("이 모임 플레이리스트를 삭제할까요?")) return;

    try {
      await saveContent(db, gatheringPlaylistDocRef(db, appId, id), { status: 'draft', isPublished: false, trashedAt: Date.now() }, auth.currentUser?.uid);
      if (editingGatheringPlaylistId === id) {
        setEditingGatheringPlaylistId(null);
        setNewGatheringPlaylist(createEmptyGatheringPlaylist());
      }
      setToastMessage?.("모임 플레이리스트 삭제 완료");
    } catch (error) {
      console.error(error);
      setAuthError?.("모임 플레이리스트 삭제 실패");
    }
  };

  const handleEditGatheringPlaylist = (playlist) => {
    setEditingGatheringPlaylistId(playlist.id);
    setNewGatheringPlaylist({
      ...createEmptyGatheringPlaylist(),
      ...playlist,
      youtubePlaylistId: playlist.youtubePlaylistId || extractYouTubePlaylistId(playlist.youtubeUrl),
      isPublished: playlist.isPublished !== false,
    });
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

  const saveSelectedPublicUser = async (payload, successMessage = "유저 정보 저장 완료") => {
    if (!selectedUserForSticker?.id) return;
    try {
      await setDoc(
        publicUserDocRef(db, appId, selectedUserForSticker.id),
        payload,
        { merge: true }
      );
      setSelectedUserForSticker((prev) => ({ ...prev, ...payload }));
      setToastMessage?.(successMessage);
    } catch (e) {
      console.error(e);
      setAuthError?.("유저 정보 저장 실패");
    }
  };

  const handleSaveNicknameAndLevel = async () => {
    if (!selectedUserForSticker) return;
    const payload = {
      nickname: nicknameDraft,
      levelOverrideName,
      levelOverrideColor,
    };

    try {
      const batch = writeBatch(db);
      batch.set(userProfileDocRef(db, appId, selectedUserForSticker.id), payload, { merge: true });
      batch.set(publicUserDocRef(db, appId, selectedUserForSticker.id), { nickname: nicknameDraft, levelName: levelOverrideName, levelColor: levelOverrideColor }, { merge: true });
      await batch.commit();
      setSelectedUserForSticker((prev) => ({ ...prev, ...payload }));
      setToastMessage?.("유저 프로필 저장 완료");
    } catch (e) {
      console.error(e);
      setAuthError?.("유저 프로필 저장 실패");
    }
  };

  const handleToggleRankingHidden = async () => {
    if (!selectedUserForSticker) return;
    await saveSelectedPublicUser({
      isRankingHidden: !selectedUserForSticker?.isRankingHidden,
    }, "랭킹 노출 설정 저장 완료");
  };

  const toggleSticker = async (stickerId) => {
    if (!selectedUserForSticker) return;
    const uid = selectedUserForSticker.id;
    await guardedSave(async () => {
      try {
        const rewards = await runTransaction(db, async (tx) => {
          const ref = userProfileDocRef(db, appId, uid), snap = await tx.get(ref);
          const current = normalizeRewards(snap.data()?.rewards || []);
          const exists = current.some((r) => r.id === stickerId);
          const next = exists ? current.filter((r) => r.id !== stickerId) : [...current, { id: stickerId, year: new Date().getFullYear(), unlockedAt: Date.now(), meta: { adminGranted: true, grantedBy: auth.currentUser?.uid || '' } }];
          tx.set(ref, { rewards: next }, { merge: true });
          return next;
        });
        setSelectedUserForSticker((current) => current?.id === uid ? { ...current, rewards } : current);
        setToastMessage?.('보상 변경을 저장했습니다.');
      } catch { reportError('보상 변경을 저장하지 못했습니다. 다시 시도해 주세요.'); }
    });
  };

  const runAnnualSettlement = async (execute = false) => {
    if (!settleYear || !db) return;
    setIsSettling(true);
    try {
      const targetYear = Number(settleYear);
      if (targetYear !== 2026) {
        setAuthError?.("현재 연간 스티커는 2026년 정산만 지원합니다.");
        return;
      }

      const publicUsersSnapshot = await getDocs(
        collection(db, "artifacts", appId, "public_stats")
      );
      let grantedCount = 0;
      const preview = [];
      const failed = [];

      for (const userDoc of publicUsersSnapshot.docs) {
        const profileRef = userProfileDocRef(db, appId, userDoc.id);
        const profileSnapshot = await getDoc(profileRef);
        if (!profileSnapshot.exists()) continue;

        const result = settleRewards(profileSnapshot.data()?.rewards || [], targetYear);
        preview.push({ uid: userDoc.id, name: userDoc.data().nickname || userDoc.id, tier: result.tier, count: result.count });
        if (result.tier) grantedCount += 1;
        if (execute === true) {
          try {
            await runTransaction(db, async (tx) => {
              const latest = await tx.get(profileRef);
              const next = settleRewards(latest.data()?.rewards || [], targetYear);
              tx.set(profileRef, { rewards: next.rewards }, { merge: true });
            });
          } catch { failed.push(userDoc.id); }
        }
        setSettlementProgress(`${preview.length} / ${publicUsersSnapshot.size}명 확인${failed.length ? ` · 실패 ${failed.length}명` : ''}`);
      }
      setSettlementPreview({ year: targetYear, rows: preview, failed });
      setToastMessage?.(execute === true ? `${targetYear} 정산 완료 · ${grantedCount}명 대상 · 실패 ${failed.length}명` : `${targetYear} 정산 미리보기 · ${grantedCount}명 지급 대상`);
    } catch (e) {
      console.error(e);
      setAuthError?.("배치 정산 실패");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="up-themed-page up-admin-page min-h-screen bg-[#050505] text-white pb-24 px-4 lg:px-7">
      <div className="up-admin-container">
        <header className="up-admin-header">
          <div className="up-admin-header__title">
            <span>UP CONTENT STUDIO</span>
            <h1>Control Room</h1>
            <p>페이지와 음악을 한 흐름 안에서 발행하고 관리합니다.</p>
          </div>
          <div className="up-admin-metrics" aria-label="Content summary">
            <div><span>Tracks</span><strong>{tracks.length}</strong><small>{activeTrackCount} published</small></div>
            <div><span>Playlists</span><strong>{playlists.length}</strong><small>public collections</small></div>
            <div><span>Gatherings</span><strong>{gatheringPlaylists.length}</strong><small>offline archives</small></div>
            <div><span>Hero</span><strong>{adminCounts.config}</strong><small>page slides</small></div>
          </div>
        </header>

        <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={adminCounts} />

        <div className="up-admin-stage__head">
          <div>
            <span>{activeSection.eyebrow}</span>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.desc}</p>
          </div>
          <div className="up-admin-live"><i /> LIVE DATABASE</div>
        </div>
        <section className="up-admin-stage" aria-label={`${activeSection.title} workspace`}>
        {errorMessage && <p className="up-notice" role="alert">{errorMessage}</p>}
        {selectedEditor && <PublicationTools key={`${activeTab}:${selectedEditor.id || 'new'}`} kind={activeTab} identity={`${activeTab}:${selectedEditor.id || 'new'}`} value={selectedEditor.value} setValue={selectedEditor.set} original={selectedEditor.list.find((item) => item.id === selectedEditor.id)} onRestore={async (data) => { if (!selectedEditor.id) return; await guardedSave(async () => { try { await saveContent(db, selectedEditor.ref(db, appId, selectedEditor.id), data, auth.currentUser?.uid, true); selectedEditor.set(data); setToastMessage?.('이전 버전으로 복원했습니다.'); } catch { reportError('복원하지 못했습니다.'); } }); }} />}
        <fieldset disabled={isSaving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {activeTab === "tracks" && (
            <TrackManager
              tracks={tracks}
              newTrack={newTrack}
              setNewTrack={setNewTrack}
            editingId={editingId}
            setEditingId={setEditingId}
            isUploadingImg={isUploadingImg}
              handleImageUpload={handleImageUpload}
              handleSaveTrack={() => guardedSave(handleSaveTrack)}
              handleDeleteTrack={handleDeleteTrack}
              handleEditTrack={handleEditTrack}
              onFillMissingCurationFields={handleFillMissingCurationFields}
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
            handleSavePlaylist={() => guardedSave(handleSavePlaylist)}
            handleDeletePlaylist={handleDeletePlaylist}
            handleEditPlaylist={handleEditPlaylist}
          />
        )}

        {activeTab === "gatherings" && (
          <GatheringPlaylistManager
            gatheringPlaylists={gatheringPlaylists}
            draft={newGatheringPlaylist}
            setDraft={setNewGatheringPlaylist}
            editingId={editingGatheringPlaylistId}
            setEditingId={setEditingGatheringPlaylistId}
            isUploadingImage={isUploadingGatheringImage}
            handleImageUpload={(file) => handleImageUpload(
              file,
              (url) => setNewGatheringPlaylist((current) => ({ ...current, image: url })),
              "gathering"
            )}
            handleSave={() => guardedSave(handleSaveGatheringPlaylist)}
            handleDelete={handleDeleteGatheringPlaylist}
            handleEdit={handleEditGatheringPlaylist}
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
            handleToggleRankingHidden={handleToggleRankingHidden}
            selectedUserRewardIds={selectedUserRewardIds}
            toggleSticker={toggleSticker}
            settleYear={settleYear}
            setSettleYear={setSettleYear}
            isSettling={isSettling}
            runAnnualSettlement={() => runAnnualSettlement(false)}
            executeAnnualSettlement={() => runAnnualSettlement(true)}
            settlementPreview={settlementPreview}
            settlementProgress={settlementProgress}
          />
        )}
        </fieldset>
        </section>
      </div>
    </div>
  );
}
