export interface SpecialAbilityData {
  id: string;
  name: string;
  description: string;
  category: 'attack' | 'defense' | 'mobility' | 'recovery' | 'elemental' | 'tactical';
  element?: string;
}

/**
 * 50+ Distinct Monster Traits (特性) with deep tactical gameplay impacts
 */
export const MONSTER_TRAITS_POOL: SpecialAbilityData[] = [
  // --- 攻撃系 (Offensive Traits) ---
  {
    id: 'trait_fire_spirit',
    name: '紅蓮の闘志',
    description: 'HPが半分以下になると攻撃力が1.4倍に跳ね上がるピンチ強化特性。',
    category: 'attack',
    element: '炎',
  },
  {
    id: 'trait_sharp_blade',
    name: '鋭利な刃',
    description: '攻撃の急所ヒット率が大幅に上昇し、クリティカルダメージも強化される。',
    category: 'attack',
  },
  {
    id: 'trait_overwhelm',
    name: '威圧の咆哮',
    description: 'バトル開始時、敵全体の攻撃力を15%低下させ戦意を削ぐ。',
    category: 'attack',
  },
  {
    id: 'trait_first_strike',
    name: '電光石火の先手',
    description: '第1ラウンドの攻撃ダメージが1.3倍になり、初手で大打撃を与える。',
    category: 'attack',
  },
  {
    id: 'trait_reckless_power',
    name: 'すてみ剛力',
    description: '攻撃力が常時1.2倍になるが、被ダメージも10%増加する諸刃の剣。',
    category: 'attack',
  },
  {
    id: 'trait_armor_pierce',
    name: '装甲貫通',
    description: '相手の防御力バフを無視して安定したダメージを与える。',
    category: 'attack',
  },
  {
    id: 'trait_berserk_pulse',
    name: '狂乱の脈動',
    description: '攻撃を命中させるたびに、自身の攻撃力が5%ずつ累積上昇する。',
    category: 'attack',
  },
  {
    id: 'trait_sniper_focus',
    name: '天賦のスナイパー',
    description: '遠距離攻撃技の命中率が100%になり、長距離狙撃の威力が上がる。',
    category: 'attack',
  },
  {
    id: 'trait_double_edge_soul',
    name: '修羅の闘気',
    description: '反動技を使用した際、反動を半減しつつ相手へのダメージを1.25倍にする。',
    category: 'attack',
  },

  // --- 防御・耐久系 (Defense & Resilience Traits) ---
  {
    id: 'trait_unyielding_guts',
    name: '不撓不屈（根性）',
    description: 'HP満タン時に一撃死級の大ダメージを受けても、HP1で確実に耐え残る。',
    category: 'defense',
    element: '地',
  },
  {
    id: 'trait_iron_wall',
    name: '金剛岩壁',
    description: 'バトル開始時から強固な岩の鎧をまとい、常時被ダメージを20%カット。',
    category: 'defense',
    element: '地',
  },
  {
    id: 'trait_water_veil',
    name: '清流の受け流し',
    description: '直接攻撃を受けた際、水の衝撃吸収でダメージを25%軽減する。',
    category: 'defense',
    element: '水',
  },
  {
    id: 'trait_magma_armor',
    name: '灼熱のマグマスキン',
    description: '相手から近接攻撃を受けた時、触れた敵にやけどダメージを跳ね返す。',
    category: 'defense',
    element: '炎',
  },
  {
    id: 'trait_mirror_coat',
    name: '光彩の反射鏡',
    description: '相手の特殊遠距離攻撃を受けた時、受けたダメージの20%を相手に反射。',
    category: 'defense',
    element: '光',
  },
  {
    id: 'trait_thick_fur',
    name: '極厚の毛皮',
    description: '急所（クリティカル）ダメージを完全に無効化し、通常ダメージに抑える。',
    category: 'defense',
  },
  {
    id: 'trait_shadow_cloak',
    name: '深淵の幻影',
    description: '影の中に溶け込み、相手のあらゆる攻撃を20%の確率で完全回避する。',
    category: 'defense',
    element: '闇',
  },
  {
    id: 'trait_holy_barrier',
    name: '聖樹の加護',
    description: 'ターン終了時、自身の周囲に最大HPの10%分の保護シールドを再展開。',
    category: 'defense',
    element: '草',
  },
  {
    id: 'trait_adaptive_shell',
    name: '環境適応外殻',
    description: '相手の弱点属性攻撃を受けても、ばつぐん倍率を等倍に和らげる。',
    category: 'defense',
  },

  // --- 機動・移動力系 (Mobility & Agility Traits) ---
  {
    id: 'trait_wind_stride',
    name: '神速の飛翔',
    description: '毎ターンの移動可能距離が+6m増加し、アリーナを素早く駆け回れる。',
    category: 'mobility',
    element: '風',
  },
  {
    id: 'trait_light_step',
    name: '閃光ステップ',
    description: '移動後の攻撃時、相手の迎撃をかわし命中率が+15%底上げされる。',
    category: 'mobility',
    element: '光',
  },
  {
    id: 'trait_storm_chaser',
    name: '疾風怒濤',
    description: '素早さステータスが常時1.3倍になり、常に行動順の先手を取りやすい。',
    category: 'mobility',
    element: '風',
  },
  {
    id: 'trait_feather_body',
    name: '軽やかな羽毛',
    description: '地形の減速効果や移動距離のランダムダイス下振れ（15m未満）を完全無効化。',
    category: 'mobility',
  },
  {
    id: 'trait_electro_drift',
    name: '電磁加速ブースト',
    description: 'ターン開始時に素早さバフが付与され、移動力ダイスが常に最大値近くになる。',
    category: 'mobility',
    element: '雷',
  },
  {
    id: 'trait_shadow_warp',
    name: '影歩き',
    description: '相手モンスターをすり抜けて背後に回り込むことができる軽快な足取り。',
    category: 'mobility',
    element: '闇',
  },
  {
    id: 'trait_earth_quake_step',
    name: '地響きの巨躯',
    description: '移動した距離に応じて、次の近接攻撃の威力が最大+30%まで加算される。',
    category: 'mobility',
    element: '地',
  },
  {
    id: 'trait_acrobat',
    name: 'アクロバット機動',
    description: '移動距離を5m以上残して技を放つと、技の威力が1.2倍になる。',
    category: 'mobility',
  },

  // --- 回復・耐久再生系 (Recovery & Sustain Traits) ---
  {
    id: 'trait_vampiric_fangs',
    name: '吸血鬼の牙',
    description: 'すべての攻撃技に15%のHP吸収（ドレイン）効果が自動で付与される。',
    category: 'recovery',
    element: '闇',
  },
  {
    id: 'trait_photosynthesis',
    name: '光合成コア',
    description: '毎ターン開始時に、自身の最大HPの8%を自動で自己再生する。',
    category: 'recovery',
    element: '草',
  },
  {
    id: 'trait_hydrating_dew',
    name: 'うるおいの雫',
    description: '回復技の効果量が1.35倍になり、状態異常を自然治癒する。',
    category: 'recovery',
    element: '水',
  },
  {
    id: 'trait_phoenix_rebirth',
    name: '不死鳥の再燃',
    description: '一度だけHPが25%以下になった瞬間に、HPが即座に300回復する。',
    category: 'recovery',
    element: '炎',
  },
  {
    id: 'trait_soil_nutrients',
    name: '大地の滋養',
    description: 'その場で待機してターンを終えると、HPが最大値の15%回復する。',
    category: 'recovery',
    element: '地',
  },
  {
    id: 'trait_sacred_spring',
    name: '聖なる泉の導き',
    description: 'バトル中に使用する回復スキルの効果範囲が広がり、回復量が底上げされる。',
    category: 'recovery',
    element: '光',
  },
  {
    id: 'trait_static_recharge',
    name: '静電リチャージ',
    description: '移動距離1mごとに生体電流を充電し、HPをわずかに修復する。',
    category: 'recovery',
    element: '雷',
  },

  // --- 属性マスター系 (Elemental Masteries) ---
  {
    id: 'trait_master_fire',
    name: '炎帝のカリスマ',
    description: '炎属性の技威力が常時1.25倍になり、相手をやけどにさせやすくなる。',
    category: 'elemental',
    element: '炎',
  },
  {
    id: 'trait_master_water',
    name: '海神の支配',
    description: '水属性の技威力が常時1.25倍になり、水流の押し流し範囲が拡大。',
    category: 'elemental',
    element: '水',
  },
  {
    id: 'trait_master_grass',
    name: '森林の王気',
    description: '草属性の技威力が常時1.25倍になり、追加で自身の防御力も上昇。',
    category: 'elemental',
    element: '草',
  },
  {
    id: 'trait_master_thunder',
    name: '雷神の稲妻',
    description: '雷属性の技威力が常時1.25倍になり、相手を麻痺（移動力半減）にする。',
    category: 'elemental',
    element: '雷',
  },
  {
    id: 'trait_master_dark',
    name: '常闇の支配者',
    description: '闇属性の技威力が常時1.25倍になり、相手の攻撃力を吸い取る。',
    category: 'elemental',
    element: '闇',
  },
  {
    id: 'trait_master_light',
    name: '天光の祝福',
    description: '光属性の技威力が常時1.25倍になり、聖なる光で命中率が必中になる。',
    category: 'elemental',
    element: '光',
  },
  {
    id: 'trait_master_earth',
    name: '地脈の主',
    description: '地属性の技威力が常時1.25倍になり、最大HPも+200ボーナス加算。',
    category: 'elemental',
    element: '地',
  },
  {
    id: 'trait_master_wind',
    name: '暴風の申し子',
    description: '風属性の技威力が常時1.25倍になり、攻撃時の風圧で敵を弾き飛ばす。',
    category: 'elemental',
    element: '風',
  },

  // --- 特殊・戦術タクティカル系 (Tactical & Special Traits) ---
  {
    id: 'trait_intimidation_aura',
    name: '覇王色の威圧',
    description: '接近してきた敵モンスターの素早さと攻撃力を同時に弱体化させる。',
    category: 'tactical',
  },
  {
    id: 'trait_analyst_eye',
    name: 'アナライズ・アイ',
    description: '相手の弱点属性を突いたときのダメージ倍率が1.5倍から1.8倍に跳ね上がる。',
    category: 'tactical',
  },
  {
    id: 'trait_gamblers_luck',
    name: '豪運ギャンブラー',
    description: '攻撃ダメージの振れ幅が最大+40%まで上振れする勝負師の才能。',
    category: 'tactical',
  },
  {
    id: 'trait_retaliation_curse',
    name: '報復の呪言',
    description: '倒された時、最後に攻撃してきた相手に特大の呪いダメージを残す。',
    category: 'tactical',
    element: '闇',
  },
  {
    id: 'trait_chaos_affinity',
    name: 'カオス親和体質',
    description: '禁忌・カオス技の出現確率と効果が強化され、戦局を覆す力を引き出す。',
    category: 'tactical',
  },
  {
    id: 'trait_titan_body',
    name: '巨人の体躯',
    description: '最大HPが+300され、攻撃力も高いが、移動速度がやや重厚になる。',
    category: 'tactical',
    element: '地',
  },
  {
    id: 'trait_mana_overflow',
    name: '魔力氾濫',
    description: '技の攻撃射程が全体的に+5m延伸され、安全圏からアウトレンジ攻撃が可能。',
    category: 'tactical',
    element: '光',
  },
  {
    id: 'trait_pure_heart',
    name: '不変のメンタル',
    description: '攻撃力ダウンや防御力ダウンなどの能力低下デバフを一切受け付けない。',
    category: 'tactical',
  },
  {
    id: 'trait_pride_hunter',
    name: '孤高のハンター',
    description: '戦場に敵が多いほど集中力が増し、敵1体ごとに攻撃力が+8%加算される。',
    category: 'tactical',
  },
  {
    id: 'trait_combustion_spark',
    name: '自己発熱エンジン',
    description: '行動するたびに体温が上昇し、毎ターン終了時に攻撃力バフが累積する。',
    category: 'tactical',
    element: '炎',
  },
  {
    id: 'trait_frost_bite',
    name: '氷結の牙',
    description: '相手にダメージを与えた時、30%の確率で相手の移動力を半減させる。',
    category: 'tactical',
    element: '水',
  },
  {
    id: 'trait_overclock',
    name: 'オーバークロック',
    description: '最初の3ターン間、攻撃力と素早さが1.35倍になる超加速ブースト。',
    category: 'tactical',
    element: '雷',
  },
  {
    id: 'trait_solar_blessing',
    name: '天日の恩恵',
    description: '相手よりHPが高い場合、与えるダメージが常時+20%アップする優位特性。',
    category: 'tactical',
    element: '光',
  },
  {
    id: 'trait_mirage_dance',
    name: '蜃気楼ステップ',
    description: '移動を完了した直後、次の1撃を受けるまで回避率が50%に跳ね上がる。',
    category: 'tactical',
    element: '風',
  },
];

export function getTraitData(traitNameOrId?: string): SpecialAbilityData | undefined {
  if (!traitNameOrId) return undefined;
  return MONSTER_TRAITS_POOL.find((t) => t.id === traitNameOrId || t.name === traitNameOrId);
}

