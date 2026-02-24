// src/pages/About.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, Archive, Sparkles, Smartphone, MoveRight, ExternalLink, Music, Heart, Share2, Compass, Layers, Globe } from 'lucide-react';
import AboutCanvas from '../components/AboutCanvas';

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const About = ({ siteConfig }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 relative min-h-screen overflow-hidden bg-[#050505]">
      <AboutCanvas />
      
      <div className="container mx-auto px-6 lg:px-8 relative z-10 pb-40">
        
        {/* [Part 1] Identity - 더 예술적으로 표현 */}
        <section className="mb-40 lg:mb-72">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <span className={subTitle + " block mb-6"}>About Project UP</span>
                <h2 className={`${h1Title} text-[15vw] lg:text-[12rem] mb-12 leading-none`}>
                    Art is<br/>
                    <span className="not-italic text-[#004aad] drop-shadow-[0_0_30px_rgba(0,74,173,0.5)]">Vibration</span>
                </h2>
            </motion.div>
            
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="space-y-8">
                    <p className="text-2xl lg:text-4xl font-black uppercase italic tracking-tighter leading-tight text-white">
                        "우리는 소리를 통해<br/> 공간의 기억을 수집합니다." 🎙️
                    </p>
                    <p className="text-zinc-400 leading-relaxed text-lg lg:text-xl font-medium">
                        <b>UNFRAME</b>은 경계 없는 예술을 지향하는 아트 컬렉티브입니다. 
                        그 첫 번째 디지털 아카이빙 프로젝트인 <b>'UP' (Unframe Playlist)</b>은 
                        단순히 음악을 듣는 기능을 넘어, 전시장의 공기와 작가의 의도가 담긴 
                        '소리의 조각(Sound Artifacts)'을 당신의 주머니 속으로 옮겨오는 실험입니다.
                    </p>
                </motion.div>
                
                {/* UP의 3요소 시각화 */}
                <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }} viewport={{ once: true }} className="grid grid-cols-1 gap-4">
                    {[
                        { icon: Compass, t: "Explore", d: "전시장의 맥락이 담긴 소리를 발견합니다." },
                        { icon: Layers, t: "Collect", d: "당신의 취향을 아카이브에 기록하고 스티커를 모읍니다." },
                        { icon: Globe, t: "Connect", d: "일상의 소음 사이로 전시의 잔향을 연결합니다." }
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-[#004aad]/50 transition-all group">
                            <step.icon className="w-8 h-8 text-[#004aad] group-hover:scale-110 transition-transform" />
                            <div>
                                <h5 className="font-black uppercase tracking-widest text-sm">{step.t}</h5>
                                <p className="text-zinc-500 text-xs mt-1 font-bold">{step.d}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>

        {/* [Part 2] System Guide - 퀘스트와 연동된 상세 설명 */}
        <section className="mb-40 lg:mb-72">
            <div className="text-center mb-20 lg:mb-32">
                <h3 className={subTitle + " mb-4"}>Play Rules</h3>
                <p className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter">How to Play UNFRAME 🎮</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                {[
                    { 
                        icon: Ghost, 
                        title: "Relationship", 
                        desc: "감상자에서 가족으로 가는 길",
                        detail: "공간에 머무르는 시간이 늘어날수록 당신의 등급이 Hello → Friend → Regular → Family로 진화합니다. 등급이 높을수록 아카이브 페이지에서 사용할 수 있는 특수한 기능들이 해제됩니다! 🛸"
                    },
                    { 
                        icon: Archive, 
                        title: "Sticker Book", 
                        desc: "기록되지 않은 취향은 흩어집니다",
                        detail: "특정한 행동(첫 하트, 100번 감상 등)을 할 때마다 숨겨진 스티커를 얻을 수 있습니다. 모든 스티커를 수집하여 UNFRAME의 진정한 마스터 아카이빙 컬렉터가 되어보세요. 🎨"
                    },
                    { 
                        icon: Sparkles, 
                        title: "Daily Play", 
                        desc: "매일매일 달라지는 오늘의 등수",
                        detail: "매일 접속 시 랜덤한 랭킹 테마(예: 심야의 감상자)가 주어집니다. 퀘스트를 완료하고 티어 카드를 발급받아 당신의 독특한 감상 페르소나를 세상에 공유하세요! 🏆"
                    },
                    { 
                        icon: Smartphone, 
                        title: "Install App", 
                        desc: "내 손안의 작은 갤러리",
                        detail: "사파리나 크롬 메뉴의 [홈 화면에 추가] 기능을 이용해 보세요. 브라우저 주소창 없이 오직 음악과 영상에만 집중할 수 있는 완벽한 몰입 환경을 만들어줍니다. 📱"
                    }
                ].map((item, i) => (
                    <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className={`${glass} p-10 lg:p-14 rounded-[3.5rem] flex flex-col gap-6 hover:bg-[#004aad]/5 transition-all group border-white/5`}>
                        <div className="w-14 h-14 bg-[#004aad]/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <item.icon className="w-7 h-7 text-[#004aad]" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter">{item.title}</h4>
                            <div className="h-0.5 w-10 bg-[#004aad] group-hover:w-full transition-all duration-700" />
                            <p className="text-white font-bold text-lg">{item.desc}</p>
                            <p className="text-zinc-500 text-sm lg:text-base leading-relaxed font-medium">{item.detail}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* [Part 3] Unframe Bridge - 포털 디자인 */}
        <section className="relative">
            <div className="absolute inset-0 bg-[#004aad]/10 blur-[120px] rounded-full" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className={`${glass} p-12 lg:p-32 rounded-[5rem] lg:rounded-[10rem] text-center space-y-12 relative overflow-hidden border-white/20`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#004aad] to-transparent" />
                
                <div className="space-y-6">
                    <span className={subTitle}>Enter the Nexus</span>
                    <h2 className="text-6xl lg:text-[10rem] font-black uppercase tracking-tighter leading-none italic">
                        Unframe<br/>
                        <span className="text-[#004aad] not-italic">Collective</span>
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-base lg:text-xl font-medium leading-relaxed">
                        플레이리스트는 시작일 뿐입니다. <br/>
                        언프레임이 제안하는 다양한 시각 예술과 출판(U#), <br/>
                        마스코트 프링의 이야기가 궁금하다면 메인 포털로 입장하세요. 🛸
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-6 pt-10">
                    <a href="https://unframe.kr" target="_blank" rel="noreferrer" className="px-12 py-7 bg-white text-black rounded-full font-black uppercase text-xs lg:text-sm tracking-[0.2em] hover:bg-[#004aad] hover:text-white transition-all flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                        Explore Portal <ExternalLink className="w-5 h-5" />
                    </a>
                    <a href="https://unframe.kr/project" target="_blank" rel="noreferrer" className="px-12 py-7 border border-white/20 rounded-full font-black uppercase text-xs lg:text-sm tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4">
                        Project Archive <MoveRight className="w-5 h-5" />
                    </a>
                </div>
            </motion.div>
        </section>

      </div>
    </motion.div>
  );
};

export default About;