import React from "react"
import { motion } from "framer-motion"
import { Share, X } from "lucide-react"

export default function AchievementPopup({
  newAchievement,
  popupMeta,
  displayName,
  formatDateTime,
  setNewAchievement,
  setShareItem
}) {

  if (!newAchievement || !popupMeta) return null

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">

      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        className="w-full max-w-140 relative"
      >

        <div className="rounded-4xl overflow-hidden shadow-2xl border border-white/10">

          <div
            className="scale-[0.92] origin-top-left"
            style={{ width: 600, height: 850 }}
          >

            <div
              style={{
                width: "600px",
                height: "850px",
                background:
                  "linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', 'Pretendard', sans-serif",
              }}
            >

              <div
                style={{
                  width: "560px",
                  height: "810px",
                  border: "1.5px solid #7dd3fc",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "60px 40px",
                  boxSizing: "border-box",
                }}
              >

                {/* TITLE */}
                <div style={{ textAlign: "center", width: "100%" }}>
                  <h1
                    style={{
                      fontSize: "56px",
                      fontWeight: 300,
                      color: "#ffffff",
                      letterSpacing: "0.1em",
                      margin: 0,
                    }}
                  >
                    {popupMeta.title}
                  </h1>
                </div>

                {/* ICON */}
                <div
                  style={{
                    width: "320px",
                    height: "320px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {React.createElement(popupMeta.icon, {
                    size: 180,
                    color: "#ffffff",
                  })}
                </div>

                {/* USER */}
                <div style={{ textAlign: "center", width: "80%" }}>
                  <p style={{ fontSize: "26px", color: "#ffffff" }}>
                    <span style={{ fontWeight: 800, color: "#7dd3fc" }}>
                      {displayName}
                    </span>{" "}
                    님
                  </p>

                  <p
                    style={{
                      fontSize: "20px",
                      color: "#ffffff",
                      marginTop: "12px",
                    }}
                  >
                    {popupMeta.desc}
                  </p>
                </div>

                {/* FOOTER */}
                <div
                  style={{
                    textAlign: "center",
                    width: "100%",
                    borderTop: "0.5px solid #7dd3fc55",
                    paddingTop: "25px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "18px",
                      color: "#ffffff",
                    }}
                  >
                    {formatDateTime(newAchievement.unlockedAt)}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* buttons */}

        <div className="mt-4 grid grid-cols-2 gap-3">

          <button
            onClick={() => setNewAchievement(null)}
            className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase"
          >
            Close
          </button>

          <button
            onClick={() => {
              setShareItem({
                title: popupMeta.title,
                desc: popupMeta.desc,
                type: "reward",
                color: popupMeta.color,
                icon: popupMeta.icon,
                unlockedAt: newAchievement.unlockedAt,
              })

              setNewAchievement(null)
            }}
            className="py-4 bg-[#004aad] rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
          >
            <Share size={12} /> Share Card
          </button>

        </div>

        <button
          onClick={() => setNewAchievement(null)}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white/80" />
        </button>

      </motion.div>
    </div>
  )
}