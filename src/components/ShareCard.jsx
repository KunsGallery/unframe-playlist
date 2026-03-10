import React from "react"
import { Music, Heart } from "lucide-react"

export default function ShareCard({
  shareItem,
  shareCardRef,
  user,
  formatDateTime
}) {

  if (!shareItem) return null

  return (
    <div
      ref={shareCardRef}
      style={{
        position: 'fixed', top: 0, left: 0, width: '600px', height: '850px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: -1, opacity: 0.99, pointerEvents: 'none',
        fontFamily: "'Inter', 'Pretendard', sans-serif"
      }}
    >
      <div style={{ width: '560px', height: '810px', border: '1.5px solid #7dd3fc', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 40px', boxSizing: 'border-box' }}>

        {/* corners */}
        <svg style={{ position: 'absolute', top: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
        <svg style={{ position: 'absolute', top: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
        <svg style={{ position: 'absolute', bottom: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(-90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
        <svg style={{ position: 'absolute', bottom: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(180deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>

        {/* title + curve */}
        <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.1em', margin: 0, textShadow: '0 0 10px rgba(125, 211, 252, 0.5)', position: 'relative', zIndex: 2 }}>
            {shareItem.title}
          </h1>
          <svg style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', width: '380px', height: '60px', fill: 'none', stroke: '#7dd3fc', strokeWidth: 1, opacity: 0.6, zIndex: 1 }}>
            <path d="M0,30 Q190,-20 380,30" />
          </svg>
        </div>

        {/* icon */}
        <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '260px', height: '260px', background: `radial-gradient(circle, ${shareItem.color || '#7dd3fc'}44 0%, transparent 60%)`, filter: 'blur(50px)', zIndex: 1, mixBlendMode: 'screen' }} />
          <div style={{ zIndex: 5, filter: `drop-shadow(0 0 8px ${shareItem.color || '#7dd3fc'}) drop-shadow(0 0 15px ${shareItem.color || '#7dd3fc'}66)` }}>
            {shareItem.type === 'reward'
              ? React.createElement(shareItem.icon || Heart, { size: 180, color: '#ffffff', strokeWidth: 1.5 })
              : (shareItem.image
                ? <div style={{ width: '200px', height: '200px', border: '4px solid #ffffff', borderRadius: '40px', overflow: 'hidden' }}>
                    <img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" alt="" />
                  </div>
                : <Music size={150} color="#ffffff" />
              )
            }
          </div>
        </div>

        {/* user + desc */}
        <div style={{ textAlign: 'center', zIndex: 10, width: '80%' }}>
          <p style={{ fontSize: '26px', fontWeight: 400, color: '#ffffff', margin: 0 }}>
            <span style={{ fontWeight: 800, color: '#7dd3fc' }}>{user?.displayName || 'Collector'}</span> 님,
          </p>
          <p style={{ fontSize: '20px', fontWeight: 300, color: '#ffffff', marginTop: '12px', opacity: 0.9, wordBreak: 'keep-all', lineHeight: 1.4 }}>
            {shareItem.desc || "당신의 취향을 기록합니다."}
          </p>
        </div>

        {/* footer */}
        <div style={{ textAlign: 'center', width: '100%', borderTop: '0.5px solid #7dd3fc55', paddingTop: '25px' }}>
          <p style={{ fontSize: '14px', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.3em', marginBottom: '8px' }}>ACHIEVEMENT CARD</p>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
            {formatDateTime(shareItem.unlockedAt || new Date())}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(125, 211, 252, 0.3)' }}>UNFRAME PLAYLIST</p>
        </div>

        {/* decor */}
        <div style={{ position: 'absolute', top: '160px', left: '50px', color: '#7dd3fc', fontSize: '24px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
        <div style={{ position: 'absolute', top: '200px', right: '60px', color: '#ffffff', fontSize: '18px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
        <div style={{ position: 'absolute', bottom: '240px', left: '70px', color: '#ffffff', fontSize: '20px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
        <div style={{ position: 'absolute', bottom: '180px', right: '40px', color: '#7dd3fc', fontSize: '28px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
        <div style={{ position: 'absolute', left: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
        <div style={{ position: 'absolute', right: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>

      </div>
    </div>
  )
}