import React, { useState } from 'react';
import { ScreenType, BattleModeType, MonsterData, MatchType } from './types';
import { TitleScreen } from './components/TitleScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { DrawScreen } from './components/DrawScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ModeSelectScreen } from './components/ModeSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { SavedMonstersModal } from './components/SavedMonstersModal';
import { OnlineLobbyScreen } from './components/OnlineLobbyScreen';
import { analyzeMonsterCanvas } from './utils/monsterAnalyzer';
import { sound } from './utils/sound';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('title');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getIsMuted());
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);

  // Player monster data
  const [playerMonster, setPlayerMonster] = useState<MonsterData | null>(null);

  // Selected battle mode & match type
  const [battleMode, setBattleMode] = useState<BattleModeType>('1vs1');
  const [matchType, setMatchType] = useState<MatchType>('bot');
  const [p2Monster, setP2Monster] = useState<MonsterData | null>(null);
  const [online, setOnline] = useState<{room:string;ws:WebSocket;player:number;monster:MonsterData;mode:BattleModeType;players:MonsterData[]}|null>(null);

  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
  };

  // When player finishes drawing on canvas
  const handleMonsterCreated = (canvas: HTMLCanvasElement, imageSrc: string) => {
    // Perform AI analysis on the drawn canvas pixels
    const analysis = analyzeMonsterCanvas(canvas);

    const monster: MonsterData = {
      id: `player_monster_${Date.now()}`,
      name: analysis.name,
      imageSrc,
      aspectRatio: analysis.aspectRatio,
      type: analysis.type,
      stats: analysis.stats,
      specialAbility: analysis.specialAbility,
      moves: analysis.moves,
      analysisReason: analysis.analysisReason,
      isPlayer: true,
      team: 0,
    };

    setPlayerMonster(monster);
    sound.playAnalysisChime();
    setCurrentScreen('analysis');
  };

  const handleUpdateMonster = (updated: MonsterData) => {
    setPlayerMonster(updated);
  };

  const handleSelectModeAndStart = (mode: BattleModeType, match: MatchType = 'bot', p2?: MonsterData) => {
    setBattleMode(mode);
    setMatchType(match);
    setP2Monster(p2 || null);
    setCurrentScreen('battle');
  };

  const handleSelectSavedMonster = (monster: MonsterData) => {
    setPlayerMonster(monster);
    if (currentScreen === 'title') {
      setCurrentScreen('mode_select');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans antialiased select-none">
      {currentScreen === 'title' && (
        <TitleScreen
          onStart={() => setCurrentScreen('draw')}
          onShowTutorial={() => setCurrentScreen('tutorial')}
          onOpenSavedMonsters={() => setIsSavedModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {currentScreen === 'tutorial' && (
        <TutorialScreen
          onBack={() => setCurrentScreen('title')}
          onProceedToDraw={() => setCurrentScreen('draw')}
        />
      )}

      {currentScreen === 'draw' && (
        <DrawScreen
          onBack={() => setCurrentScreen('title')}
          onMonsterCreated={handleMonsterCreated}
        />
      )}

      {currentScreen === 'analysis' && playerMonster && (
        <AnalysisScreen
          monster={playerMonster}
          onUpdateMonster={handleUpdateMonster}
          onProceedToModeSelect={() => setCurrentScreen('mode_select')}
          onRedraw={() => setCurrentScreen('draw')}
        />
      )}

      {currentScreen === 'mode_select' && playerMonster && (
        <ModeSelectScreen
          monster={playerMonster}
          onBack={() => setCurrentScreen('analysis')}
          onSelectModeAndStart={handleSelectModeAndStart}
          onOpenSavedMonsters={() => setIsSavedModalOpen(true)}
          onOnline={() => setCurrentScreen('online_lobby')}
        />
      )}

      {currentScreen === 'online_lobby' && playerMonster && (
        <OnlineLobbyScreen monster={playerMonster} onBack={() => setCurrentScreen('mode_select')} onBattle={(room, ws, player, selectedMonster, mode, players) => { setPlayerMonster(selectedMonster); setOnline({room,ws,player,monster:selectedMonster,mode,players}); setCurrentScreen('online_battle'); }} />
      )}

      {currentScreen === 'online_battle' && playerMonster && online && (
        <BattleScreen
          playerMonster={online.monster}
          mode={online.mode}
          matchType="online"
          onlinePlayers={online.players}
          localPlayerIndex={online.player}
          onlineWs={online.ws}
          onBackToModeSelect={() => { online.ws.close(); setOnline(null); setCurrentScreen('title'); }}
          onRedrawNewMonster={() => { online.ws.close(); setOnline(null); setCurrentScreen('draw'); }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {currentScreen === 'battle' && playerMonster && (
        <BattleScreen
          playerMonster={playerMonster}
          mode={battleMode}
          matchType={matchType}
          p2Monster={p2Monster}
          onBackToModeSelect={() => setCurrentScreen('mode_select')}
          onRedrawNewMonster={() => setCurrentScreen('draw')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Saved Monsters Storage Modal */}
      <SavedMonstersModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        onSelectMonster={handleSelectSavedMonster}
        currentMonsterId={playerMonster?.id}
      />
    </div>
  );
}
