export type ScreenType = 'title' | 'tutorial' | 'draw' | 'analysis' | 'mode_select' | 'battle' | 'online_lobby' | 'online_battle';

export type BattleModeType = '1vs1' | '1vs1vs1vs1' | '2vs2';

export type MatchType = 'bot' | 'pvp' | 'online'; // ボット対戦 (VS CPU) または 対人戦 (ローカルフレンド対戦/PvP)

export type ElementType = '炎' | '水' | '草' | '雷' | '闇' | '光' | '地' | '風';

export type MoveCategory = 'attack' | 'status' | 'chaos';

export type MoveTargetScope = 
  | 'single_enemy'  // 単体敵
  | 'all_enemies'   // 敵全体一斉攻撃
  | 'single_ally'   // 味方単体（2vs2）
  | 'all_allies'    // 味方全体（自分＋相棒）
  | 'self'          // 自身のみ
  | 'all_field';    // フィールド全員（敵味方すべて）

export type AttackSpecialEffectType =
  | 'drain'       // HP吸収 (ドレイン: 与ダメージの%をHP回復)
  | 'recoil'      // 反動ダメージ (与ダメージの%を自身が受ける)
  | 'burn'        // やけど (相手の攻撃力低下 & 持続ダメージ)
  | 'paralyze'    // まひ (相手の素早さ・移動力を半減)
  | 'freeze'      // 氷結 (相手を1ターン行動不能)
  | 'atk_down'    // 相手の攻撃力ダウン (-25%)
  | 'def_down'    // 相手の防御力ダウン (-25%)
  | 'spd_down'    // 相手の素早さ・移動力ダウン (-30%)
  | 'atk_up'      // 自身の攻撃力アップ (+25%)
  | 'def_up'      // 自身の防御力アップ (+25%)
  | 'spd_up'      // 自身の素早さ・移動力アップ (+30%)
  | 'high_crit'   // 急所率超大幅アップ (+40%)
  | 'multi_hit';  // 2〜4回連続ヒット

export interface MoveSpecialEffect {
  type: AttackSpecialEffectType;
  rate?: number; // 発生確率 (0 ~ 100%) - ドレインや反動は100%
  value?: number; // 吸収率(30~70%)、反動率(15~25%)、ステータス増減倍率など
  hits?: number; // multi_hitの場合の回数 (2~4)
  description: string; // 技カードに表示する説明文（例: "与ダメの50%をHP吸収"）
}

export interface Move {
  id: string;
  name: string;
  type: ElementType;
  category: MoveCategory; // 攻撃 / 補助 / ゲームバランス崩壊級カオス
  targetScope?: MoveTargetScope; // 攻撃範囲・対象区分（単体/全体/自身）
  power: number; // 0 for pure status, 30 - 95 (ステータス依存型バランス調整), 999 for rare chaos
  accuracy: number; // 50 - 100
  cooldown?: number; // legacy compat
  range: number;
  description: string;
  effectType: 
    | 'dash_strike' 
    | 'projectile' 
    | 'explosion' 
    | 'beam' 
    | 'spin_slash' 
    | 'chaos_distort' 
    | 'buff_aura' 
    | 'eraser_strike' 
    | 'time_stop' 
    | 'roulette'
    | 'line_beam'        // 直線貫通レーザー・ビーム
    | 'spread_3way'       // 3方向・扇状拡散弾
    | 'ground_mortar'     // 遠距離地点爆破・迫撃弾
    | 'teleport_strike'   // 瞬間移動・背後奇襲
    | 'stealth_cloak'     // 透明化・クローキング
    | 'decoy_clone'       // 分身・デコイ召喚
    | 'vortex_pull'       // 引き寄せ・ブラックホール
    | 'knockback_wave'    // 衝撃波ノックバック・突き放し
    | 'barrier_wall';     // フィールド障害物・壁生成
  healRatio?: number; // 最大HPに対する割合回復 (0.1 ~ 1.0)
  specialEffect?: MoveSpecialEffect; // 攻撃技に付与される特殊能力（ドレイン、反動、ステータス低下/上昇など）
  chaosType?: 
    | 'hp_reverse'         // エントロピー逆転（HP現在値と減った分を反転）
    | 'cheat_atk_boost'    // チートコード（攻撃力+500%）
    | 'time_stop'          // ザ・ワールド（相手を1ターン完全行動不能）
    | 'god_eraser'         // 神の消しゴム（相手の現在HPと攻撃力を半減消去）
    | 'death_roulette'     // ロシアンルーレット（50%相手即死、50%自分即死）
    | 'skill_steal'        // 著作権侵害（相手のバフと攻撃力を強奪）
    | 'black_hole'         // ブラックホール（全員のHPを40%削り全バフ消去）
    | 'super_chat'         // 課金パワー（HP全快＋無敵バリア付与）
    | 'controller_hijack'  // 指示妨害（相手に自傷大ダメージ）
    | 'nuclear_cataclysm'; // 天変地異（敵味方全員に特大爆発ダメージ）
}

