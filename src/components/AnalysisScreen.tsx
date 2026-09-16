import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Swords,
  Shield,
  Zap,
  Heart,
  Edit2,
  Check,
  Flame,
  Droplets,
  Leaf,
  Moon,
  Sun,
  Mountain,
  Wind,
  Save,
  BookmarkCheck,
} from 'lucide-react';
import { MonsterData, ElementType } from '../types';
import { sound } from '../utils/sound';
import { saveMonsterToStorage } from '../utils/storage';

interface AnalysisScreenProps {
  monster: MonsterData;
  onUpdateMonster: (updated: MonsterData) => void;
  onProceedToModeSelect: () => void;
  onRedraw: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  monster,
  onUpdateMonster,
  onProceedToModeSelect,
  onRedraw,
}) => {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>(monster.name);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Auto-save on initial load
  useEffect(() => {
    saveMonsterToStorage(monster);
    setIsSaved(true);
  }, [monster.id]);

  const handleManualSave = () => {
    saveMonsterToStorage(monster);
    setIsSaved(true);
    sound.playBuff();
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      const updated = { ...monster, name: editedName.trim() };
      onUpdateMonster(updated);
      saveMonsterToStorage(updated);
      setIsSaved(true);
    }
    setIsEditingName(false);
    sound.playClick();
  };

  const getElementBadge = (type: ElementType) => {
    switch (type) {
      case '炎':
        return {
          icon: Flame,
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          gradient: 'from-orange-500 to-rose-600',
        };
      case '水':
        return {
          icon: Droplets,
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          gradient: 'from-sky-500 to-blue-600',
        };
      case '草':
        return {
          icon: Leaf,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          gradient: 'from-emerald-500 to-green-600',
        };
      case '雷':
        return {
          icon: Zap,
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          gradient: 'from-amber-400 to-yellow-600',
        };
      case '闇':
        return {
          icon: Moon,
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          gradient: 'from-purple-500 to-indigo-600',
        };
      case '光':
        return {
          icon: Sun,
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          gradient: 'from-cyan-400 to-teal-500',
        };
      case '地':
        return {
          icon: Mountain,
          bg: 'bg-amber-700/20 text-amber-400 border-amber-700/30',
          gradient: 'from-amber-600 to-yellow-800',
        };
      case '風':
        return {
          icon: Wind,
          bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          gradient: 'from-teal-400 to-emerald-600',
        };
    }
  };

  const badge = getElementBadge(monster.type);
  const ElementIcon = badge.icon;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          id="analysis-back-btn"
          onClick={() => {
            sound.playClick();
            onRedraw();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>描き直す</span>
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <h2 className="text-lg font-black text-amber-300">AI分析結果鑑定書</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-save-monster-box"
            onClick={handleManualSave}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'セーブBOX保存済' : 'セーブBOXに保存'}</span>
          </button>

          <button
            id="proceed-to-mode-btn"
            onClick={() => {
              sound.playClick();
              onProceedToModeSelect();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>バトルモード選択へ</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-5xl w-full mx-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exact Drawn Image Display */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col items-center relative overflow-hidden">
            {/* Subtle glow circle matching element */}
            <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${badge.gradient}`} />

            <div className="text-xs font-bold text-slate-400 mb-2 w-full flex items-center justify-between">
              <span>手描きモンスター（実体）</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">2D Original Art</span>
            </div>

            {/* Image Frame with checkerboard */}
            <div className="w-full aspect-square bg-slate-800/80 rounded-xl border border-slate-700 p-4 flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
                  backgroundSize: `20px 20px`,
                }}
              />
              <img
                src={monster.imageSrc}
                alt={monster.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] relative z-10 transition-transform hover:scale-105"
              />
            </div>

            {/* AI Reasoning Note */}
            <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed w-full">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI鑑定レポート</span>
              </div>
              <p>{monster.analysisReason}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Name, Stats, Ability, Moves */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Monster Name & Element Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">モンスター名</div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-lg font-black text-amber-300 outline-none w-48"
                    maxLength={14}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-white">{monster.name}</h3>
                  <button
                    onClick={() => {
                      setIsEditingName(true);
                      sound.playClick();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="名前を変更"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Type Badge */}
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm ${badge.bg}`}>
              <ElementIcon className="w-4 h-4" />
              <span>{monster.type} タイプ</span>
            </div>
          </div>

          {/* Core Stats (HP up to 2000, ATK/DEF/SPD up to 1000) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>ステータスパラメーター</span>
              <span className="text-[10px] text-amber-400 font-mono">MAX: HP 2000 / 攻撃・防御・速さ 1000</span>
            </h4>

            <div className="space-y-3">
              {/* HP */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Heart className="w-3.5 h-3.5" /> HP（体力）
                  </span>
                  <span className="font-mono text-emerald-300">{monster.stats.hp} / 2000</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (monster.stats.hp / 2000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Attack */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Swords className="w-3.5 h-3.5" /> 攻撃力 (ATK)
                  </span>
                  <span className="font-mono text-rose-300">{monster.stats.attack} / 1000</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (monster.stats.attack / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Defense */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Shield className="w-3.5 h-3.5" /> 防御力 (DEF)
                  </span>
                  <span className="font-mono text-blue-300">{monster.stats.defense} / 1000</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (monster.stats.defense / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Speed */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Zap className="w-3.5 h-3.5" /> 素早さ (SPD)
                  </span>
                  <span className="font-mono text-amber-300">{monster.stats.speed} / 1000</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (monster.stats.speed / 1000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Special Ability Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">特殊能力</div>
              <div className="text-sm font-extrabold text-white">{monster.specialAbility.name}</div>
              <div className="text-xs text-slate-300 mt-0.5">{monster.specialAbility.description}</div>
            </div>
          </div>

          {/* Moves Cards (4 Moves: Basic, Heavy, Support, Chaos) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">習得技リスト（全4種・100種以上のプールから厳選）</h4>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                特殊能力効果つき
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monster.moves.map((move, idx) => {
                const isChaos = move.category === 'chaos';
                const isStatus = move.category === 'status';

                return (
                  <div
                    key={move.id}
                    className={`rounded-xl p-3.5 flex flex-col justify-between border transition-all ${
                      isChaos
                        ? 'bg-gradient-to-br from-rose-950/40 via-purple-950/40 to-slate-900 border-rose-500/40 shadow-sm shadow-rose-900/30'
                        : isStatus
                        ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                              isChaos
                                ? 'bg-rose-500 text-white animate-pulse'
                                : isStatus
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isChaos ? '禁忌' : isStatus ? '変化' : `技${idx + 1}`}
                          </span>
                          {move.targetScope === 'all_enemies' && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-900 text-purple-300 border border-purple-500/50">
                              全体攻撃
                            </span>
                          )}
                          {move.targetScope === 'all_allies' && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-teal-900 text-teal-300 border border-teal-500/50">
                              味方全体
                            </span>
                          )}
                          {move.isSynergyCombo && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-900 text-cyan-300 border border-cyan-500/50">
                              連携コンボ
                            </span>
                          )}
                          {(Boolean(move.healRatio) || move.description.includes('回復')) && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-900 text-emerald-300 border border-emerald-500/50">
                              HP回復
                            </span>
                          )}
                          {move.specialEffect && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-900/80 text-amber-300 border border-amber-500/50">
                              ✨ {move.specialEffect.description}
                            </span>
                          )}
                          <span className={`text-xs font-black ${isChaos ? 'text-rose-300' : 'text-white'}`}>
                            {move.name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isChaos
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black'
                              : isStatus
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-amber-300'
                          }`}
                        >
                          {move.power > 0 ? `威力 ${move.power}` : '変化/補助'}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-snug mb-2 ${isChaos ? 'text-rose-200/90' : 'text-slate-400'}`}>
                        {move.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5">
                      <span>属性: {move.type}</span>
                      <span>命中: {move.accuracy}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto flex justify-between items-center py-2 text-xs text-slate-500 border-t border-slate-800">
        <span>ステータス確認完了後、「バトルモード選択へ」を押してください。</span>
        <button
          onClick={onProceedToModeSelect}
          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
        >
          <span>次へ進む</span>
          <span>→</span>
        </button>
      </footer>
    </div>
  );
};
