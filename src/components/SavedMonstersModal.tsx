import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Trash2,
  Check,
  Play,
  Heart,
  Swords,
  Shield,
  Zap,
  Sparkles,
  Calendar,
  FolderOpen,
} from 'lucide-react';
import { MonsterData, SavedMonsterEntry } from '../types';
import { getSavedMonsters, deleteSavedMonster, saveMonsterToStorage } from '../utils/storage';
import { sound } from '../utils/sound';

interface SavedMonstersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMonster: (monster: MonsterData) => void;
  currentMonsterId?: string;
}

export const SavedMonstersModal: React.FC<SavedMonstersModalProps> = ({
  isOpen,
  onClose,
  onSelectMonster,
  currentMonsterId,
}) => {
  const [savedList, setSavedList] = useState<SavedMonsterEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SavedMonsterEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const list = getSavedMonsters();
      setSavedList(list);
      if (list.length > 0) {
        const found = currentMonsterId
          ? list.find((m) => m.id === currentMonsterId) || list[0]
          : list[0];
        setSelectedEntry(found);
      } else {
        setSelectedEntry(null);
      }
    }
  }, [isOpen, currentMonsterId]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playFaint();
    const updated = deleteSavedMonster(id);
    setSavedList(updated);
    if (selectedEntry?.id === id) {
      setSelectedEntry(updated.length > 0 ? updated[0] : null);
    }
    setDeleteConfirmId(null);
  };

  const handleSelect = (entry: SavedMonsterEntry) => {
    sound.playClick();
    setSelectedEntry(entry);
  };

  const handleConfirmAndDeploy = () => {
    if (!selectedEntry) return;
    sound.playVictory();
    onSelectMonster(selectedEntry.monster);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                モンスターセーブデータBOX
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {savedList.length}体
                </span>
              </h3>
              <p className="text-xs text-slate-400">描いたモンスターを切り替えて出撃できます</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left List, Right Detail */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Monster List (Left column) */}
          <div className="md:col-span-5 p-3 sm:p-4 overflow-y-auto border-r border-slate-800/80 space-y-2 max-h-[40vh] md:max-h-[62vh]">
            {savedList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                保存されたモンスターはいません
              </div>
            ) : (
              savedList.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                const winRate =
                  entry.battles && entry.battles > 0
                    ? Math.round(((entry.wins || 0) / entry.battles) * 100)
                    : 0;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleSelect(entry)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/50 hover:bg-slate-800/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    {/* Drawing Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center flex-shrink-0">
                      <img
                        src={entry.monster.imageSrc}
                        alt={entry.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-sm text-white truncate">{entry.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-amber-300">
                          {entry.monster.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>HP {entry.monster.stats.maxHp}</span>
                        <span>ATK {entry.monster.stats.attack}</span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 text-amber-400">
                          <Trophy className="w-3 h-3" />
                          {entry.wins || 0}勝 / {entry.battles || 0}戦 ({winRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="flex items-center pl-1">
                      {deleteConfirmId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold"
                          >
                            削除
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="px-1.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(entry.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Monster Detail (Right column) */}
          <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto max-h-[45vh] md:max-h-[62vh] flex flex-col justify-between bg-slate-950/30">
            {selectedEntry ? (
              <div className="space-y-4">
                {/* Header card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-700 p-2 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <img
                      src={selectedEntry.monster.imageSrc}
                      alt={selectedEntry.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-black text-white">{selectedEntry.name}</h4>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {selectedEntry.monster.type}属性
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {selectedEntry.monster.analysisReason || selectedEntry.monster.specialAbility?.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {selectedEntry.wins || 0}勝 / {selectedEntry.battles || 0}戦
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedEntry.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scaled Stats Bars */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    ステータス (HP Max 2000 / 能力値 Max 1000)
                  </div>

                  {/* HP */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Heart className="w-3.5 h-3.5" /> HP
                      </span>
                      <span className="text-white font-bold">{selectedEntry.monster.stats.maxHp} / 2000</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (selectedEntry.monster.stats.maxHp / 2000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Attack */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <Swords className="w-3.5 h-3.5" /> 攻撃 (ATK)
                      </span>
                      <span className="text-white font-bold">{selectedEntry.monster.stats.attack} / 1000</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min(100, (selectedEntry.monster.stats.attack / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Defense */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-sky-400 flex items-center gap-1 font-bold">
                        <Shield className="w-3.5 h-3.5" /> 防御 (DEF)
                      </span>
                      <span className="text-white font-bold">{selectedEntry.monster.stats.defense} / 1000</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${Math.min(100, (selectedEntry.monster.stats.defense / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <Zap className="w-3.5 h-3.5" /> 素早さ (SPD)
                      </span>
                      <span className="text-white font-bold">{selectedEntry.monster.stats.speed} / 1000</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, (selectedEntry.monster.stats.speed / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Moves */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">修得技 (4種)</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEntry.monster.moves.map((move) => (
                      <div
                        key={move.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-200 truncate">{move.name}</span>
                          <span className="text-[10px] font-mono text-amber-400 shrink-0">
                            {move.power > 0 ? `力${move.power}` : '変化'}
                          </span>
                        </div>
                        {move.specialEffect && (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30 truncate mb-1">
                            ✨ {move.specialEffect.description}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 line-clamp-1">{move.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                モンスターを選択してください
              </div>
            )}

            {/* Bottom Action */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                キャンセル
              </button>
              <button
                id="btn-deploy-saved-monster"
                disabled={!selectedEntry}
                onClick={handleConfirmAndDeploy}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-900/40 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>このモンスターで出撃！</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
