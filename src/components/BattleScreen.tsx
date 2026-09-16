import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Zap,
  Heart,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Trophy,
  Skull,
  Crosshair,
  ArrowLeft,
  Target,
  Compass,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Bot,
} from 'lucide-react';
import { BattleModeType, BattleParticipant, MonsterData, BattleLogEntry, Move, MatchType } from '../types';
import { BattleArenaScene } from './three/BattleArenaScene';
import { generateBotMonster } from '../utils/monsterAnalyzer';
import { sound } from '../utils/sound';
import { recordBattleStats } from '../utils/storage';

interface BattleScreenProps {
  playerMonster: MonsterData;
  mode: BattleModeType;
  matchType?: MatchType;
  p2Monster?: MonsterData | null;
  onBackToModeSelect: () => void;
  onRedrawNewMonster: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onlinePlayers?: MonsterData[];
  localPlayerIndex?: number;
  onlineWs?: WebSocket | null;
}

interface FloatingDamage {
  id: string;
  x: number;
  y: number;
  damage: number | string;
  isCritical: boolean;
  color?: string;
}

type TurnPhase = 'TACTICAL_CONTROL' | 'EXECUTING' | 'GAME_OVER';

const getMoveCooldown = (move: Move) => {
  // 拘束・行動/移動制限は連続ハメ防止で重いCT。
  if (/拘束|移動不能|凍結|麻痺|ネット|根縛|停止/.test(`${move.name} ${move.description}`) || move.effectType === 'time_stop') return Math.max(6, Math.round(move.cooldown ?? 6));
  if (/カウンター/.test(move.name) || move.effectType === 'decoy_clone') return Math.max(6, Math.round(move.cooldown ?? 6));
  if (Number.isFinite(move.cooldown) && (move.cooldown ?? 0) > 0) return Math.min(5, Math.max(1, Math.round(move.cooldown!)));
  if (move.power >= 90) return 3;
  if (move.power >= 70) return 2;
  return 1;
};

const getMoveEnergyCost = (move: Move) => {
  if (move.category === 'chaos') return 40;
  if (/マジックウォール/.test(move.name)) return 40;
  if (/バリア/.test(move.name)) return 30;
  if (/エナジーシールド/.test(move.name)) return 20;
  if (/薄い結界/.test(move.name)) return 10;
  if (move.power >= 70) return 20;
  return 10;
};

const getShieldGain = (move: Move) => {
  if (/薄い結界/.test(move.name)) return 50;
  if (/エナジーシールド/.test(move.name)) return 100;
  if (/マジックウォール/.test(move.name)) return 200;
  if (/バリア/.test(move.name)) return 150;
  return 0;
};


