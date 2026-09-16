import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{WebSocketServer}from'ws';
const __dirname=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(__dirname,'dist'),rooms=new Map();
const send=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o))},broadcast=(r,o)=>r.clients.forEach(w=>send(w,o));
function code(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s}
const required=r=>r.mode==='1vs1'?2:4;const team=(r,i)=>r.mode==='2vs2'?(r.teams?.[i]??(i%2)):i;
function lobby(r){broadcast(r,{type:'lobby_state',state:{connected:r.players.map(p=>!!p.ws),ready:r.ready,selected:r.players.map(p=>!!p.monster),mode:r.mode,host:0,requiredPlayers:required(r),teams:r.teams||[0,1,0,1]}})}
function snap(r){return{room:r.code,mode:r.mode,turn:r.turn,round:r.round,players:r.players.slice(0,required(r)).map((p,i)=>({monster:p.monster,hp:p.hp,maxHp:p.maxHp,energy:p.energy,shield:p.shield,cooldowns:p.cooldowns,statuses:p.statuses,alive:p.hp>0,team:team(r,i)})),winner:r.winner,winnerTeam:r.winnerTeam,log:r.log.slice(-50)}}
function next(r){const n=required(r);for(let k=1;k<=n;k++){const i=(r.turn+k)%n;if(r.players[i].monster&&r.players[i].hp>0){r.turn=i;r.round++;r.players[i].cooldowns=r.players[i].cooldowns.map(x=>Math.max(0,x-1));return}}}
function enemies(r,i){const n=required(r);return r.players.slice(0,n).map((p,j)=>({p,j})).filter(x=>x.p.hp>0&&x.p.monster&&x.j!==i&&(r.mode!=='2vs2'||team(r,x.j)!==team(r,i)))}
function checkWin(r){const alive=r.players.slice(0,required(r)).map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0);if(r.mode==='2vs2'){const ts=[...new Set(alive.map(i=>team(r,i)))];if(ts.length<=1){r.winnerTeam=ts[0]??null;return true}}else if(alive.length<=1){r.winner=alive[0]??null;return true}return false}
function resolve(r,a){const i=r.turn,p=r.players[i];if(!p||p.hp<=0)return next(r);if(a.kind==='charge'){p.energy=Math.min(100,p.energy+30);r.log.push(`⚡ P${i+1} がチャージ！`);next(r);return}if(a.kind!=='move'||!Number.isInteger(a.index)||a.index<0||a.index>3)return;const m=p.monster.moves[a.index],cd=p.cooldowns[a.index]||0;if(cd>0)return send(p.ws,{type:'error',message:`あと${cd}ターン使用できません`});const cost=m.category==='chaos'?40:m.power>=70?20:10;if(p.energy<cost)return send(p.ws,{type:'error',message:`エネルギー不足（必要${cost}）`});p.energy-=cost;p.cooldowns[a.index]=Math.max(1,Math.min(5,Math.round(m.cooldown||1)));const es=enemies(r,i);if(!es.length)return;if(Math.random()*100>(m.accuracy??100)){r.log.push(`💨 P${i+1}の「${m.name}」は外れた`);next(r);return}
 // online multi-player: all_enemies hits all opponents; otherwise attack nearest/first living opponent. Support affects self/allies.
 if(m.targetScope==='self'||(m.power===0&&m.healRatio)){const heal=Math.round(p.maxHp*(m.healRatio||.15));p.hp=Math.min(p.maxHp,p.hp+heal);r.log.push(`💖 P${i+1}「${m.name}」 HP+${heal}`)}else{const targets=m.targetScope==='all_enemies'?es:[es[0]];for(const {p:o,j} of targets){let dmg=Math.max(1,Math.round((m.power||20)*(p.monster.stats.attack/(p.monster.stats.attack+o.monster.stats.defense*.55))*.78));let blocked=Math.min(o.shield,dmg);o.shield-=blocked;dmg-=blocked;o.hp=Math.max(0,o.hp-dmg);r.log.push(`⚔️ P${i+1}「${m.name}」→P${j+1} ${dmg}ダメージ`);if(m.specialEffect?.type==='drain')p.hp=Math.min(p.maxHp,p.hp+Math.round(dmg*(m.specialEffect.value||.5)))}}
 p.energy=Math.min(100,p.energy+5);if(checkWin(r)){r.log.push('🏆 対戦終了！');broadcast(r,{type:'battle_over',state:snap(r)});return}next(r)}
