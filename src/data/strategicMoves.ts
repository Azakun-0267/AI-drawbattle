import { Move } from '../types';

// 戦略技: 4枠のうち最低1枠に入り、殴り合いだけにならないための技群。
export const STRATEGIC_MOVES: Move[] = [
  // 炎: 火力・自己強化。回復や拘束は持たない。
  {id:'tactical_atk_up',name:'紅蓮オーバードライブ',type:'炎',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,description:'3ターン攻撃力を35%強化。炎は攻め切るための自己強化が得意。',effectType:'buff_aura'},
  {id:'tactical_knockback',name:'爆炎ブラスト',type:'炎',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:16,cooldown:2,description:'自分を中心とした半径16mの爆炎。範囲内の敵全員を大きく吹き飛ばす。',effectType:'explosion'},
  // 水: 回復・押し流しによる制御。
  {id:'tactical_self_heal',name:'癒やしの水脈',type:'水',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,healRatio:.10,description:'自分のHPを10%回復。水は低火力だが粘り強い。',effectType:'buff_aura'},
  {id:'tactical_knockback',name:'タイダルプッシュ',type:'水',category:'status',targetScope:'single_enemy',power:0,accuracy:100,range:26,cooldown:2,description:'水流で前方の敵を押し流し、接近戦を拒否する。',effectType:'knockback_wave'},
  // 草: 毒・拘束・吸収の持久戦。
  {id:'tactical_root',name:'大樹の根縛り',type:'草',category:'status',targetScope:'single_enemy',power:0,accuracy:90,range:32,cooldown:5,description:'前方範囲の敵の移動力を2ターン75%ダウン。行動や攻撃は可能。再使用まで長い隙がある。',effectType:'vortex_pull'},
  {id:'tactical_poison',name:'猛毒胞子',type:'草',category:'status',targetScope:'single_enemy',power:0,accuracy:92,range:30,cooldown:2,description:'3ターン猛毒。ターン開始時に最大HPの4%ダメージ。',effectType:'projectile'},
  // 雷: 速度・テンポ支配。
  {id:'tactical_spd_up',name:'超電導アクセル',type:'雷',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,description:'3ターン素早さを40%強化。',effectType:'buff_aura'},
  {id:'strategic_energy_shield',name:'電磁シールド',type:'雷',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,description:'シールド100を獲得。',effectType:'buff_aura'},
  // 地: 防御・シールド破壊・前線維持。
  {id:'tactical_def_up',name:'金剛要塞',type:'地',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,description:'3ターン防御力を40%強化。',effectType:'buff_aura'},
  {id:'strategic_shield_break',name:'地殻シールドブレイク',type:'地',category:'attack',targetScope:'single_enemy',power:22,accuracy:100,range:25,cooldown:2,description:'シールドへのダメージ2倍。',effectType:'knockback_wave'},
  // 風: 機動・撤退・押し引き。
  {id:'tactical_retreat',name:'疾風離脱',type:'風',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:1,description:'最も近い敵から最大移動距離ぶん後退する。',effectType:'buff_aura'},
  {id:'tactical_knockback',name:'暴風リパルス',type:'風',category:'status',targetScope:'single_enemy',power:0,accuracy:95,range:22,cooldown:2,description:'前方範囲の敵を大きく押し返して間合いを作る。',effectType:'knockback_wave'},
  // 光: 味方支援専用。自分を対象にできない。
  {id:'tactical_ally_heal',name:'セイントヒールリンク',type:'光',category:'status',targetScope:'single_ally',power:0,accuracy:100,range:18,cooldown:3,healRatio:.12,description:'自分の周囲18mの緑色エリア内にいる生存味方全員を12%回復。自分・敵・範囲外には無効。',effectType:'buff_aura'},
  {id:'tactical_ally_guard',name:'聖域プロテクト',type:'光',category:'status',targetScope:'single_ally',power:0,accuracy:100,range:22,cooldown:3,description:'前方範囲内の味方1体の防御を3ターン30%強化。自分には使えない。',effectType:'projectile'},
  // 闇: デバフ・妨害・位置崩し。
  {id:'tactical_pull',name:'奈落の引力',type:'闇',category:'status',targetScope:'single_enemy',power:0,accuracy:90,range:28,cooldown:2,description:'前方範囲の敵を自分の3m手前まで強制的に引き寄せる。',effectType:'vortex_pull'},
  {id:'strategic_pierce',name:'影蝕み貫通弾',type:'闇',category:'attack',targetScope:'single_enemy',power:38,accuracy:100,range:30,cooldown:2,description:'シールドを50%無視する妨害攻撃。',effectType:'beam'},

  // v2.7: 2vs2で連携・読み合いが生まれる変則技。既存BattleScreenの効果系を使うためBOT戦とも共通。
  {id:'meta_fire_trap',name:'時限灼熱ボム',type:'炎',category:'attack',targetScope:'all_enemies',power:48,accuracy:100,range:14,cooldown:3,description:'近距離円形爆発。敵2体をまとめて巻き込める。味方の引き寄せと好相性。',effectType:'explosion'},
  {id:'meta_fire_counter',name:'爆炎カウンター',type:'炎',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:6,description:'次に受ける攻撃を反射。相手の大技を読んで切り返す。',effectType:'buff_aura'},
  {id:'meta_water_rescue',name:'レスキューウェーブ',type:'水',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:18,cooldown:2,description:'周囲の敵を一気に押し流す。狙われた味方を救出して陣形を作り直す。',effectType:'explosion'},
  {id:'meta_water_zone',name:'渦潮キャッチ',type:'水',category:'status',targetScope:'single_enemy',power:0,accuracy:100,range:24,cooldown:3,description:'広い扇形から敵を引き寄せ、味方の範囲攻撃へ放り込む連携始動技。',effectType:'vortex_pull'},
  {id:'meta_grass_net',name:'ジャングルネット',type:'草',category:'status',targetScope:'single_enemy',power:0,accuracy:100,range:30,cooldown:5,description:'敵を拘束する前方制圧技。逃げ道を塞いで相棒に決めてもらう。',effectType:'vortex_pull'},
  {id:'meta_grass_spore',name:'ポイズンパーティ',type:'草',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:15,cooldown:3,description:'密集した敵をまとめて猛毒圏に巻き込む。2vs2の固まり対策。',effectType:'explosion'},
  {id:'meta_thunder_clone',name:'残像デコイ',type:'雷',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:6,description:'デコイを1体展開して攻撃を1回だけ身代わり。前線で強引に駆け引きできる。',effectType:'decoy_clone'},
  {id:'meta_thunder_ambush',name:'瞬雷バックスタブ',type:'雷',category:'attack',targetScope:'single_enemy',power:52,accuracy:100,range:24,cooldown:2,description:'瞬間移動系の奇襲。射線をずらして後衛へ圧力をかける。',effectType:'teleport_strike'},
  {id:'meta_earth_breaker',name:'城壁クラッシャー',type:'地',category:'attack',targetScope:'single_enemy',power:46,accuracy:100,range:13,cooldown:2,description:'近距離のシールド破壊役。守りに入った相手へ圧力をかける。',effectType:'dash_strike'},
  {id:'meta_earth_repulse',name:'要塞リパルサー',type:'地',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:13,cooldown:3,description:'自分の周囲から敵を追い出す。味方を守るタンク向けの陣地技。',effectType:'explosion'},
  {id:'meta_wind_peel',name:'相棒を守れ！暴風剥がし',type:'風',category:'status',targetScope:'single_enemy',power:0,accuracy:100,range:25,cooldown:2,description:'味方に張り付いた敵を大きく吹き飛ばす救援技。',effectType:'knockback_wave'},
  {id:'meta_wind_spread',name:'三叉かまいたち',type:'風',category:'attack',targetScope:'all_enemies',power:34,accuracy:100,range:27,cooldown:2,description:'広い扇状3WAY。位置取り次第で敵2体を同時に削れる。',effectType:'spread_3way'},
  {id:'meta_light_link',name:'逆転ヒールリンク',type:'光',category:'status',targetScope:'single_ally',power:0,accuracy:100,range:20,cooldown:3,healRatio:.16,description:'範囲内の相棒を16%回復。自分には使えないため救援判断が重要。',effectType:'buff_aura'},
  {id:'meta_light_counter',name:'聖光カウンター',type:'光',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:6,description:'次の一撃を反射。味方を狙うか自分を狙うか相手に二択を迫る。',effectType:'buff_aura'},
  {id:'meta_dark_vortex',name:'奈落コンボホール',type:'闇',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:20,cooldown:3,description:'扇形の敵をまとめて引き寄せる。相棒の爆発技へ繋ぐコンボ始動。',effectType:'vortex_pull'},
  {id:'meta_dark_stealth',name:'影潜り',type:'闇',category:'status',targetScope:'self',power:0,accuracy:100,range:0,cooldown:3,description:'一時的にステルス化。狙いを外して位置取りを作り直す。',effectType:'stealth_cloak'},

  // v3.0: 射程と役割を極端に分け、至近距離の殴り合いを崩す。
  {id:'role_fire_nova',name:'紅蓮メガノヴァ',type:'炎',category:'attack',targetScope:'all_enemies',power:68,accuracy:92,range:36,cooldown:4,description:'半径36mを焼き払う巨大爆発。引き寄せとの連携向け。',effectType:'explosion'},
  {id:'role_water_cannon',name:'水平線ウォーターキャノン',type:'水',category:'attack',targetScope:'all_enemies',power:42,accuracy:96,range:72,cooldown:3,description:'超長射程の細い水砲。遠距離から前線を削る。',effectType:'line_beam'},
  {id:'role_water_repulse',name:'大津波リセット',type:'水',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:34,cooldown:3,description:'前方広範囲の敵を大きく吹き飛ばし、接近戦を強制終了する。',effectType:'knockback_wave'},
  {id:'role_grass_mine',name:'毒花砲撃',type:'草',category:'status',targetScope:'all_enemies',power:0,accuracy:96,range:62,cooldown:4,description:'遠距離地点に大きな毒沼を設置し、進路を封鎖する。',effectType:'ground_mortar'},
  {id:'role_thunder_railgun',name:'天雷レールガン',type:'雷',category:'attack',targetScope:'all_enemies',power:56,accuracy:90,range:84,cooldown:4,description:'超遠距離の直線貫通射撃。細い射線を合わせる狙撃技。',effectType:'line_beam'},
  {id:'role_earth_launch',name:'大地の拒絶',type:'地',category:'status',targetScope:'all_enemies',power:0,accuracy:100,range:28,cooldown:2,description:'周囲の敵を超強力に吹き飛ばし、味方から引き剥がす。',effectType:'explosion'},
  {id:'role_wind_sniper',name:'真空スナイプ',type:'風',category:'attack',targetScope:'all_enemies',power:48,accuracy:94,range:78,cooldown:3,description:'超遠距離まで届く細い真空刃。近づかずに射線で戦う。',effectType:'line_beam'},
  {id:'role_wind_superpush',name:'台風圧送',type:'風',category:'status',targetScope:'all_enemies',power:0,accuracy:96,range:40,cooldown:3,description:'広い前方範囲を強烈に吹き飛ばす。毒沼や味方AoEへ位置を操作する。',effectType:'knockback_wave'},
  {id:'role_dark_far_pull',name:'遠隔重力井戸',type:'闇',category:'status',targetScope:'all_enemies',power:0,accuracy:94,range:58,cooldown:4,description:'遠距離の敵をまとめて引き寄せ、陣形を崩す。',effectType:'vortex_pull'},

  // v3.1: 地形を作る障害物技。壁は移動を遮り、近接一辺倒の盤面を崩す。
  {id:'role_earth_wall',name:'岩盤バリケード',type:'地',category:'status',targetScope:'self',power:0,accuracy:100,range:14,cooldown:5,description:'正面14mに横長の岩壁を3ラウンド相当生成。敵味方とも通り抜けられない。',effectType:'barrier_wall'},
  {id:'role_light_wall',name:'プリズムウォール',type:'光',category:'status',targetScope:'self',power:0,accuracy:100,range:16,cooldown:5,description:'正面16mに光の障害壁を生成。接近ルートを塞いで射線と間合いを作る。',effectType:'barrier_wall'},
  {id:'role_light_barrier',name:'フォトンバリア',type:'光',category:'status',targetScope:'all_allies',power:0,accuracy:100,range:30,cooldown:3,description:'回復ではなく範囲内の味方を守る支援。防御を強化して前線を維持する。',effectType:'buff_aura'},
];
export const STRATEGIC_SUPPORT = STRATEGIC_MOVES.filter(m => m.category === 'status');

