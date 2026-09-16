import React from 'react';
import { ArrowLeft, Play, Palette, Sparkles, Trophy, Gamepad2, MousePointer } from 'lucide-react';
import { sound } from '../utils/sound';

interface TutorialScreenProps {
  onBack: () => void;
  onProceedToDraw: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onBack, onProceedToDraw }) => {
  const steps = [
    {
      num: '1',
      title: 'モンスターを描く',
      desc: 'キャンバスに自由にモンスターを描きます。色・太さ・透明度を調整して思い思いのモンスターを誕生させよう！',
      icon: Palette,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      num: '2',
      title: 'AIが分析・ステータス決定',
      desc: '描いた色、面積、密度、縦横比からAIが属性（炎・水・草・雷など）、HP・攻撃・防御・素早さ・技を判定！描いた絵そのものが使われます。',
      icon: Sparkles,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      num: '3',
      title: 'バトルモードを選ぶ',
      desc: '1vs1の真剣勝負、4人全員が敵の「1vs1vs1vs1」乱戦サバイバル、味方Botと共闘する「2vs2」チーム戦から選択！',
      icon: Trophy,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      num: '4',
      title: '広大な3Dフィールドでバトル！',
      desc: '3Dトレーナーを操作して移動！あなたの描いた2Dモンスターが3D空間を駆け抜け、3Dエフェクトを放ちながら敵を討伐します。',
      icon: Gamepad2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none">
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <button
          id="tutorial-back-btn"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>タイトルへ戻る</span>
        </button>

        <h2 className="text-xl font-black text-amber-300">ゲームの流れ＆操作ガイド</h2>
        <div className="w-20" />
      </header>

      <main className="max-w-4xl w-full mx-auto py-8">
        {/* 4 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start shadow-md"
              >
                <div className={`w-12 h-12 rounded-xl border flex-shrink-0 flex items-center justify-center ${step.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    STEP 0{step.num}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls Guide */}
        <div className="bg-indigo-950/40 border border-indigo-900/60 rounded-2xl p-5 mb-8">
          <h4 className="text-sm font-extrabold text-indigo-200 mb-4 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
            <span>3Dフィールドでの操作方法</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-medium">トレーナー移動</span>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-amber-300">W / A / S / D</span>
                <span className="text-slate-500 py-1">or</span>
                <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-amber-300">↑ ← ↓ →</span>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-medium">カメラ視点回転</span>
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-cyan-300 flex items-center gap-1">
                <MousePointer className="w-3 h-3" /> マウスドラッグ / スワイプ
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-medium">ズームイン / アウト</span>
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-cyan-300">
                マウスホイール
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-medium">技発動（手動 / 自動）</span>
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-rose-300">
                画面上の技ボタン / オート切替
              </span>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            id="tutorial-start-draw-btn"
            onClick={() => {
              sound.playClick();
              onProceedToDraw();
            }}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>モンスター作成へ進む</span>
          </button>
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 py-2">
        ステップを確認したら、早速オリジナルモンスターを描いてみましょう！
      </footer>
    </div>
  );
};