function handle(ws,raw){let m;try{m=JSON.parse(raw)}catch{return}if(m.type==='create'){let c=code();while(rooms.has(c))c=code();const mk=()=>({ws:null,monster:null,hp:0,maxHp:0,energy:0,shield:0,cooldowns:[0,0,0,0],statuses:[]});const r={code:c,clients:[ws],players:[mk(),mk(),mk(),mk()],ready:[false,false,false,false],teams:[0,1,0,1],mode:'1vs1',turn:0,round:1,winner:null,winnerTeam:null,log:[]};r.players[0].ws=ws;ws.room=c;ws.player=0;rooms.set(c,r);send(ws,{type:'room_created',room:c,player:0});lobby(r);return}if(m.type==='join'){const r=rooms.get(String(m.room||'').toUpperCase());if(!r)return send(ws,{type:'error',message:'ルームがありません'});const slot=r.players.findIndex(p=>!p.ws);if(slot<0)return send(ws,{type:'error',message:'満員です'});r.players[slot].ws=ws;r.clients.push(ws);ws.room=r.code;ws.player=slot;send(ws,{type:'joined',room:r.code,player:slot});lobby(r);return}const r=rooms.get(ws.room);if(!r)return;
 if(m.type==='set_mode'){if(ws.player!==0)return send(ws,{type:'error',message:'ホストのみ変更できます'});if(!['1vs1','2vs2','1vs1vs1vs1'].includes(m.mode))return;r.mode=m.mode;r.ready=[false,false,false,false];r.winner=null;r.winnerTeam=null;lobby(r);return}
 if(m.type==='set_team'){if(r.mode!=='2vs2')return;if(r.ready[ws.player])return send(ws,{type:'error',message:'READY後はチーム変更できません'});const t=Number(m.team);if(t!==0&&t!==1)return;const n=required(r);const count=r.teams.slice(0,n).filter((x,idx)=>idx!==ws.player&&r.players[idx].ws&&x===t).length;if(count>=2)return send(ws,{type:'error',message:`Team ${t===0?'A':'B'} はすでに2人です`});r.teams[ws.player]=t;lobby(r);return}
 if(m.type==='select_monster'){if(!m.monster?.stats||!Array.isArray(m.monster.moves))return send(ws,{type:'error',message:'モンスターデータが不正です'});const p=r.players[ws.player];p.monster=m.monster;p.maxHp=Number(m.monster.stats.maxHp||m.monster.stats.hp);p.hp=p.maxHp;p.energy=0;p.shield=0;p.cooldowns=[0,0,0,0];r.ready[ws.player]=false;send(ws,{type:'monster_selected',player:ws.player});lobby(r);return}
 if(m.type==='ready'){const n=required(r);if(ws.player>=n)return send(ws,{type:'error',message:'このモードの参加枠ではありません'});const p=r.players[ws.player];if(m.monster?.stats&&Array.isArray(m.monster.moves)){p.monster=m.monster;p.maxHp=Number(m.monster.stats.maxHp||m.monster.stats.hp||1);p.hp=p.maxHp;p.energy=0;p.shield=0;p.cooldowns=[0,0,0,0];}if(!p.monster)return send(ws,{type:'error',message:'モンスターを選んでください'});r.ready[ws.player]=true;send(ws,{type:'ready_ack',player:ws.player});lobby(r);if(r.players.slice(0,n).every(p=>p.ws)&&r.ready.slice(0,n).every(Boolean)&&r.players.slice(0,n).every(p=>p.monster)){if(r.mode==='2vs2'){const a=r.teams.slice(0,n).filter(x=>x===0).length,b=r.teams.slice(0,n).filter(x=>x===1).length;if(a!==2||b!==2){r.ready[ws.player]=false;lobby(r);return send(ws,{type:'error',message:'2vs2はTeam A・Bを2人ずつにしてください'})}}r.turn=0;r.round=1;r.winner=null;r.winnerTeam=null;r.log=[`🔥 ${r.mode} オンライン対戦開始！`];r.players.slice(0,n).forEach(p=>{p.hp=p.maxHp;p.energy=0;p.shield=0;p.cooldowns=[0,0,0,0]});broadcast(r,{type:'battle_start',room:r.code,mode:r.mode,players:r.players.slice(0,n).map((p,i)=>({...p.monster,team:team(r,i)}))});}return}
 if(m.type==='battle_sync'){broadcast(r,{type:'battle_sync',from:ws.player,state:m.state});return;}
 if(m.type==='state_request')return send(ws,{type:'state',state:snap(r)});if(m.type==='action'){if(ws.player!==r.turn)return send(ws,{type:'error',message:'今はあなたのターンではありません'});resolve(r,m.action||{});broadcast(r,{type:'state',state:snap(r)})}}
const server=http.createServer((req,res)=>{
  const u=(req.url||'/').split('?')[0];
  if(u==='/health'){res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});return res.end('ok')}
  let f=path.join(dist,u==='/'?'index.html':u);
  if(!f.startsWith(dist)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(dist,'index.html');
  try{
    const ext=path.extname(f).toLowerCase();
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
    res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':ext==='.html'?'no-cache':'public, max-age=31536000, immutable'});
    res.end(fs.readFileSync(f));
  }catch{res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found')}
});
const wss=new WebSocketServer({noServer:true,maxPayload:16*1024*1024});
server.on('upgrade',(req,socket,head)=>{
  if((req.url||'').split('?')[0]!=='/ws'){socket.destroy();return}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',ws=>{
  ws.room=null;ws.player=null;
  ws.on('message',data=>handle(ws,data.toString()));
  ws.on('close',()=>{
    const r=rooms.get(ws.room);if(!r)return;
    if(Number.isInteger(ws.player)&&r.players[ws.player])r.players[ws.player].ws=null;
    r.clients=r.clients.filter(x=>x!==ws);
    if(!r.clients.length)rooms.delete(r.code);else{r.ready=[false,false,false,false];lobby(r)}
  });
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('server ready v2.8.2'));
