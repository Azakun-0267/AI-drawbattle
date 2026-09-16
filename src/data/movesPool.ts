import { ElementType, Move, MoveSpecialEffect, AttackSpecialEffectType } from '../types';

export interface MoveTemplate extends Omit<Move, 'id'> {}

// Rare Chaos Moves (Only rolled rarely: ~5% chance, or special drawing features)
export const RARE_CHAOS_MOVES: Record<ElementType, MoveTemplate[]> = {
  炎: [
    {
      name: '🔥 エントロピー逆転',
      type: '炎',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 0,
      description: '【禁忌・超低確率】熱力学崩壊！全員の「現在HPと減ったHP」を完全反転させる！',
      effectType: 'chaos_distort',
      chaosType: 'hp_reverse',
    },
    {
      name: '💀 運命のロシアンルーレット',
      type: '炎',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 20,
      description: '【禁忌・超低確率】50%で相手を一撃即死、外れたら自分が即死する破滅ギャンブル！',
      effectType: 'roulette',
      chaosType: 'death_roulette',
    },
  ],
  水: [
    {
      name: '🎨 神の消しゴム',
      type: '水',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 25,
      description: '【禁忌・超低確率】相手の現在HP70%と防御力を消しゴムで物理的に消去！',
      effectType: 'eraser_strike',
      chaosType: 'god_eraser',
    },
    {
      name: '🌊 世界全水没ディストピア',
      type: '水',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 40,
      description: '【禁忌・超低確率】フィールド全員に特大津波の崩壊ダメージ！',
      effectType: 'explosion',
      chaosType: 'nuclear_cataclysm',
    },
  ],
  草: [
    {
      name: '💸 課金パワー・赤スパチャ',
      type: '草',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 0,
      description: '【禁忌・超低確率】金の力！HP全快＋全能力超ブースト！',
      effectType: 'buff_aura',
      chaosType: 'super_chat',
    },
  ],
  雷: [
    {
      name: '⏳ ザ・ワールド（時間停止）',
      type: '雷',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 30,
      description: '【禁忌・超低確率】時よ止まれ！相手を1ターン完全行動不能にする！',
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
      description: '【禁忌・超低確率】開発者コマンド発動！攻撃力+500%改造！',
      effectType: 'chaos_distort',
      chaosType: 'cheat_atk_boost',
    },
  ],
  闇: [
    {
      name: '🪞 著作権侵害（完全強奪）',
      type: '闇',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 30,
      description: '【禁忌・超低確率】相手の攻撃力と防御力を盗み出し、相手のバフを剥奪！',
      effectType: 'chaos_distort',
      chaosType: 'skill_steal',
    },
    {
      name: '🎮 コントローラー奪取',
      type: '闇',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 30,
      description: '【禁忌・超低確率】精神ハッキング！相手自身に全力で自傷ダメージ！',
      effectType: 'chaos_distort',
      chaosType: 'controller_hijack',
    },
  ],
  光: [
    {
      name: '🌀 特異点ブラックホール',
      type: '光',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 40,
      description: '【禁忌・超低確率】全次元崩壊！敵味方のバフを消去し全員HP40%削る！',
      effectType: 'explosion',
      chaosType: 'black_hole',
    },
  ],
  地: [
    {
      name: '🌋 地殻大崩壊カタストロフィ',
      type: '地',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 35,
      description: '【禁忌・超低確率】大地が裂けマグマ流出！全モンスターに壊滅的ダメージ！',
      effectType: 'explosion',
      chaosType: 'nuclear_cataclysm',
    },
  ],
  風: [
    {
      name: '🌪️ 虚無竜巻バミューダ',
      type: '風',
      category: 'chaos',
      power: 999,
      accuracy: 100,
      range: 35,
      description: '【禁忌・超低確率】亜空間竜巻！相手のHPを強制的に70%削り取る！',
      effectType: 'chaos_distort',
      chaosType: 'god_eraser',
    },
  ],
};

// Elemental thematic components for generating 100+ unique moves per element
interface ElementThemeSpec {
  prefixes: string[];
  nouns: string[];
  suffixes: string[];
  specialAbilities: {
    type: AttackSpecialEffectType;
    label: string;
    rate?: number;
    value?: number;
    hits?: number;
    descSuffix: string;
  }[];
}