export const BattleScreen: React.FC<BattleScreenProps> = ({
  playerMonster,
  mode,
  matchType = 'bot',
  p2Monster,
  onBackToModeSelect,
  onRedrawNewMonster,
  isMuted,
  onToggleMute,
  onlinePlayers,
  localPlayerIndex = 0,
  onlineWs = null,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BattleArenaScene | null>(null);

  // Participants
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const participantsRef = useRef<BattleParticipant[]>([]);
  participantsRef.current = participants;

  // Turn management ("移動して攻撃したらターン終了")
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('TACTICAL_CONTROL');

  // Turn refs: async CPU actions must never use an old React render's turn index.
  const turnOrderRef = useRef<string[]>([]);
  const currentTurnIndexRef = useRef<number>(0);
  const roundNumberRef = useRef<number>(1);
  const turnEpochRef = useRef<number>(0);
  const lastStartedTurnRef = useRef<string>('');
  const activeTurnIdRef = useRef<string>('');

  // Movement & Range states
  const [turnMaxDist, setTurnMaxDist] = useState<number>(18);
  const [turnRemainingDist, setTurnRemainingDist] = useState<number>(18);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number>(0);
  const [targetId, setTargetId] = useState<string>('');

  // Game End & Feedback
  const [isBattleOver, setIsBattleOver] = useState<boolean>(false);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);

  // Projected 2D screen positions for HUD bars
  const [screenHuds, setScreenHuds] = useState<{ id: string; x: number; y: number; visible: boolean }[]>([]);

  const addLog = useCallback((text: string, type: 'attack' | 'damage' | 'faint' | 'info' | 'critical' | 'chaos' = 'info') => {
    const entry: BattleLogEntry = {
      id: `${Date.now()}_${Math.random()}`,
      text,
      type,
      timestamp: Date.now(),
    };
    setBattleLogs((prev) => [entry, ...prev.slice(0, 35)]);
  }, []);

  // Show floating damage numbers
  const showDamageNumber = (target: BattleParticipant, damage: number | string, isCrit: boolean, customColor?: string) => {
    if (!sceneRef.current) return;
    const coords = sceneRef.current.getScreenCoordinates(target.position, 6.5);
    const newDamage: FloatingDamage = {
      id: `dmg_${Date.now()}_${Math.random()}`,
      x: coords.x,
      y: coords.y,
      damage,
      isCritical: isCrit,
      color: customColor,
    };
    setFloatingDamages((prev) => [...prev, newDamage]);
    setTimeout(() => {
      setFloatingDamages((prev) => prev.filter((d) => d.id !== newDamage.id));
    }, 1400);
  };

  // 1. Initialize Participants
  const initializeParticipants = useCallback(() => {
    const initialList: BattleParticipant[] = [];

    // ONLINE: use the exact same BattleScreen rules/arena as BOT battle.
    // Only ownership differs; every participant is a real player.
    if (matchType === 'online' && onlinePlayers && onlinePlayers.length) {
      const pos = mode === '1vs1'
        ? [{x:0,z:16},{x:0,z:-16}]
        : mode === '2vs2'
          ? [{x:-10,z:16},{x:-10,z:-16},{x:10,z:16},{x:10,z:-16}]
          : [{x:0,z:18},{x:0,z:-18},{x:-18,z:0},{x:18,z:0}];
      onlinePlayers.forEach((m,i)=>{
        const team = mode === '2vs2' ? (Number.isFinite(m.team) ? m.team : i % 2) : i;
        initialList.push({id:`online_${i}`,monster:m,team,isPlayer:i===localPlayerIndex,isPlayer2:false,playerIndex:i,currentHp:Math.min(1800,m.stats.hp),maxHp:Math.min(1800,m.stats.hp),attackBuff:1,defenseBuff:1,speedBuff:1,isFainted:false,energy:0,shield:0,moveCooldowns:[0,0,0,0],statuses:[],position:{x:pos[i].x,y:0,z:pos[i].z},rotation:pos[i].z<0?Math.PI:0,maxMoveDistance:18,remainingMoveDistance:18,turnStartPosition:{x:pos[i].x,y:0,z:pos[i].z},isBot:false});
      });
      return initialList;
    }

    // Participant 1: Player 1 Monster
    initialList.push({
      id: 'player_1',
      monster: playerMonster,
      team: 0,
      isPlayer: true,
      currentHp: Math.min(1800, playerMonster.stats.hp),
      maxHp: Math.min(1800, playerMonster.stats.hp),
      attackBuff: 1.0,
      defenseBuff: 1.0,
      speedBuff: 1.0,
      isFainted: false,
      energy: 0,
      shield: 0,
      moveCooldowns: [0, 0, 0, 0],
      statuses: [],
      position: { x: 0, y: 0, z: 16 },
      rotation: 0,
      maxMoveDistance: 18,
      remainingMoveDistance: 18,
      turnStartPosition: { x: 0, y: 0, z: 16 },
      isBot: false,
      isPlayer2: false,
    });

    if (mode === '1vs1') {
      const isPvP = matchType === 'pvp';
      const p2Data = isPvP && p2Monster ? p2Monster : generateBotMonster('炎', 1, 1);
      initialList.push({
        id: 'enemy_1',
        monster: p2Data,
        team: 1,
        isPlayer: false,
        currentHp: Math.min(1800, p2Data.stats.hp),
        maxHp: Math.min(1800, p2Data.stats.hp),
        attackBuff: 1.0,
        defenseBuff: 1.0,
        speedBuff: 1.0,
        isFainted: false,
        energy: 0,
        shield: 0,
        moveCooldowns: [0, 0, 0, 0],
        statuses: [],
        position: { x: 0, y: 0, z: -16 },
        rotation: Math.PI,
        maxMoveDistance: 18,
        remainingMoveDistance: 18,
        turnStartPosition: { x: 0, y: 0, z: -16 },
        isBot: !isPvP,
        isPlayer2: isPvP,
      });
    } else if (mode === '2vs2') {
      // Ally for Team 0
      const ally = generateBotMonster('草', 1, 0);
      initialList.push({
        id: 'ally_1',
        monster: ally,
        team: 0,
        isPlayer: false,
        currentHp: Math.min(1800, ally.stats.hp),
        maxHp: Math.min(1800, ally.stats.hp),
        attackBuff: 1.0,
        defenseBuff: 1.0,
        speedBuff: 1.0,
        isFainted: false,
        energy: 0,
        shield: 0,
        moveCooldowns: [0, 0, 0, 0],
        statuses: [],
        position: { x: -10, y: 0, z: 16 },
        rotation: 0,
        maxMoveDistance: 18,
        remainingMoveDistance: 18,
        turnStartPosition: { x: -10, y: 0, z: 16 },
        isBot: true,
        isPlayer2: false,
      });

      // Enemy 1
      const isPvP = matchType === 'pvp';
      const enemy1Data = isPvP && p2Monster ? p2Monster : generateBotMonster('雷', 2, 1);
      initialList.push({
        id: 'enemy_1',
        monster: enemy1Data,
        team: 1,
        isPlayer: false,
        currentHp: Math.min(1800, enemy1Data.stats.hp),
        maxHp: Math.min(1800, enemy1Data.stats.hp),
        attackBuff: 1.0,
        defenseBuff: 1.0,
        speedBuff: 1.0,
        isFainted: false,
        energy: 0,
        shield: 0,
        moveCooldowns: [0, 0, 0, 0],
        statuses: [],
        position: { x: -10, y: 0, z: -16 },
        rotation: Math.PI,
        maxMoveDistance: 18,
        remainingMoveDistance: 18,
        turnStartPosition: { x: -10, y: 0, z: -16 },
        isBot: !isPvP,
        isPlayer2: isPvP,
      });

      // Enemy 2
      const enemy2 = generateBotMonster('水', 3, 1);
      initialList.push({
        id: 'enemy_2',
        monster: enemy2,
        team: 1,
        isPlayer: false,
        currentHp: Math.min(1800, enemy2.stats.hp),
        maxHp: Math.min(1800, enemy2.stats.hp),
        attackBuff: 1.0,
        defenseBuff: 1.0,
        speedBuff: 1.0,
        isFainted: false,
        energy: 0,
        shield: 0,
        moveCooldowns: [0, 0, 0, 0],
        statuses: [],
        position: { x: 10, y: 0, z: -16 },
        rotation: Math.PI,
        maxMoveDistance: 18,
        remainingMoveDistance: 18,
        turnStartPosition: { x: 10, y: 0, z: -16 },
        isBot: true,
        isPlayer2: false,
      });
    } else {
      // 4-Player Battle Royale
      const types = ['炎', '水', '雷'] as const;
      types.forEach((t, i) => {
        const bot = generateBotMonster(t, i + 1, i + 1);
        const positions = [
          { x: 0, z: -18 },
          { x: -18, z: 0 },
          { x: 18, z: 0 },
        ];
        initialList.push({
          id: `frenemy_${i + 1}`,
          monster: bot,
          team: i + 1,
          isPlayer: false,
          currentHp: Math.min(1800, bot.stats.hp),
          maxHp: Math.min(1800, bot.stats.hp),
          attackBuff: 1.0,
          defenseBuff: 1.0,
          speedBuff: 1.0,
          isFainted: false,
          energy: 0,
          shield: 0,
          moveCooldowns: [0, 0, 0, 0],
          statuses: [],
          position: { x: positions[i].x, y: 0, z: positions[i].z },
          rotation: 0,
          maxMoveDistance: 18,
          remainingMoveDistance: 18,
          turnStartPosition: { x: positions[i].x, y: 0, z: positions[i].z },
          isBot: true,
          isPlayer2: false,
        });
      });
    }

    return initialList;
  }, [playerMonster, mode, matchType, p2Monster, onlinePlayers, localPlayerIndex]);

  // Active participant helper
  const activeParticipant = participants.find((p) => p.id === turnOrder[currentTurnIndex]);

  // 2. Start Battle Round and Setup Turn Order
  const startNewRound = useCallback((currentList: BattleParticipant[], roundNum: number) => {
    // Sort living participants by speed (with slight random variance)
    const living = currentList.filter((p) => !p.isFainted);
    living.sort((a, b) => {
      // ONLINE is always an explicit P1 → P2 → P3 → P4 rotation.
      // This avoids each client independently deriving a different speed order in 2vs2.
      if (matchType === 'online') return (a.playerIndex ?? 99) - (b.playerIndex ?? 99);
      const spdA = a.monster.stats.speed * a.speedBuff + (Math.random() * 20 - 10);
      const spdB = b.monster.stats.speed * b.speedBuff + (Math.random() * 20 - 10);
      return spdB - spdA;
    });

    const order = living.map((p) => p.id);
    // Update refs BEFORE state. This prevents the turn effect from briefly using
    // a new order with an old index (or vice versa).
    turnOrderRef.current = order;
    currentTurnIndexRef.current = 0;
    roundNumberRef.current = roundNum;
    turnEpochRef.current += 1;
    setTurnOrder(order);
    setCurrentTurnIndex(0);
    setRoundNumber(roundNum);

    addLog(`-- ⚔️ 第 ${roundNum} ラウンド開始！ --`, 'info');
  }, [addLog, matchType]);

  // 3. Start a Participant's Turn
  const startParticipantTurn = useCallback(
    (participantId: string) => {
      const p = participantsRef.current.find((x) => x.id === participantId);
      if (!p || p.isFainted) {
        advanceToNextTurn();
        return;
      }
      activeTurnIdRef.current = participantId;
      sceneRef.current?.tickArenaObstacles?.();

      // ターン開始時リソース処理
      p.energy = Math.min(100, (p.energy ?? 0) + 10);
      p.moveCooldowns = (p.moveCooldowns ?? [0, 0, 0, 0]).map((v) => Math.max(0, v - 1));

      // 一時ステータス強化の残りターン更新。切れたら倍率を元へ戻す。
      for (const [label, field, mult] of [['攻撃強化','attackBuff',1.35],['防御強化','defenseBuff',1.40],['速度強化','speedBuff',1.40]] as const) {
        const st=(p.statuses??[]).find(x=>x.startsWith(label+':'));
        if (!st) continue;
        const turns=Number(st.split(':')[1]||0); p.statuses=(p.statuses??[]).filter(x=>!x.startsWith(label+':'));
        if (turns>1) p.statuses.push(`${label}:${turns-1}`);
        else { (p as any)[field]=Math.max(1,(p as any)[field]/mult); addLog(`↩️【${p.monster.name}】の${label}が切れた。`,'info'); }
      }

      // v2.8 persistent field hazards: poison pools remain on the arena for several owner turns.
      // Zone format: 毒沼@x,z,radius,turns,ownerTeam. Every living enemy standing inside is poisoned/damaged.
      for (const owner of participantsRef.current) {
        for (const st of (owner.statuses ?? []).filter(x => x.startsWith('毒沼@'))) {
          const [x,z,r,turns,zoneTeam] = st.slice(3).split(',').map(Number);
          if (![x,z,r,turns,zoneTeam].every(Number.isFinite) || turns <= 0 || p.team === zoneTeam) continue;
          if (Math.hypot(p.position.x-x,p.position.z-z) <= r) {
            const zoneDmg=Math.max(1,Math.round(p.maxHp*.025));
            p.currentHp=Math.max(0,p.currentHp-zoneDmg);
            p.statuses=[...(p.statuses??[]).filter(x=>!x.startsWith('猛毒:')),'猛毒:2'];
            showDamageNumber(p, `-${zoneDmg}`, false, '#22c55e');
            addLog(`🟢☠️【${p.monster.name}】は毒沼の中！ ${zoneDmg}ダメージ＋猛毒！`,'damage');
          }
        }
      }
      // The zone owner counts its own zones down once per its turn.
      p.statuses=(p.statuses??[]).map(st=>{
        if(!st.startsWith('毒沼@')) return st;
        const a=st.slice(3).split(','); const t=Number(a[3]||0)-1; a[3]=String(t); return `毒沼@${a.join(',')}`;
      }).filter(st=>!st.startsWith('毒沼@') || Number(st.slice(3).split(',')[3])>0);
      if (p.currentHp <= 0) { p.isFainted=true; setParticipants(prev=>prev.map(x=>x.id===p.id?{...p}:x)); setTimeout(()=>advanceToNextTurn(),450); return; }

      // 継続ダメージ: 猛毒は最大HPの4%。残りターンもここで減らす。
      const poison = (p.statuses ?? []).find(s => s.startsWith('猛毒:'));
      if (poison) {
        const turns = Number(poison.split(':')[1] || 0);
        const dmg = Math.max(1, Math.round(p.maxHp * 0.04));
        p.currentHp = Math.max(0, p.currentHp - dmg);
        p.statuses = (p.statuses ?? []).filter(s => !s.startsWith('猛毒:'));
        if (turns > 1) p.statuses.push(`猛毒:${turns-1}`);
        showDamageNumber(p, `-${dmg}`, false, '#22c55e');
        addLog(`☠️【${p.monster.name}】は猛毒で ${dmg} ダメージ！`, 'damage');
        if (p.currentHp <= 0) { p.isFainted = true; setParticipants(prev => prev.map(x => x.id===p.id ? {...p} : x)); setTimeout(()=>advanceToNextTurn(),450); return; }
      }

      // Poison/zone damage mutates the live participant; commit it immediately so HP/status
      // never waits for a later render (important for online turns).
      const poisonCommitted = participantsRef.current.map(x => x.id === p.id ? {...p, statuses:[...(p.statuses??[])]} : {...x, statuses:[...(x.statuses??[])]});
      participantsRef.current = poisonCommitted;
      setParticipants(poisonCommitted);
      sceneRef.current?.syncParticipants?.(poisonCommitted);

      // 行動不能系状態は「ターンを消費して」次へ進める。無限停止させない。
      const disabledStatus = (p.statuses ?? []).find((s) =>
        s.startsWith('凍結:') || s.startsWith('睡眠:') || s.startsWith('麻痺:') || s.startsWith('停止:')
      );
      if (disabledStatus) {
        const disabledName = disabledStatus.split(':')[0];
        const disabledTurns = Math.max(0, Number(disabledStatus.split(':')[1] || 0));
        p.statuses = (p.statuses ?? []).filter(s => s !== disabledStatus);
        if (disabledTurns > 1) p.statuses.push(`${disabledName}:${disabledTurns - 1}`);
        else addLog(`✅【${p.monster.name}】の${disabledName}が解除された！`, 'info');
        const disabledCommitted = participantsRef.current.map(x => x.id === p.id ? {...p, statuses:[...(p.statuses??[])]} : x);
        participantsRef.current = disabledCommitted;
        setParticipants(disabledCommitted);
        sceneRef.current?.syncParticipants?.(disabledCommitted);
        addLog(`⛔【${p.monster.name}】は${disabledName}で行動できない！（残り${Math.max(0, disabledTurns-1)}ターン）`, 'info');
        setTurnPhase('EXECUTING');
        setTimeout(() => advanceToNextTurn(), 500);
        return;
      }

      // Calculate random mobility distance for this turn
      // Dice: 12 ~ 20m + Speed Stat bonus (up to +10m)
      const dice = Math.floor(Math.random() * 9) + 12;
      const speedBonus = Math.floor((p.monster.stats.speed / 800) * 10);
      let totalDist = dice + speedBonus;
      // v3.1.4: movement-control skills no longer set movement to zero.
      // They reduce this turn's movement allowance by 75% (25% remains), so the
      // victim can still reposition and cannot be permanently locked in place.
      const root = (p.statuses ?? []).find(s => s.startsWith('移動制限75:') || s.startsWith('移動不能:'));
      if (root) {
        totalDist = Math.max(1, totalDist * 0.25);
        const turns = Number(root.split(':')[1] || 0);
        p.statuses = (p.statuses ?? []).filter(s => !s.startsWith('移動制限75:') && !s.startsWith('移動不能:'));
        if (turns > 1) p.statuses.push(`移動制限75:${turns-1}`);
        addLog(`🌿【${p.monster.name}】は移動制限中！ このターンの移動力が75%ダウン（${totalDist.toFixed(1)}m）`, 'info');
      }

      // Trait Mobility Bonus
      const trait = p.monster.specialAbility;
      if (trait && (trait.category === 'mobility' || trait.id.includes('step') || trait.name.includes('足') || trait.name.includes('ステップ'))) {
        totalDist += 6;
        addLog(`💨【特性：${trait.name}】が発動！ 移動力 +6m 加算！`, 'info');
      }

      // Trait Regeneration / Healing (Photosynthesis / Recovery)
      if (trait && (trait.category === 'recovery' || trait.id.includes('photo') || trait.name.includes('光合成') || trait.name.includes('自然治癒'))) {
        const heal = Math.max(15, Math.round(p.maxHp * 0.08));
        p.currentHp = Math.min(p.maxHp, p.currentHp + heal);
        addLog(`🌿【特性：${trait.name}】が発動！ ターン開始時に HPが ${heal} 回復！`, 'critical');
      }

      p.maxMoveDistance = totalDist;
      p.remainingMoveDistance = totalDist;
      p.turnStartPosition = { ...p.position };

      // Handle stealth turns duration countdown at turn start
      if (p.stealthTurns && p.stealthTurns > 0) {
        const nextStealth = p.stealthTurns - 1;
        p.stealthTurns = nextStealth;
        if (nextStealth === 0) {
          addLog(`👁️【${p.monster.name}】の透明化（ステルス）が解けた！`, 'info');
        } else {
          addLog(`👻【${p.monster.name}】は透明化中（残り ${nextStealth} ターン）`, 'info');
        }
      }

      setTurnMaxDist(totalDist);
      setTurnRemainingDist(totalDist);

      sound.playDiceRoll();

      const isHumanControlled = p.isBot !== true && (matchType === 'online' ? p.playerIndex === localPlayerIndex : (p.isPlayer || (matchType === 'pvp' && p.isPlayer2)));

      // Set the active model for visuals, but NEVER allow keyboard/D-pad control for CPU turns.
      // Previously BattleArenaScene listened to WASD globally, so the active CPU could be moved
      // by the player even though the React UI correctly hid the controls.
      sceneRef.current?.setActiveTurn(p.id, totalDist, totalDist, p.position);
      sceneRef.current?.setManualControlEnabled(isHumanControlled);

      addLog(
        `🎲【${p.monster.name}】(${matchType==='online' ? `P${(p.playerIndex??0)+1}` : isHumanControlled ? (p.isPlayer ? 'P1' : 'P2') : 'CPU'}) のターン！ 移動力: ${totalDist}m (ダイス:${dice} + 素早さ:${speedBonus})`,
        'info'
      );

      // Default target
      const enemies = participantsRef.current.filter((other) => other.team !== p.team && !other.isFainted);
      if (enemies.length > 0) {
        // Pick closest enemy
        let closest = enemies[0];
        let minDist = 9999;
        enemies.forEach((e) => {
          const d = Math.hypot(e.position.x - p.position.x, e.position.z - p.position.z);
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        });
        setTargetId(closest.id);
        sceneRef.current?.setTargetParticipant(closest.id);
      }

      // Default move 0 range indicator
      const defaultMove = p.monster.moves[0];
      if (defaultMove) {
        sceneRef.current?.setSelectedMove(defaultMove);
      }

      if (isHumanControlled) {
        setTurnPhase('TACTICAL_CONTROL');
      } else if (matchType === 'online' && p.isBot !== true) {
        // Remote player: spectate their turn. Their client owns the controls.
        setTurnPhase('EXECUTING');
      } else {
        setTurnPhase('EXECUTING');
        executeBotTurn(p);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchType, addLog, localPlayerIndex]
  );

  // 4. CPU Bot Turn Execution (Smart Tactical AI: Never attacks out of range!)
  const executeBotTurn = async (bot: BattleParticipant) => {
    await new Promise((r) => setTimeout(r, 600));

    // Find living enemies
    const enemies = participantsRef.current.filter((p) => p.team !== bot.team && !p.isFainted);
    if (enemies.length === 0) return;

    const moveDist = bot.maxMoveDistance;

    // Tactical Self Moves (Stealth, Decoy, Buff, Heal)
    // CPU must NEVER choose a move it cannot currently use. Previously it could
    // pick an energy/CT-locked move; executeAction then switched to TACTICAL_CONTROL,
    // leaving the CPU as the active participant and effectively soft-locking the match.
    const isBotMoveUsable = (m: Move) => {
      const idx = bot.monster.moves.findIndex((x) => x.id === m.id);
      const cd = idx >= 0 ? (bot.moveCooldowns?.[idx] ?? 0) : 0;
      return cd <= 0 && (bot.energy ?? 0) >= getMoveEnergyCost(m);
    };

    const selfMoves = bot.monster.moves.filter(
      (m) =>
        isBotMoveUsable(m) && (
          m.targetScope === 'self' ||
          m.effectType === 'stealth_cloak' ||
          m.effectType === 'decoy_clone' ||
          (Boolean(m.healRatio) && m.targetScope !== 'single_ally') ||
          (m.category === 'status' && (!m.targetScope || m.targetScope === 'self'))
        )
    );

    // Evaluate tactical defensive needs
    const hpRatio = bot.currentHp / bot.maxHp;
    const isUnprotected = !bot.decoyCount && !bot.stealthTurns;
    if (selfMoves.length > 0 && ((hpRatio < 0.45 && Math.random() < 0.7) || (isUnprotected && Math.random() < 0.45))) {
      const chosenSelfMove = selfMoves[Math.floor(Math.random() * selfMoves.length)];
      setTargetId(bot.id);
      sceneRef.current?.setTargetParticipant(bot.id);
      sceneRef.current?.setSelectedMove(chosenSelfMove);
      await new Promise((r) => setTimeout(r, 450));
      await executeAction(bot, bot, chosenSelfMove);
      return;
    }

    // Team support: save a badly injured ally before chasing damage.
    const allies = participantsRef.current.filter(p => p.team === bot.team && p.id !== bot.id && !p.isFainted);
    const allyHeal = bot.monster.moves.find(m => isBotMoveUsable(m) && m.id === 'tactical_ally_heal');
    const hurtAlly = allies.sort((a,b)=>a.currentHp/a.maxHp-b.currentHp/b.maxHp)[0];
    if (allyHeal && hurtAlly && hurtAlly.currentHp/hurtAlly.maxHp < .55) {
      const d=Math.hypot(hurtAlly.position.x-bot.position.x,hurtAlly.position.z-bot.position.z);
      if (d <= allyHeal.range) { setTargetId(hurtAlly.id); await executeAction(bot,hurtAlly,allyHeal); return; }
    }

    // Control/status: poison healthy targets, root mobile enemies, or pull enemies for setup.
    const controlMoves = bot.monster.moves.filter(m => isBotMoveUsable(m) && ['tactical_poison','tactical_root','tactical_pull'].includes(m.id));
    for (const cm of controlMoves) {
      const candidate = [...enemies].sort((a,b)=>b.currentHp-a.currentHp).find(e => Math.hypot(e.position.x-bot.position.x,e.position.z-bot.position.z) <= cm.range);
      if (candidate && Math.random() < .7) { setTargetId(candidate.id); await executeAction(bot,candidate,cm); return; }
    }

    // Evaluate viable attack options (moving + attacking within legitimate range)
    type TacticalOption = {
      enemy: BattleParticipant;
      move: Move;
      currentDist: number;
      neededMovement: number;
      score: number;
    };

    const viableOptions: TacticalOption[] = [];
    const attackMoves = bot.monster.moves.filter(
      (m) =>
        isBotMoveUsable(m) &&
        m.targetScope !== 'self' &&
        m.targetScope !== 'all_field' &&
        m.effectType !== 'stealth_cloak' &&
        m.effectType !== 'decoy_clone' &&
        m.category !== 'chaos' &&
        m.power > 0
    );

    enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.position.x - bot.position.x, enemy.position.z - bot.position.z);
      attackMoves.forEach((m) => {
        // If whole field/all enemies or ultra range
        if (m.range >= 900 || m.targetScope === 'all_enemies' || m.targetScope === 'all_field') {
          viableOptions.push({
            enemy,
            move: m,
            currentDist: dist,
            neededMovement: 0,
            score: m.power + 20,
          });
          return;
        }

        // Target distance minus move range = distance bot must travel
        const requiredTravel = dist - m.range;
        if (requiredTravel <= moveDist) {
          const neededMove = Math.max(0, requiredTravel);
          let score = m.power;
          if (enemy.currentHp < m.power * 4) score += 60; // Finish off low HP enemy
          if (neededMove === 0) score += 25; // Bonus for already in range
          if (m.effectType === 'teleport_strike') score += 35;
          if (m.effectType === 'line_beam' || m.effectType === 'spread_3way') score += 15;
          viableOptions.push({
            enemy,
            move: m,
            currentDist: dist,
            neededMovement: neededMove,
            score,
          });
        }
      });
    });

    if (viableOptions.length > 0) {
      // Pick best tactical combination
      viableOptions.sort((a, b) => b.score - a.score);
      const chosen = viableOptions[0];

      setTargetId(chosen.enemy.id);
      sceneRef.current?.setTargetParticipant(chosen.enemy.id);
      sceneRef.current?.setSelectedMove(chosen.move);

      // Travel if needed to be inside range
      if (chosen.neededMovement > 0) {
        const dx = chosen.enemy.position.x - bot.position.x;
        const dz = chosen.enemy.position.z - bot.position.z;
        const dist = Math.hypot(dx, dz);
        // Leave 2 meters buffer inside range so it's comfortably in range
        const travel = Math.min(bot.maxMoveDistance, Math.max(chosen.neededMovement, dist - (chosen.move.range - 2.5)));
        const destX = bot.position.x + (dx / dist) * travel;
        const destZ = bot.position.z + (dz / dist) * travel;

        await sceneRef.current?.moveBotTo(
          bot.id,
          { x: destX, z: destZ },
          bot.maxMoveDistance,
          (rem) => setTurnRemainingDist(rem)
        );
      }

      await new Promise((r) => setTimeout(r, 400));
      await executeAction(bot, chosen.enemy, chosen.move);
      return;
    }

    // No attack move can reach any enemy even after full movement!
    // Option A: Use Self Buff/Decoy/Stealth if available
    if (selfMoves.length > 0) {
      const chosenSelf = selfMoves[0];
      setTargetId(bot.id);
      sceneRef.current?.setTargetParticipant(bot.id);
      sceneRef.current?.setSelectedMove(chosenSelf);
      await new Promise((r) => setTimeout(r, 400));
      await executeAction(bot, bot, chosenSelf);
      return;
    }

    // Option B: Advance maximum distance towards closest enemy and brace (NEVER attack out of range!)
    let closestEnemy = enemies[0];
    let minDist = 9999;
    enemies.forEach((e) => {
      const d = Math.hypot(e.position.x - bot.position.x, e.position.z - bot.position.z);
      if (d < minDist) {
        minDist = d;
        closestEnemy = e;
      }
    });

    setTargetId(closestEnemy.id);
    sceneRef.current?.setTargetParticipant(closestEnemy.id);

    const dx = closestEnemy.position.x - bot.position.x;
    const dz = closestEnemy.position.z - bot.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0) {
      const travel = Math.min(bot.maxMoveDistance, dist - 2);
      const destX = bot.position.x + (dx / dist) * travel;
      const destZ = bot.position.z + (dz / dist) * travel;

      await sceneRef.current?.moveBotTo(
        bot.id,
        { x: destX, z: destZ },
        bot.maxMoveDistance,
        (rem) => setTurnRemainingDist(rem)
      );
    }

    addLog(`🛡️【${bot.monster.name}】は間合いを詰めて身構えた！（射程外のため攻撃待機）`, 'info');
    await new Promise((r) => setTimeout(r, 650));
    advanceToNextTurn();
  };

  // 5. Execute Action (Attack or Status) -> Turn automatically ends!
  const executeAction = async (actor: BattleParticipant, target: BattleParticipant | undefined, move: Move) => {
    // CPUは自分で狙いを付ける。人間プレイヤーだけは自動追尾せず←→で照準を合わせる。
    if (actor.isBot && target && target.id !== actor.id) {
      actor.rotation = Math.atan2(target.position.x - actor.position.x, target.position.z - actor.position.z);
    }
    setTurnPhase('EXECUTING');

    // 技CT・エネルギーはローカル戦でも共通化
    const moveIndex = actor.monster.moves.findIndex((m) => m.id === move.id);
    const cooldowns = actor.moveCooldowns ?? [0, 0, 0, 0];
    const cd = moveIndex >= 0 ? (cooldowns[moveIndex] ?? 0) : 0;
    const cost = getMoveEnergyCost(move);
    if (cd > 0) {
      addLog(`⏳【${actor.monster.name}】の『${move.name}』はCT中！（あと${cd}ターン）`, 'info');
      if (actor.isBot) { advanceToNextTurn(); } else { setTurnPhase('TACTICAL_CONTROL'); }
      return;
    }
    if ((actor.energy ?? 0) < cost) {
      addLog(`⚡【${actor.monster.name}】はエネルギー不足！（必要${cost} / 現在${actor.energy ?? 0}）`, 'info');
      if (actor.isBot) { advanceToNextTurn(); } else { setTurnPhase('TACTICAL_CONTROL'); }
      return;
    }

    // 使用した技のCTとエネルギーを即時反映
    actor.energy = Math.max(0, (actor.energy ?? 0) - cost);
    if (moveIndex >= 0) actor.moveCooldowns = cooldowns.map((v, i) => i === moveIndex ? getMoveCooldown(move) : v);

    // v3.0 gamble moves: unlike normal skills, these intentionally have a real failure roll.
    // Forbidden/chaos rarity is decided at monster creation; this roll is only for gamble skills in battle.
    if ((/🎲/.test(move.description) || move.id?.startsWith('gamble_')) && Math.random() * 100 >= move.accuracy) {
      addLog(`🎲【${actor.monster.name}】の『${move.name}』はハズレ！ ギャンブル失敗！`, 'info');
      await new Promise<void>(resolve => sceneRef.current?.executeTurnAction(actor, target, move, () => {}, resolve));
      await new Promise(r=>setTimeout(r,250));
      advanceToNextTurn();
      return;
    }

    // --- v3.1 terrain obstacle skill ---
    if (move.effectType === 'barrier_wall') {
      await new Promise<void>(resolve => sceneRef.current?.executeTurnAction(actor, actor, move, () => {}, resolve));
      sceneRef.current?.spawnBarrierWall?.(actor, move);
      addLog(`🧱【${actor.monster.name}】が『${move.name}』で障害壁を生成！ 通り抜け不可！`, 'critical');
      await new Promise(r=>setTimeout(r,300));
      advanceToNextTurn();
      return;
    }

    // --- v2.9.1 guaranteed healing path ---
    // Healing must not depend on an attack 'hit' callback. Apply it directly to the live
    // participant objects, then sync React + Three state. This also makes online snapshots
    // contain the healed HP immediately.
    const isHealingMove = move.category === 'status' && Boolean(move.healRatio || /回復|ヒール|治癒|再生/.test(move.name));
    if (isHealingMove) {
      const ratio = Math.max(0.05, Math.min(0.30, move.healRatio || 0.18));
      let recipients: BattleParticipant[] = [];
      if (move.targetScope === 'single_ally') {
        // Support heal uses the visible area, not a stale selected target.
        recipients = participantsRef.current.filter(p =>
          p.id !== actor.id && p.team === actor.team && !p.isFainted &&
          (sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false)
        );
      } else if (move.targetScope === 'all_allies') {
        recipients = participantsRef.current.filter(p =>
          p.id !== actor.id && p.team === actor.team && !p.isFainted &&
          (sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false)
        );
      } else {
        recipients = [actor];
      }
      await new Promise<void>(resolve => sceneRef.current?.executeTurnAction(actor, target, move, () => {}, resolve));
      if (recipients.length === 0) {
        addLog(`❌『${move.name}』の緑色範囲内に回復できる味方がいない！`, 'info');
      } else {
        for (const unit of recipients) {
          const before = unit.currentHp;
          const amount = Math.max(1, Math.round(unit.maxHp * ratio));
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
          const actual = unit.currentHp - before;
          showDamageNumber(unit, `+${actual}`, false, '#34d399');
          addLog(`💚【${unit.monster.name}】HP ${before} → ${unit.currentHp}（+${actual}）`, 'critical');
        }
      }
      const live = participantsRef.current.map(x => ({...x, statuses:[...(x.statuses??[])]}));
      participantsRef.current = live;
      setParticipants(live);
      sceneRef.current?.syncParticipants?.(live);
      await new Promise(r=>setTimeout(r,350));
      advanceToNextTurn();
      return;
    }

    // --- v2.8 unified utility engine ---
    // Status moves no longer depend on a specific tactical_* id. Enemy debuffs, pulls, heals and buffs
    // execute even when power is 0, which fixes meta_* and generated support moves silently doing nothing.
    const enemyUtility = move.category === 'status' && (move.targetScope === 'single_enemy' || move.targetScope === 'all_enemies');
    if (enemyUtility) {
      const enemiesInArea=participantsRef.current.filter(p=>p.team!==actor.team&&!p.isFainted&&(sceneRef.current?.isParticipantInMoveArea(actor,p,move)??false));
      if(enemiesInArea.length===0){ addLog(`❌『${move.name}』の色付き効果範囲内に敵がいない！`,'info'); }
      for(const enemy of enemiesInArea){
        const dx=enemy.position.x-actor.position.x,dz=enemy.position.z-actor.position.z,d=Math.max(.1,Math.hypot(dx,dz));
        if(move.effectType==='vortex_pull'){
          // Root/net moves bind; vortex/catch/pull moves physically pull. Some moves can do both.
          const isRoot=/根|縛|ネット|拘束/.test(move.name);
          if(isRoot){ enemy.statuses=[...(enemy.statuses??[]).filter(x=>!x.startsWith('移動不能:')&&!x.startsWith('移動制限75:')),'移動制限75:2']; addLog(`🌿【${enemy.monster.name}】の移動力を2ターン75%ダウン！`,'critical'); }
          else { const dest={x:actor.position.x+dx/d*3,z:actor.position.z+dz/d*3}; await sceneRef.current?.moveBotTo(enemy.id,dest,Math.max(0,d-3),()=>{}); enemy.position={...enemy.position,...dest}; addLog(`🧲【${enemy.monster.name}】を3m手前まで引き寄せた！`,'critical'); }
        }
        if(move.effectType==='knockback_wave' || (move.effectType==='explosion' && /救出|リパル|押し|暴風|ウェーブ/.test(move.name)) || /押し|暴風|リパル|ウェーブ/.test(move.name)){
          const push=/超強力|台風|ハイローラー|大津波|拒絶/.test(move.name) ? Math.min(26,Math.max(15,move.range*.48)) : Math.min(18,Math.max(8,move.range*.38)); enemy.position={...enemy.position,x:Math.max(-92,Math.min(92,enemy.position.x+dx/d*push)),z:Math.max(-92,Math.min(92,enemy.position.z+dz/d*push))};
          sceneRef.current?.syncParticipants?.(participantsRef.current); addLog(`💨【${enemy.monster.name}】を${push.toFixed(1)}m吹き飛ばした！`,'critical');
        }
        if(/毒|ポイズン|胞子|poison/i.test(`${move.id} ${move.name} ${move.description} ${move.specialEffect?.type ?? ''}`)){
          enemy.statuses=[...(enemy.statuses??[]).filter(x=>!x.startsWith('猛毒:')),'猛毒:3'];
          addLog(`☠️【${enemy.monster.name}】に猛毒！`,'critical');
        }
        const sp=move.specialEffect;
        if(sp && ['atk_down','def_down','spd_down','burn','paralyze','freeze'].includes(sp.type)){
          if(sp.type==='atk_down'||sp.type==='burn') enemy.attackBuff*=sp.value||.75;
          if(sp.type==='def_down') enemy.defenseBuff*=sp.value||.75;
          if(sp.type==='spd_down'||sp.type==='paralyze'||sp.type==='freeze') enemy.speedBuff*=sp.value||.65;
          enemy.statuses=[...(enemy.statuses??[]),`${sp.type}:${sp.type==='freeze'?1:3}`];
          addLog(`📉【${enemy.monster.name}】に${sp.description}！`,'critical');
        }
      }
      // Poison/spore skills also leave a clearly visible persistent pool at the end of the cast area.
      if(/毒|ポイズン|胞子|poison/i.test(`${move.id} ${move.name} ${move.description} ${move.specialEffect?.type ?? ''}`)){
        // v2.8.1: the persistent pool is EXACTLY the same place/size as the green cast preview.
        const spec=sceneRef.current?.getMoveAreaSpec(move);
        const dist=spec?.shape==='landing' ? spec.center : 0;
        const r=spec?.shape==='landing'||spec?.shape==='disk' ? spec.radius : Math.max(8,move.range*.3);
        const x=actor.position.x+Math.sin(actor.rotation)*dist, z=actor.position.z+Math.cos(actor.rotation)*dist;
        actor.statuses=[...(actor.statuses??[]),`毒沼@${x.toFixed(2)},${z.toFixed(2)},${r.toFixed(2)},3,${actor.team}`];
        addLog(`🟢『${move.name}』の緑色プレビューと同じ場所に毒沼！ 半径${r.toFixed(1)}m・3ターン！`,'chaos');
      }
      setParticipants(prev=>prev.map(p=>{const live=participantsRef.current.find(x=>x.id===p.id);return live?{...p,...live}:p;}));
      sceneRef.current?.syncParticipants?.(participantsRef.current);
      await new Promise(r=>setTimeout(r,500)); advanceToNextTurn(); return;
    }

    // --- Legacy tactical utility moves: positioning / healing / control / buffs ---
    if (move.id?.startsWith('tactical_')) {
      const livingEnemies = participantsRef.current.filter(p => p.team !== actor.team && !p.isFainted);
      const chosenTarget = target && !target.isFainted ? target : undefined;
      if (move.id === 'tactical_retreat' && livingEnemies.length) {
        const nearest = [...livingEnemies].sort((a,b) => Math.hypot(a.position.x-actor.position.x,a.position.z-actor.position.z)-Math.hypot(b.position.x-actor.position.x,b.position.z-actor.position.z))[0];
        const dx=actor.position.x-nearest.position.x, dz=actor.position.z-nearest.position.z, d=Math.max(.1,Math.hypot(dx,dz));
        await sceneRef.current?.moveBotTo(actor.id,{x:actor.position.x+dx/d*actor.maxMoveDistance,z:actor.position.z+dz/d*actor.maxMoveDistance},actor.maxMoveDistance,()=>{});
        addLog(`💨【${actor.monster.name}】は敵との間合いを切って撤退！`,'info');
      } else if (move.id === 'tactical_self_heal') {
        const heal=Math.round(actor.maxHp*.18); actor.currentHp=Math.min(actor.maxHp,actor.currentHp+heal);
        addLog(`💚【${actor.monster.name}】はHPを${heal}回復！`,'critical');
      } else if (move.id === 'tactical_ally_heal') {
        // Visible green circle = exact heal area. Heal ALL living allies in it, never self/enemies/outside.
        const alliesInArea = participantsRef.current.filter(p =>
          p.id !== actor.id && p.team === actor.team && !p.isFainted &&
          (sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false)
        );
        if (alliesInArea.length === 0) {
          addLog(`❌『${move.name}』の緑色の範囲内に回復できる味方がいない！`, 'info');
        } else {
          alliesInArea.forEach(ally => {
            const heal=Math.round(ally.maxHp*.12);
            ally.currentHp=Math.min(ally.maxHp,ally.currentHp+heal);
            showDamageNumber(ally, `+${heal}`, false, '#34d399');
            addLog(`✨【${ally.monster.name}】を${heal}回復！`,'critical');
          });
        }
      } else if (['tactical_pull','tactical_root','tactical_poison','tactical_knockback'].includes(move.id)) {
        // 妨害技も個別ターゲット不要。見えている効果範囲に入った敵全員へ問答無用で適用する。
        const enemiesInArea = participantsRef.current.filter(p =>
          p.team !== actor.team && !p.isFainted &&
          (sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false)
        );
        if (enemiesInArea.length === 0) {
          addLog(`❌『${move.name}』の効果範囲内に敵がいない！`, 'info');
        }
        for (const enemy of enemiesInArea) {
          if (move.id === 'tactical_pull') {
            const dx=enemy.position.x-actor.position.x,dz=enemy.position.z-actor.position.z,d=Math.max(.1,Math.hypot(dx,dz));
            await sceneRef.current?.moveBotTo(enemy.id,{x:actor.position.x+dx/d*3,z:actor.position.z+dz/d*3},Math.max(0,d-3),()=>{});
            addLog(`🧲【${enemy.monster.name}】を強制的に引き寄せた！`,'info');
          } else if (move.id === 'tactical_root') {
            enemy.statuses=[...(enemy.statuses??[]).filter(x=>!x.startsWith('移動不能:')&&!x.startsWith('移動制限75:')),'移動制限75:2'];
            addLog(`🌿【${enemy.monster.name}】の移動力を2ターン75%ダウン！`,'critical');
          } else if (move.id === 'tactical_poison') {
            enemy.statuses=[...(enemy.statuses??[]).filter(x=>!x.startsWith('猛毒:')),'猛毒:3'];
            addLog(`☠️【${enemy.monster.name}】に3ターンの猛毒！`,'critical');
          } else if (move.id === 'tactical_knockback') {
            const dx=enemy.position.x-actor.position.x,dz=enemy.position.z-actor.position.z,d=Math.max(.1,Math.hypot(dx,dz));
            const push=10;
            enemy.position.x += dx/d*push; enemy.position.z += dz/d*push;
            addLog(`💨【${enemy.monster.name}】を大きく吹き飛ばした！`,'critical');
          }
        }
      } else if (move.id === 'tactical_ally_guard' && chosenTarget && chosenTarget.id!==actor.id && chosenTarget.team===actor.team && (sceneRef.current?.isParticipantInMoveArea(actor, chosenTarget, move) ?? false)) {
        chosenTarget.defenseBuff=Math.min(2,chosenTarget.defenseBuff*1.30); chosenTarget.statuses=[...(chosenTarget.statuses??[]),'防御強化:3'];
        addLog(`🛡️【${chosenTarget.monster.name}】の防御力を30%強化！`,'critical');
      } else if (move.id === 'tactical_atk_up') { actor.attackBuff=Math.min(2,actor.attackBuff*1.35); actor.statuses=[...(actor.statuses??[]),'攻撃強化:3']; addLog(`🔥攻撃力が35%上昇！`,'critical');
      } else if (move.id === 'tactical_def_up') { actor.defenseBuff=Math.min(2,actor.defenseBuff*1.40); actor.statuses=[...(actor.statuses??[]),'防御強化:3']; addLog(`🛡️防御力が40%上昇！`,'critical');
      } else if (move.id === 'tactical_spd_up') { actor.speedBuff=Math.min(2,actor.speedBuff*1.40); actor.statuses=[...(actor.statuses??[]),'速度強化:3']; addLog(`⚡素早さが40%上昇！`,'critical'); }
      setParticipants(prev=>prev.map(p=>{ const live=participantsRef.current.find(x=>x.id===p.id); return live?{...p,...live}:p; }));
      await new Promise(r=>setTimeout(r,450)); advanceToNextTurn(); return;
    }

    // シールド獲得技。HPダメージではなくシールドだけを増やす。
    const shieldGain = getShieldGain(move);
    if (shieldGain > 0) {
      actor.shield = Math.min(250, (actor.shield ?? 0) + shieldGain);
      if (/マジックウォール/.test(move.name)) {
        actor.statuses = [...(actor.statuses ?? []).filter((s) => !s.startsWith('状態異常無効:')), '状態異常無効:1'];
      }
      addLog(`🛡️【${actor.monster.name}】の『${move.name}』！シールド +${shieldGain}`, 'critical');
      setParticipants((prev) => prev.map((p) => p.id === actor.id ? { ...p, energy: actor.energy, shield: actor.shield, moveCooldowns: actor.moveCooldowns, statuses: actor.statuses } : p));
      await new Promise((r) => setTimeout(r, 450));
      advanceToNextTurn();
      return;
    }

    const isSelfAction =
      move.targetScope === 'self' ||
      (move.category === 'status' && (!move.targetScope || move.targetScope === 'self')) ||
      move.effectType === 'stealth_cloak' ||
      move.effectType === 'decoy_clone' ||
      move.effectType === 'buff_aura' ||
      Boolean(move.healRatio);

    // 攻撃技は個別ターゲットを要求しない。実際の命中は可視範囲内の敵を全走査して決める。

    addLog(`⚡【${actor.monster.name}】の『${move.name}』発動！`, 'attack');

    // 3D Scene animation
    await new Promise<void>((resolve) => {
      sceneRef.current?.executeTurnAction(
        actor,
        target,
        move,
        () => {
          // On Hit callback
          if (move.category === 'status') {
            handleStatusMoveEffect(actor, target, move);
          } else {
            handleDamageMoveEffect(actor, target, move);
          }
        },
        () => {
          resolve();
        }
      );
    });

    await new Promise((r) => setTimeout(r, 450));

    // 技命中後のエネルギー回収 +5（最大100）
    if (move.power > 0) {
      actor.energy = Math.min(100, (actor.energy ?? 0) + 5);
    }
    setParticipants((prev) => prev.map((p) =>
      p.id === actor.id
        ? { ...p, energy: actor.energy, shield: actor.shield ?? p.shield ?? 0, moveCooldowns: actor.moveCooldowns ?? p.moveCooldowns }
        : p
    ));

    // Check Win / Loss condition
    const checkList = participantsRef.current;
    const myTeam = matchType === 'online' ? (checkList.find(p=>p.playerIndex===localPlayerIndex)?.team ?? 0) : 0;
    const team0Living = checkList.filter((p) => p.team === myTeam && !p.isFainted);
    const otherTeamsLiving = checkList.filter((p) => p.team !== myTeam && !p.isFainted);

    if (team0Living.length === 0) {
      setIsBattleOver(true);
      setBattleResult('defeat');
      sound.playFaint();
      recordBattleStats(playerMonster.id, false);
      addLog('全滅してしまった... 敗北', 'faint');
      setTurnPhase('GAME_OVER');
      return;
    }

    if (otherTeamsLiving.length === 0) {
      setIsBattleOver(true);
      setBattleResult('victory');
      sound.playVictory();
      recordBattleStats(playerMonster.id, true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      addLog('すべての敵を撃破！完全勝利！！', 'critical');
      setTurnPhase('GAME_OVER');
      return;
    }

    // Advance to next participant
    advanceToNextTurn();
  };

  // Turn End: Advance turn order
  const advanceToNextTurn = () => {
    // 倒された参加者を飛ばして、必ず生存者のターンへ進む。
    // 以前は「倒された参加者が順番に残っている」とそこで return してしまい、
    // ターンが停止することがあった。
    // IMPORTANT: never read currentTurnIndex/turnOrder from this render here.
    // CPU turns are async, so those values can be stale and used to jump back to an
    // earlier enemy forever. Refs always contain the actual current turn.
    const order = turnOrderRef.current;
    let nextIndex = currentTurnIndexRef.current + 1;
    while (nextIndex < order.length) {
      const next = participantsRef.current.find((p) => p.id === order[nextIndex]);
      if (next && !next.isFainted) {
        currentTurnIndexRef.current = nextIndex;
        turnEpochRef.current += 1;
        activeTurnIdRef.current = next.id;
        setCurrentTurnIndex(nextIndex);

        // ONLINE: the player who just ended their turn must explicitly hand the
        // new turn to everyone. The periodic sender stops being authoritative as
        // soon as currentTurnIndex changes, so relying on it could leave P2/P3/P4
        // permanently waiting on the previous turn.
        if (matchType === 'online' && onlineWs?.readyState === WebSocket.OPEN) {
          onlineWs.send(JSON.stringify({
            type: 'battle_sync',
            state: {
              participants: compactOnlineParticipants(participantsRef.current),
              turnOrder: order,
              currentTurnIndex: nextIndex,
              roundNumber: roundNumberRef.current,
              turnPhase: 'EXECUTING',
              isBattleOver,
              battleResult,
              handoff: true
            }
          }));
        }
        return;
      }
      nextIndex++;
    }

    // 全員の行動終了 → 次ラウンド
    const nextRound = roundNumberRef.current + 1;
    startNewRound(participantsRef.current, nextRound);
    // startNewRound updates the refs synchronously. Explicitly publish the new
    // round as well, because the first actor may be a different client.
    if (matchType === 'online' && onlineWs?.readyState === WebSocket.OPEN) {
      onlineWs.send(JSON.stringify({
        type: 'battle_sync',
        state: {
          participants: compactOnlineParticipants(participantsRef.current),
          turnOrder: turnOrderRef.current,
          currentTurnIndex: 0,
          roundNumber: nextRound,
          turnPhase: 'EXECUTING',
          isBattleOver,
          battleResult,
          handoff: true
        }
      }));
    }
  };

  // 6. Damage Move Logic (Driven by monster stats, tactical range, and 50+ unique traits)
  const handleDamageMoveEffect = (actor: BattleParticipant, target: BattleParticipant | undefined, move: Move) => {
    const checkList = participantsRef.current;

    let targetsToHit: BattleParticipant[] = [];
    if (move.targetScope === 'all_enemies') {
      // 範囲攻撃は「使用者から技の射程内にいる敵だけ」。味方には絶対に当たらない。
      const radius = Math.max(0, move.range);
      targetsToHit = checkList.filter((p) => {
        if (p.team === actor.team || p.isFainted) return false;
        return sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false;
      });
      addLog(`💥【範囲攻撃】『${move.name}』！射程${radius}m以内の敵だけが対象！`, 'attack');
    } else if (move.targetScope === 'all_field') {
      // 旧all_fieldもフレンドリーファイア禁止。有限半径内の敵だけを攻撃する。
      // v3.0.1: NEVER clamp all-field explosions to 20m here. The arena preview,
      // VFX and hit-test all consume the exact same Move/RangeSpec.
      const fieldRadius = Math.max(1, move.range || 18);
      targetsToHit = checkList.filter((p) => {
        if (p.team === actor.team || p.isFainted) return false;
        return sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false;
      });
      addLog(`💥【全域爆発】『${move.name}』！表示されている爆発範囲内の敵すべてが対象！`, 'chaos');
    } else {
      // 通常の攻撃技も、使用者から技の射程内にいる敵すべてへ命中する。
      // 敵味方判定をここで固定するため、味方への誤射は発生しない。
      const radius = Math.max(0, move.range);
      targetsToHit = checkList.filter((p) => {
        if (p.team === actor.team || p.isFainted) return false;
        return sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false;
      });
    }

    if (targetsToHit.length === 0) return;

    // v2.8 teleport attacks actually move the caster, rather than only playing a teleport animation.
    if (move.effectType === 'teleport_strike') {
      const t=targetsToHit[0]; const dx=t.position.x-actor.position.x,dz=t.position.z-actor.position.z,d=Math.max(.1,Math.hypot(dx,dz));
      actor.position={...actor.position,x:t.position.x+dx/d*2.4,z:t.position.z+dz/d*2.4};
      actor.rotation=Math.atan2(t.position.x-actor.position.x,t.position.z-actor.position.z);
      sceneRef.current?.syncParticipants?.(participantsRef.current);
      addLog(`🌀【${actor.monster.name}】が【${t.monster.name}】の背後へ瞬間移動！`,'critical');
    }

    let totalDamageDealtByActor = 0;
    const special = move.specialEffect;
    const actorTrait = actor.monster.specialAbility;

    // Evaluate attacker traits
    let traitDamageMult = 1.0;
    if (actorTrait) {
      if ((actorTrait.id === 'trait_fire_spirit' || actorTrait.name === '紅蓮の闘志') && actor.currentHp <= actor.maxHp * 0.5) {
        traitDamageMult *= 1.4;
        addLog(`🔥【特性：${actorTrait.name}】ピンチにより攻撃威力が1.4倍に覚醒！`, 'critical');
      } else if (actorTrait.id === 'trait_first_strike' || actorTrait.name === '電光石火の先手') {
        if (roundNumber === 1) {
          traitDamageMult *= 1.35;
          addLog(`⚡【特性：${actorTrait.name}】第1ラウンドの奇襲で威力が1.35倍！`, 'critical');
        }
      } else if (actorTrait.id === 'trait_reckless_power' || actorTrait.name === 'すてみ剛力') {
        traitDamageMult *= 1.25;
        addLog(`💥【特性：${actorTrait.name}】剛力により威力が1.25倍！`, 'critical');
      } else if (actorTrait.id === 'trait_overclock' || actorTrait.name === 'オーバークロック') {
        if (roundNumber <= 3) {
          traitDamageMult *= 1.3;
          addLog(`⚡【特性：${actorTrait.name}】超加速稼働により威力が1.3倍！`, 'critical');
        }
      }
    }

    // Stealth Attack Bonus (Ambush from invisibility!)
    const isActorStealthed = Boolean(actor.stealthTurns && actor.stealthTurns > 0);
    if (isActorStealthed) {
      traitDamageMult *= 1.6;
      addLog(`👻【急襲】透明化（ステルス）からの死角奇襲！威力が1.6倍に跳ね上がった！`, 'critical');
      // Break stealth upon attack
      setParticipants((prev) => prev.map((p) => (p.id === actor.id ? { ...p, stealthTurns: 0 } : p)));
    }

    targetsToHit.forEach((t) => {
      // 1. Decoy Interception Check (Absorbs hit completely!)
      if (t.decoyCount && t.decoyCount > 0) {
        sceneRef.current?.destroyOneDecoy(t.id);
        sound.playMiss();
        showDamageNumber(t, 'DECOY SHIELD', false, '#38bdf8');
        addLog(`👥【身代わり】攻撃は【${t.monster.name}】の立体ホログラム分身（デコイ）が防いで身代わりに消滅した！`, 'info');
        setParticipants((prev) =>
          prev.map((p) => (p.id === t.id ? { ...p, decoyCount: Math.max(0, (p.decoyCount || 1) - 1) } : p))
        );
        return;
      }

      // 命中判定は可視攻撃エリアだけで決める。
      // エリア内なのに命中率乱数でMISSする挙動は廃止。透明化も位置を隠すこと自体が防御になる。

      // 3D Visual Hit Reaction
      sceneRef.current?.triggerHitReaction(t.id);

      // Special Ability / Traits: sharp blade increases critical hit rate
      let critChance = special?.type === 'high_crit' ? 0.45 : 0.16;
      if (actorTrait && (actorTrait.id === 'trait_sharp_blade' || actorTrait.name === '鋭利な刃')) {
        critChance += 0.25;
      }
      const isCrit = Math.random() < critChance;

      const attackStat = actor.monster.stats.attack * actor.attackBuff;
      // Armor pierce ignores target defense buff
      const targetDefBuff = actorTrait?.name === '装甲貫通' ? 1.0 : t.defenseBuff;
      const defenseStat = t.monster.stats.defense * targetDefBuff;

      // Type advantage check
      let typeMultiplier = 1.0;
      const advantages: Record<string, string> = {
        炎: '草',
        草: '水',
        水: '炎',
        雷: '水',
        地: '雷',
        風: '草',
        光: '闇',
        闇: '光',
      };
      if (advantages[move.type] === t.monster.type) {
        typeMultiplier = 1.5;
      } else if (advantages[t.monster.type] === move.type) {
        typeMultiplier = 0.75;
      }

      // Defender trait defense reduction
      const targetTrait = t.monster.specialAbility;
      let targetTraitDefMult = 1.0;
      if (targetTrait && (targetTrait.id === 'trait_iron_wall' || targetTrait.name === '不沈の金城' || targetTrait.category === 'defense')) {
        targetTraitDefMult = 0.82;
      }

      // Attacker conditional traits against target
      let targetSpecificMult = 1.0;
      if (actorTrait && (actorTrait.id === 'trait_solar_blessing' || actorTrait.name === '天日の恩恵')) {
        if (actor.currentHp > t.currentHp) {
          targetSpecificMult *= 1.2;
        }
      }

      const effectivePower = move.power * traitDamageMult * targetSpecificMult;

      // Stats dominate calculation + move power scaling
      const statRatio = attackStat / (defenseStat * 0.7 + 90);
      const statContribution = attackStat * 0.28;
      const moveContribution = effectivePower * 2.5;
      const baseDmg = (statRatio * moveContribution + statContribution) * 0.75;
      const variance = 0.94 + Math.random() * 0.12;
      const critMult = isCrit ? (actorTrait?.name === '鋭利な刃' ? 1.85 : 1.6) : 1.0;
      const calculatedDamage = Math.max(8, Math.round(baseDmg * 0.72 * variance * typeMultiplier * critMult * targetTraitDefMult));

      // v3.0.1 COUNTER: consume the stance on the first incoming damaging hit and
      // reflect that hit to the attacker. Counter is resolved before normal target damage.
      const counterStatus = (t.statuses ?? []).find(st => st.startsWith('カウンター:'));
      if (counterStatus) {
        t.statuses = (t.statuses ?? []).filter(st => !st.startsWith('カウンター:'));
        const reflected = Math.max(1, Math.round(calculatedDamage * 0.45));
        actor.currentHp = Math.max(0, actor.currentHp - reflected);
        actor.isFainted = actor.currentHp <= 0;
        showDamageNumber(t, 'COUNTER!', true, '#fbbf24');
        showDamageNumber(actor, `-${reflected}`, true, '#fb7185');
        addLog(`↩️【${t.monster.name}】のカウンター発動！ ${reflected}ダメージを【${actor.monster.name}】へ反射！`, 'critical');
        const counterCommitted = participantsRef.current.map(p =>
          p.id === t.id ? {...t, statuses:[...(t.statuses??[])]} :
          p.id === actor.id ? {...actor, statuses:[...(actor.statuses??[])]} : p
        );
        participantsRef.current = counterCommitted;
        setParticipants(counterCommitted);
        sceneRef.current?.syncParticipants?.(counterCommitted);
        return;
      }

      totalDamageDealtByActor += calculatedDamage;

      sound.playHit();

      // multi_hit は1発の大技ではなく、合計威力を複数ヒットに分けて見せる。
      const hitCount = move.specialEffect?.type === 'multi_hit' ? Math.max(2, move.specialEffect.hits || 3) : 1;
      if (hitCount > 1) {
        const perHit = Math.max(1, Math.round(calculatedDamage / hitCount));
        addLog(`👊【${actor.monster.name}】の${move.name}！ ${perHit}前後 × ${hitCount} HIT！`, 'critical');
      }

      if (t.isPlayer || isCrit) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 300);
      }

      showDamageNumber(t, calculatedDamage, isCrit);

      // Target debuffs / status effects from special attack
      let targetAtkMult = 1.0;
      let targetDefMult = 1.0;
      let targetSpdMult = 1.0;

      if (special) {
        const roll = Math.random() * 100 <= (special.rate || 100);
        if (roll) {
          if (special.type === 'burn') {
            targetAtkMult = 0.75;
            addLog(`🔥【${t.monster.name}】はやけどを負い、攻撃力が低下した！`, 'damage');
          } else if (special.type === 'paralyze') {
            targetSpdMult = 0.5;
            addLog(`⚡【${t.monster.name}】は麻痺して素早さと移動力が半減した！`, 'damage');
          } else if (special.type === 'freeze') {
            targetSpdMult = 0.3;
            addLog(`❄️【${t.monster.name}】は氷結し、動きが極度に鈍った！`, 'damage');
          } else if (special.type === 'atk_down') {
            targetAtkMult = special.value || 0.75;
            addLog(`📉【${t.monster.name}】の攻撃力がダウンした！`, 'info');
          } else if (special.type === 'def_down') {
            targetDefMult = special.value || 0.75;
            addLog(`🛡️📉【${t.monster.name}】の防御力がダウンした！`, 'info');
          } else if (special.type === 'spd_down') {
            targetSpdMult = special.value || 0.7;
            addLog(`💨📉【${t.monster.name}】の素早さがダウンした！`, 'info');
          }
        }
      }

      setParticipants((prevList) => {
        const nextList = prevList.map((p) => {
          if (p.id === t.id) {
            // 特殊移動効果。ダメージだけで終わらず、実際の盤面位置を変更する。
            let forcedPosition = p.position;
            const vx = p.position.x - actor.position.x;
            const vz = p.position.z - actor.position.z;
            const vlen = Math.max(0.001, Math.hypot(vx, vz));
            if (move.effectType === 'vortex_pull') {
              const pull = Math.min(8, Math.max(3, move.range * 0.28), Math.max(0, vlen - 1.8));
              forcedPosition = {
                ...p.position,
                x: p.position.x - (vx / vlen) * pull,
                z: p.position.z - (vz / vlen) * pull,
              };
              addLog(`🧲【${p.monster.name}】が ${pull.toFixed(1)}m 引き寄せられた！`, 'chaos');
            } else if (move.effectType === 'knockback_wave') {
              const push = Math.min(10, Math.max(4, move.range * 0.3));
              forcedPosition = {
                ...p.position,
                x: Math.max(-92, Math.min(92, p.position.x + (vx / vlen) * push)),
                z: Math.max(-92, Math.min(92, p.position.z + (vz / vlen) * push)),
              };
              addLog(`💨【${p.monster.name}】が ${push.toFixed(1)}m 吹き飛ばされた！`, 'chaos');
            }
            const currentShield = p.shield ?? 0;
            let shieldDamage = 0;
            let hpDamage = calculatedDamage;

            // シールドはHPより先に削る。特殊技だけ例外ルールを持つ。
            if (currentShield > 0) {
              if (/バリアクラッシャー/.test(move.name)) {
                shieldDamage = currentShield;
                hpDamage = calculatedDamage;
              } else if (/シールドブレイク/.test(move.name)) {
                shieldDamage = Math.min(currentShield, calculatedDamage * 2);
                hpDamage = Math.max(0, calculatedDamage - shieldDamage);
              } else if (/貫通攻撃/.test(move.name)) {
                shieldDamage = Math.min(currentShield, Math.round(calculatedDamage * 0.5));
                hpDamage = Math.max(0, calculatedDamage - shieldDamage);
              } else {
                shieldDamage = Math.min(currentShield, calculatedDamage);
                hpDamage = Math.max(0, calculatedDamage - shieldDamage);
              }
            }

            let nextHp = Math.max(0, p.currentHp - hpDamage);
            const nextShield = Math.max(0, currentShield - shieldDamage);

            if (shieldDamage > 0) {
              addLog(`🛡️【${p.monster.name}】のシールドが ${Math.round(shieldDamage)} 吸収！ 残り ${Math.round(nextShield)}`, 'info');
            }

            // Defensive Traits: Pinch Endure or Phoenix Rebirth
            if (nextHp === 0 && targetTrait) {
              if (targetTrait.id === 'trait_pinch_endure' || targetTrait.name === '起死回生の気迫') {
                nextHp = 1;
                addLog(`🛡️【特性：${targetTrait.name}】致命傷を気迫で耐え凌いだ！（HP 1残留）`, 'critical');
              } else if (targetTrait.id === 'trait_rebirth_phoenix' || targetTrait.name === '不死鳥の加護') {
                nextHp = Math.round(p.maxHp * 0.3);
                addLog(`🔥【特性：${targetTrait.name}】炎の翼で蘇った！（HP 30%回復）`, 'critical');
              }
            }

            const fainted = nextHp === 0;
            if (fainted) {
              sound.playFaint();
              addLog(`⚡【${p.monster.name}】は力尽き倒れた！`, 'faint');
            } else {
              addLog(
                `💥【${p.monster.name}】に ${calculatedDamage} のダメージ！${isCrit ? '（急所直撃！）' : ''}${
                  typeMultiplier > 1 ? '（効果はバツグンだ！）' : ''
                }`,
                isCrit ? 'critical' : 'damage'
              );
            }
            return {
              ...p,
              currentHp: nextHp,
              shield: nextShield,
              isFainted: fainted,
              attackBuff: Math.max(0.4, p.attackBuff * targetAtkMult),
              defenseBuff: Math.max(0.4, p.defenseBuff * targetDefMult),
              speedBuff: Math.max(0.3, p.speedBuff * targetSpdMult),
              position: forcedPosition,
            };
          }
          return p;
        });
        participantsRef.current = nextList;
        sceneRef.current?.syncParticipants?.(nextList);
        return nextList;
      });
    });

    // Trait: Spirit Drain (生命の略奪) heals 20% of damage dealt
    if (actorTrait && (actorTrait.id === 'trait_spirit_drain' || actorTrait.name === '生命の略奪') && totalDamageDealtByActor > 0) {
      const traitDrain = Math.max(12, Math.round(totalDamageDealtByActor * 0.2));
      sound.playBuff();
      showDamageNumber(actor, `+${traitDrain}`, false, '#10b981');
      addLog(`🩸【特性：${actorTrait.name}】相手の生命力を略奪し HPを ${traitDrain} 回復！`, 'critical');
      setParticipants((prevList) =>
        prevList.map((p) => {
          if (p.id === actor.id) {
            return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + traitDrain) };
          }
          return p;
        })
      );
    }

    // Post-attack special effects on the attacker (actor): Drain, Recoil, Self-Buffs
    if (special && totalDamageDealtByActor > 0) {
      if (special.type === 'drain') {
        const drainPercent = (special.value || 50) / 100;
        const drainHeal = Math.max(10, Math.round(totalDamageDealtByActor * drainPercent));
        sound.playBuff();
        showDamageNumber(actor, `+${drainHeal}`, false, '#10b981');
        addLog(`🩸【${actor.monster.name}】はドレイン吸収により HPを ${drainHeal} 回復した！`, 'critical');
        setParticipants((prevList) =>
          prevList.map((p) => {
            if (p.id === actor.id) {
              return { ...p, currentHp: Math.min(p.maxHp, p.currentHp + drainHeal) };
            }
            return p;
          })
        );
      } else if (special.type === 'recoil') {
        const recoilPercent = (special.value || 20) / 100;
        const recoilDmg = Math.max(10, Math.round(totalDamageDealtByActor * recoilPercent));
        showDamageNumber(actor, `-${recoilDmg}`, false, '#f43f5e');
        addLog(`💥【${actor.monster.name}】は攻撃の反動で ${recoilDmg} の自傷ダメージを受けた！`, 'damage');
        setParticipants((prevList) =>
          prevList.map((p) => {
            if (p.id === actor.id) {
              const nextHp = Math.max(0, p.currentHp - recoilDmg);
              return { ...p, currentHp: nextHp, isFainted: nextHp === 0 };
            }
            return p;
          })
        );
      } else if (special.type === 'atk_up') {
        const mult = special.value || 1.25;
        sound.playBuff();
        addLog(`⚔️📈【${actor.monster.name}】の攻撃力が上昇！`, 'critical');
        setParticipants((prevList) =>
          prevList.map((p) => (p.id === actor.id ? { ...p, attackBuff: p.attackBuff * mult } : p))
        );
      } else if (special.type === 'def_up') {
        const mult = special.value || 1.25;
        sound.playBuff();
        addLog(`🛡️📈【${actor.monster.name}】の防御力が上昇！`, 'critical');
        setParticipants((prevList) =>
          prevList.map((p) => (p.id === actor.id ? { ...p, defenseBuff: p.defenseBuff * mult } : p))
        );
      } else if (special.type === 'spd_up') {
        const mult = special.value || 1.3;
        sound.playBuff();
        addLog(`💨📈【${actor.monster.name}】の素早さが上昇！`, 'critical');
        setParticipants((prevList) =>
          prevList.map((p) => (p.id === actor.id ? { ...p, speedBuff: p.speedBuff * mult } : p))
        );
      }
    }
  };

  // 7. Status Move Logic
  const handleStatusMoveEffect = (actor: BattleParticipant, target: BattleParticipant | undefined, move: Move) => {
    sound.playBuff();
    const isAllAllies = move.targetScope === 'all_allies';
    const isHealing = Boolean(move.healRatio || move.description.includes('回復'));
    const isSingleAlly = move.targetScope === 'single_ally';

    // 回復・味方補助の対象を厳密に固定。single_ally は自分を含めず、射程内の味方だけ。
    if (isSingleAlly) {
      if (!target || target.id === actor.id || target.team !== actor.team || target.isFainted) {
        addLog(`❌『${move.name}』は自分自身や敵には使用できない！`, 'info');
        return;
      }
      const dist = Math.hypot(target.position.x - actor.position.x, target.position.z - actor.position.z);
      if (!(sceneRef.current?.isParticipantInMoveArea(actor, target, move) ?? false)) {
        addLog(`❌【${target.monster.name}】は効果範囲外！（距離 ${dist.toFixed(1)}m / 射程 ${move.range}m）`, 'info');
        return;
      }
    }

    setParticipants((prevList) =>
      prevList.map((p) => {
        const isSelf = p.id === actor.id;
        const isAlly = p.team === actor.team && !p.isFainted;
        const distFromActor = Math.hypot(p.position.x - actor.position.x, p.position.z - actor.position.z);
        const inRange = p.id !== actor.id && (sceneRef.current?.isParticipantInMoveArea(actor, p, move) ?? false);
        const validSingleAlly = isSingleAlly && target && p.id === target.id && p.id !== actor.id && isAlly && inRange;
        const validAllAlly = isAllAllies && p.id !== actor.id && isAlly && inRange;
        const validSelf = move.targetScope !== 'single_ally' && move.targetScope !== 'all_allies' && isSelf;

        if (validSelf || validSingleAlly || validAllAlly) {
          let nextHp = p.currentHp;
          if (isHealing) {
            const healRatio = Math.min(0.25, move.healRatio || 0.18);
            const healAmt = Math.round(p.maxHp * healRatio);
            nextHp = Math.min(p.maxHp, p.currentHp + healAmt);
            showDamageNumber(p, `+${healAmt}`, false, '#34d399');
            addLog(`💖【${p.monster.name}】のHPが ${healAmt} 回復！`, 'critical');
          }

          let nextStealthTurns = p.stealthTurns || 0;
          let nextDecoyCount = p.decoyCount || 0;

          if (move.effectType === 'stealth_cloak') {
            nextStealthTurns = 2;
            showDamageNumber(p, 'STEALTH ON', false, '#c084fc');
            addLog(
              `👻【${p.monster.name}】は光学迷彩を発動し透明化した！（2ターン回避率特大UP＆次撃ダメージ大幅UP）`,
              'critical'
            );
          }

          if (move.name.includes('カウンター')) {
            // 次に受ける1回の攻撃を反射
            p.statuses = [...(p.statuses ?? []).filter((s) => !s.startsWith('カウンター:')), 'カウンター:1'];
            addLog(`↩️【${p.monster.name}】はカウンター態勢！次の攻撃を無効化し、受けるはずだったダメージの45%を反射する！`, 'critical');
          }

          if (move.effectType === 'decoy_clone') {
            nextDecoyCount = 1;
            showDamageNumber(p, 'DECOY x1', false, '#38bdf8');
            addLog(
              `👥【${p.monster.name}】は1体の立体ホログラム分身（デコイ）を展開した！（攻撃を1回だけ身代わり）`,
              'critical'
            );
          }

          return {
            ...p,
            currentHp: nextHp,
            stealthTurns: nextStealthTurns,
            decoyCount: nextDecoyCount,
            attackBuff: p.attackBuff * (move.effectType === 'stealth_cloak' || move.effectType === 'decoy_clone' ? 1.0 : 1.3),
            defenseBuff: p.defenseBuff * (move.effectType === 'stealth_cloak' || move.effectType === 'decoy_clone' ? 1.0 : 1.3),
          };
        }
        return p;
      })
    );
  };

  // ONLINE STATE SYNC: BattleScreen remains the battle engine; server only relays snapshots.
  // Do NOT resend drawing imageSrc every 100ms. In 2vs2 four Base64 drawings made each
  // snapshot huge enough to delay/drop turn handoffs. Images are already present locally.
  const compactOnlineParticipants = (list: BattleParticipant[]) => list.map(p => ({
    ...p, monster: { ...p.monster, imageSrc: '' }
  }));
  const hydrateOnlineParticipants = (list: BattleParticipant[]) => list.map(remote => {
    const local = participantsRef.current.find(p => p.id === remote.id);
    const rosterMonster = onlinePlayers?.[remote.playerIndex ?? -1];
    const imageSrc = local?.monster?.imageSrc || rosterMonster?.imageSrc || remote.monster.imageSrc || '';
    // v3.1.1: isPlayer is local-client identity and must never be inherited from
    // another player's snapshot. Otherwise when that remote player faints, every
    // client can incorrectly enter spectator mode.
    return {
      ...remote,
      isPlayer: remote.playerIndex === localPlayerIndex,
      isPlayer2: false,
      monster: { ...remote.monster, imageSrc },
    };
  });
  const applyingRemoteRef = useRef(false);
  const lastOnlineSendRef = useRef(0);
  useEffect(() => {
    if (matchType !== 'online' || !onlineWs) return;
    const receive = (e: MessageEvent) => {
      let msg:any; try { msg=JSON.parse(e.data); } catch { return; }
      if (msg.type !== 'battle_sync' || msg.from === localPlayerIndex) return;
      const st=msg.state; if(!st?.participants) return;
      applyingRemoteRef.current=true;
      const hydrated = hydrateOnlineParticipants(st.participants);
      // v3.0.1: remote clients also need damage/heal feedback. Compare the incoming
      // authoritative snapshot against what this client last rendered.
      for (const next of hydrated) {
        const before = participantsRef.current.find(p => p.id === next.id);
        if (!before) continue;
        const delta = next.currentHp - before.currentHp;
        if (delta < 0) showDamageNumber(next, `${delta}`, false, '#ffffff');
        else if (delta > 0) showDamageNumber(next, `+${delta}`, false, '#34d399');
      }
      setParticipants(hydrated);
      participantsRef.current=hydrated;
      if (Array.isArray(st.turnOrder)) { setTurnOrder(st.turnOrder); turnOrderRef.current=st.turnOrder; }
      if (Number.isInteger(st.currentTurnIndex)) { setCurrentTurnIndex(st.currentTurnIndex); currentTurnIndexRef.current=st.currentTurnIndex; }
      if (Number.isInteger(st.roundNumber)) { setRoundNumber(st.roundNumber); roundNumberRef.current=st.roundNumber; }
      if (st.turnPhase) setTurnPhase(st.turnPhase);
      if (Array.isArray(st.battleLogs)) {
        setBattleLogs(prev => {
          const merged = [...st.battleLogs, ...prev];
          const seen = new Set<string>();
          return merged.filter((x:any) => { if (!x?.id || seen.has(x.id)) return false; seen.add(x.id); return true; }).sort((a:any,b:any)=>(b.timestamp||0)-(a.timestamp||0)).slice(0,36);
        });
      }
      // Battle result is perspective-dependent. Never copy the sender's VICTORY to
      // the defeated client; derive it from this client's own team.
      const localTeam = hydrated.find(p => p.playerIndex === localPlayerIndex)?.team;
      const ownLiving = hydrated.filter(p => p.team === localTeam && !p.isFainted);
      const enemyLiving = hydrated.filter(p => p.team !== localTeam && !p.isFainted);
      const locallyOver = ownLiving.length === 0 || enemyLiving.length === 0;
      setIsBattleOver(locallyOver);
      setBattleResult(ownLiving.length === 0 ? 'defeat' : enemyLiving.length === 0 ? 'victory' : null);
      sceneRef.current?.syncParticipants?.(hydrated);
      setTimeout(()=>{applyingRemoteRef.current=false},0);
    };
    onlineWs.addEventListener('message',receive);
    return()=>onlineWs.removeEventListener('message',receive);
  },[matchType,onlineWs,localPlayerIndex]);

  // During our own turn, publish the exact live BattleScreen state (including movement/rotation).
  useEffect(()=>{
    if(matchType!=='online'||!onlineWs) return;
    const timer=setInterval(()=>{
      if(applyingRemoteRef.current||onlineWs.readyState!==WebSocket.OPEN) return;
      const activeId=turnOrderRef.current[currentTurnIndexRef.current];
      const active=participantsRef.current.find(p=>p.id===activeId);
      const owner=active?.playerIndex;
      // P1 may publish initial state; afterwards only the active player's client is authoritative.
      if(owner!==localPlayerIndex && !(turnOrderRef.current.length===0 && localPlayerIndex===0)) return;
      const now=Date.now(); if(now-lastOnlineSendRef.current<90)return; lastOnlineSendRef.current=now;
      onlineWs.send(JSON.stringify({type:'battle_sync',state:{participants:compactOnlineParticipants(participantsRef.current),turnOrder:turnOrderRef.current,currentTurnIndex:currentTurnIndexRef.current,roundNumber:roundNumberRef.current,turnPhase,isBattleOver,battleResult,battleLogs:battleLogs.slice(0,36)}}));
    },180);
    return()=>clearInterval(timer);
  },[matchType,onlineWs,localPlayerIndex,turnPhase,isBattleOver,battleResult,battleLogs]);

  // 8. Lifecycle Setup
  // Three.js owns DOM inside the arena container. Use a layout effect so its canvas
  // is removed before React mutates/unmounts the surrounding battle DOM.
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const scene = new BattleArenaScene(containerRef.current, {
      onDamageDealt: () => {},
      onBattleLog: (text, type) => addLog(text, type),
      onMoveDistanceChanged: (rem) => {
        setTurnRemainingDist(rem);
      },
    });
    sceneRef.current = scene;

    const initialList = initializeParticipants();
    setParticipants(initialList);
    scene.initParticipants(initialList, mode);
    if (matchType === 'online') {
      scene.setLocalViewParticipant(`online_${localPlayerIndex}`);
    }

    startNewRound(initialList, 1);

    // Track Screen coordinates for floating monster healthbars
    const hudInterval = setInterval(() => {
      if (sceneRef.current) {
        const huds = participantsRef.current.map((p) => {
          const coords = sceneRef.current!.getScreenCoordinates(p.position, 6.2);
          return { id: p.id, ...coords };
        });
        setScreenHuds(huds);
      }
    }, 45);

    return () => {
      clearInterval(hudInterval);
      scene.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When turn changes, trigger participant turn
  useEffect(() => {
    if (turnOrder.length > 0 && currentTurnIndex < turnOrder.length) {
      const activeId = turnOrder[currentTurnIndex];
      // React state updates for order/index can arrive separately. Start each logical
      // turn only once so a CPU cannot get duplicate actions or steal a human turn.
      const key = `${turnEpochRef.current}:${activeId}`;
      if (lastStartedTurnRef.current === key) return;
      lastStartedTurnRef.current = key;
      turnOrderRef.current = turnOrder;
      currentTurnIndexRef.current = currentTurnIndex;
      activeTurnIdRef.current = activeId;
      startParticipantTurn(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnOrder, currentTurnIndex]);

  // Handle move change from UI
  const handleSelectMove = (index: number) => {
    if (!activeParticipant || activeParticipant.isBot === true) return;
    sound.playClick();
    setSelectedMoveIndex(index);
    const m = activeParticipant.monster.moves[index];
    if (m && sceneRef.current) {
      sceneRef.current.setSelectedMove(m);

      const isSelf =
        m.targetScope === 'self' ||
        (m.category === 'status' && (!m.targetScope || m.targetScope === 'self')) ||
        m.effectType === 'stealth_cloak' ||
        m.effectType === 'decoy_clone' ||
        m.effectType === 'buff_aura';

      if (isSelf) {
        setTargetId(activeParticipant.id);
        sceneRef.current.setTargetParticipant(activeParticipant.id);
      } else if (targetId === activeParticipant.id) {
        const livingEnemies = participants.filter((p) => p.team !== activeParticipant.team && !p.isFainted);
        if (livingEnemies.length > 0) {
          let closest = livingEnemies[0];
          let minDist = Infinity;
          livingEnemies.forEach((e) => {
            const d = Math.hypot(e.position.x - activeParticipant.position.x, e.position.z - activeParticipant.position.z);
            if (d < minDist) {
              minDist = d;
              closest = e;
            }
          });
          setTargetId(closest.id);
          sceneRef.current.setTargetParticipant(closest.id);
        }
      }
    }
  };

  // Handle target change from UI
  const handleSelectTarget = (id: string) => {
    if (!activeParticipant || activeParticipant.isBot === true) return;
    sound.playClick();
    setTargetId(id);
    sceneRef.current?.setTargetParticipant(id);
  };

  // Check if target is inside range
  const currentMove = activeParticipant?.monster.moves[selectedMoveIndex];
  const isCurrentMoveSelf = Boolean(
    currentMove &&
      (currentMove.targetScope === 'self' ||
        (currentMove.category === 'status' && (!currentMove.targetScope || currentMove.targetScope === 'self')) ||
        currentMove.effectType === 'stealth_cloak' ||
        currentMove.effectType === 'decoy_clone' ||
        currentMove.effectType === 'buff_aura')
  );

  const currentTarget = isCurrentMoveSelf
    ? activeParticipant
    : participants.find((p) => p.id === targetId && !p.isFainted);

  const targetDistance =
    activeParticipant && currentTarget && !isCurrentMoveSelf
      ? Math.hypot(activeParticipant.position.x - currentTarget.position.x, activeParticipant.position.z - currentTarget.position.z)
      : 0;

  const isTargetInRange = isCurrentMoveSelf
    ? true
    : Boolean(currentMove && activeParticipant && currentTarget && (sceneRef.current?.isParticipantInMoveArea(activeParticipant, currentTarget, currentMove) ?? false));

  useEffect(() => {
    const selected = participants.find(p => p.id === targetId);
    if (selected?.isFainted) {
      setTargetId('');
      sceneRef.current?.setTargetParticipant(null);
    }
  }, [participants, targetId]);

  const isHumanTurn =
    activeParticipant && activeParticipant.isBot !== true && (matchType === 'online' ? activeParticipant.playerIndex === localPlayerIndex : (activeParticipant.isPlayer || (matchType === 'pvp' && activeParticipant.isPlayer2)));

  const localParticipant = participants.find(x => x.playerIndex === localPlayerIndex) || participants.find(x => x.isPlayer);
  const localTeam = localParticipant?.team ?? 0;
  const relationOf = (p: BattleParticipant) => p.id === localParticipant?.id ? '自分' : p.team === localTeam ? '味方' : '敵';
  const relationClass = (p: BattleParticipant) => p.id === localParticipant?.id ? 'border-cyan-300 ring-2 ring-cyan-400/60' : p.team === localTeam ? 'border-sky-400/80' : 'border-rose-500/90';

  return (
    <div
      className={`relative w-full h-screen overflow-hidden bg-slate-950 select-none ${
        screenShake ? 'animate-bounce' : ''
      }`}
    >
      {/* 常時見える体力ゲージ。3D上のゲージが画面外でも残HPを確認できる。 */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[min(96vw,900px)] grid grid-cols-2 md:grid-cols-4 gap-2 pointer-events-none">
        {participants.filter(p => {
          if (p.isFainted) return false;
          const local = participants.find(x => x.playerIndex === localPlayerIndex) || participants.find(x => x.isPlayer);
          return !(matchType === 'online' && local && p.team !== local.team && (p.stealthTurns || 0) > 0);
        }).map(p => {
          const pct = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
          return <div key={`fixed-hp-${p.id}`} className={`bg-slate-950/90 border-2 ${relationClass(p)} rounded-xl px-2 py-1 backdrop-blur`}>
            <div className="flex justify-between text-[10px] font-black text-white gap-2"><span className="truncate"><span className={p.team===localTeam?'text-cyan-300':'text-rose-300'}>{relationOf(p)} </span><span className={p.team===0?'text-sky-300':'text-rose-300'}>[TEAM {p.team===0?'A':p.team===1?'B':String(p.team+1)}] </span>{p.monster.name}</span><span className="shrink-0">P{(p.playerIndex??0)+1} · {p.currentHp}/{p.maxHp}</span></div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-1"><div className={`h-full transition-all ${pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width:`${pct}%`}} /></div>
            {(p.shield ?? 0) > 0 && <div className="text-[9px] text-sky-300 mt-0.5">🛡 {Math.round(p.shield ?? 0)}</div>}
          </div>;
        })}
      </div>

      {/* 3D Arena WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {Boolean(localParticipant?.isFainted) && participants.some(p => !p.isFainted) && !isBattleOver && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-black/80 border border-slate-500 text-white font-black tracking-widest pointer-events-none">
          👁 観戦モード — あなたのモンスターは戦闘不能
        </div>
      )}

      {/* Floating 3D Monster HUD Healthbars */}
      {matchType !== 'online' && screenHuds.map((hud) => {
        const p = participants.find((x) => x.id === hud.id);
        if (!p || !hud.visible || p.isFainted) return null;
        const local = participants.find(x => x.playerIndex === localPlayerIndex) || participants.find(x => x.isPlayer);
        if (matchType === 'online' && local && p.team !== local.team && (p.stealthTurns || 0) > 0) return null;

        const hpPercent = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
        const isCurrentActive = p.id === activeParticipant?.id;
        const isTargeted = p.id === targetId;

        return (
          <div
            key={hud.id}
            style={{
              transform: `translate(-50%, -100%) translate(${hud.x}px, ${hud.y}px)`,
            }}
            className={`absolute pointer-events-auto transition-all cursor-pointer ${
              isCurrentActive ? 'z-30 scale-105' : 'z-20'
            } pointer-events-none`}
          >
            <div
              className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-md flex flex-col items-center gap-1 min-w-[130px] shadow-lg ${
                isCurrentActive
                  ? 'border-cyan-400 bg-slate-900/90 ring-2 ring-cyan-400/50'
                  : p.team === localTeam
                  ? 'border-sky-400 bg-sky-950/85 ring-1 ring-sky-400/50'
                  : 'border-rose-500 bg-rose-950/85 ring-1 ring-rose-500/50'
              }`}
            >
              {/* Header: Name + Badge */}
              <div className="flex items-center justify-between w-full gap-1.5 text-[11px] font-black leading-none">
                <span className="truncate text-white max-w-[100px]"><span className={p.team===localTeam?'text-cyan-300':'text-rose-300'}>{relationOf(p)} </span>{p.monster.name}</span>
                <div className="flex items-center gap-1">
                  {Boolean(p.stealthTurns && p.stealthTurns > 0) && (
                    <span className="px-1 py-0.5 rounded bg-purple-600/90 text-[8px] text-purple-100 font-bold animate-pulse">
                      👻ステルス
                    </span>
                  )}
                  {Boolean(p.decoyCount && p.decoyCount > 0) && (
                    <span className="px-1 py-0.5 rounded bg-sky-600/90 text-[8px] text-sky-100 font-bold">
                      👥分身x{p.decoyCount}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      p.isPlayer
                        ? 'bg-blue-500 text-white'
                        : p.isPlayer2
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {p.isPlayer ? 'P1' : p.isPlayer2 ? 'P2' : 'CPU'}
                  </span>
                </div>
              </div>

              {/* HP Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    hpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : hpPercent > 20
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-400 animate-pulse'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {/* HP Text + Distance from active */}
              <div className="flex items-center justify-between w-full text-[9px] text-slate-300 font-semibold">
                <span>
                  {p.currentHp}/{p.maxHp}
                </span>
                {activeParticipant && p.id !== activeParticipant.id && (
                  <span className="text-amber-300">
                    {Math.hypot(activeParticipant.position.x - p.position.x, activeParticipant.position.z - p.position.z).toFixed(1)}m
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Damage Popups */}
      {floatingDamages.map((dmg) => (
        <div
          key={dmg.id}
          style={{
            left: `${dmg.x}px`,
            top: `${dmg.y}px`,
            transform: 'translate(-50%, -50%)',
            color: dmg.color || (dmg.isCritical ? '#fbbf24' : '#ffffff'),
          }}
          className={`absolute pointer-events-none font-black text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] animate-out fade-out slide-out-to-top-8 duration-1000 z-50 ${
            dmg.isCritical ? 'text-3xl scale-110 font-mono text-amber-300' : ''
          }`}
        >
          {dmg.damage}
        </div>
      ))}

      {/* Top HUD Bar */}
      <header className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-40">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="battle-back-btn"
            onClick={() => {
              sound.playClick();
              onBackToModeSelect();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>撤退</span>
          </button>

          <button
            id="battle-mute-btn"
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 shadow-lg backdrop-blur cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Round & Turn Status */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="px-4 py-1 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl backdrop-blur flex items-center gap-2">
            <span className="text-amber-400 font-extrabold text-xs">ROUND {roundNumber}</span>
            <span className="text-slate-500 text-xs">•</span>
            <div className="flex items-center gap-1 text-xs font-black">
              {isHumanTurn ? (
                activeParticipant?.isPlayer ? (
                  <span className="text-blue-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> P1（あなたのターン）
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> P2（フレンドのターン）
                  </span>
                )
              ) : (
                <span className="text-slate-300 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-amber-400" /> {activeParticipant?.monster.name}（CPU行動中）
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match Type Badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-black text-slate-300 backdrop-blur shadow">
            {matchType === 'online' ? `🌐 オンライン P${localPlayerIndex+1}` : matchType === 'pvp' ? '👥 対人戦 (PvP)' : '🤖 ボット対戦'} / {mode}
          </span>
        </div>
      </header>

      {/* Real-time Mobility Gauge (Top-Center underneath Header) */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none z-40 flex flex-col items-center gap-1">
        <div className="px-4 py-1.5 rounded-2xl bg-slate-950/85 border border-cyan-500/40 shadow-2xl backdrop-blur flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-black text-cyan-300">
            <Compass className="w-4 h-4" />
            <span>残り移動力:</span>
          </div>
          <div className="w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-150 ${
                turnRemainingDist / (turnMaxDist || 1) > 0.4 ? 'bg-cyan-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, (turnRemainingDist / (turnMaxDist || 1)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-black text-white font-mono">
            {turnRemainingDist.toFixed(1)}m / {turnMaxDist.toFixed(0)}m
          </span>
        </div>

        {/* Active Monster Trait Banner */}
        {activeParticipant?.monster.specialAbility && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-400/80 text-amber-300 text-[11px] font-bold flex items-center gap-2 shadow-lg backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate max-w-xs md:max-w-md">
              特性: <strong className="text-amber-200 font-black">{activeParticipant.monster.specialAbility.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* PC/Chromebook: movement is keyboard-only (WASD, arrows rotate). */}

      {/* Tactical Action Dock (Bottom Center & Right) */}
      {isHumanTurn && activeParticipant && turnPhase === 'TACTICAL_CONTROL' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1120px,94%)] z-40 pointer-events-auto flex flex-col gap-1">
          {/* Energy / Shield */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-black">
            <span className="text-amber-300">⚡ EN {activeParticipant.energy ?? 0}/100</span>
            <span className="text-cyan-300">🛡️ SH {activeParticipant.shield ?? 0}</span>
          </div>

          {currentMove && <div className="px-3 py-1.5 rounded-xl bg-slate-950/92 border border-amber-400/50 flex items-center gap-3 text-[11px] overflow-hidden"><b className="text-amber-300 shrink-0">{currentMove.name}</b><span className="text-slate-200 truncate">{currentMove.description || currentMove.specialEffect?.description || '特殊効果なし'}</span><span className="text-cyan-300 shrink-0">射程 {sceneRef.current?.getMoveAreaSpec(currentMove).range.toFixed(0) ?? currentMove.range}m</span></div>}

          {/* 4 Moves Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeParticipant.monster.moves.map((m, idx) => {
              const isSelected = selectedMoveIndex === idx;
              const areaSpec = sceneRef.current?.getMoveAreaSpec(m);
              const rangeLabel = areaSpec ? `${areaSpec.shape==='disk'?'円形':areaSpec.shape==='landing'?'地点':areaSpec.shape==='rect'?'直線':areaSpec.shape==='sector'?'前方':'自己'} ${areaSpec.range.toFixed(0)}m` : `射程 ${m.range}m`;
              const moveCd = activeParticipant.moveCooldowns?.[idx] ?? 0;
              const moveCost = getMoveEnergyCost(m);
              const unavailable = moveCd > 0 || (activeParticipant.energy ?? 0) < moveCost;

              return (
                <button
                  key={m.id || idx}
                  disabled={unavailable}
                  onClick={() => handleSelectMove(idx)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/50 scale-102'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {m.type}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        m.range <= 12 ? 'bg-orange-950/80 text-orange-300' : 'bg-cyan-950/80 text-cyan-300'
                      }`}
                    >
                      {rangeLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="text-xs font-black text-white truncate">{m.name}</div>
                    <span className={`text-[9px] font-black ${moveCd > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {moveCd > 0 ? `CT ${moveCd}` : `⚡${moveCost}`}
                    </span>
                  </div>

                  {/* Tactical Mechanic Tag */}
                  {m.effectType && (
                    <div className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30 truncate mb-1">
                      {m.effectType === 'stealth_cloak' && '👻 光学迷彩・ステルス'}
                      {m.effectType === 'decoy_clone' && '👥 分身デコイ召喚'}
                      {m.effectType === 'line_beam' && '⚡ 直線貫通レーザー'}
                      {m.effectType === 'spread_3way' && '✨ 3方向扇状拡散弾'}
                      {m.effectType === 'ground_mortar' && '☄️ 高角放物迫撃砲'}
                      {m.effectType === 'teleport_strike' && '🌀 背後瞬動ワープ斬'}
                      {m.effectType === 'vortex_pull' && '🧲 引力ブラックホール'}
                      {m.effectType === 'knockback_wave' && '💨 斥力ノックバック波'}
                      {m.effectType === 'dash_strike' && '⚔️ 跳躍突進ストライク'}
                      {m.effectType === 'spin_slash' && '🌪️ 跳躍回転スラッシュ'}
                      {m.effectType === 'projectile' && '🎯 遠隔エネルギー弾'}
                      {m.effectType === 'explosion' && '💥 全域広範囲大爆発'}
                      {m.effectType === 'beam' && '🌟 高出力照射カノン'}
                      {m.effectType === 'buff_aura' && (m.healRatio ? '💖 自己回復オーラ' : '🔥 自己強化オーラ')}
                      {m.effectType === 'chaos_distort' && '🌀 禁忌の混沌歪曲'}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>威力: {m.power > 0 ? m.power : '-'}</span>
                    <span>命中: {m.accuracy}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Execution Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="execute-move-btn"
              disabled={!currentMove}
              onClick={() => {
                if (currentMove) {
                  sound.playClick();
                  // 攻撃はターゲット指定なし。色付き攻撃範囲に入っている敵全員へ問答無用で判定。
                  // 自己スキルだけは使用者自身を渡す。
                  executeAction(activeParticipant, isCurrentMoveSelf ? activeParticipant : undefined, currentMove);
                }
              }}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-2xl transition-all cursor-pointer ${
                isCurrentMoveSelf
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30 scale-102 active:scale-95'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-rose-500/30 scale-102 active:scale-95'
              }`}
            >
              {isCurrentMoveSelf ? <Sparkles className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
              <span>
                {isCurrentMoveSelf
                  ? `スキル発動！（『${currentMove?.name}』を発動してターン終了）`
                  : '技を放つ！（攻撃したらターン終了）'}
              </span>
            </button>

            <button
              id="end-turn-standby-btn"
              onClick={() => {
                sound.playClick();
                addLog(`🛡️【${activeParticipant.monster.name}】はその場で待機した。`, 'info');
                advanceToNextTurn();
              }}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow-xl cursor-pointer transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>待機してターン終了</span>
            </button>
          </div>
        </div>
      )}

      {/* Battle Log Sidebar (Top Right) */}
      <div className="absolute top-32 right-4 w-72 max-h-52 overflow-y-auto z-30 pointer-events-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-3 backdrop-blur shadow-2xl text-xs space-y-1.5 scrollbar-thin">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>戦闘ログ</span>
          <span className="text-[9px] text-slate-500">{battleLogs.length}件</span>
        </div>
        {battleLogs.map((log) => (
          <div
            key={log.id}
            className={`leading-relaxed text-[11px] ${
              log.type === 'critical'
                ? 'text-amber-300 font-bold'
                : log.type === 'faint'
                ? 'text-rose-400 font-black'
                : log.type === 'damage'
                ? 'text-rose-200'
                : log.type === 'attack'
                ? 'text-cyan-300'
                : log.type === 'chaos'
                ? 'text-purple-300 font-bold'
                : 'text-slate-400'
            }`}
          >
            {log.text}
          </div>
        ))}
      </div>

      {/* Game Over Modal Screen */}
      {isBattleOver && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                battleResult === 'victory'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {battleResult === 'victory' ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
              {battleResult === 'victory'
                ? matchType === 'pvp'
                  ? 'P1 TEAM WINNER!'
                  : 'VICTORY! 完全勝利！'
                : matchType === 'pvp'
                ? 'P2 TEAM WINNER!'
                : 'DEFEAT... 敗北'}
            </h2>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {battleResult === 'victory'
                ? 'スタジアムの全敵モンスターを圧倒！見事な移動と射程管理で栄光を掴み取りました！'
                : '戦場に力尽きました... 移動によるポジショニングや50種以上の特性相性を活用して再挑戦しましょう！'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                id="battle-rematch-btn"
                onClick={() => {
                  sound.playClick();
                  setIsBattleOver(false);
                  setBattleResult(null);
                  const initialList = initializeParticipants();
                  setParticipants(initialList);
                  sceneRef.current?.initParticipants(initialList, mode);
                  startNewRound(initialList, 1);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>もう一度対戦する</span>
              </button>

              <button
                id="battle-exit-btn"
                onClick={() => {
                  sound.playClick();
                  onBackToModeSelect();
                }}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <span>モード選択へ戻る</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
