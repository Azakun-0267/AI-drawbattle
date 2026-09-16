import { ElementType, MonsterData, MonsterStats, Move } from '../types';
import { getElementMovePool, RARE_CHAOS_MOVES } from '../data/movesPool';
import { MONSTER_TRAITS_POOL } from '../data/traitsPool';
import { STRATEGIC_MOVES, GAMBLE_MOVES } from '../data/strategicMoves';

export interface AnalysisResult {
  stats: MonsterStats;
  type: ElementType;
  name: string;
  specialAbility: {
    name: string;
    description: string;
    id?: string;
  };
  moves: [Move, Move, Move, Move];
  analysisReason: string;
  aspectRatio: number;
}

// Elemental Move Templates (4 moves: Basic/Synergy Attack, Heavy/AOE Elemental, Healing & Tactical Support, and Game-Breaking Chaos!)
const ELEMENTAL_MOVES: Record<
  ElementType,
  {
    move1: Omit<Move, 'id'>[];
    move2: Omit<Move, 'id'>[];
    move3: Omit<Move, 'id'>[]; // Status & Tactical Buffs/Debuffs/Heal/Allies
    chaos: Omit<Move, 'id'>[]; // Game-Breaking Hilarious/Broken Chaos Moves!
  }
> = {
  炎: {
    move1: [
      { name: 'ひのこの弾', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 95, range: 22, description: '小さな火の玉を高速連射する安定技。', effectType: 'projectile' },
      { name: 'フレアタックル', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 90, range: 10, description: '炎を身にまとって敵に突進する強力な一撃。', effectType: 'dash_strike' },
      { name: '🔥 フレイムバースト', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 92, range: 18, description: '猛烈な火柱を立ち上らせて敵を吹き飛ばす強烈な炎撃！', effectType: 'dash_strike' },
      { name: '✨ 三叉紅蓮火炎弾', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 115, accuracy: 92, range: 22, description: '【3方向拡散】扇状に広がる紅蓮の火炎弾を同時に3発射出！', effectType: 'spread_3way' },
    ],
    move2: [
      { name: '灼熱インフェルノ', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 220, accuracy: 82, range: 24, description: '極限の火炎球を放ち対象を一瞬で溶解させる超絶大技！', effectType: 'beam' },
      { name: '🌋 業火大爆発（全体攻撃）', type: '炎', category: 'attack', targetScope: 'all_enemies', power: 155, accuracy: 88, range: 30, description: '【敵全体攻撃】激しい爆炎の渦を巻き起こし、敵陣全体を一斉に焼き焦がす！', effectType: 'explosion' },
      { name: '☄️ 天火メテオモルタル', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 205, accuracy: 85, range: 36, description: '【遠距離迫撃砲】上空高く打ち上げた火炎隕石が敵の足元へ高角急降下爆撃！', effectType: 'ground_mortar' },
      { name: '⚡ 直列熱線レーザー', type: '炎', category: 'attack', targetScope: 'single_enemy', power: 195, accuracy: 90, range: 34, description: '【直線貫通】超高熱の集束レーザーが直線上の敵を一直線に撃ち抜く！', effectType: 'line_beam' },
    ],
    move3: [
      { name: '不死鳥の再生炎', type: '炎', category: 'status', targetScope: 'self', healRatio: 0.55, power: 0, accuracy: 100, range: 0, description: '【HP回復】鳳凰の炎で自身の最大HPの55%を一気に回復し、攻撃力を上昇！', effectType: 'buff_aura' },
      { name: '🔥 激昂のブレイズソウル', type: '炎', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【闘志昂揚】自身の攻撃力と素早さを1.5倍に引き上げる熱血のオーラ！', effectType: 'buff_aura' },
      { name: '👻 熱波の蜃気楼ステルス', type: '炎', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【ステルス迷彩】熱波で光を歪め2ターン透明化！回避率特大UP＆次撃1.6倍！', effectType: 'stealth_cloak' },
    ],
    chaos: [
      {
        name: '🔥 エントロピー逆転',
        type: '炎',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 0,
        description: '【禁忌】熱力学崩壊！全員の「現在HPと減ったHP」を完全反転！瀕死が全快、満タンが瀕死に！',
        effectType: 'chaos_distort',
        chaosType: 'hp_reverse',
      },
      {
        name: '💀 ロシアンルーレット',
        type: '炎',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 20,
        description: '【禁忌】運命の銃口！50%の確率で相手を一撃即死、外れたら自分が即死する！',
        effectType: 'roulette',
        chaosType: 'death_roulette',
      },
    ],
  },
  水: {
    move1: [
      { name: 'アクアショット', type: '水', category: 'attack', targetScope: 'single_enemy', power: 105, accuracy: 95, range: 24, description: '圧縮された高圧水流弾を鋭く撃ち出す。', effectType: 'projectile' },
      { name: '波乗り突進', type: '水', category: 'attack', targetScope: 'single_enemy', power: 120, accuracy: 92, range: 12, description: '激流に乗って敵へ素早く詰め寄り粉砕する。', effectType: 'dash_strike' },
      { name: '🌊 激流スパイラル', type: '水', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 90, range: 20, description: '渦巻く激流の刃で敵を鋭く切り裂く連続水撃！', effectType: 'spin_slash' },
      { name: '🌊 激流三連スプレッド', type: '水', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 94, range: 22, description: '【3方向拡散】扇状に広がる鋭い水流弾を同時に発射！', effectType: 'spread_3way' },
    ],
    move2: [
      { name: 'ハイドロカノン', type: '水', category: 'attack', targetScope: 'single_enemy', power: 225, accuracy: 82, range: 25, description: '超巨大水流砲で対象を彼方まで吹き飛ばす一撃必殺砲！', effectType: 'beam' },
      { name: '🌊 大津波タイダルウェイブ（全体攻撃）', type: '水', category: 'attack', targetScope: 'all_enemies', power: 150, accuracy: 90, range: 35, description: '【敵全体攻撃】戦場全体を飲み込む大津波を発生させ、敵全員に大ダメージ！', effectType: 'explosion' },
      { name: '⚡ 高圧レーザーカッター', type: '水', category: 'attack', targetScope: 'single_enemy', power: 190, accuracy: 92, range: 34, description: '【直線貫通】極小径の超高圧水刃レーザーで直線上の敵を両断！', effectType: 'line_beam' },
      { name: '🧲 激渦の引き寄せヴォルテックス', type: '水', category: 'attack', targetScope: 'single_enemy', power: 140, accuracy: 95, range: 26, description: '【引力引き寄せ】大渦潮の中心に敵を引き寄せて間合いを詰める！', effectType: 'vortex_pull' },
    ],
    move3: [
      { name: '命の雫・超回復', type: '水', category: 'status', targetScope: 'self', healRatio: 0.6, power: 0, accuracy: 100, range: 0, description: '【HP回復】聖なる湧き水でHPを最大値の60%一気に大回復する！', effectType: 'buff_aura' },
      { name: '🌧️ アクアシールド・障壁展開', type: '水', category: 'status', targetScope: 'self', healRatio: 0.35, power: 0, accuracy: 100, range: 0, description: '【水壁展開】水のバリアを展開しHPを35%回復＋防御力を1.6倍に強化！', effectType: 'buff_aura' },
      { name: '👥 水鏡のホログラム分身', type: '水', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【分身召喚】水鏡の残影デコイを2体展開！敵の攻撃を身代わり防御！', effectType: 'decoy_clone' },
    ],
    chaos: [
      {
        name: '🎨 神の消しゴム',
        type: '水',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 25,
        description: '【禁忌】キャンバスツール発動！相手のHP85%と防御力を物理的に消し去る！',
        effectType: 'eraser_strike',
        chaosType: 'god_eraser',
      },
      {
        name: '🌊 大洪水ディストピア',
        type: '水',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 40,
        description: '【禁忌】世界全水没！敵味方・台座すべてを飲み込み、フィールド全員に特大破壊ダメージ！',
        effectType: 'explosion',
        chaosType: 'nuclear_cataclysm',
      },
    ],
  },
  草: {
    move1: [
      { name: 'リーフカッター', type: '草', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 95, range: 20, description: '鋭い葉の刃を回転させながら飛ばす。', effectType: 'projectile' },
      { name: 'ウッドバッシュ', type: '草', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 90, range: 10, description: '硬質な丸太の如き巨躯で敵を力強く殴打する。', effectType: 'dash_strike' },
      { name: '🍃 ヴァインスラッシャー', type: '草', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 92, range: 18, description: '強靭なツルを鞭のようにしならせて相手を猛打する！', effectType: 'dash_strike' },
      { name: '🧲 樹木根の集束バキューム', type: '草', category: 'attack', targetScope: 'single_enemy', power: 120, accuracy: 95, range: 26, description: '【引力引き寄せ】地下の根を巻き付けて敵を強引に手元へ引き寄せる！', effectType: 'vortex_pull' },
    ],
    move2: [
      { name: 'ソーラーブルーム', type: '草', category: 'attack', targetScope: 'single_enemy', power: 220, accuracy: 85, range: 24, description: '大地の自然光を一気に収束させて解き放つ破壊光線！', effectType: 'beam' },
      { name: '🌿 大樹の地響き（全体攻撃）', type: '草', category: 'attack', targetScope: 'all_enemies', power: 155, accuracy: 88, range: 30, description: '【敵全体攻撃】大地深くまで根を張り巡らせ激震を起こし、敵全体を根こそぎ薙ぎ払う！', effectType: 'spin_slash' },
      { name: '☄️ 大地樹の岩石迫撃砲', type: '草', category: 'attack', targetScope: 'single_enemy', power: 200, accuracy: 84, range: 36, description: '【遠距離迫撃砲】巨木のしなりで巨大種子弾を上空へ放物射出！敵足元で炸裂！', effectType: 'ground_mortar' },
    ],
    move3: [
      { name: '大樹の光合成・全快祈願', type: '草', category: 'status', targetScope: 'self', healRatio: 0.6, power: 0, accuracy: 100, range: 0, description: '【HP回復】HPを60%回復し、さらに防御力と攻撃力を1.4倍にする！', effectType: 'buff_aura' },
      { name: '🌱 樹霊の祝福・剛壁結界', type: '草', category: 'status', targetScope: 'self', healRatio: 0.4, power: 0, accuracy: 100, range: 0, description: '【防壁覚醒】大森林の息吹でHPを40%回復し、頑丈な樹皮バリアで防御力2倍！', effectType: 'buff_aura' },
      { name: '👥 木遁の身代わりデコイ', type: '草', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【分身召喚】植物のクローン身代わりを2体展開！攻撃を完全に遮断！', effectType: 'decoy_clone' },
    ],
    chaos: [
      {
        name: '💸 課金パワー・超スパチャ',
        type: '草',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 0,
        description: '【禁忌】金の力！赤スパチャが降り注ぎ、HP全回復＋全ステータス2倍＋完全無敵バリア！',
        effectType: 'buff_aura',
        chaosType: 'super_chat',
      },
      {
        name: '🌱 無限増殖バイオハザード',
        type: '草',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 0,
        description: '【禁忌】攻撃力・素早さが暴走インフレ！圧倒的火力でオーバーキル！',
        effectType: 'chaos_distort',
        chaosType: 'cheat_atk_boost',
      },
    ],
  },
  雷: {
    move1: [
      { name: 'スパークショック', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 95, range: 22, description: 'ジリジリと放電する高圧電撃弾を放つ。', effectType: 'projectile' },
      { name: 'ボルテッカー', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 90, range: 14, description: '電光石火の速さで帯電突撃する。', effectType: 'dash_strike' },
      { name: '⚡ サンダークラッシュ', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 140, accuracy: 92, range: 18, description: '激しい雷鳴と共に上空から電撃を叩き落とす！', effectType: 'beam' },
      { name: '🌀 瞬雷フラッシュステップ', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 130, accuracy: 92, range: 20, description: '【背後瞬動ワープ】電光石火で敵の背後へ転移して死角から叩き込む！', effectType: 'teleport_strike' },
    ],
    move2: [
      { name: 'ギガサンダーボルト', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 230, accuracy: 80, range: 25, description: '天より轟く極大雷光を敵の頭上に直撃させる超絶威力の必殺雷！', effectType: 'beam' },
      { name: '⚡ プラズマ全方位放電（全体攻撃）', type: '雷', category: 'attack', targetScope: 'all_enemies', power: 160, accuracy: 86, range: 35, description: '【敵全体攻撃】数億ボルトのプラズマを全方位に放出し、敵全員を感電粉砕！', effectType: 'explosion' },
      { name: '⚡ ハイパーレールガン', type: '雷', category: 'attack', targetScope: 'single_enemy', power: 210, accuracy: 90, range: 34, description: '【直線貫通】超電磁加速された高密プラズマが直線上の敵を粉砕！', effectType: 'line_beam' },
    ],
    move3: [
      { name: '充電リカバリー・超自己修復', type: '雷', category: 'status', targetScope: 'self', healRatio: 0.5, power: 0, accuracy: 100, range: 0, description: '【HP回復】生体電流を急速充電しHPを50%回復＋素早さを2倍に加速！', effectType: 'buff_aura' },
      { name: '⚡ オーバーチャージ・超電磁展開', type: '雷', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【自己超加速】体内の電磁パルスを限界突破させ素早さ2倍、攻撃力を1.5倍に引き上げる！', effectType: 'buff_aura' },
      { name: '👥 電磁ホログラム分身', type: '雷', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【分身召喚】電磁ホログラムの残影クローンを2体展開！身代わり防御！', effectType: 'decoy_clone' },
    ],
    chaos: [
      {
        name: '⏳ ザ・ワールド（時間停止）',
        type: '雷',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 30,
        description: '【禁忌】時よ止まれ！相手モンスターの時間を完全停止させ、一方的に行動！',
        effectType: 'time_stop',
        chaosType: 'time_stop',
      },
      {
        name: '⚡ チートコード: 999999',
        type: '雷',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 0,
        description: '【禁忌】開発者モード突入！攻撃力を+500%に改造し、次の一撃で完全オーバーキル！',
        effectType: 'chaos_distort',
        chaosType: 'cheat_atk_boost',
      },
    ],
  },
  闇: {
    move1: [
      { name: 'シャドウニードル', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 108, accuracy: 95, range: 22, description: '影のトゲを相手へ素早く刺し込む。', effectType: 'projectile' },
      { name: 'ナイトストライク', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 90, range: 11, description: '一瞬姿を眩ませて敵の死角から強襲する。', effectType: 'dash_strike' },
      { name: '🌑 シャドウインパルス', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 90, range: 18, description: '凝縮した闇の衝撃波を放ち、敵の足元を崩す強襲撃！', effectType: 'dash_strike' },
      { name: '🌀 シャドウワープ急襲斬', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 92, range: 20, description: '【背後瞬動ワープ】影の次元をくぐり抜け敵の背後へワープしてクロス一閃！', effectType: 'teleport_strike' },
    ],
    move2: [
      { name: '滅びのダークヴォイド', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 225, accuracy: 82, range: 22, description: '虚無の闇空間を開いて敵を圧迫・消滅させる極大技！', effectType: 'explosion' },
      { name: '🌌 ナイトメアウェーブ（全体攻撃）', type: '闇', category: 'attack', targetScope: 'all_enemies', power: 155, accuracy: 88, range: 32, description: '【敵全体攻撃】漆黒の悪夢波動を解き放ち、敵陣全体を闇に沈める！', effectType: 'spin_slash' },
      { name: '🧲 重力ブラックホール', type: '闇', category: 'attack', targetScope: 'single_enemy', power: 145, accuracy: 95, range: 26, description: '【引力引き寄せ】巨大な重力特異点で敵を引き寄せて強制接近させる！', effectType: 'vortex_pull' },
    ],
    move3: [
      { name: '吸血の影・ドレインヒール', type: '闇', category: 'status', targetScope: 'self', healRatio: 0.55, power: 0, accuracy: 100, range: 0, description: '【HP回復】敵の生気を遠隔吸血して自身のHPを55%回復！', effectType: 'buff_aura' },
      { name: '🌑 暗黒のヴェール・虚無結界', type: '闇', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【影の結界】影の結界を全身に纏い、受けるダメージを半減＋攻撃力を1.4倍！', effectType: 'buff_aura' },
      { name: '👻 虚無の光学迷彩ステルス', type: '闇', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【ステルス迷彩】影の中に完全に潜伏し2ターン透明化！回避率特大UP＆奇襲1.6倍！', effectType: 'stealth_cloak' },
    ],
    chaos: [
      {
        name: '🪞 著作権侵害（完全強奪）',
        type: '闇',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 30,
        description: '【禁忌】相手の攻撃力と防御力を完全に吸い取り自分のものにし、相手の攻撃力を0にする！',
        effectType: 'chaos_distort',
        chaosType: 'skill_steal',
      },
      {
        name: '🎮 コントローラー奪取（指示妨害）',
        type: '闇',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 30,
        description: '【禁忌】相手の精神をハッキング！相手に自身を全力で攻撃させ自傷特大ダメージ！',
        effectType: 'chaos_distort',
        chaosType: 'controller_hijack',
      },
    ],
  },
  光: {
    move1: [
      { name: 'シャインアロー', type: '光', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 95, range: 24, description: '眩い光の矢を真っ直ぐ高速で射貫く。', effectType: 'projectile' },
      { name: 'ホーリーラッシュ', type: '光', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 92, range: 11, description: '神聖なオーラをまとい果敢に突進する。', effectType: 'dash_strike' },
      { name: '✨ プリズムブラスター', type: '光', category: 'attack', targetScope: 'single_enemy', power: 140, accuracy: 92, range: 20, description: '集光クリスタルの光線を一転集中して浴びせかける！', effectType: 'beam' },
      { name: '✨ 三連光輪スプレッド', type: '光', category: 'attack', targetScope: 'single_enemy', power: 115, accuracy: 94, range: 22, description: '【3方向拡散】扇状に3発の聖光輪を放射拡散！', effectType: 'spread_3way' },
    ],
    move2: [
      { name: 'ジャッジメントレイ', type: '光', category: 'attack', targetScope: 'single_enemy', power: 230, accuracy: 82, range: 26, description: '天からの聖なる極光で邪悪を完全に討ち滅ぼす神撃！', effectType: 'beam' },
      { name: '🌟 プリズムスーパーノヴァ（全体攻撃）', type: '光', category: 'attack', targetScope: 'all_enemies', power: 160, accuracy: 86, range: 35, description: '【敵全体攻撃】全方位に七色の聖光を大爆散させ、敵全員に壊滅的ダメージ！', effectType: 'explosion' },
      { name: '⚡ 天罰のルミナスビーム', type: '光', category: 'attack', targetScope: 'single_enemy', power: 205, accuracy: 90, range: 35, description: '【直線貫通】超長距離の極太聖光レーザーが直線上の敵を貫通撃破！', effectType: 'line_beam' },
    ],
    move3: [
      { name: '天の恵み・大回復', type: '光', category: 'status', targetScope: 'self', healRatio: 0.65, power: 0, accuracy: 100, range: 0, description: '【HP回復】聖光によりHPを最大値の65%回復させ、全デバフを浄化！', effectType: 'buff_aura' },
      { name: '👼 聖域の守護・ホーリーバリア', type: '光', category: 'status', targetScope: 'self', healRatio: 0.4, power: 0, accuracy: 100, range: 0, description: '【光の結界】自身のHPを40%回復し、さらに神聖なシールドを展開！', effectType: 'buff_aura' },
      { name: '👻 光子屈折ステルス', type: '光', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【ステルス迷彩】光の屈折で2ターン透明化！回避率特大UP＆次撃1.6倍！', effectType: 'stealth_cloak' },
    ],
    chaos: [
      {
        name: '🌀 ブラックホール特異点',
        type: '光',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 40,
        description: '【禁忌】全次元崩壊！全モンスターのバフを抹消し、全員のHPを強制的に40%削る！',
        effectType: 'explosion',
        chaosType: 'black_hole',
      },
      {
        name: '🔥 エントロピー逆転',
        type: '光',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 0,
        description: '【禁忌】光熱反転！全員のHP（現在値と減った分）を完全反転させ、戦局を覆す！',
        effectType: 'chaos_distort',
        chaosType: 'hp_reverse',
      },
    ],
  },
  地: {
    move1: [
      { name: 'ロックバレット', type: '地', category: 'attack', targetScope: 'single_enemy', power: 110, accuracy: 92, range: 20, description: '硬い岩石の塊を高速で投げつける。', effectType: 'projectile' },
      { name: 'マッドクランチ', type: '地', category: 'attack', targetScope: 'single_enemy', power: 125, accuracy: 90, range: 10, description: '重厚な体躯を活かして力任せに押し潰す。', effectType: 'dash_strike' },
      { name: '⛰️ グランドクラッシャー', type: '地', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 90, range: 16, description: '大地の岩盤を隆起させて相手を強烈に押し潰す！', effectType: 'spin_slash' },
      { name: '💨 巨震の斥力ノックバック', type: '地', category: 'attack', targetScope: 'single_enemy', power: 120, accuracy: 95, range: 16, description: '【斥力ノックバック】激しい大地の震動波で敵を後方へ弾き飛ばす！', effectType: 'knockback_wave' },
    ],
    move2: [
      { name: 'メガリスバスター', type: '地', category: 'attack', targetScope: 'single_enemy', power: 225, accuracy: 82, range: 20, description: '巨大なメガリスを隆起させて敵を叩き落とす超重量撃！', effectType: 'explosion' },
      { name: '🌋 アースクエイク大地動乱（全体攻撃）', type: '地', category: 'attack', targetScope: 'all_enemies', power: 155, accuracy: 88, range: 30, description: '【敵全体攻撃】大地を大きく揺るがし大断層を発生させ、敵全員を一斉に撃破！', effectType: 'spin_slash' },
      { name: '☄️ 岩石巨弾迫撃砲', type: '地', category: 'attack', targetScope: 'single_enemy', power: 205, accuracy: 84, range: 36, description: '【遠距離迫撃砲】巨岩を上空へ放物打ち上げ！敵足元へ高角直撃炸裂！', effectType: 'ground_mortar' },
    ],
    move3: [
      { name: '大地の養分吸収・自己回復', type: '地', category: 'status', targetScope: 'self', healRatio: 0.55, power: 0, accuracy: 100, range: 0, description: '【HP回復】大地から栄養を吸い上げHPを55%回復＋防御力を1.5倍に強化！', effectType: 'buff_aura' },
      { name: '🛡️ 金剛不壊・アイアンボディ', type: '地', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【鉄壁覚醒】全身を鋼鉄の岩石で硬化させ防御力を2倍に跳ね上げる！', effectType: 'buff_aura' },
      { name: '👥 土人形の身代わりデコイ', type: '地', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【分身召喚】土のゴーレム分身を2体配置！敵の攻撃を身代わりに防ぐ！', effectType: 'decoy_clone' },
    ],
    chaos: [
      {
        name: '🎨 神の消しゴム',
        type: '地',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 25,
        description: '【禁忌】描画消滅！相手の現在HP85%と防御力を消しゴムで文字通り消去！',
        effectType: 'eraser_strike',
        chaosType: 'god_eraser',
      },
      {
        name: '💀 ロシアンルーレット',
        type: '地',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 20,
        description: '【禁忌】大地の裁き！50%で相手を即死、50%で自分が即死する破滅ギャンブル！',
        effectType: 'roulette',
        chaosType: 'death_roulette',
      },
    ],
  },
  風: {
    move1: [
      { name: 'エアスラッシュ', type: '風', category: 'attack', targetScope: 'single_enemy', power: 108, accuracy: 95, range: 22, description: '鋭い真空の刃を軽快に繰り出す。', effectType: 'projectile' },
      { name: '疾風スピア', type: '風', category: 'attack', targetScope: 'single_enemy', power: 120, accuracy: 92, range: 12, description: '追い風に乗り音速の突きを放つ。', effectType: 'dash_strike' },
      { name: '🌪️ テンペストスラッシュ', type: '風', category: 'attack', targetScope: 'single_enemy', power: 135, accuracy: 90, range: 20, description: '激しい突風の渦を回転させながら相手を切り刻む！', effectType: 'spin_slash' },
      { name: '💨 烈風突風ノックバック', type: '風', category: 'attack', targetScope: 'single_enemy', power: 120, accuracy: 95, range: 16, description: '【斥力ノックバック】猛烈な突風で敵を後退させて距離を取る！', effectType: 'knockback_wave' },
    ],
    move2: [
      { name: 'ソニックストーム', type: '風', category: 'attack', targetScope: 'single_enemy', power: 220, accuracy: 82, range: 24, description: '音速を超える突風レーザーで対象を連続粉砕する必殺技！', effectType: 'beam' },
      { name: '🌀 テンペストタイフーン（全体攻撃）', type: '風', category: 'attack', targetScope: 'all_enemies', power: 155, accuracy: 88, range: 35, description: '【敵全体攻撃】猛烈な暴風台風を巻き上げ、敵全員を空中に弾き飛ばし叩きつける！', effectType: 'spin_slash' },
      { name: '✨ 三連風刃スプレッド', type: '風', category: 'attack', targetScope: 'single_enemy', power: 115, accuracy: 94, range: 22, description: '【3方向拡散】扇状に3条の真空鎌刃を射出する拡散波状撃！', effectType: 'spread_3way' },
    ],
    move3: [
      { name: '清澄の風・大回復', type: '風', category: 'status', targetScope: 'self', healRatio: 0.55, power: 0, accuracy: 100, range: 0, description: '【HP回復】癒しの風を身にまといHPを55%回復し、素早さを1.5倍にする！', effectType: 'buff_aura' },
      { name: '🍃 疾風怒濤・ターボアジリティ', type: '風', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【極限加速】風の翼を広げ素早さを2倍にし、HPを30%回復＋移動力を強化！', effectType: 'buff_aura' },
      { name: '👻 気流隠蔽カモフラージュ', type: '風', category: 'status', targetScope: 'self', power: 0, accuracy: 100, range: 0, description: '【ステルス迷彩】気流と同化して2ターン透明化！回避率特大UP＆次撃1.6倍！', effectType: 'stealth_cloak' },
    ],
    chaos: [
      {
        name: '⏳ ザ・ワールド（時間停止）',
        type: '風',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 30,
        description: '【禁忌】大気静止！相手の時間を完全停止させ、自分だけが一方的に殴り続ける！',
        effectType: 'time_stop',
        chaosType: 'time_stop',
      },
      {
        name: '🪞 著作権侵害（スキル強奪）',
        type: '風',
        category: 'chaos',
        power: 999,
        accuracy: 100,
        range: 30,
        description: '【禁忌】風のごとく相手の技と能力値を強奪！相手の攻撃力を0にして我が力とする！',
        effectType: 'chaos_distort',
        chaosType: 'skill_steal',
      },
    ],
  },
};

const SPECIAL_ABILITIES: Record<ElementType, { name: string; description: string }[]> = {
  炎: [
    { name: '炎の闘志', description: 'HPが減少するほど攻撃の激しさが増加する。' },
    { name: 'マグマスキン', description: '接触した敵に熱ダメージを反射する構え。' },
  ],
  水: [
    { name: '流水の守護', description: '攻撃を受けた際の衝撃を受け流しダメージ軽減。' },
    { name: 'うるおいの雫', description: '時間経過で微量のHPを自己回復する。' },
  ],
  草: [
    { name: '光合成コア', description: '太陽光を取り入れ技のクールダウンが早まる。' },
    { name: '大樹の根性', description: '致命傷を受けても耐え忍ぶ強い生命力。' },
  ],
  雷: [
    { name: '帯電ブースト', description: '素早い移動時に自身の素早さが一時的にアップ。' },
    { name: '静電気ショック', description: '攻撃時、相手の動きを一時鈍らせる。' },
  ],
  闇: [
    { name: '影潜み', description: '攻撃モーション時の回避率がわずかに上昇。' },
    { name: '漆黒の呪言', description: '攻撃ヒット時に敵の攻撃力を低下させる。' },
  ],
  光: [
    { name: '聖なるオーラ', description: '周囲に威圧感を与え被ダメージを抑える。' },
    { name: '閃光ステップ', description: '初動のダッシュ速度が非常に鋭くなる。' },
  ],
  地: [
    { name: '金剛岩壁', description: '強固な守りでノックバックをほぼ無効化。' },
    { name: '大地の鼓動', description: '最大HPが他モンスターより底上げされる。' },
  ],
  風: [
    { name: '神速の羽撃き', description: '風に乗りフィールドを縦横無尽に駆け巡る。' },
    { name: '風の盾', description: '遠距離攻撃の命中ダメージを逸らす。' },
  ],
};

const NAME_PREFIXES: Record<ElementType, string[]> = {
  炎: ['ヴォルカ', 'ブレイズ', 'フレア', 'ヒート', 'イグニス', 'サラマン'],
  水: ['アクア', 'タイダル', 'マリン', 'リヴァイ', 'ハイドロ', 'スプラ'],
  草: ['フォレスト', 'リーフィ', 'シルヴァ', 'プラント', 'ウッド', 'ヴァイン'],
  雷: ['サンダー', 'ボルト', 'ライトニ', 'プラズマ', 'エレキ', 'スパーキー'],
  闇: ['シャドウ', 'ファントム', 'ダーク', 'アビス', 'ネビュラ', 'ノクターン'],
  光: ['ルミナス', 'シャイニー', 'オーロラ', 'ホーリー', 'プリズム', 'ソーラー'],
  地: ['ガイア', 'ロック', 'テラ', 'ゴーレム', 'グラン', 'バルダー'],
  風: ['ゼファー', 'シルフ', 'テンペスト', 'ゲイル', 'サイクロン', 'ウィンド'],
};

const NAME_SUFFIXES = ['ドン', 'ビースト', 'ロン', 'バロン', 'ガル', 'レクス', 'パル', 'ドール', 'キャット', 'ファング'];

/**
 * Analyzes an HTMLCanvasElement or ImageData to determine monster stats and elements.
 */
export function analyzeMonsterCanvas(canvas: HTMLCanvasElement): AnalysisResult {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let drawnPixels = 0;

  // Color buckets
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let darkSum = 0;
  let brightSum = 0;
  let yellowSum = 0;
  let earthSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];

      // Ignore transparent / nearly transparent background
      if (a > 30) {
        drawnPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

        if (brightness < 60) {
          darkSum++;
        } else if (brightness > 210 && (r + g + b) > 630) {
          brightSum++;
        }

        // Check dominant hues
        if (r > 140 && g < 100 && b < 100) {
          redSum += 2;
        } else if (r > 120 && g > 100 && b < 80) {
          if (r > 180 && g > 160 && b < 100) {
            yellowSum += 2;
          } else {
            earthSum += 2;
          }
        } else if (b > 130 && r < 120) {
          blueSum += 2;
        } else if (g > 130 && r < 130 && b < 130) {
          greenSum += 2;
        } else if (r > 120 && b > 120 && g < 90) {
          darkSum += 1.5; // purple/violet shade
        }
      }
    }
  }

  // Fallback if canvas is practically empty
  if (drawnPixels < 100) {
    minX = 100;
    maxX = width - 100;
    minY = 100;
    maxY = height - 100;
    drawnPixels = 2000;
    redSum = 500;
  }

  const boxW = Math.max(1, maxX - minX);
  const boxH = Math.max(1, maxY - minY);
  const boundingArea = boxW * boxH;
  const density = Math.min(1, drawnPixels / boundingArea);
  const aspectRatio = boxW / boxH;

  // Determine Element based on highest color bucket
  const scores: { type: ElementType; score: number }[] = [
    { type: '炎', score: redSum },
    { type: '水', score: blueSum },
    { type: '草', score: greenSum },
    { type: '雷', score: yellowSum },
    { type: '闇', score: darkSum },
    { type: '光', score: brightSum },
    { type: '地', score: earthSum },
    { type: '風', score: (blueSum * 0.4 + greenSum * 0.4 + brightSum * 0.4) },
  ];

  scores.sort((a, b) => b.score - a.score);
  let bestType: ElementType = scores[0].score > 50 ? scores[0].type : '炎';

  // If density is extremely high and mostly dark, default to 地 or 闇
  if (scores[0].score <= 50) {
    if (aspectRatio > 1.4) bestType = '地';
    else if (aspectRatio < 0.7) bestType = '風';
    else bestType = '炎';
  }

  // Calculate Balanced stats (HP up to 2000 scale, attack/defense/speed balanced)
  // HP: Based on total drawn mass, density, and grounding (600 ~ 2000)
  const baseHp = Math.round(750 + Math.min(1050, (drawnPixels / 20000) * 1050) + density * 200 + (bestType === '地' ? 120 : 0));
  let hp = Math.min(1800, Math.max(420, baseHp));

  // Attack: Boosted by red, sharp energetic shapes, or predatory angles (280 ~ 950)
  const atkMultiplier = (redSum > blueSum ? 1.25 : 1.0) + (yellowSum > 100 ? 0.15 : 0);
  const baseAtk = Math.round(360 + (1 - Math.abs(1 - aspectRatio) * 0.3) * 380 * atkMultiplier);
  let attack = Math.min(950, Math.max(180, Math.round(baseAtk)));

  // Defense: Boosted by high density (solidly colored in) and wide grounded stance (260 ~ 880)
  const baseDef = Math.round(320 + density * 360 + (aspectRatio > 1.2 ? 80 : 0) + (bestType === '地' ? 120 : 0));
  let defense = Math.min(880, Math.max(170, baseDef));

  // Speed: Boosted by slim vertical or aerodynamic shape, lightning/wind types (240 ~ 780)
  const baseSpd = Math.round(320 + (1 - density) * 300 + (bestType === '雷' || bestType === '風' ? 130 : 0) + (aspectRatio < 0.85 ? 60 : 0));
  let speed = Math.min(780, Math.max(160, baseSpd));

  // v3.1: 絵の特徴だけで全員が高ステータスにならないよう個体差を追加。
  // 約18%は明確な低ステータス個体、約32%はやや弱め。強個体も残る。
  const qualityRoll = Math.random();
  const statScale = qualityRoll < 0.18 ? (0.52 + Math.random()*0.16) : qualityRoll < 0.50 ? (0.70 + Math.random()*0.18) : qualityRoll < 0.90 ? (0.88 + Math.random()*0.15) : (1.03 + Math.random()*0.10);
  hp = Math.min(1800, Math.max(350, Math.round(hp * statScale)));
  attack = Math.max(140, Math.round(attack * statScale));
  defense = Math.max(130, Math.round(defense * statScale));
  speed = Math.max(130, Math.round(speed * statScale));

  // Pick 4 Moves from the 100+ moves pool!
  const pool = getElementMovePool(bestType);

  // Move 1: Reliable/Synergy attack (power 35 ~ 65)
  const m1Candidates = pool.filter((m) => m.category === 'attack' && m.power >= 35 && m.power <= 65 && m.range >= 18);
  const m1 = m1Candidates[Math.floor(Math.random() * m1Candidates.length)] || pool[0];

  // Move 2/3: 属性固有の役割技を優先。全属性が同じ回復・殴り技になるのを防ぐ。
  const strategic = STRATEGIC_MOVES.filter(m => m.type === bestType && m.name !== m1.name);
  const shuffledStrategic = [...strategic].sort(() => Math.random() - 0.5);
  const fallbackSpecial = pool.filter((m) => m.name !== m1.name && m.range >= 16 && m.effectType !== m1.effectType);
  const m2 = shuffledStrategic[0] || fallbackSpecial[0] || pool[1];
  const m3 = shuffledStrategic.find(m => m.name !== m2.name && m.id !== m2.id)
    || fallbackSpecial.find(m => m.name !== m2.name && m.category !== m2.category)
    || pool.find(m => m.name !== m1.name && m.name !== m2.name) || pool[2];

  // v3.0 rarity split:
  // Gamble moves are uncommon enough to feel special (~12%). Forbidden chaos stays genuinely ultra-rare (~0.8%).
  // Chaotic dark/red drawings get only a small extra forbidden chance; it must never become routine.
  const isRareChaos = Math.random() < 0.008 || (darkSum > 14000 && redSum > 12000 && Math.random() < 0.025);
  const isGamble = !isRareChaos && Math.random() < 0.12;
  let m4;
  if (isRareChaos) {
    const chaosList = RARE_CHAOS_MOVES[bestType] || RARE_CHAOS_MOVES['炎'];
    m4 = chaosList[Math.floor(Math.random() * chaosList.length)];
  } else if (isGamble) {
    const gambles = GAMBLE_MOVES.filter(m => m.type === bestType);
    m4 = gambles[Math.floor(Math.random() * gambles.length)] || GAMBLE_MOVES[Math.floor(Math.random() * GAMBLE_MOVES.length)];
  } else {
    const finishers = pool.filter(
      (m) => m.category === 'attack' && m.power >= 70 && m.range >= 20 && m.name !== m1.name && m.name !== m2.name && m.effectType !== m1.effectType && m.effectType !== m2.effectType
    );
    m4 = finishers[Math.floor(Math.random() * finishers.length)] || pool[3];
  }

  // 旧技には威力100〜230級が多く、一撃が重すぎたため通常技を全体的に圧縮する。
  // chaos は特殊ルールで処理するため表示値をそのまま残す。
  const withCooldown = (m: Omit<Move, 'id'> | Move, id: string): Move => {
    const balancedPower = m.category === 'chaos' || m.power <= 0
      ? m.power
      : Math.max(18, Math.min(72, Math.round(m.power * 0.62)));
    const longRangeBoost = ['beam','line_beam','projectile','ground_mortar'].includes(m.effectType) ? 1.22 : 1;
    const controlHeavy = /拘束|移動不能|凍結|麻痺|ネット|根縛/.test(`${m.name} ${m.description}`);
    return {
      ...m,
      id,
      range: Math.round(m.range * longRangeBoost),
      healRatio: m.healRatio ? Math.min(0.25, m.healRatio * 0.5) : undefined,
      power: balancedPower,
      cooldown: controlHeavy ? Math.max(5, m.cooldown ?? 0) : (m.cooldown ?? (balancedPower >= 60 ? 3 : balancedPower >= 45 ? 2 : 1)),
    };
  };
  const move1: Move = withCooldown(m1, 'move_1');
  const move2: Move = withCooldown(m2, 'move_2');
  const move3: Move = withCooldown(m3, 'move_3');
  const move4: Move = withCooldown(m4, 'move_4');

  // Pick Special Ability from 50+ traits pool based on monster element and stats
  const eligibleTraits = MONSTER_TRAITS_POOL.filter(
    (t) => !t.element || t.element === bestType
  );
  const selectedTrait = eligibleTraits.length > 0
    ? eligibleTraits[Math.floor(Math.random() * eligibleTraits.length)]
    : MONSTER_TRAITS_POOL[Math.floor(Math.random() * MONSTER_TRAITS_POOL.length)];
  const specialAbility = {
    name: selectedTrait.name,
    description: selectedTrait.description,
    id: selectedTrait.id,
  };

  // Generate Japanese Name
  const prefixes = NAME_PREFIXES[bestType] || NAME_PREFIXES['炎'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  const name = `${prefix}${suffix}`;

  // Analysis reason text explaining the AI logic
  const reasons: string[] = [];
  if (bestType === '炎') reasons.push('赤い色彩と情熱的なストロークが検出され、灼熱の【炎タイプ】と判定！');
  else if (bestType === '水') reasons.push('青く滑らかな描画ラインが識別され、柔軟で清冽な【水タイプ】と判定！');
  else if (bestType === '草') reasons.push('緑豊かな線画と自然の息吹を感じる形状から【草タイプ】と判定！');
  else if (bestType === '雷') reasons.push('鋭角なストロークと鮮やかなトーンから迅雷の【雷タイプ】と判定！');
  else if (bestType === '闇') reasons.push('重厚なダークトーンとミステリアスな筆跡から【闇タイプ】と判定！');
  else if (bestType === '光') reasons.push('明るく透明感のある輝く輪郭線から聖なる【光タイプ】と判定！');
  else if (bestType === '地') reasons.push('どっしりとした横長のシルエットと安定感から剛健な【地タイプ】と判定！');
  else reasons.push('軽やかで伸びやかな筆跡から疾風の【風タイプ】と判定！');

  if (statScale < 0.70) reasons.push('今回は低ステータス寄りの個体として誕生。技と立ち回りで覆すタイプ。');
  else if (statScale < 0.88) reasons.push('能力値は控えめな個体。位置取りと技構成が重要。');

  if (density > 0.45) {
    reasons.push('密度が高く塗り込まれた体躯により、最大HPと高い防御力を獲得。');
  } else {
    reasons.push('繊細で無駄のない軽快なフォルムにより、鋭い素早さと攻撃力を獲得。');
  }
  if (isRareChaos) {
    reasons.push(`【超低確率覚醒】禁忌の超常技【${move4.name}】を発現！`);
  } else {
    reasons.push(`必殺奥義【${move4.name}】を習得！`);
  }

  return {
    stats: {
      hp,
      maxHp: hp,
      attack,
      defense,
      speed,
    },
    type: bestType,
    name,
    specialAbility,
    moves: [move1, move2, move3, move4],
    analysisReason: reasons.join(' '),
    aspectRatio,
  };
}

/**
 * Creates pre-made hand-drawn style canvas bots for opponent and ally trainers!
 */
export function generateBotMonster(type: ElementType, team: number, botIndex: number): MonsterData {
  // Generate a hand-drawn style SVG/canvas DataURL for each bot monster
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 400, 400);

  // Draw cute hand-drawn style stylized monsters using rough strokes
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const typeThemes: Record<ElementType, { main: string; sub: string; eye: string }> = {
    炎: { main: '#f97316', sub: '#ef4444', eye: '#fef08a' },
    水: { main: '#0ea5e9', sub: '#0284c7', eye: '#ffffff' },
    草: { main: '#22c55e', sub: '#15803d', eye: '#fef08a' },
    雷: { main: '#eab308', sub: '#ca8a04', eye: '#38bdf8' },
    闇: { main: '#8b5cf6', sub: '#4c1d95', eye: '#f43f5e' },
    光: { main: '#38bdf8', sub: '#f472b6', eye: '#ffffff' },
    地: { main: '#d97706', sub: '#78350f', eye: '#fef3c7' },
    風: { main: '#14b8a6', sub: '#0f766e', eye: '#e0f2fe' },
  };

  const theme = typeThemes[type];

  // Draw body
  ctx.fillStyle = theme.main;
  ctx.strokeStyle = '#1e293b';

  ctx.beginPath();
  if (botIndex % 3 === 0) {
    // Round Blob / Slime shape
    ctx.moveTo(120, 200);
    ctx.bezierCurveTo(100, 100, 300, 90, 280, 200);
    ctx.bezierCurveTo(320, 310, 80, 320, 120, 200);
    ctx.fill();
    ctx.stroke();

    // Horns / Spikes
    ctx.fillStyle = theme.sub;
    ctx.beginPath();
    ctx.moveTo(140, 120);
    ctx.lineTo(120, 60);
    ctx.lineTo(170, 100);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(260, 120);
    ctx.lineTo(280, 60);
    ctx.lineTo(230, 100);
    ctx.fill();
    ctx.stroke();
  } else if (botIndex % 3 === 1) {
    // Dragon / Beast silhouette
    ctx.moveTo(160, 260);
    ctx.lineTo(120, 320);
    ctx.lineTo(200, 310);
    ctx.lineTo(280, 320);
    ctx.lineTo(240, 260);
    ctx.lineTo(280, 180);
    ctx.lineTo(240, 130);
    ctx.lineTo(260, 80);
    ctx.lineTo(180, 110);
    ctx.lineTo(140, 80);
    ctx.lineTo(160, 130);
    ctx.lineTo(120, 180);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wings
    ctx.fillStyle = theme.sub;
    ctx.beginPath();
    ctx.moveTo(120, 160);
    ctx.lineTo(50, 120);
    ctx.lineTo(90, 220);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(280, 160);
    ctx.lineTo(350, 120);
    ctx.lineTo(310, 220);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Tall Golem / Robot shape
    ctx.fillStyle = theme.main;
    ctx.fillRect(130, 130, 140, 150);
    ctx.strokeRect(130, 130, 140, 150);

    ctx.fillRect(160, 80, 80, 50);
    ctx.strokeRect(160, 80, 80, 50);

    ctx.fillStyle = theme.sub;
    // Shoulders
    ctx.beginPath();
    ctx.arc(110, 160, 28, 0, Math.PI * 2);
    ctx.arc(290, 160, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw expressive handwritten face / eyes
  ctx.fillStyle = theme.eye;
  ctx.beginPath();
  ctx.arc(170, 175, 16, 0, Math.PI * 2);
  ctx.arc(230, 175, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pupils
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(174, 176, 7, 0, Math.PI * 2);
  ctx.arc(234, 176, 7, 0, Math.PI * 2);
  ctx.fill();

  // Hand-drawn mouth
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(185, 215);
  ctx.quadraticCurveTo(200, 230, 215, 215);
  ctx.stroke();

  // Hand-drawn scribble blush / pattern
  ctx.strokeStyle = theme.sub;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(140, 205);
  ctx.lineTo(155, 205);
  ctx.moveTo(245, 205);
  ctx.lineTo(260, 205);
  ctx.stroke();

  const imageSrc = canvas.toDataURL('image/png');

  // Stats for bot (scaled to 2000 HP range)
  const botQuality = Math.random() < .22 ? .60 + Math.random()*.18 : .78 + Math.random()*.30;
  const hp = Math.min(1800, Math.floor((850 + Math.random() * 650) * botQuality));
  const attack = Math.floor((320 + Math.random() * 360) * botQuality);
  const defense = Math.floor((300 + Math.random() * 330) * botQuality);
  const speed = Math.floor((280 + Math.random() * 360) * botQuality);

  const pool = getElementMovePool(type);
  const m1Candidates = pool.filter((m) => m.category === 'attack' && m.power >= 35 && m.power <= 65 && m.range >= 18);
  const m1 = m1Candidates[botIndex % m1Candidates.length] || pool[0];

  const roleMoves = STRATEGIC_MOVES.filter(m => m.type === type);
  const m2 = roleMoves.length ? roleMoves[botIndex % roleMoves.length] : pool[1];
  const m3 = roleMoves.length > 1 ? roleMoves[(botIndex + 1) % roleMoves.length] : (pool.find(m => m.category === 'status' && m.name !== m2.name) || pool[2]);

  const finishers = pool.filter((m) => m.category === 'attack' && m.power >= 70 && m.range >= 20 && m.name !== m1.name && m.name !== m2.name && m.effectType !== m1.effectType && m.effectType !== m2.effectType);
  const m4 = finishers.length > 0 ? finishers[botIndex % finishers.length] : pool[3];

  const botNames: Record<ElementType, string[]> = {
    炎: ['イグニホーン', 'サラマンビースト', 'ヴォルカレクス'],
    水: ['アクアスライム', 'タイダルフィン', 'マリンオクト'],
    草: ['ウッドトレント', 'フォレストフォックス', 'リーフマンティス'],
    雷: ['スパーキードッグ', 'ボルトファング', 'エレキバード'],
    闇: ['シャドウスピリット', 'ナイトファントム', 'アビスレプス'],
    光: ['ルミナベア', 'ホーリーフェザー', 'セレスティアル'],
    地: ['テラゴーレム', 'グランタートル', 'ロックアルマジロ'],
    風: ['ゲイルホーク', 'ゼファーキャット', 'シルフドラゴン'],
  };

  const nameList = botNames[type];
  const name = nameList[botIndex % nameList.length];

  // Distinct trait from 50+ traits pool
  const eligibleBotTraits = MONSTER_TRAITS_POOL.filter((t) => !t.element || t.element === type);
  const botTrait = eligibleBotTraits[botIndex % eligibleBotTraits.length] || MONSTER_TRAITS_POOL[botIndex % MONSTER_TRAITS_POOL.length];
  const ability = {
    name: botTrait.name,
    description: botTrait.description,
    id: botTrait.id,
  };

  return {
    id: `bot_monster_${botIndex}_${Date.now()}`,
    name,
    imageSrc,
    aspectRatio: 1.0,
    type,
    stats: {
      hp,
      maxHp: hp,
      attack,
      defense,
      speed,
    },
    specialAbility: ability,
    moves: [
      { ...m1, id: `bot_move1_${botIndex}` },
      { ...m2, id: `bot_move2_${botIndex}` },
      { ...m3, id: `bot_move3_${botIndex}` },
      { ...m4, id: `bot_move4_${botIndex}` },
    ],
    analysisReason: 'Botトレーナーが丹念に描いたパートナーモンスター。',
    isPlayer: false,
    team,
  };
}
