import React from "react";
import { Disc3, Headphones, Trophy } from "lucide-react";

const INK = "#11110f", PAPER = "#f1efe7", LIME = "#ccff00", BLUE = "#143cff", ORANGE = "#ff5c35", CARD = "#fffdf5";
const SANS = "Inter, Pretendard, 'Apple SD Gothic Neo', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

const titleSize = (title = "", sizes) => {
  const length = [...title].length;
  return length <= 7 ? sizes[0] : length <= 14 ? sizes[1] : sizes[2];
};

const Icon = ({ icon, fallback, size, color }) => React.createElement(icon || fallback, { size, color, strokeWidth: 2 });

function Ticket({ item, name, dateText, serial }) {
  return (
    <div style={{ width: 600, height: 850, boxSizing: "border-box", padding: "46px 46px 60px", background: PAPER, fontFamily: SANS, color: INK }}>
      <div style={{ height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", background: LIME, border: `3px solid ${INK}`, borderRadius: 30, boxShadow: `12px 12px 0 ${INK}`, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "28px 30px 0", font: `800 17px ${MONO}`, letterSpacing: ".04em" }}>
          <span>UNFRAME PLAYLIST</span>
          {serial && <span>№ {serial}</span>}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px" }}>
          <div style={{ font: `800 16px ${MONO}`, letterSpacing: ".06em" }}>ADMIT ONE LISTENER</div>
          <div style={{ marginTop: 18, fontSize: titleSize(item.title, [96, 68, 50]), fontWeight: 950, lineHeight: 0.98, letterSpacing: "-.055em", wordBreak: "keep-all", overflowWrap: "anywhere" }}>{item.title}</div>
          <div style={{ marginTop: 24, fontSize: 23, fontWeight: 600, lineHeight: 1.4, wordBreak: "keep-all" }}>{item.desc || "당신의 감상을 기록합니다."}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "24px 30px", background: PAPER, borderTop: `3px dashed ${INK}` }}>
          <div style={{ minWidth: 0, font: `800 18px/1.45 ${MONO}` }}>
            <div style={{ overflowWrap: "anywhere" }}>{name}</div>
            {dateText && <div>{dateText}</div>}
          </div>
          <div style={{ flex: "none", width: 82, height: 82, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: ORANGE, border: `3px solid ${INK}`, transform: "rotate(-8deg)" }}>
            <Icon icon={item.icon} fallback={Headphones} size={42} color={INK} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Sleeve({ item, name, dateText, serial }) {
  return (
    <div style={{ position: "relative", width: 600, height: 850, overflow: "hidden", background: BLUE, fontFamily: SANS, color: "#fff" }}>
      <div style={{ position: "absolute", right: -190, top: 74, width: 520, height: 520, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: INK, boxShadow: `inset 0 0 0 34px ${INK}, inset 0 0 0 36px #2c2c29, inset 0 0 0 78px ${INK}, inset 0 0 0 80px #2c2c29, inset 0 0 0 122px ${INK}, inset 0 0 0 124px #2c2c29` }}>
        <div style={{ width: 170, height: 170, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: LIME }}>
          <Icon icon={item.icon} fallback={Trophy} size={76} color={INK} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 44, top: 44, font: `800 17px/1.4 ${MONO}`, letterSpacing: ".04em" }}>
        <div>SIDE A</div>
        <div>SPECIAL ISSUE{serial ? ` № ${serial}` : ""}</div>
      </div>
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 44 }}>
        <div style={{ fontSize: titleSize(item.title, [100, 72, 54]), fontWeight: 950, lineHeight: 0.98, letterSpacing: "-.055em", color: LIME, wordBreak: "keep-all", overflowWrap: "anywhere" }}>{item.title}</div>
        <div style={{ marginTop: 20, fontSize: 23, fontWeight: 600, lineHeight: 1.4, wordBreak: "keep-all" }}>{item.desc || "당신의 감상을 기록합니다."}</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginTop: 28, paddingTop: 20, borderTop: "2px solid #fff", font: `800 17px/1.4 ${MONO}` }}>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{name}{dateText ? ` · ${dateText}` : ""}</span>
          <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><Disc3 size={20} color="#fff" /> UP</span>
        </div>
      </div>
    </div>
  );
}

// Everyday achievements print as an admission ticket; rare ones as an LP sleeve.
export default function AchievementCard({ variant = "ticket", ...props }) {
  return variant === "sleeve" ? <Sleeve {...props} /> : <Ticket {...props} />;
}