// v3.0: 通常レア枠。禁忌とは別物で、少し見かけるギャンブル技。
// 強い時と弱い時がはっきりしており、毎試合同じ展開にならないための枠。
export const GAMBLE_MOVES: Move[] = [
  {id:'gamble_fire_dice',name:'爆裂ダイス',type:'炎',category:'attack',targetScope:'all_enemies',power:58,accuracy:72,range:30,cooldown:3,description:'🎲 72%で広範囲大爆発。外すと何も起きない。高火力だが安定しない。',effectType:'explosion'},
  {id:'gamble_water_coin',name:'潮目コイントス',type:'水',category:'status',targetScope:'all_enemies',power:0,accuracy:68,range:34,cooldown:3,description:'🎲 成功すると広範囲の敵を強く押し流す。失敗すると不発。',effectType:'knockback_wave'},
  {id:'gamble_grass_spore',name:'胞子ルーレット',type:'草',category:'status',targetScope:'all_enemies',power:0,accuracy:70,range:34,cooldown:3,description:'🎲 成功すると広範囲に猛毒を撒く。失敗すると不発。',effectType:'explosion'},
  {id:'gamble_thunder_blink',name:'雷鳴ジャックポット',type:'雷',category:'attack',targetScope:'single_enemy',power:64,accuracy:67,range:55,cooldown:3,description:'🎲 超遠距離から瞬間奇襲。命中率は低いが成功時は大きなリターン。',effectType:'teleport_strike'},
  {id:'gamble_dark_vortex',name:'ブラックホールくじ',type:'闇',category:'status',targetScope:'all_enemies',power:0,accuracy:66,range:42,cooldown:4,description:'🎲 成功すると遠距離の敵をまとめて引き寄せる。失敗すると不発。',effectType:'vortex_pull'},
  {id:'gamble_light_bless',name:'祝福ルーレット',type:'光',category:'status',targetScope:'all_allies',power:0,accuracy:75,range:30,cooldown:4,healRatio:.20,description:'🎲 成功すると範囲内の味方を20%回復。通常回復より強いが不安定。',effectType:'buff_aura'},
  {id:'gamble_earth_cannon',name:'地殻ロシアンキャノン',type:'地',category:'attack',targetScope:'all_enemies',power:66,accuracy:65,range:38,cooldown:4,description:'🎲 遠距離地点へ巨大爆発。命中率は低いが複数巻き込みを狙える。',effectType:'ground_mortar'},
  {id:'gamble_wind_launch',name:'暴風ハイローラー',type:'風',category:'status',targetScope:'all_enemies',power:0,accuracy:70,range:38,cooldown:3,description:'🎲 成功すると敵を超強力に吹き飛ばして陣形を破壊する。',effectType:'knockback_wave'},
];

