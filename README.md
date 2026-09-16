# えかきモンスターズ ONLINE 改良版

元ゲームのReact/Vite/TypeScript/Three.js構成を維持したオンライン対戦版です。

## 今回の修正
- 元ゲームの画面・3Dバトルを保持
- オンライン1vs1のルームコードを安定化
- ロビーからバトルへ移る際にWebSocketを切断しないよう修正
- バトル開始直後のstate取りこぼし対策（state_request）
- 自分のターン以外の技ボタンを完全無効化
- 技4つを常時表示
- ガードを削除
- エネルギー（0～100）
- シールドをHPと分離
- シールド獲得技、シールド破壊、貫通、バリアクラッシャー
- 技クールタイム
- 状態異常、バフ/デバフ、チャージ、カウンター
- サーバー側でターン・HP・シールド・CT・エネルギーを管理
- 切断時の勝敗処理
- ルームコードは6文字（紛らわしい文字を除外）

## 起動
npm install
npm run dev

## オンラインサーバー
npm start

Render:
Build Command: npm install && npm run build
Start Command: npm start
