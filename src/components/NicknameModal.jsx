// src/components/NicknameModal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function NicknameModal({
  isOpen,
  user,
  nickInput,
  setNickInput,
  nickError,
  setNickError,
  setIsNickModalOpen,
  saveNicknameOnce,
}) {
  return (
    <AnimatePresence>
      {isOpen && user && !user.isAnonymous && (
        <div className="fixed inset-0 z-10050 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl">
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            className="w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-zinc-950/70 shadow-2xl overflow-hidden"
          >
            <div className="p-8 lg:p-10 relative">
              <button
                onClick={() => setIsNickModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                aria-label="close"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>

              <h3 className="text-2xl font-black uppercase tracking-tight italic">
                Choose Your Nickname
              </h3>

              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                UP에서 사용할 닉네임을 설정할 수 있어요. <br />
                <span className="text-white/80 font-bold">
                  닉네임 변경은 1회만 가능
                </span>
                합니다.
              </p>

              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Nickname
                </p>

                <input
                  value={nickInput}
                  onChange={(e) => {
                    setNickInput(e.target.value);
                    setNickError("");
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-[#004aad]"
                  placeholder="2~16자 (한글/영문/숫자/_-)"
                />

                {nickError ? (
                  <p className="text-[11px] text-red-400 font-bold">{nickError}</p>
                ) : null}

                <p className="text-[11px] text-zinc-500 font-bold">
                  예: unframe, 감상자, blue_wave, my-pick
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsNickModalOpen(false)}
                  className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                >
                  Later
                </button>

                <button
                  onClick={saveNicknameOnce}
                  className="py-4 bg-[#004aad] rounded-2xl text-[10px] font-black uppercase hover:brightness-110 transition-all"
                >
                  Save (1 time)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}