const ELEMENT_THEMES: Record<ElementType, ElementThemeSpec> = {
  炎: {
    prefixes: [
      '紅蓮の', '灼熱の', '獄炎の', '爆裂の', '火竜の', '陽炎の', '業火の', '焔の', 'マグマの', '火砕の',
      'プロミネンス', 'クリムゾン', 'ブレイズ', 'フレア', 'インフェルノ', 'バーニング', '火山性', '太陽熱', '熱波の', '灰燼の'
    ],
    nouns: [
      'ファング', 'クロー', 'ブレス', 'バースト', 'スラッシュ', 'ストライク', 'キャノン', 'ウェイブ', 'ナックル', 'レイ',
      'ランス', 'ダイブ', 'ロア', 'ウィング', 'テール', 'プレス', 'キック', 'パルス', 'ソード', 'インパクト',
      '連弾', '穿刺', '噴出', '旋風', '咆哮', '突貫', '放射', '激突', '乱舞', '破砕'
    ],
    suffixes: [
      '撃', '牙', '爪', '刃', '砲', '破', '閃', '拳', '陣', '流',
      '炎', '突', '裂', '葬', '波', '弾', '双撃', '滅殺', '崩砕', '斬'
    ],
    specialAbilities: [
      { type: 'burn', label: 'やけど付与', rate: 45, descSuffix: '相手をやけど状態にして攻撃力を低下させる。' },
      { type: 'drain', label: 'HP熱量吸収', value: 45, descSuffix: '【HP吸収】熱エネルギーを吸収し、与ダメの45%を自己回復！' },
      { type: 'recoil', label: '捨て身反動', value: 20, descSuffix: '【反動】凄まじい熱突撃の反動で与ダメの20%を受ける。' },
      { type: 'atk_up', label: '闘志高揚', value: 1.25, rate: 60, descSuffix: '攻撃命中時に自身の攻撃力を+25%上昇！' },
      { type: 'high_crit', label: '急所直撃', rate: 40, descSuffix: '【急所率UP】急所直撃率が40%アップする鋭い炎撃！' },
      { type: 'def_down', label: '装甲融解', value: 0.75, rate: 50, descSuffix: '高熱で相手の装甲を融解させ防御力を-25%ダウン！' },
      { type: 'multi_hit', label: '連続火炎弾', hits: 3, descSuffix: '【3連撃】火の粉の連続波状攻撃！' },
    ],
  },
  水: {
    prefixes: [
      '蒼海の', '深海の', '激流の', '氷結の', 'アクア', 'タイダル', 'ハイドロ', '氷河の', '流水の', '海神の',
      'フロスト', 'ブリザード', '霧氷の', '清冽な', '大波の', '渦潮の', '氷槍の', '水沫の', 'オーシャンの', '潮流の'
    ],
    nouns: [
      'ショット', 'ストライク', 'カノン', 'ブレード', 'ウェイブ', 'スプラッシュ', 'テイル', 'ファング', 'ダイブ', 'ランス',
      'バースト', 'ヴォルテックス', 'スライサー', 'インパクト', 'キック', 'パルス', 'ロア', 'ウィップ', 'シュート', 'クロー',
      '急流', '氷柱', '連弾', '乱舞', '激突', '奔流', '旋風', '穿刺', '水牢', '渦巻'
    ],
    suffixes: [
      '流', '波', '刃', '弾', '撃', '砲', '斬', '牙', '破', '牙',
      '陣', '連', '葬', '双撃', '氷結', '滅砕', '奔流', '瀑布', '爪', '拳'
    ],
    specialAbilities: [
      { type: 'drain', label: '生命水ドレイン', value: 50, descSuffix: '【HP吸収】命の水を吸い取り与ダメの50%をHP回復！' },
      { type: 'freeze', label: '凍結フリーズ', rate: 35, descSuffix: '【凍結】極寒の冷気で相手を凍らせて1ターン行動不能に！' },
      { type: 'spd_down', label: '泥流拘束', value: 0.7, rate: 60, descSuffix: '泥流を浴びせ相手の移動力と素早さを-30%ダウン！' },
      { type: 'spd_up', label: '激流加速', value: 1.3, rate: 65, descSuffix: '水流に乗って自身の素早さと移動力を+30%アップ！' },
      { type: 'def_up', label: '水流ヴェール', value: 1.25, rate: 55, descSuffix: '水幕を展開し自身の防御力を+25%アップ！' },
      { type: 'multi_hit', label: '水流乱れ撃ち', hits: 3, descSuffix: '【3連撃】高速水弾の連続連射！' },
      { type: 'high_crit', label: '水刃一閃', rate: 35, descSuffix: '【急所率UP】鋭利な水刃が敵の急所を貫く！' },
    ],
  },
  草: {
    prefixes: [
      '密林の', '大樹の', '深緑の', '木霊の', 'フォレスト', '自然の', 'ヴァイン', '百花の', '新緑の', '神木の',
      '若葉の', '古樹の', '野茨の', 'ジャングル', 'リーフ', '大地樹の', '生命の', '樹海の', '萌芽の', '翡翠の'
    ],
    nouns: [
      'ウィップ', 'カッター', 'バッシュ', 'ルート', 'ニードル', 'シード', 'ストライク', 'ブルーム', 'スラッシュ', 'インパクト',
      'ハンマー', 'ソーン', 'スライサー', 'ブレス', 'パルス', 'ランス', 'ダイブ', 'スパイン', 'ナックル', 'テイル',
      '連弾', '挟撃', '乱舞', '穿刺', '激突', '旋風', '突貫', '咆哮', '破砕', '蔓延'
    ],
    suffixes: [
      '鞭', '刃', '撃', '牙', '破', '爪', '陣', '連', '弾', '双撃',
      '穿ち', '拳', '衝', '滅砕', '舞', '散華', '砲', '斬', '棘', '落とし'
    ],
    specialAbilities: [
      { type: 'drain', label: 'ギガドレイン', value: 60, descSuffix: '【HP吸収】養分を根こそぎ吸い上げ、与ダメの60%をHP回復！' },
      { type: 'drain', label: '寄生胞子ドレイン', value: 40, descSuffix: '【HP吸収】寄生胞子で敵の体力を削り与ダメの40%をHP回復！' },
      { type: 'recoil', label: 'ウッドハンマー反動', value: 25, descSuffix: '【反動】巨木の質量で圧砕する反動で与ダメの25%を受ける。' },
      { type: 'paralyze', label: '痺れ胞子', rate: 50, descSuffix: '【麻痺】毒胞子を散布し相手の素早さと移動力を半減！' },
      { type: 'def_up', label: '樹皮アーマー', value: 1.3, rate: 60, descSuffix: '強固な樹皮を硬質化させ自身の防御力を+30%アップ！' },
      { type: 'atk_down', label: '花粉脱力', value: 0.75, rate: 50, descSuffix: '甘い花粉で相手の戦意を奪い攻撃力を-25%ダウン！' },
      { type: 'multi_hit', label: '千本針乱射', hits: 4, descSuffix: '【4連撃】無数の針葉を高速連射する怒涛の連撃！' },
    ],
  },
  雷: {
    prefixes: [
      '迅雷の', '紫電の', '轟雷の', 'プラズマ', 'ボルテックス', '稲妻の', 'ライトニング', '高圧の', '神鳴の', 'エレキ',
      'スパーク', '雷帝の', '電磁の', '閃電の', '超電導の', '雷雲の', '雷獣の', '青雷の', '黄雷の', '放電の'
    ],
    nouns: [
      'ショック', 'ボルト', 'ブレイク', 'ストライク', 'ファング', 'スラッシュ', 'パルス', 'バースト', 'カノン', 'ランス',
      'クロー', 'キック', 'インパクト', 'アロー', 'ナックル', 'テイル', 'ダイブ', 'レイ', 'ニードル', 'ウィング',
      '連弾', '連雷', '激突', '旋風', '穿刺', '突貫', '乱舞', '咆哮', '破砕', '疾走'
    ],
    suffixes: [
      '雷', '閃', '撃', '牙', '刃', '砲', '破', '爪', '陣', '連',
      '拳', '弾', '双撃', '穿ち', '滅殺', '斬', '落とし', '電光', '衝', '瞬殺'
    ],
    specialAbilities: [
      { type: 'paralyze', label: '強烈麻痺', rate: 60, descSuffix: '【麻痺】高電圧ショックで相手を痺れさせ移動力・素早さを激減！' },
      { type: 'drain', label: '吸電ドレイン', value: 40, descSuffix: '【HP吸収】生体電流を吸い上げ与ダメの40%をHP回復！' },
      { type: 'spd_up', label: '超電磁加速', value: 1.35, rate: 70, descSuffix: '電磁パルスで自身の素早さと移動力を+35%急加速！' },
      { type: 'high_crit', label: '電光急所一閃', rate: 45, descSuffix: '【急所率UP】急所直撃率が45%アップする神速の一閃！' },
      { type: 'recoil', label: 'ボルテッカー反動', value: 20, descSuffix: '【反動】超帯電全力突撃の反動で与ダメの20%を受ける。' },
      { type: 'multi_hit', label: '多重連雷撃', hits: 3, descSuffix: '【3連撃】連続落雷で相手をめった打ち！' },
    ],
  },
  闇: {
    prefixes: [
      '漆黒の', '暗黒の', '深淵の', '常闇の', '虚無の', 'シャドウ', 'ナイトメア', 'アビス', '冥府の', '邪神の',
      '黒曜の', '幻影の', '呪詛の', 'ダーク', '宵闇の', '魔獣の', '亡霊の', '黒影の', '奈落の', '夜魔の'
    ],
    nouns: [
      'ニードル', 'ストライク', 'ファング', 'クロー', 'スラッシュ', 'ヴォイド', 'バースト', 'サイズ', 'パルス', 'ランス',
      'ブレイド', 'テイル', 'インパクト', 'ロア', 'キック', 'ナックル', 'バイト', 'ダイブ', 'ウィング', 'レイ',
      '連弾', '挟撃', '連撃', '穿刺', '激突', '旋風', '突貫', '乱舞', '咆哮', '破砕'
    ],
    suffixes: [
      '闇', '影', '撃', '牙', '爪', '刃', '破', '陣', '連', '弾',
      '拳', '葬', '双撃', '斬', '穿ち', '滅殺', '衝', '怨念', '呪縛', '落とし'
    ],
    specialAbilities: [
      { type: 'drain', label: 'ソウルドレイン', value: 55, descSuffix: '【HP吸収】魂と生気を貪り食らい、与ダメの55%をHP吸収！' },
      { type: 'drain', label: '暗黒吸血牙', value: 45, descSuffix: '【HP吸収】鋭い牙で敵の生き血を吸い与ダメの45%をHP回復！' },
      { type: 'atk_down', label: '呪詛の脱力', value: 0.75, rate: 60, descSuffix: '呪言を刻みつけ相手の攻撃力を-25%低下させる！' },
      { type: 'spd_down', label: '影縛りバインド', value: 0.7, rate: 65, descSuffix: '相手の影を縫い留め、移動力と素早さを-30%ダウン！' },
      { type: 'high_crit', label: '暗殺急所突き', rate: 45, descSuffix: '【急所率UP】死角から心臓を狙う急所直撃率+45%！' },
      { type: 'recoil', label: '暗黒禁断撃', value: 20, descSuffix: '【反動】己の生気を削る重撃の反動で与ダメの20%を受ける。' },
      { type: 'multi_hit', label: '漆黒の連爪', hits: 3, descSuffix: '【3連撃】闇の爪痕を残す高速3連撃！' },
    ],
  },
  光: {
    prefixes: [
      '聖なる', '極光の', '閃光の', '神聖な', 'ホーリー', 'ルミナス', 'シャイニング', '太陽の', '天上の', '栄光の',
      '白銀の', 'オーロラ', '聖騎士の', '光輝の', 'セレスティアル', '純白の', '天使の', '黎明の', '陽光の', '聖天の'
    ],
    nouns: [
      'アロー', 'ラッシュ', 'ブレード', 'レイ', 'バースト', 'ストライク', 'カノン', 'ランス', 'パルス', 'インパクト',
      'スライサー', 'ファング', 'ナックル', 'テイル', 'ウィング', 'シールド', 'ロア', 'ダイブ', 'クロー', 'キック',
      '連弾', '乱舞', '激突', '旋風', '穿刺', '突貫', '連射', '咆哮', '破砕', '聖裁'
    ],
    suffixes: [
      '光', '聖', '撃', '刃', '砲', '閃', '破', '陣', '連', '弾',
      '拳', '牙', '爪', '双撃', '斬', '穿ち', '滅殺', '審判', '衝', '福音'
    ],
    specialAbilities: [
      { type: 'drain', label: '聖光還元ドレイン', value: 45, descSuffix: '【HP吸収】聖なる光で浄化し与ダメの45%を自己HP還元！' },
      { type: 'atk_up', label: '神威ブースト', value: 1.25, rate: 60, descSuffix: '聖なる加護により自身の攻撃力を+25%アップ！' },
      { type: 'def_up', label: '聖域プロテクト', value: 1.25, rate: 60, descSuffix: '光の盾を展開し自身の防御力を+25%アップ！' },
      { type: 'atk_down', label: '閃光ブラインド', value: 0.75, rate: 60, descSuffix: '強烈な光で相手の目を晦ませ攻撃力を-25%ダウン！' },
      { type: 'high_crit', label: '断罪の急所撃', rate: 40, descSuffix: '【急所率UP】邪悪を討つ神撃により急所率+40%！' },
      { type: 'multi_hit', label: '光の乱れ矢', hits: 3, descSuffix: '【3連撃】光の矢を連射する華麗な連撃！' },
    ],
  },
  地: {
    prefixes: [
      '金剛の', '巨岩の', '大地の', '地脈の', 'ガイア', 'メガリス', '岩石の', '剛力の', 'テラ', '重力の',
      '崩落の', '鉱石の', '大断層の', '盤石の', '重装甲の', '玄武の', '砂塵の', '断崖の', '地底の', '鉄壁の'
    ],
    nouns: [
      'バレット', 'クランチ', 'バスター', 'プレス', 'ストライク', 'ハンマー', 'インパクト', 'ナックル', 'タックル', 'テイル',
      'スライサー', 'ファング', 'クロー', 'パルス', 'ブレイク', 'ダイブ', 'ロア', 'ランス', 'キック', 'ウェイブ',
      '連弾', '連砕', '激突', '旋風', '穿刺', '突貫', '乱舞', '咆哮', '破砕', '地震'
    ],
    suffixes: [
      '岩', '撃', '砕', '拳', '破', '牙', '爪', '陣', '連', '弾',
      '双撃', '落とし', '斬', '穿ち', '滅殺', '衝', '盾', '剛', '塊', '壁'
    ],
    specialAbilities: [
      { type: 'drain', label: '大地養分ドレイン', value: 50, descSuffix: '【HP吸収】敵の質量とエネルギーを吸収し与ダメの50%をHP回復！' },
      { type: 'recoil', label: 'メガトン捨て身', value: 25, descSuffix: '【反動】超重量突進の強烈な反動で与ダメの25%を受ける。' },
      { type: 'def_up', label: '金剛ボディ', value: 1.3, rate: 65, descSuffix: '肉体を岩石のように硬化させ自身の防御力を+30%アップ！' },
      { type: 'spd_down', label: '重力付加マッド', value: 0.7, rate: 60, descSuffix: '泥土と重力で相手の足元を捕らえ移動力・素早さ-30%！' },
      { type: 'def_down', label: '装甲破砕スマッシュ', value: 0.75, rate: 55, descSuffix: '豪快な一撃で相手の装甲を粉砕し防御力-25%！' },
      { type: 'high_crit', label: '急所粉砕撃', rate: 35, descSuffix: '【急所率UP】相手の急所を力任せに打ち砕く！' },
      { type: 'multi_hit', label: '多重投石連撃', hits: 3, descSuffix: '【3連撃】巨大な礫を連続で叩き込む！' },
    ],
  },
  風: {
    prefixes: [
      '疾風の', '烈風の', '旋風の', '神速の', 'テンペスト', 'サイクロン', 'ゲイル', 'シルフ', '突風の', '乱気流の',
      '翡翠風の', '真空の', '暴風雨の', '気流の', '羽ばたきの', '竜巻の', 'ソニック', '薫風の', '風神の', '大気の'
    ],
    nouns: [
      'カッター', 'スラッシュ', 'ストライク', 'スライサー', 'ウィング', 'ストーム', 'パルス', 'ブレス', 'ショット', 'ブレード',
      'アロー', 'テイル', 'ファング', 'クロー', 'キック', 'ダイブ', 'ランス', 'ナックル', 'ロア', 'インパクト',
      '連弾', '連刃', '激突', '旋風', '穿刺', '突貫', '乱舞', '咆哮', '破砕', '突風'
    ],
    suffixes: [
      '風', '刃', '撃', '斬', '閃', '破', '爪', '陣', '連', '弾',
      '拳', '牙', '双撃', '穿ち', '滅殺', '衝', '舞', '旋', '瞬殺', '切断'
    ],
    specialAbilities: [
      { type: 'drain', label: 'サイクロンドレイン', value: 45, descSuffix: '【HP吸収】大気とともに活力を巻き上げ与ダメの45%をHP回復！' },
      { type: 'spd_up', label: '神速追い風', value: 1.35, rate: 70, descSuffix: '追い風に乗り自身の素早さと移動力を+35%アップ！' },
      { type: 'spd_down', label: '乱気流ストーム', value: 0.7, rate: 65, descSuffix: '激しい向かい風で相手の素早さと移動力を-30%ダウン！' },
      { type: 'high_crit', label: '真空急所斬り', rate: 45, descSuffix: '【急所率UP】かまいたちが急所を切り裂く（急所率+45%）！' },
      { type: 'atk_down', label: '突風目眩まし', value: 0.75, rate: 55, descSuffix: '突風で体勢を崩させ相手の攻撃力を-25%ダウン！' },
      { type: 'multi_hit', label: '風刃連射舞', hits: 4, descSuffix: '【4連撃】鋭いかまいたちを4連続で叩き込む！' },
    ],
  },
};

