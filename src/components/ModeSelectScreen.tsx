import React, { useState, useEffect } from 'react';
import { ArrowLeft, Swords, Users, Crown, Trophy, FolderOpen, Bot, UserCheck, Sparkles, Compass, Target, ShieldCheck } from 'lucide-react';
import { BattleModeType, MatchType, MonsterData, SavedMonsterEntry } from '../types';
import { sound } from '../utils/sound';
import { generateBotMonster } from '../utils/monsterAnalyzer';

interface ModeSelectScreenProps {
  monster: MonsterData;
  onBack: () => void;
  onSelectModeAndStart: (mode: BattleModeType, matchType: MatchType, p2Monster?: MonsterData) => void;
  onOpenSavedMonsters?: () => void;
  onOnline?: () => void;
}

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  monster,
  onBack,
  onSelectModeAndStart,
  onOpenSavedMonsters,
  onOnline,
}) => {
  const [selectedMode, setSelectedMode] = useState<BattleModeType>('1vs1');
  const [matchType, setMatchType] = useState<MatchType>('bot');
  const [savedMonsters, setSavedMonsters] = useState<SavedMonsterEntry[]>([]);
  const [selectedP2Monster, setSelectedP2Monster] = useState<MonsterData | null>(null);

  // Load saved monsters for P2 selection if playing PvP
  useEffect(() => {
    try {
      const raw = localStorage.getItem('saved_monsters_v1');
      if (raw) {
        const parsed: SavedMonsterEntry[] = JSON.parse(raw);
        // Exclude current player monster if possible
        const others = parsed.filter(m => m.id !== monster.id);
        setSavedMonsters(others.length > 0 ? others : parsed);
      }
    } catch {
      // ignore
    }
  }, [monster.id]);

  // Default P2 monster if not set
  useEffect(() => {
    if (!selectedP2Monster) {
      if (savedMonsters.length > 0) {
        setSelectedP2Monster(savedMonsters[0].monster);
      } else {
        // Fallback quick preset monster for P2
        setSelectedP2Monster(generateBotMonster('雷', 1, 1));
      }
    }
  }, [savedMonsters, selectedP2Monster]);

  const modes: {
    id: BattleModeType;
    title: string;
    sub: string;
    description: string;
    badge: string;
    icon: typeof Swords;
    accent: string;
    border: string;
    details: string[];
  }[] = [
    {
      id: '1vs1',
      title: '1 vs 1 シングル決闘',
      sub: matchType === 'bot' ? 'プレイヤー vs ライバルBot' : 'P1 vs P2 (フレンド直接対決)',
      description: '1対1の真剣勝負。毎ターン決まる移動力で間合いを詰め、射程内の敵へ技を放ってターンエンド！',
      badge: 'シングル決闘',
      icon: Swords,
      accent: 'from-blue-500 to-indigo-600 text-blue-300',
      border: 'border-blue-500/40 hover:border-blue-400',
      details: ['参加者: 2名', 'チーム: 1 vs 1', '勝敗条件: 相手モンスターのHPを0にする'],
    },
    {
      id: '2vs2',
      title: '2 vs 2 チームタッグ戦',
      sub: matchType === 'bot' ? 'プレイヤー + 味方Bot vs 敵Bot 2体' : 'P1チーム vs P2チーム',
      description: '2対2の白熱チームバトル！味方と役割分担し、50種以上の特性と移動戦術を駆使して敵チームを制圧せよ！',
      badge: 'チーム戦',
      icon: Users,
      accent: 'from-emerald-500 to-teal-600 text-emerald-300',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      details: ['参加者: 4名', 'チーム: 2 vs 2', '勝敗条件: 敵チームのモンスターを全滅させる'],
    },
    {
      id: '1vs1vs1vs1',
      title: '4人乱戦サバイバル',
      sub: '4人全員が敵！バトルロイヤル',
      description: '四つ巴の大激突！敵同士の射程外から漁夫の利を狙うか、一気に切り込むか？！最後の1体になるまで生き残れ！',
      badge: '大乱戦',
      icon: Crown,
      accent: 'from-amber-500 to-rose-600 text-amber-300',
      border: 'border-amber-500/40 hover:border-amber-400',
      details: ['参加者: 4名', 'チーム: 全員孤立', '勝敗条件: 最後の1体になるまで生き残る'],
    },
  ];

  const handleStart = () => {
    sound.playClick();
    onSelectModeAndStart(selectedMode, matchType, selectedP2Monster || undefined);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          id="mode-back-btn"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>鑑定書へ戻る</span>
        </button>

        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-black text-white">バトル設定＆モード選択</h2>
        </div>

        {/* Player Monster Mini Pill & Saved Monsters Switch Button */}
        <div className="flex items-center gap-2">
          {onOpenSavedMonsters && (
            <button
              id="mode-open-saved-btn"
              onClick={() => {
                sound.playClick();
                onOpenSavedMonsters();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>モンスター交代</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <img
              src={monster.imageSrc}
              alt={monster.name}
              className="w-7 h-7 object-contain rounded bg-slate-800 p-0.5"
            />
            <div className="text-left text-xs">
              <div className="font-extrabold text-amber-300 leading-none">{monster.name}</div>
              <div className="text-[10px] text-slate-400">{monster.type} / HP {monster.stats.hp}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto py-6">
        {/* Match Type Switch (VS Bot vs VS Human / PvP) */}
        <div className="mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>対戦相手タイプの選択</span>
            </div>
            <div className="text-sm font-bold text-white">
              {matchType === 'bot'
                ? '🤖 VS ボット戦（CPU）: AIが操作するモンスターと1人で対戦！'
                : '👥 VS 対人戦（フレンド対戦）: 1台の端末でP1とP2が交代操作！自作モンスター同士の直接激突！'}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <button
              id="match-type-bot-btn"
              onClick={() => {
                sound.playClick();
                setMatchType('bot');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                matchType === 'bot'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>VS ボット (CPU)</span>
            </button>
            <button
              id="match-type-pvp-btn"
              onClick={() => {
                sound.playClick();
                setMatchType('pvp');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                matchType === 'pvp'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>VS 対人戦 (フレンド)</span>
            </button>
          </div>
        </div>

        {onOnline && (
          <button onClick={() => { sound.playClick(); onOnline(); }} className="w-full mb-5 p-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 border border-cyan-300/30 text-white font-black text-lg shadow-xl hover:scale-[1.01] transition-transform">🌐 友だちとオンライン対戦（ルームコード）</button>
        )}

        {/* Tactical Rules & Flow Explainer Banner */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white mb-0.5">🎲 毎ターンランダム移動</div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                ターン開始時に素早さ＋ダイスで移動可能距離が決定。3Dフィールドを自由にポジショニング！
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white mb-0.5">🎯 攻撃射程と間合い</div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                近接(10m)・中距離(22m)・遠距離(35m)・全体(∞)の射程リングが存在。間合いを詰めてロックオン！
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white mb-0.5">✨ 50種類以上の多様な特性</div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                ピンチ覚醒、急所強化、移動力増強、自動再生など、多彩な特性が戦局を一変させる！
              </div>
            </div>
          </div>
        </div>

        {/* P2 Monster Selection (Only when PvP mode is active) */}
        {matchType === 'pvp' && (
          <div className="mb-6 bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-300">Player 2（フレンド）の出撃モンスターを選択</span>
              </div>
              <span className="text-[11px] text-slate-400">セーブBOXのモンスターまたはプリセットから選択</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* If saved monsters exist, show them */}
              {savedMonsters.slice(0, 4).map((entry) => {
                const isSelected = selectedP2Monster?.id === entry.monster.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedP2Monster(entry.monster);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-rose-950/60 border-rose-400 shadow-md ring-1 ring-rose-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={entry.monster.imageSrc}
                      alt={entry.monster.name}
                      className="w-10 h-10 object-contain rounded bg-slate-900 p-0.5"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-white truncate">{entry.monster.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {entry.monster.type} / HP {entry.monster.stats.hp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Presets for P2 */}
              {[
                { name: '炎獄竜ヴォルカ', type: '炎' as const },
                { name: '蒼海獣リヴァイア', type: '水' as const },
                { name: '迅雷翼ライガ', type: '雷' as const },
              ].map((preset, idx) => {
                const isSelected = selectedP2Monster?.name === preset.name;
                return (
                  <div
                    key={preset.name}
                    onClick={() => {
                      sound.playClick();
                      const m = generateBotMonster(preset.type, idx + 1, 1);
                      m.name = preset.name;
                      setSelectedP2Monster(m);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-rose-950/60 border-rose-400 shadow-md ring-1 ring-rose-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center font-black text-amber-300 text-sm">
                      {preset.type}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-white truncate">{preset.name}</div>
                      <div className="text-[10px] text-slate-400">プリセット対戦用</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;

            return (
              <div
                key={mode.id}
                id={`mode-card-${mode.id}`}
                onClick={() => {
                  sound.playClick();
                  setSelectedMode(mode.id);
                }}
                className={`relative rounded-2xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `bg-slate-900 shadow-2xl scale-102 ${mode.border} ring-2 ring-amber-400/50`
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r ${mode.accent} text-white shadow-sm`}
                    >
                      {mode.badge}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white mb-1">{mode.title}</h3>
                  <div className="text-xs font-semibold text-amber-300 mb-3">{mode.sub}</div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-5">{mode.description}</p>
                </div>

                {/* Details list */}
                <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs text-slate-400">
                  {mode.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full shadow-md">
                    選択中
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Start 3D Battle Button */}
        <div className="flex justify-center">
          <button
            id="start-3d-battle-btn"
            onClick={handleStart}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-lg shadow-2xl shadow-rose-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
          >
            <Swords className="w-6 h-6" />
            <span>
              {matchType === 'bot'
                ? '3Dスタジアムへ出撃！（ボット対戦）'
                : 'P1 vs P2 フレンド対戦を開始する！'}
            </span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 py-3 border-t border-slate-800">
        自分自身がモンスターになって戦場を移動！広大なアリーナで射程を見極め、多彩な特性を活かして勝利を掴みましょう。
      </footer>
    </div>
  );
};
