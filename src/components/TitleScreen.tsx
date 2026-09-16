import React from 'react';
import { Play, BookOpen, Volume2, VolumeX, Sparkles, Swords, Palette, Users, FolderOpen } from 'lucide-react';
import { sound } from '../utils/sound';

interface TitleScreenProps {
  onStart: () => void;
  onShowTutorial: () => void;
  onOpenSavedMonsters: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onShowTutorial,
  onOpenSavedMonsters,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Dynamic Background Light Orbs */}
      <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Swords className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <span className="font-extrabold tracking-wider text-sm text-slate-300">
            AI MONSTER BATTLE 3D
          </span>
        </div>

        <button
          id="toggle-sound-btn"
          onClick={() => {
            onToggleMute();
            sound.playClick();
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-2 text-xs font-semibold transition-colors"
          title={isMuted ? 'サウンドをON' : 'ミュート'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'BGM/SE: OFF' : 'BGM/SE: ON'}</span>
        </button>
      </header>

      {/* Center Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-6 text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium mb-6 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>描いた絵そのものが3D空間を駆け回る新体験</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 drop-shadow-sm">
          AIモンスターバトル 3D
        </h1>

        <p className="max-w-xl text-slate-300 text-sm sm:text-base mb-8 leading-relaxed">
          キャンバスに描いたあなたのイラストがそのまま2Dモンスターとして3Dフィールドに召喚！
          AIが色彩・密度・形状を分析し、属性やステータスを即時決定。
          3Dトレーナーを操作してBotとリアルタイム大迫力バトル！
        </p>

        {/* Feature Pill Highlights */}
        <div className="grid grid-cols-3 gap-3 max-w-lg w-full mb-10 text-xs text-slate-300 font-medium">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center gap-1.5 shadow-sm">
            <Palette className="w-4 h-4 text-rose-400" />
            <span>描いた絵そのまま</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center gap-1.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AIステータス分析</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center gap-1.5 shadow-sm">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>1vs1 / 4人乱戦 / 2vs2</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            id="title-start-btn"
            onClick={() => {
              sound.playClick();
              onStart();
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-lg shadow-xl shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>GAME START（モンスターを描く）</span>
          </button>

          <button
            id="title-saved-monsters-btn"
            onClick={() => {
              sound.playClick();
              onOpenSavedMonsters();
            }}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 font-bold text-base transition-all hover:scale-102 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <span>セーブデータBOX</span>
          </button>

          <button
            id="title-tutorial-btn"
            onClick={() => {
              sound.playClick();
              onShowTutorial();
            }}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-base transition-all hover:scale-102 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>あそびかた</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-500">
        AIモンスターバトル 3D • 160×160 Large Stadium Arena • Powered by Three.js
      </footer>
    </div>
  );
};