// Generates an expansive, deterministic pool of 100+ uniquely named and configured moves per element
export function getElementMovePool(element: ElementType): MoveTemplate[] {
  const theme = ELEMENT_THEMES[element];
  const pool: MoveTemplate[] = [];
  const seenNames = new Set<string>();

  // 1. Handcrafted Core Iconic Moves (10 curated iconic moves with varied ranges and abilities)
  const coreMoves: MoveTemplate[] = [
    {
      name: `${element === '炎' ? '火炎放射' : element === '水' ? 'ハイドロポンプ' : element === '草' ? 'ソーラービーム' : element === '雷' ? '10万ボルト' : element === '闇' ? 'シャドーボール' : element === '光' ? 'ゴッドレイ' : element === '地' ? 'じしん' : 'エアスラッシュ'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 65,
      accuracy: 95,
      range: 22,
      description: `【代表技】${element}のエネルギーを圧縮して放つ最も信頼性の高い基本必殺技。`,
      effectType: 'beam',
    },
    {
      name: `${element === '炎' ? '紅蓮ドレインファング' : element === '水' ? 'アクアドレインキス' : element === '草' ? 'ギガドレイン' : element === '雷' ? '吸電プラズマ' : element === '闇' ? 'ソウルドレイン' : element === '光' ? 'ホーリードレイン' : element === '地' ? '大地の養分吸収' : 'サイクロンドレイン'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 52,
      accuracy: 90,
      range: 12,
      description: '【HP吸収】敵の体力を削り取り、与えたダメージの50%を自身のHPとして回復する！',
      effectType: 'dash_strike',
      specialEffect: {
        type: 'drain',
        rate: 100,
        value: 50,
        description: '与ダメの50%をHP吸収',
      },
    },
    {
      name: `${element === '炎' ? 'フレアドライブ' : element === '水' ? 'タイダルクラッシュ' : element === '草' ? 'ウッドハンマー' : element === '雷' ? 'ボルテッカー' : element === '闇' ? '暗黒突撃' : element === '光' ? 'ホーリーダイブ' : element === '地' ? 'メガトン捨て身タックル' : '暴風ダイブ'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 88,
      accuracy: 85,
      range: 10,
      description: '【超威力・反動】捨て身の全身全霊アタック！強大無比だが与ダメの20%の反動ダメージを受ける。',
      effectType: 'dash_strike',
      specialEffect: {
        type: 'recoil',
        rate: 100,
        value: 20,
        description: '反動で与ダメの20%を受ける',
      },
    },
    {
      name: `⚔️ ${element === '炎' ? '連撃紅蓮脚' : element === '水' ? '激流双掌打' : element === '草' ? '連棘樹木断' : element === '雷' ? '迅雷瞬撃破' : element === '闇' ? '暗影連撃葬' : element === '光' ? '聖光十字斬' : element === '地' ? '重撃地脈砕' : '疾風乱舞刃'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 64,
      accuracy: 92,
      range: 18,
      description: '【連続打撃】自身のエネルギーを研ぎ澄まし敵に連続で叩き込む俊敏な強襲技！',
      effectType: 'dash_strike',
      specialEffect: {
        type: 'multi_hit',
        hits: 2,
        description: '【2連撃】素早い追撃を与える',
      },
    },
    {
      name: `💥 ${element === '炎' ? '業火大爆発（敵全体）' : element === '水' ? '大津波タイダル（敵全体）' : element === '草' ? '大樹の地響き（敵全体）' : element === '雷' ? '全方位放電（敵全体）' : element === '闇' ? 'ナイトメアウェーブ（敵全体）' : element === '光' ? 'プリズムスーパーノヴァ（敵全体）' : element === '地' ? '大断層アースクエイク（敵全体）' : '大暴風トルネード（敵全体）'}`,
      type: element,
      category: 'attack',
      targetScope: 'all_enemies',
      power: 68,
      accuracy: 88,
      range: 35,
      description: '【敵全体攻撃】戦場全体に広範囲の属性波動を巻き起こし、敵陣営全員を一網打尽にする！',
      effectType: 'explosion',
    },
    {
      name: `💖 ${element === '炎' ? '不死鳥の再生炎' : element === '水' ? '命の雫・大回復' : element === '草' ? '大樹の光合成' : element === '雷' ? '急速充電リカバリー' : element === '闇' ? '虚無修復の呪言' : element === '光' ? '天の恵み・聖光治癒' : element === '地' ? '大地の母性治癒' : '息吹の追い風回復'}`,
      type: element,
      category: 'status',
      targetScope: 'self',
      healRatio: 0.5,
      power: 0,
      accuracy: 100,
      range: 0,
      description: '【HP回復】自身の最大HPの50%を一気に大回復し、さらに攻撃力・防御力を強化する！',
      effectType: 'buff_aura',
    },
    {
      name: `🛡️ ${element === '炎' ? '炎熱プロテクション' : element === '水' ? '激流ウォール' : element === '草' ? '樹皮シールド' : element === '雷' ? '電磁バリア' : element === '闇' ? '黒影のカーテン' : element === '光' ? '聖光の守護陣' : element === '地' ? '金剛の砦' : '神速の風幕'}`,
      type: element,
      category: 'status',
      targetScope: 'self',
      healRatio: 0.3,
      power: 0,
      accuracy: 100,
      range: 0,
      description: '【自己防御強化】自身のHPを30%回復しつつ、防御力と素早さを1.3倍に引き上げる！',
      effectType: 'buff_aura',
    },
    {
      name: `✨ ${element === '炎' ? '極炎奥義・ヴァルカンブレイク' : element === '水' ? '海王秘奥義・リヴァイアサン砲' : element === '草' ? '世界樹奥義・ユグドラシルバースト' : element === '雷' ? '雷神奥義・トールハンマー' : element === '闇' ? '冥界奥義・ハデスヴォイド' : element === '光' ? '聖天奥義・セラフィムレイ' : element === '地' ? '金剛奥義・ガイアクラッシャー' : '風神奥義・テンペストブレード'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 92,
      accuracy: 82,
      range: 24,
      description: '【最強奥義】モンスターの秘めたる力を限界突破させて放つ極大の一撃！',
      effectType: 'beam',
      specialEffect: {
        type: 'high_crit',
        rate: 35,
        description: '急所直撃率+35%',
      },
    },
    // New Tactical Moves:
    {
      name: `👻 ${element === '闇' ? '虚無の光学迷彩' : element === '光' ? '光子屈折ステルス' : element === '風' ? '気流隠蔽カモフラージュ' : element === '水' ? '霧散ミラージュ' : '熱波の蜃気楼'}`,
      type: element,
      category: 'status',
      targetScope: 'self',
      power: 0,
      accuracy: 100,
      range: 0,
      description: '【ステルス迷彩】光の屈折を歪めて2ターン透明化！回避率が劇的上昇し次の一撃の威力が1.6倍に！',
      effectType: 'stealth_cloak',
    },
    {
      name: `👥 ${element === '雷' ? '電磁ホログラム分身' : element === '水' ? '水鏡の残影クローン' : element === '闇' ? '影法師のダブル' : element === '草' ? '木遁身代わり分身' : '幻影ダブルデコイ'}`,
      type: element,
      category: 'status',
      targetScope: 'self',
      power: 0,
      accuracy: 100,
      range: 0,
      description: '【分身召喚】左右に2体の立体デコイを展開！敵の攻撃を身代わりとして防ぎきる！',
      effectType: 'decoy_clone',
    },
    {
      name: `⚡ ${element === '雷' ? 'ハイパーレールガン' : element === '光' ? '天罰のルミナスビーム' : element === '炎' ? '直列熱線レーザー' : element === '水' ? '高圧ウォーターカッター' : '超電磁ピアシングビーム'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 74,
      accuracy: 90,
      range: 34,
      description: '【直線貫通レーザー】長距離を一直線に撃ち抜く超高速の極太ビーム！',
      effectType: 'line_beam',
      specialEffect: {
        type: 'high_crit',
        rate: 30,
        description: '急所率+30%',
      },
    },
    {
      name: `☄️ ${element === '炎' ? '天火メテオモルタル' : element === '地' ? '岩石巨弾迫撃砲' : element === '水' ? '大水球アーティラリ' : element === '雷' ? '放電プラズマ彗星弾' : '高角放物迫撃砲'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 82,
      accuracy: 85,
      range: 36,
      description: '【超遠距離迫撃砲】上空高く打ち上げた弾頭が高角度で敵の足元へ急降下着弾！',
      effectType: 'ground_mortar',
    },
    {
      name: `✨ ${element === '風' ? '三連風刃スプレッド' : element === '草' ? '扇状乱れ撃ち散弾' : element === '水' ? 'トライデントトリプル波' : element === '炎' ? '三叉火炎スプラッシュ' : '3方向扇状バースト'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 62,
      accuracy: 94,
      range: 22,
      description: '【3方向扇状拡散弾】3方向に広がるエネルギー弾を同時射出する拡散波状攻撃！',
      effectType: 'spread_3way',
      specialEffect: {
        type: 'multi_hit',
        hits: 3,
        description: '3連射',
      },
    },
    {
      name: `🌀 ${element === '闇' ? 'シャドウワープ急襲斬' : element === '風' ? '瞬歩・背後影刃' : element === '雷' ? '瞬雷フラッシュステップ' : element === '光' ? '聖光転移ストライク' : '次元跳躍背後斬'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 76,
      accuracy: 92,
      range: 20,
      description: '【背後瞬動急襲】一瞬で空間を跳躍して相手の背後へワープし、死角からクロス斬撃！',
      effectType: 'teleport_strike',
      specialEffect: {
        type: 'high_crit',
        rate: 40,
        description: '急所率+40%',
      },
    },
    {
      name: `🧲 ${element === '闇' ? '重力ブラックホール' : element === '水' ? '激渦の引き寄せ' : element === '風' ? '集束バキューム' : element === '地' ? '大地の磁場引力' : '引力ヴォルテックス'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 58,
      accuracy: 95,
      range: 26,
      description: '【引力引き寄せ】敵モンスターを中心に引き寄せて間合いを強制的に詰める！',
      effectType: 'vortex_pull',
    },
    {
      name: `💨 ${element === '風' ? '烈風ノックバック波' : element === '地' ? '巨震の衝撃波' : element === '雷' ? '斥力パルスブラスト' : element === '炎' ? '爆風リパルサー' : '衝撃ノックバック'}`,
      type: element,
      category: 'attack',
      targetScope: 'single_enemy',
      power: 60,
      accuracy: 95,
      range: 16,
      description: '【斥力ノックバック】激しい衝撃波で相手を後方へ吹き飛ばし距離をとる！',
      effectType: 'knockback_wave',
    },
  ];

  coreMoves.forEach((m) => {
    seenNames.add(m.name);
    pool.push(m);
  });

  // 2. Procedural Combinator to fill up to 110+ uniquely named moves!
  // Combinations of prefixes, nouns, suffixes, tactical categories, ranges, and special abilities
  let seed = 0;
  for (let pIdx = 0; pIdx < theme.prefixes.length; pIdx++) {
    for (let nIdx = 0; nIdx < theme.nouns.length; nIdx++) {
      if (pool.length >= 115) break;

      const prefix = theme.prefixes[pIdx];
      const noun = theme.nouns[nIdx];
      const sIdx = (pIdx + nIdx) % theme.suffixes.length;
      const suffix = theme.suffixes[sIdx];

      const nameCandidate = `${prefix}${noun}${suffix}`;
      if (seenNames.has(nameCandidate)) continue;
      seenNames.add(nameCandidate);

      seed++;
      // Determine power (30 - 85 for balanced stat-dependence), range, and ability
      // Keep melee uncommon: most battles should involve positioning, projectiles and ranged control.
      const isClose = seed % 6 === 0;
      const isMid = !isClose && seed % 3 !== 2;
      const range = isClose ? 9 + (seed % 4) : isMid ? 18 + (seed % 7) : 28 + (seed % 8);
      
      // Modest base powers as requested: light moves 35-48, medium 50-65, heavy 70-85
      const powerTier = seed % 5;
      let power = 55;
      let accuracy = 90;
      let effectType: MoveTemplate['effectType'] = 'projectile';

      if (isClose) {
        const closeVariants: MoveTemplate['effectType'][] = ['dash_strike', 'spin_slash', 'teleport_strike', 'knockback_wave'];
        effectType = closeVariants[seed % closeVariants.length];
      } else if (isMid) {
        const midVariants: MoveTemplate['effectType'][] = ['projectile', 'spread_3way', 'line_beam', 'vortex_pull'];
        effectType = midVariants[seed % midVariants.length];
      } else {
        const longVariants: MoveTemplate['effectType'][] = ['ground_mortar', 'line_beam', 'explosion', 'projectile'];
        effectType = longVariants[seed % longVariants.length];
      }

      if (powerTier === 0) {
        power = 28 + (seed % 8);
        accuracy = 98;
      } else if (powerTier === 1 || powerTier === 2) {
        power = 38 + (seed % 11);
        accuracy = 92;
      } else if (powerTier === 3) {
        power = 50 + (seed % 10);
        accuracy = 86;
      } else {
        power = 60 + (seed % 8);
        accuracy = 82;
      }

      // Assign Special Ability on attack
      const abilitySpec = theme.specialAbilities[seed % theme.specialAbilities.length];
      const specialEffect: MoveSpecialEffect = {
        type: abilitySpec.type,
        rate: abilitySpec.rate || 100,
        value: abilitySpec.value,
        hits: abilitySpec.hits,
        description: abilitySpec.label,
      };

      const rangeText = range <= 12 ? '【近接】' : range <= 24 ? '【中距離】' : '【遠距離】';
      const description = `${rangeText} ${abilitySpec.descSuffix}`;

      pool.push({
        name: nameCandidate,
        type: element,
        category: 'attack',
        targetScope: 'single_enemy',
        power,
        accuracy,
        range,
        description,
        effectType,
        specialEffect,
      });
    }
  }

  return pool;
}