export interface MonsterStats {
  hp: number;        // 最大2000スケール (500 - 2000)
  maxHp: number;
  attack: number;    // 200 - 1000
  defense: number;   // 200 - 900
  speed: number;     // 150 - 800
}

export interface ActiveBuff {
  type: 'atk_up' | 'def_up' | 'spd_up' | 'invincible' | 'frozen' | 'burn' | 'charged';
  multiplier: number;
  turnsRemaining: number;
}

export interface MonsterData {
  id: string;
  name: string;
  imageSrc: string;   // Data URL of the exact user drawn image
  aspectRatio: number;
  type: ElementType;
  stats: MonsterStats;
  specialAbility: {
    id?: string;
    name: string;
    description: string;
    category?: string;
  };
  moves: [Move, Move, Move, Move]; // 4つの技！
  analysisReason: string;
  isPlayer: boolean;
  team: number;
}

export interface BattleParticipant {
  id: string;
  name?: string;
  trainerName?: string;
  monster: MonsterData;
  currentHp: number;
  maxHp: number;
  attackModifier?: number; // 攻撃力倍率（バフ・デバフ）
  defenseModifier?: number;
  speedModifier?: number;
  attackBuff: number;
  defenseBuff: number;
  speedBuff: number;
  isInvincible?: boolean;
  isFrozen?: boolean; // 時間停止・スタン
  burnTurns?: number;
  team: number;
  isPlayer: boolean;
  isPlayer2?: boolean;
  playerIndex?: number; // 0 for P1, 1 for P2 (PvP)
  isBot: boolean;
  // 3Dアリーナ内で直接操作・移動するモンスターの座標
  position: { x: number; y: number; z: number };
  rotation: number;
  // ターンごとのランダム移動距離システム
  maxMoveDistance: number; // ターン開始時にダイス＋素早さで決定した総移動可能距離
  remainingMoveDistance: number; // 現在のターンでまだ移動できる距離 (m)
  turnStartPosition: { x: number; y: number; z: number }; // 移動範囲リングの原点
  // 互換性保持
  spotPosition?: { x: number; y: number; z: number };
  trainerPosition?: { x: number; y: number; z: number };
  trainerRotation?: number;
  isAttacking?: boolean;
  isFainted: boolean;
  // ターン選択
  selectedMoveIndex?: number | null;
  selectedTargetId?: string | null;
  // 戦略リソース（ローカル/オンライン共通）
  energy?: number;                 // 0〜100
  shield?: number;                 // HPとは別のシールド耐久
  moveCooldowns?: number[];        // 技4つの残りCT
  statuses?: string[];             // 状態異常・一時効果
  // 特殊戦術状態
  stealthTurns?: number;     // ステルス・透明化残りターン数
  decoyCount?: number;       // 分身・デコイの残り体数
  // 特性発動フラグ管理
  hasEnduredPinch?: boolean; // 根性・不撓不屈発動フラグ
  hasRebirthed?: boolean;    // 不死鳥の再燃発動フラグ
  traitAnnounced?: boolean;  // バトル登場時特性アナウンスフラグ
}

export interface BattleLogEntry {
  id: string;
  text: string;
  type: 'attack' | 'damage' | 'faint' | 'info' | 'critical' | 'chaos';
  timestamp: number;
}

export interface SavedMonsterEntry {
  id: string;
  name: string;
  savedAt: number;
  monster: MonsterData;
  wins?: number;
  battles?: number;
}


