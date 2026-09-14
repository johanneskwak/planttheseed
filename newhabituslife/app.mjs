import {receivable, contextOf, upgradeGame, COLORS, ICONS, TYPES, BOARD, BACKGROUNDS, POLICIES, GOALS, CRISES, outstanding, wealth, age, clamp, newGame, transition, actor, options, eventText, aiAction, aiAssist, hasInfo, awards} from './engine.mjs';
import {URL,KEY} from './config.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=n=>Math.round(n).toLocaleString('ko-KR');
let game=null,mode='home',session=null,room=null,busy=false,animating=false,aiTimer=null,pollTimer=null,polling=false,screen='home',lastOnline=Date.now(),lastRendered=-1,queued=false,soundOn=false,audio=null,assistRev=-1,projWin=null,aiPaused=false;
const SAVE='newhabituslife-save-v1',SESSION='newhabituslife-room-v1';
const town=`<svg class="town" viewBox="0 0 340 155" role="img" aria-label="학교와 집, 나무가 있는 작은 보드게임 마을"><ellipse cx="170" cy="131" rx="144" ry="17" fill="#dce3cd"/><path d="M28 132 Q80 113 128 132 T241 131 T312 130" fill="none" stroke="#faf8ec" stroke-width="17"/><g stroke="#53786a" stroke-width="2"><path d="M52 110v22M292 104v27M257 115v18"/><ellipse cx="51" cy="97" rx="16" ry="24" fill="#9fbd89" stroke="none"/><ellipse cx="293" cy="89" rx="19" ry="27" fill="#7da381" stroke="none"/><circle cx="257" cy="108" r="14" fill="#b4c895" stroke="none"/></g><g><path d="M80 84h69v45H80z" fill="#f2d3b1"/><path d="M73 85l41-36 42 36z" fill="#d58061"/><path d="M106 104h17v25h-17" fill="#708d7a"/><path d="M88 94h11v12H88zM129 94h11v12h-11z" fill="#fffbdf"/><path d="M177 65h59v63h-59z" fill="#e6e4c7"/><path d="M173 59h67v12h-67z" fill="#6d9183"/><path d="M190 110h15v18h-15z" fill="#6d9183"/><path d="M188 81h11v13h-11zM215 81h11v13h-11zM215 105h11v13h-11z" fill="#a9c4b6"/><path d="M202 58V28" fill="none" stroke="#6d9183" stroke-width="2"/><path d="M203 29h22l-6 7 6 7h-22" fill="#e1b858"/><rect x="146" y="96" width="21" height="30" rx="2" fill="#e6bb72"/><path d="M142 97l15-16 15 16z" fill="#9eb2a0"/></g><path d="M21 44c0-8 12-12 17-4 9-6 19 2 14 9H22zM265 32c0-7 10-11 15-4 8-6 18 2 14 8h-29z" fill="#fffdf2"/><g fill="#ddb46e"><circle cx="73" cy="132" r="3"/><circle cx="243" cy="137" r="3"/><circle cx="310" cy="131" r="3"/></g></svg>`;
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500);}
function beep(freq=500){if(!soundOn)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),v=audio.createGain();o.connect(v);v.connect(audio.destination);o.frequency.value=freq;v.gain.setValueAtTime(.035,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.start();o.stop(audio.currentTime+.13);}catch{}}
function modal(html){clearTimeout(aiTimer);$('modal').innerHTML=`<button class="close" data-close aria-label="닫기">×</button>${html}`;$('modal').showModal();$('modal').onclose=()=>scheduleAI();$('modal').querySelector('[data-close]').onclick=()=>$('modal').close();}
function header(){return `<header class="topbar"><div class="brand"><span class="brandmark">⚄</span><div>플레이하는 사회<small>PLAY SOCIETY · LIFE BOARD</small></div></div><div class="nav"><span class="pill desktop">인생 보드게임</span><button data-nav="rules">게임 방법</button><button data-nav="sound" aria-pressed="${soundOn}">${soundOn?'♪ 소리 켜짐':'♪ 소리 꺼짐'}</button>${screen!=='home'?'<button data-nav="home">처음으로</button>':''}</div></header>`;}
function footer(){return '<footer class="footer"><span>PLAY SOCIETY · 인생 한 바퀴</span><span>금액 단위: 게임머니 · 현실의 소득·투자수익·인생을 예측하는 모형이 아닙니다.</span></footer>';}
function mount(body){$('app').innerHTML=`<div class="shell">${header()}${body}${footer()}</div>`;bindCommon();}
function bindCommon(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{if(b.dataset.nav==='rules')rules();if(b.dataset.nav==='sound'){soundOn=!soundOn;b.setAttribute('aria-pressed',soundOn);b.textContent=soundOn?'♪ 소리 켜짐':'♪ 소리 꺼짐';beep();}if(b.dataset.nav==='home'){if(busy||animating){toast('말이 멈출 때까지 잠시 기다려주세요.');return;}if(session?.host&&game?.phase!=='done'){modal('<h2>진행을 잠시 멈출까요?</h2><p>이 화면을 나가면 온라인 방의 진행이 멈춥니다. 같은 브라우저에서 온라인 이어하기로 돌아올 수 있어요.</p><button id="go-home" class="primary wide">저장하고 처음으로</button>');$('go-home').onclick=()=>{$('modal').close();home();};}else home();}});document.querySelectorAll('[data-cell]').forEach(b=>{b.onclick=()=>{const t=BOARD[+b.dataset.cell];modal(`<h2>${TYPES[t][1]} ${TYPES[t][0]} 칸</h2><p>${t==='start'?'주사위만큼 이동합니다. 한 바퀴를 먼저 도는 경주가 아니라, 정해진 라운드 동안 각자의 인생을 만드는 게임이에요.':(eventText({type:t,variant:0})?.[1]||'예상하지 못한 기회를 만나세요.')}</p><p class="muted">1·2라운드는 배움, 3라운드는 진로 카드를 반드시 만납니다. 이후에는 도착한 칸의 카드를 해결해요.</p>`);};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}};});}
function coord(i){if(i<9)return[1,i+1];if(i<14)return[i-7,9];if(i<23)return[7,23-i];return[29-i,1];}
function board(g,preview=false){return `<div class="board" aria-label="28칸 인생 보드판">${BOARD.map((t,i)=>{let [r,c]=coord(i);let ps=g?.players.filter(p=>p.pos===i)||[];return `<div class="cell ${g?.players[g.turn]?.pos===i?'current':''}" style="grid-row:${r};grid-column:${c};--tile:${TYPES[t][2]}" data-cell="${i}" role="button" tabindex="0" aria-label="${i+1}번 ${TYPES[t][0]} 칸${ps.length?' · '+ps.map(p=>p.name).join(', '):''}"><span class="tile-no">${String(i+1).padStart(2,'0')}</span><span class="tile-icon" aria-hidden="true">${TYPES[t][1]}</span><span class="label">${TYPES[t][0]}</span><div class="pawns">${ps.map(p=>`<span class="pawn" style="--pc:${COLORS[p.id]}" title="${esc(p.name)}">${p.id+1}</span>`).join('')}</div></div>`;}).join('')}<div class="board-center"><div class="eyebrow">Every life has a story</div><div class="center-title">인생 한 바퀴</div><div class="center-sub">다른 출발선, 함께 만드는 우리 사회</div>${town}<div class="center-bottom">${preview?'<span class="pill">🎲 운과 선택</span><span class="pill">🤝 관계와 협력</span><span class="pill">⚖ 우리가 정하는 규칙</span>':`<span class="pill">공동기금 ${num(g.fund)}</span><span class="pill">${esc(g.market)}</span>`}</div>${!preview&&g.policies.length?`<div class="row" style="margin-top:8px">${g.policies.map(k=>`<span class="policy-chip">${POLICIES[k].icon} ${POLICIES[k].name}</span>`).join('')}</div>`:''}</div></div>`;}
function home(){clearTimeout(aiTimer);clearInterval(pollTimer);screen='home';mode='home';busy=false;queued=false;let demo=newGame(['여우','고래','병아리','곰'],{seed:12});demo.players.forEach((p,i)=>p.pos=[2,9,17,25][i]);let saved=readLocal(SAVE),savedRoom=readLocal(SESSION);if(saved&&saved.game&&![1,2,3].includes(saved.game.version))saved=null;mount(`<section class="hero"><div><span class="pill"><span class="dot"></span> 주사위 위에서 만나는 사회</span><h1>인생은 한 바퀴.<br>선택은 <em>무한가지.</em></h1><p>누구는 조금 앞에서, 누구는 다른 길에서.<br>배우고, 일하고, 서로를 도우며<br>우리만의 인생 보드게임을 시작해요.</p><div class="row" style="margin-top:24px"><button class="primary" id="quick">혼자 바로 시작하기 ↗</button>${saved?'<button id="resume">저장한 게임 이어하기</button>':''}</div><p class="note">2–6명 · 기본 8라운드 · 예상 20–35분<br>혼자 할 때는 AI 친구들이 함께해요.</p></div><div class="hero-board">${board(demo,true)}</div></section><section class="mode-grid"><button class="mode-card" data-mode="solo"><span class="mode-icon">🎲</span><div><h3>혼자, 가볍게 한 판</h3><p>AI 친구 3명과 함께.<br>선생님 없이도 바로 시작해요.</p><b>나만의 인생 시작 →</b></div></button><button class="mode-card" data-mode="local"><span class="mode-icon">🪑</span><div><h3>한 테이블에 모여서</h3><p>한 기기로 2–6팀이 돌아가며.<br>대화하고 협상하는 교실 보드게임.</p><b>테이블 만들기 →</b></div></button><button class="mode-card" data-mode="online"><span class="mode-icon">🌐</span><div><h3>각자의 화면, 같은 보드</h3><p>방 코드로 만나 함께 플레이.<br>제안과 투표가 모두의 화면에 연결돼요.</p><b>온라인 방 만들기 / 참가 →</b></div></button></section>${savedRoom?'<div style="margin-bottom:22px"><button id="resume-room" class="secondary">온라인 방 이어하기</button></div>':''}`);
 $('quick').onclick=()=>startLocal('solo',{names:['나','고래','병아리','곰'],rounds:8,equal:false});document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setup(b.dataset.mode));if($('resume'))$('resume').onclick=()=>{game=upgradeGame(saved.game);mode=saved.mode;session=null;screen='game';renderGame();scheduleAI();};if($('resume-room'))$('resume-room').onclick=()=>{session=savedRoom;mode='online';beginPoll();};
}
function readLocal(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function persist(){if(['solo','local'].includes(mode)&&game)try{localStorage.setItem(SAVE,JSON.stringify({mode,game}));}catch{toast('브라우저 저장 공간이 부족합니다.');}}
function setup(kind){screen='setup';mount(`<section class="setup panel"><span class="eyebrow">Set your table</span><h1 style="margin-top:10px">${kind==='online'?'같은 보드에서 만나요':kind==='solo'?'나의 첫 주사위':'오늘의 테이블 만들기'}</h1><p class="muted small">${kind==='online'?'진행자는 방을 만들고, 참가자는 6자리 코드를 입력하세요.':'별명으로 시작하세요. 캐릭터의 출발 조건은 게임 속 가상의 설정입니다.'}</p>${kind==='online'?`<label for="online-name">내 별명 / 모둠 이름</label><input id="online-name" maxlength="12" placeholder="예: 1모둠"><div class="fields"><div><label for="online-code">참가할 방 코드</label><input id="online-code" maxlength="6" placeholder="6자리 코드" autocomplete="off" style="text-transform:uppercase"></div><div style="align-self:end"><button id="join-room" class="secondary wide">코드로 참가하기</button></div></div><button id="create-room" class="primary wide">새 온라인 방 만들기</button><div class="hint">2–6팀 · 진행자도 한 팀으로 참여합니다. 진행자 화면을 켜 두어야 게임이 진행돼요. 방은 7일 동안 이어할 수 있어요.</div>`:`<div class="fields"><div><label for="count">참가 팀 수</label><select id="count">${[2,3,4,5,6].map(n=>`<option ${n===4?'selected':''}>${n}</option>`).join('')}</select></div><div><label for="rounds">게임 길이</label><select id="rounds"><option value="8">가볍게 · 8라운드</option><option value="12">깊이 있게 · 12라운드</option></select></div></div><label>플레이어 이름 ${kind==='solo'?'(첫 번째가 나, 나머지는 AI)':''}</label><div id="names" class="names"></div><label class="check"><input type="checkbox" id="equal">비교 실험: 모두 같은 출발 조건</label><button id="start" class="primary wide">출발선 뽑고 시작하기 →</button><div class="hint">모두가 같은 횟수만큼 플레이합니다. 자산뿐 아니라 건강, 배움, 도움의 기록도 마지막에 함께 돌아봐요.</div>`}<div id="setup-error" role="alert"></div></section>`);
 if(kind==='online'){$('create-room').onclick=()=>connect('create');$('join-room').onclick=()=>connect('join');return;}
 const names=()=>{$('names').innerHTML=Array.from({length:+$('count').value},(_,i)=>`<input aria-label="${i+1}번 플레이어 이름" maxlength="12" value="${kind==='solo'?['나','고래','병아리','곰','토끼','거북이'][i]:`${i+1}모둠`}">`).join('');};names();$('count').onchange=names;$('start').onclick=()=>startLocal(kind,{names:[...$('names').querySelectorAll('input')].map(i=>i.value),rounds:+$('rounds').value,equal:$('equal').checked});
}
function startLocal(kind,opts){clearInterval(pollTimer);session=null;mode=kind;screen='game';assistRev=-1;aiPaused=false;game=newGame(opts.names,{rounds:opts.rounds,equal:opts.equal,seed:opts.seed,backgrounds:opts.backgrounds,ai:kind==='solo'?opts.names.map((_,i)=>i).slice(1):[]});persist();renderGame();intro();}
function intro(){modal(`<h2>출발선이 정해졌어요</h2><p>이 조건은 캐릭터의 가상 배경입니다. 실제 여러분의 가정과는 관계없어요.</p>${game.players.map(p=>`<div class="room-member"><span style="font-size:25px">${ICONS[p.id]}</span><div><b>${esc(p.name)}</b> · 시작 ${num(p.born)}<div class="muted small">${BACKGROUNDS[p.background].name} · ${esc(p.cards.join(' · '))}</div></div></div>`).join('')}<p class="small">먼저 도착하는 경주가 아닙니다. 모두 ${game.maxRounds}번의 선택을 하고, 각자의 삶을 돌아봐요.</p><button id="intro-close" class="primary wide">좋아, 나의 인생을 시작하자</button>`);$('intro-close').onclick=()=>{$('modal').close();scheduleAI();};}
function playerPanel(p){
 const chips=[];
 if(p.tokens>0)chips.push(`<span class="chip-token" title="조언 토큰">🔑${p.tokens}</span>`);
 if(hasInfo(p))chips.push('<span class="chip-info" title="멘토·동문 카드 보유">정보</span>');
 if(p.insurance)chips.push('<span class="chip-info">🛡 보장 '+num(p.insurance)+'</span>');
 if(receivable(p)>0)chips.push('<span class="chip-loan">받을 돈 '+num(receivable(p))+'</span>');
 if(outstanding(p)>0)chips.push(`<span class="chip-loan" title="다른 팀에게 갚을 금액">차용 ${num(outstanding(p))}</span>`);
 if(p.debt>0)chips.push(`<span class="chip-debt" title="대출 잔액">빚 ${num(p.debt)}</span>`);
 return `<button class="player ${game.turn===p.id?'active':''}" style="--pc:${COLORS[p.id]}" data-player="${p.id}" aria-label="${esc(p.name)} 상태 보기"><div class="row spread"><div class="row" style="gap:7px"><span class="avatar">${ICONS[p.id]}</span><span class="player-name">${esc(p.name)}${p.ai?' · AI':''}</span></div>${game.turn===p.id?'<span style="font-size:9px">MY TURN</span>':''}</div><div class="money" style="margin-top:8px">${num(p.cash)} <small>현금</small></div><div class="mini-stats"><span>♥ ${p.health}/6</span><span>역량 ${p.skill}</span><span>신뢰 ${p.trust}</span></div>${chips.length?`<div class="chips">${chips.join('')}</div>`:''}</button>`;
}
function canAct(id=actor(game)){if(busy||animating||queued)return false;if(mode==='online')return session?.seat===id;return !game.players[id]?.ai;}
function hintText(){
 if(game.phase==='vote')return '정책을 고르면 비용도 함께 부담합니다. 누가 혜택을 받고, 누가 더 부담하는지 이야기해보세요.';
 if(game.phase==='forecast')return '예측은 각자 제출합니다. 먼저 고른 팀의 선택은 다른 팀에게 보이지 않아요.';
 if(game.phase==='crisis')return '같은 사건이 모두에게 똑같이 무겁지는 않습니다. 막대 길이를 비교해보세요.';
 if(game.round<3)return '첫 두 라운드는 배움, 세 번째는 진로 선택입니다. 이후에는 도착한 칸에서 새로운 인생 카드를 만나요.';
 return '다른 팀의 차례에도 조언 토큰을 쓰거나 아는 길을 알려줄 수 있어요. 도움은 의무가 아니고, 제안은 거절할 수 있습니다.';
}
function promisePanel(){
 if(!game.promises||!game.promises.length)return '';
 const kept=game.promises.filter(x=>x.kept).length;
 return `<section class="journal"><div class="row spread"><h3>우리가 남긴 약속</h3><span class="small muted">${kept} / ${game.promises.length} 이행</span></div><div class="promise-list">${game.promises.slice().reverse().map(pr=>{
  const mine=mode==='online'?session.seat===pr.to:mode==='solo'?pr.to===0:true;
  return `<div class="promise-item${pr.kept?' kept':''}"><div><b>${esc(game.players[pr.from].name)} → ${esc(game.players[pr.to].name)}</b><div class="small">R${pr.round} · ${esc(pr.text)}</div></div>${pr.kept?'<span class="badge">지킴</span>':mine&&!busy&&!queued?`<button class="small" data-keep="${pr.id}">지켰어요</button>`:'<span class="small muted">대기</span>'}</div>`;
 }).join('')}</div></section>`;
}
function renderGame(){
 screen='game';if(game.phase==='done')return results();
 const p=game.players[game.turn];
 mount(`<div class="game-head row spread"><div><div class="eyebrow">Life is a board game</div><h1>인생 한 바퀴</h1></div><div class="round-meta">${session?`<span class="pill">방 ${session.code}</span>`:'<span class="pill">'+(mode==='solo'?'AI와 함께':'한 테이블 플레이')+'</span>'}<div class="round-num">${game.round}<span> / ${game.maxRounds} ROUND</span></div><span class="pill">${age(game)}세</span></div></div><div class="players" style="--count:${game.players.length}">${game.players.map(playerPanel).join('')}</div><div class="game-grid"><div class="board-wrap"><div id="board-host">${board(game)}</div><div class="board-caption"><div class="legend">${['learn','network','market','care','community'].map(t=>`<span><i style="background:${TYPES[t][2]};border:1px solid #aaa7"></i>${TYPES[t][0]}</span>`).join('')}</div><span>칸을 누르면 설명을 볼 수 있어요</span></div><div class="timeline" aria-label="라운드 진행">${Array.from({length:game.maxRounds},(_,i)=>`<i class="${i<game.round?'on':''}"></i>`).join('')}</div><section class="journal"><div class="row spread"><h3>우리 테이블의 이야기</h3><span class="small muted">최근 기록</span></div><div class="log-list" aria-live="polite">${game.log.slice(0,10).map(l=>`<div class="log-item"><span>R${l.round}</span><div>${esc(l.text)}</div></div>`).join('')}</div></section>${promisePanel()}</div><aside class="control"><section class="panel fade-in"><div class="turn-tag"><span class="avatar">${ICONS[p.id]}</span><span>${esc(p.name)}의 차례</span>${p.ai?'<span class="pill">AI</span>':''}</div><div id="actions">${actionPanel()}</div></section><div class="hint">${hintText()}</div><div class="row spread" style="margin-top:13px"><button id="my-info" class="small">내 카드 · 목표</button><span class="network-status" id="net-status">${mode==='online'?'온라인 연결됨':'이 기기에 자동 저장'}</span></div><div class="row" style="margin-top:10px;gap:8px"><button class="small" id="promise-btn">약속 남기기</button>${mode==='solo'?`<button class="small" id="ai-pause" aria-pressed="${aiPaused}">${aiPaused?'▶ AI 계속하기':'Ⅱ AI 멈추고 토론'}</button>`:''}<button class="small" id="projector">진행 화면 띄우기</button></div>${session?.host?'<button class="small wide" style="margin-top:10px" id="assist">진행자: 멈춘 차례 도와주기</button>':''}</aside></div><div style="height:28px"></div>`);
 bindGame();paintProjector();
}
function helperPanel(ops){
 const turnId=game.turn;
 const cands=(mode==='online'?[game.players[session.seat]]:game.players).filter(q=>q&&q.id!==turnId&&!q.ai);
 const advisable=ops.filter(o=>o.advisable),unknown=ops.filter(o=>!o.known);
 const canAdvise=cands.some(q=>q.tokens>0),canShare=cands.some(q=>hasInfo(q)&&q.sharedRound!==game.round);
 const ready=!busy&&!queued&&!animating;
 let html='';
 if(advisable.length&&canAdvise)html+=`<button class="helper" id="advise-btn" ${ready?'':'disabled'}>🔑 조언 토큰으로 잠긴 선택지 열어주기</button>`;
 if(unknown.length&&canShare)html+=`<button class="helper" id="share-btn" ${ready?'':'disabled'}>💬 내가 아는 길을 알려주기 · 비용 없음</button>`;
 if(mode==='online'&&session.seat!==turnId&&game.guesses[session.seat]===undefined)html+=`<button class="helper" id="guess-btn" ${ready?'':'disabled'}>🎯 이 팀이 무엇을 고를지 예측하기</button>`;
 const guessed=Object.keys(game.guesses).length;
 return html||guessed?`<div class="helper-box"><div class="small muted" style="margin-bottom:7px">다른 팀의 차례에도 할 수 있는 일${guessed?` · ${guessed}팀이 예측 중`:''}</div>${html||'<span class="small muted">지금은 도울 수 있는 게 없어요.</span>'}</div>`:'';
}
function actionPanel(){
 const p=game.players[game.turn],id=actor(game),active=game.players[id],can=canAct();
 const open=!busy&&!queued&&!animating;
 const wait=mode==='online'&&id!==session.seat?`<p class="muted small" style="margin-top:12px">${esc(active?.name||'다른 팀')}의 선택을 기다리고 있어요.</p>`:'';
 if(game.phase==='crisis'){
  const c=game.crisis;
  return `<span class="event-icon">⚡</span><div class="eyebrow">모두에게 닥친 일</div><h2 style="margin-top:6px">${esc(c.name)}</h2><p class="desc">${esc(c.note)}</p><div class="crisis-table">${c.hits.map(h=>`<div class="crisis-row" style="--pc:${COLORS[h.id]}"><b>${esc(h.name)}</b><i style="width:${clamp(h.share,4,100)}%"></i><span>−${num(h.loss)}${h.covered?` · 보험 ${num(h.covered)}`:''}</span></div>`).join('')}</div><p class="small muted">막대는 위기 직전 순자산에 견준 부담의 크기입니다. 같은 사건인데 누구에게 더 무거웠나요?</p><button class="primary wide" data-action="ack" ${can&&open?'':'disabled'}>확인했어요</button>${wait}`;
 }
 if(game.phase==='forecast'){
  const me=mode==='online'?session.seat:id,done=game.forecasts[me]!==undefined;
  const ready=open&&!done&&(mode==='online'||can);
  return `<span class="event-icon">📈</span><h2>이번 라운드 시장은?</h2><p class="desc">모두 같은 시장 변동을 맞습니다. 오를지 내릴지 각자 예측하고, 맞힌 팀은 현금 +25를 받아요. 주식이 없어도 참여합니다. 상승 3가지·하락 2가지 중 하나를 같은 확률로 뽑습니다.</p><p class="small" style="margin-bottom:10px">${Object.keys(game.forecasts).length} / ${game.players.length}팀 예측 완료 · ${done?'내 예측은 제출했어요':esc(game.players[me]?.name)+'의 예측'}</p><div class="row"><button class="primary" data-action="forecast" data-value="up" ${ready?'':'disabled'}>오른다</button><button data-action="forecast" data-value="down" ${ready?'':'disabled'}>내린다</button></div>${done?'<p class="small muted" style="margin-top:10px">다른 팀을 기다리고 있어요.</p>':''}`;
 }
 if(game.phase==='roll'){
  const peek=hasInfo(p)&&game.round>3?`<div class="peek"><span class="small muted">멘토·동문 카드로 앞길을 미리 봅니다</span><div class="peek-row">${[1,2,3,4,5,6].map(d=>{const raw=BOARD[(p.pos+d)%BOARD.length],t=raw==='start'?'chance':raw;return `<span class="peek-cell" style="--tile:${TYPES[t][2]}"><b>${d}</b><i aria-hidden="true">${TYPES[t][1]}</i><em>${TYPES[t][0]}</em></span>`;}).join('')}</div></div>`:'';
  return `<h2>어떤 하루가 기다릴까요?</h2><p class="desc">주사위를 굴리고, 말이 도착한 곳에서 나의 선택을 시작하세요.</p>${peek}<div class="dice-area"><div class="dice" id="dice" aria-label="주사위">⚄</div><button class="primary wide roll-button" data-action="roll" ${can&&open?'':'disabled'}>${p.ai?'AI가 생각하는 중…':'주사위 굴리기'}</button></div>${wait}`;
 }
 if(game.phase==='choice'){
  const [title,desc]=eventText(game.event),ops=options(game);
  const body=ops.map(o=>o.known
   ?`<button class="choice${o.info?' info-choice':''}" data-action="choose" data-value="${o.id}" ${can&&open&&!o.disabled?'':'disabled'}><b>${o.title}${o.disabled?' 🔒':''}</b><span>${o.desc}</span>${o.disabled?`<span class="why">${o.advisable?'조건이 아직 안 됐어요. 다른 팀이 조언 토큰으로 열어줄 수 있습니다.':'지금은 조건이 안 됐어요.'}</span>`:''}</button>`
   :'<div class="choice unknown"><b>들어본 적 없는 선택지</b><span>이 상황에 다른 길이 있다는 이야기를 들어본 적이 없어요. 멘토·동문 카드를 가진 팀이 알려줄 수 있습니다.</span></div>').join('');
  return `<span class="event-icon">${TYPES[game.event.type][1]}</span><div class="eyebrow">${game.die}칸 이동 · ${TYPES[game.event.type][0]}</div><h2 style="margin-top:6px">${title}</h2><p class="desc">${desc}</p><div class="options">${body}</div>${helperPanel(ops)}${wait}`;
 }
 if(game.phase==='target'){
  const cost=game.pending==='ask'?60:game.pending==='business'?100:200;
  const lead=game.pending==='ask'?'돌봄 도움을 부탁해보세요. 상대가 수락해야 성사됩니다.':game.pending==='business'?'함께 100씩 출자할 동료를 찾아보세요. 손익도 함께 나눕니다.':'200을 빌려줄 팀을 고르세요. 다음 화면에서 이자율을 제시합니다. 마지막에는 보유 자산으로 정산하고, 못 갚으면 빌려준 팀의 손실이 됩니다.';
  return `<h2>누구에게 제안할까요?</h2><p class="desc">${lead}</p><div class="options">${game.players.filter(q=>q.id!==p.id).map(q=>`<button class="choice" data-action="target" data-value="${q.id}" ${can&&open&&q.cash>=cost?'':'disabled'}><b>${ICONS[q.id]} ${esc(q.name)}</b><span>현재 현금 ${num(q.cash)}${q.cash<cost?` · ${num(cost)}이 필요해요`:''}</span></button>`).join('')}</div><button data-action="target" data-value="cancel" style="margin-top:10px" ${can&&open?'':'disabled'}>돌아가기</button>${wait}`;
 }
 if(game.phase==='rate'){
  const q=game.players[game.loanTarget];
  return `<span class="event-icon">🤝</span><h2>이자를 얼마나 붙일까요?</h2><p class="desc">${esc(q.name)}에게 200을 빌려달라고 요청합니다. 갚을 금액은 다음 턴부터 최대 50씩 자동으로 빠져나가요. 이자가 높으면 수락받기 쉽지만, 갚을 돈도 늘어납니다.</p><div class="options">${[10,20,30].map(r=>`<button class="choice" data-action="rate" data-value="${r}" ${can&&open?'':'disabled'}><b>이자 ${r}%</b><span>갚을 금액 ${num(200*(1+r/100))}</span></button>`).join('')}</div><button data-action="rate" data-value="cancel" style="margin-top:10px" ${can&&open?'':'disabled'}>돌아가기</button>${wait}`;
 }
 if(game.phase==='offer'){
  const k=game.offer.kind;
  const body=k==='ask'?'이 돌봄 도움을 요청했어요. 수락하면 내 현금 60을 쓰고 두 사람 신뢰가 1씩 올라요.':k==='business'?'이 공동사업을 제안했어요. 각자 100을 출자하고, 35% 확률로 50만 돌아오거나 65% 확률로 190이 돌아옵니다.':`이 200을 빌려달라고 해요. 이자 ${game.offer.rate}%로 ${num(200*(1+game.offer.rate/100))}을 나누어 갚습니다. 마지막에 현금·투자·주택으로 정산하고, 은행 빚을 제외하고도 갚지 못한 금액은 내 손실이 됩니다.`;
  return `<span class="event-icon">🤝</span><h2>${esc(active.name)}님, 제안이 왔어요</h2><p class="desc">${esc(p.name)}${body}</p><div class="row"><button class="primary" data-action="respond" data-value="yes" ${can&&open?'':'disabled'}>${k==='loan'?'빌려줄게요':'함께할게요'}</button><button data-action="respond" data-value="no" ${can&&open?'':'disabled'}>이번엔 어려워요</button></div>${wait}`;
 }
 if(game.phase==='vote'){
  const me=mode==='online'?session.seat:id,voted=game.votes[me]!==undefined;
  const ready=!voted&&open&&(mode==='online'||can);
  const recent=game.crisis&&game.crisis.round===game.round?`<div class="crisis-note">방금 겪은 일 · ${esc(game.crisis.name)}. ${esc(game.crisis.note)}</div>`:'';
  return `<span class="event-icon">⚖</span><h2>우리가 만드는 다음 사회</h2>${recent}<p class="desc">정책 한 가지에 투표하세요. 최다 득표 정책을 시행하며, 동률이면 현행을 유지합니다.</p><p class="small" style="margin-bottom:10px">${Object.keys(game.votes).length} / ${game.players.length}팀 투표 · ${voted?'투표 완료':esc(game.players[me]?.name)+'의 투표'}</p><div class="options">${Object.entries(POLICIES).filter(([k])=>!game.policies.includes(k)).map(([k,v])=>`<button class="choice" data-action="vote" data-value="${k}" ${ready?'':'disabled'}><b>${v.icon} ${v.name}</b><span>${v.desc}</span></button>`).join('')}<button class="choice" data-action="vote" data-value="none" ${ready?'':'disabled'}><b>현행 유지</b><span>새로운 세금과 지원 제도를 추가하지 않아요.</span></button></div>`;
 }
 const owe=outstanding(p);
 return `<div class="success-mark">✓</div><h2>내 인생에 한 줄이 더해졌어요</h2><p class="desc">${esc(game.log[0]?.text||'선택이 기록되었습니다.')}</p><div class="ledger"><div class="row spread"><span>지금 현금</span><b>${num(p.cash)}</b></div><div class="row spread"><span>순자산 (자산+받을 돈−갚을 돈)</span><b>${num(wealth(p))}</b></div><div class="row spread"><span>건강 / 역량 / 신뢰</span><b>${p.health} / ${p.skill} / ${p.trust}</b></div>${p.debt?`<div class="row spread"><span>대출 잔액</span><b>${num(p.debt)}</b></div>`:''}${owe?`<div class="row spread"><span>다른 팀에게 갚을 금액</span><b>${num(owe)}</b></div>`:''}</div><button class="primary wide" data-action="next" ${can&&open?'':'disabled'}>${game.turn===game.players.length-1?'이번 라운드 마무리 →':'다음 팀에게 →'}</button>${wait}`;
}
function helperCandidates(test){
 const pool=mode==='online'?[game.players[session.seat]]:game.players;
 return pool.filter(q=>q&&q.id!==game.turn&&!q.ai&&test(q));
}
function adviseModal(){
 const ops=options(game).filter(o=>o.advisable),cands=helperCandidates(q=>q.tokens>0);
 if(!ops.length||!cands.length)return toast('지금 조언으로 열 수 있는 선택지가 없어요.');
 const rows=cands.flatMap(q=>ops.map(o=>`<button class="choice" data-adv="${q.id}|${o.id}"><b>${ICONS[q.id]} ${esc(q.name)} · 남은 토큰 ${q.tokens}</b><span>${esc(game.players[game.turn].name)}의 "${o.title}"을 열어주기</span></button>`));
 modal(`<h2>조언 토큰 쓰기</h2><p>잠긴 선택지 하나를 조건과 상관없이 열어줍니다. 토큰을 쓴 팀은 신뢰 +1을 얻어요. 게임당 2개씩 가지고 있고, 현금이 모자라서 잠긴 선택지는 열 수 없습니다.</p><div class="options">${rows.join('')}</div>`);
 document.querySelectorAll('[data-adv]').forEach(b=>b.onclick=()=>{const [q,o]=b.dataset.adv.split('|');$('modal').close();dispatch({type:'advise',actor:+q,value:o,expected:game.revision,round:game.round});});
}
function shareModal(){
 const ops=options(game).filter(o=>!o.known),cands=helperCandidates(q=>hasInfo(q)&&q.sharedRound!==game.round);
 if(!ops.length||!cands.length)return toast('지금 알려줄 수 있는 정보가 없어요.');
 const rows=cands.flatMap(q=>ops.map(o=>`<button class="choice" data-share="${q.id}|${o.id}"><b>${ICONS[q.id]} ${esc(q.name)}이 알려주기</b><span>${o.title}</span></button>`));
 modal(`<h2>내가 아는 길을 알려주기</h2><p>돈은 들지 않습니다. 알려준 팀은 신뢰 +1을 얻고, 한 라운드에 한 번만 알려줄 수 있어요. 알려주지 않아도 됩니다.</p><div class="options">${rows.join('')}</div>`);
 document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{const [q,o]=b.dataset.share.split('|');$('modal').close();dispatch({type:'share',actor:+q,value:o,expected:game.revision,round:game.round});});
}
function guessModal(){
 const ops=options(game).filter(o=>o.known);
 modal(`<h2>${esc(game.players[game.turn].name)}은 무엇을 고를까요?</h2><p>맞히면 기록에 남습니다. 보상은 없어요. 결과는 선택이 공개될 때 함께 나옵니다.</p><div class="options">${ops.map(o=>`<button class="choice" data-guess="${o.id}"><b>${o.title}</b><span>${o.disabled?'지금은 잠겨 있는 선택지':o.desc}</span></button>`).join('')}</div>`);
 document.querySelectorAll('[data-guess]').forEach(b=>b.onclick=()=>{const v=b.dataset.guess;$('modal').close();dispatch({type:'guess',actor:session.seat,value:v,expected:game.revision,round:game.round});});
}
function promiseModal(){
 const me=mode==='online'?session.seat:mode==='solo'?0:game.turn;
 modal(`<h2>약속 남기기</h2><p>게임이 강제하지 않는 약속입니다. 한 라운드에 한 번 기록할 수 있고, 상대가 "지켰어요"를 눌러줄 때 신뢰 +1을 얻어요. 지키지 못한 약속도 마지막에 그대로 남습니다.</p><label for="pr-to">누구에게 하는 약속인가요</label><select id="pr-to">${game.players.filter(q=>q.id!==me).map(q=>`<option value="${q.id}">${esc(q.name)}</option>`).join('')}</select><label for="pr-text">약속 내용</label><input id="pr-text" maxlength="60" placeholder="예: 취업하면 매 라운드 30씩 갚을게"><button class="primary wide" id="pr-go">약속 기록하기</button><p class="small muted">${esc(game.players[me].name)}의 이름으로 기록됩니다.</p>`);
 $('pr-go').onclick=()=>{const to=+$('pr-to').value,text=$('pr-text').value;if(!text.trim())return toast('약속 내용을 적어주세요.');$('modal').close();dispatch({type:'promise',actor:me,value:{to,text},expected:game.revision,round:game.round});};
}
function bindGame(){
 if($('ai-pause'))$('ai-pause').onclick=()=>{aiPaused=!aiPaused;clearTimeout(aiTimer);renderGame();scheduleAI();};
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  let v=b.dataset.value;
  if(b.dataset.action==='target'&&v!=='cancel')v=+v;
  const loose=['vote','forecast'].includes(b.dataset.action);
  const id=loose&&mode==='online'?session.seat:actor(game);
  dispatch({type:b.dataset.action,value:v,actor:id,expected:game.revision,round:game.round});
 });
 document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>info(+b.dataset.player));
 document.querySelectorAll('[data-keep]').forEach(b=>b.onclick=()=>{
  const pr=game.promises[+b.dataset.keep];if(!pr)return;
  dispatch({type:'keep',actor:mode==='online'?session.seat:pr.to,value:pr.id,expected:game.revision,round:game.round});
 });
 $('my-info').onclick=()=>info(mode==='online'?session.seat:mode==='solo'?0:game.turn);
 if($('promise-btn'))$('promise-btn').onclick=promiseModal;
 if($('projector'))$('projector').onclick=openProjector;
 if($('advise-btn'))$('advise-btn').onclick=adviseModal;
 if($('share-btn'))$('share-btn').onclick=shareModal;
 if($('guess-btn'))$('guess-btn').onclick=guessModal;
 if($('assist'))$('assist').onclick=()=>{modal('<h2>현재 차례를 도와줄까요?</h2><p>연결이 끊겼거나 오래 멈춘 팀의 이번 행동 한 번을 AI 제안으로 처리합니다. 해당 팀과 먼저 이야기해주세요.</p><button id="assist-confirm" class="primary wide">이번 행동 한 번 진행</button>');$('assist-confirm').onclick=async()=>{$('modal').close();if(busy)return;await hostAction(aiAction(game));};};
}
function info(id){
 const p=game.players[id],owe=outstanding(p);
 const mine=(game.promises||[]).filter(pr=>pr.from===id||pr.to===id);
 modal(`<h2>${ICONS[id]} ${esc(p.name)}의 인생 카드</h2><p><b>${BACKGROUNDS[p.background].name}</b><br>${BACKGROUNDS[p.background].desc}</p><div class="ledger"><div class="row spread"><span>출발 자금 → 현재 순자산</span><b>${num(p.born)} → ${num(wealth(p))}</b></div><div class="row spread"><span>직업 / 턴당 소득</span><b>${p.job} / ${num(p.salary)}</b></div><div class="row spread"><span>투자 / 주택 / 대출</span><b>${num(p.stocks)} / ${num(p.home)} / ${num(p.debt)}</b></div><div class="row spread"><span>받을 돈 / 보험 잔여 보장</span><b>${num(receivable(p))} / ${num(p.insurance)}</b></div><div class="row spread"><span>조언 토큰 / 건강 최저</span><b>${p.tokens}개 / ${p.minHealth}</b></div>${owe?`<div class="row spread"><span>다른 팀에게 갚을 금액</span><b>${num(owe)}</b></div>`:''}</div>${p.loans&&p.loans.some(l=>l.due>l.paid)?`<p><b>빌린 돈</b></p>${p.loans.filter(l=>l.due>l.paid).map(l=>`<p class="small">${esc(game.players[l.from].name)}에게 이자 ${l.rate}% · ${num(l.due-l.paid)} 남음 (매 턴 최대 50 자동 상환)</p>`).join('')}`:''}<p><b>만남 카드</b></p>${p.cards.map(c=>`<span class="badge">${c}</span>`).join('')}<p class="small muted">친구: 돌봄 할인·물건 빌리기 / 멘토·동문: 지원 제도 정보와 앞길 미리보기</p><div class="info"><b>나의 목표 · ${GOALS[p.goal].name}</b><br>${GOALS[p.goal].desc}</div>${mine.length?`<p><b>약속</b></p>${mine.map(pr=>`<p class="small">${esc(game.players[pr.from].name)} → ${esc(game.players[pr.to].name)}: ${esc(pr.text)} ${pr.kept?'· 지킴':'· 아직'}</p>`).join('')}`:''}<p class="small">건강은 최대 6입니다. 0이면 소득이 절반이지만 탈락하지 않아요. 순자산이 마이너스여도 끝까지 함께 플레이합니다.</p>`);
}
async function animate(old,next){if(next.phase!=='choice'||old.phase!=='roll'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;animating=true;const dice=$('dice');if(dice){dice.classList.add('rolling');for(let i=0;i<6;i++){dice.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][i];beep(260+i*80);await new Promise(r=>setTimeout(r,70));}dice.classList.remove('rolling');dice.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][next.die-1];}let tmp=structuredClone(old);for(let i=1;i<=next.die;i++){tmp.players[tmp.turn].pos=(old.players[old.turn].pos+i)%28;if($('board-host'))$('board-host').innerHTML=board(tmp);await new Promise(r=>setTimeout(r,100));}animating=false;}
async function dispatch(action){action={...contextOf(game),...action};if(busy||queued||animating)return;busy=true;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=true);try{if(mode==='online'){await rpc('send',{action,nonce:crypto.randomUUID()});queued=true;toast('선택을 보냈어요. 진행자 화면과 연결 중입니다.');}else{let next=transition(game,action);await animate(game,next);game=next;persist();beep(650);}}catch(e){toast(e.message);}finally{busy=false;if(mode!=='online'||!queued)renderGame();scheduleAI();}}
function scheduleAI(){
 clearTimeout(aiTimer);
 if(aiPaused||$('modal').open||mode==='home'||screen!=='game'||!game||game.phase==='done'||busy||animating)return;
 if(mode!=='online'&&game.phase==='choice'&&assistRev!==game.revision){
  assistRev=game.revision;
  const act=aiAssist(game);
  if(act){aiTimer=setTimeout(()=>dispatch(act),900);return;}
 }
 if(game.players[actor(game)]?.ai)aiTimer=setTimeout(()=>{if(mode==='online')return;dispatch(aiAction(game));},game.phase==='result'?1600:2600);
}
function historyChart(g,w=700,h=210){
 const rows=g.history||[];if(rows.length<2)return '';
 const all=rows.flatMap(r=>r.assets),hi=Math.max(...all,1),lo=Math.min(...all,0),span=Math.max(1,hi-lo),pad=34;
 const x=i=>pad+i*(w-pad*2)/Math.max(1,rows.length-1),y=v=>h-pad-((v-lo)/span)*(h-pad*1.6);
 const lines=g.players.map(p=>`<polyline fill="none" stroke="${COLORS[p.id]}" stroke-width="2.6" stroke-linejoin="round" points="${rows.map((r,i)=>x(i).toFixed(1)+','+y(r.assets[p.id]).toFixed(1)).join(' ')}"/>`).join('');
 const dots=g.players.map(p=>rows.map((r,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(r.assets[p.id]).toFixed(1)}" r="2.8" fill="${COLORS[p.id]}"/>`).join('')).join('');
 const zero=lo<0?`<line x1="${pad}" y1="${y(0).toFixed(1)}" x2="${w-pad}" y2="${y(0).toFixed(1)}" stroke="#bdb7a4" stroke-dasharray="4 4"/>`:'';
 const ticks=rows.map((r,i)=>`<text x="${x(i).toFixed(1)}" y="${h-10}" font-size="10" fill="#8a8574" text-anchor="middle">R${r.round}</text>`).join('');
 return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="라운드별 팀 순자산 변화"><line x1="${pad}" y1="16" x2="${pad}" y2="${h-pad}" stroke="#ddd7c4"/><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#ddd7c4"/>${zero}${lines}${dots}${ticks}<text x="${pad-6}" y="22" font-size="10" fill="#8a8574" text-anchor="end">${num(hi)}</text></svg>`;
}
function results(){
 clearTimeout(aiTimer);screen='results';
 const prize=awards(game),ws=game.players.map(wealth),hi=Math.max(...ws),lo=Math.min(...ws);
 const max=Math.max(...ws,...game.players.map(p=>p.born),1);
 const gap=lo>0?`${(hi/lo).toFixed(1)}배`:lo===0?'최하위 팀의 순자산은 0이에요':'최하위 팀은 마이너스로 끝났어요';
 const first=game.history[0],last=game.history[game.history.length-1];
 const spread=first&&last?`${num(Math.max(...first.assets)-Math.min(...first.assets))} → ${num(Math.max(...last.assets)-Math.min(...last.assets))}`:'';
 const kept=(game.promises||[]).filter(p=>p.kept).length;
 mount(`<section class="results"><span class="eyebrow">Every choice leaves a trace</span><h1 style="margin-top:12px">우리의 인생은 어떤 모양이었나요?</h1><p class="muted">${game.maxRounds}라운드의 선택이 모였습니다. 돈, 배움, 건강, 함께한 순간을 돌아봐요.</p><div class="result-grid">${game.players.map(p=>`<article class="result-card" style="--pc:${COLORS[p.id]}"><h3>${ICONS[p.id]} ${esc(p.name)}</h3><p class="small muted">${p.job}</p><div class="money">${num(wealth(p))} <small>최종 순자산</small></div><p class="small">출발 ${num(p.born)} → 변화 ${wealth(p)-p.born>=0?'+':''}${num(wealth(p)-p.born)}</p><p class="small" style="margin-top:7px">♥ 건강 ${p.health}/6 · 역량 ${p.skill} · 도움 ${p.help}회</p><div class="goal">${GOALS[p.goal].check(p)?'✓ 목표 달성':'◇ 다음 인생의 목표'}<br><b>${GOALS[p.goal].name}</b><br>${GOALS[p.goal].desc}</div>${prize[p.id].length?`<div class="awards">${prize[p.id].map(a=>`<div class="award"><b>${a.name}</b><span>${a.line}</span></div>`).join('')}</div>`:''}</article>`).join('')}</div><section class="panel"><h2>격차는 어디에서 벌어졌나요</h2><p class="small muted">라운드마다 기록한 팀별 순자산입니다. 첫 기록과 마지막 기록의 최고–최저 차이: ${spread}</p>${historyChart(game)}<div class="legend" style="margin-top:6px">${game.players.map(p=>`<span><i style="background:${COLORS[p.id]}"></i>${esc(p.name)}</span>`).join('')}</div></section><section class="panel"><h2>출발선과 도착선</h2><p class="small muted">연한 막대: 출발 자금 · 진한 막대: 최종 순자산 · 1위와 최하위 차이 ${gap}</p><div class="bars">${game.players.map(p=>`<div class="bar-row" style="--pc:${COLORS[p.id]}"><b>${esc(p.name)}</b><div class="bar-pair"><i style="width:${p.born/max*100}%"></i><i style="width:${Math.max(0,wealth(p))/max*100}%"></i></div><span>${num(wealth(p))}</span></div>`).join('')}</div><p class="small muted">이 결과는 이번 게임의 규칙과 선택에서 나왔습니다. 현실 사회의 인과관계나 자녀의 미래 자산을 뜻하지 않아요.</p></section>${game.promises&&game.promises.length?`<section class="panel"><h2>지킨 약속과 지키지 못한 약속</h2><p class="small muted">게임이 강제하지 않았던 약속 ${game.promises.length}개 중 ${kept}개가 지켜졌어요.</p><div class="promise-list">${game.promises.map(pr=>`<div class="promise-item${pr.kept?' kept':''}"><div><b>${esc(game.players[pr.from].name)} → ${esc(game.players[pr.to].name)}</b><div class="small">R${pr.round} · ${esc(pr.text)}</div></div><span class="badge">${pr.kept?'지킴':'미이행'}</span></div>`).join('')}</div></section>`:''}${game.comparison?`<section class="panel"><h2>같은 운, 달라진 출발선</h2><p class="small muted">이전 플레이와 이번 플레이의 최종 순자산입니다. 선택과 상호작용도 달라지므로 출발 조건만의 효과를 증명하지는 않아요.</p><div class="comparison-table">${game.players.map((p,i)=>`<div class="row spread"><b>${esc(p.name)}</b><span>${num(game.comparison[i].assets)} → ${num(wealth(p))} (${wealth(p)-game.comparison[i].assets>=0?'+':''}${num(wealth(p)-game.comparison[i].assets)})</span></div>`).join('')}</div></section>`:''}<section class="reflection" style="margin-top:20px"><h2>주사위를 내려놓고, 이야기해요.</h2><ol><li>하고 싶었지만 조건 때문에 선택하지 못했던 것은 무엇인가요?</li><li>아무도 알려주지 않았다면 몰랐을 선택지가 있었나요? 누가 알려줬나요?</li><li>공동 위기는 모두에게 똑같이 무거웠나요?</li><li>우리의 정책은 누구에게 도움이 되었고, 비용은 누가 부담했나요?</li><li>다시 한다면 나의 선택과 사회의 규칙 중 무엇을 바꾸고 싶나요?</li></ol></section><div class="row" style="margin:22px 0"><button id="export" class="primary">플레이 기록 내려받기</button><button id="print-result">결과 인쇄</button>${mode!=='online'?'<button id="replay-swap" class="secondary">같은 운명, 다른 출발선으로 다시</button><button id="replay">같은 친구들과 새 인생</button>':''}<button id="result-home">처음으로</button></div><p class="small muted">"같은 운명, 다른 출발선"은 주사위·시장·공동 위기의 추첨값을 그대로 두고 출발 조건만 서로 바꿔 다시 시작합니다.</p></section>`);
 $('export').onclick=exportGame;$('print-result').onclick=()=>window.print();$('result-home').onclick=home;
 if($('replay'))$('replay').onclick=()=>setup(mode);
 if($('replay-swap'))$('replay-swap').onclick=()=>{
  const previous=game.players.map(p=>({name:p.name,assets:wealth(p),health:p.health}));
  const bgs=game.players.map((p,i)=>game.players[(i+1)%game.players.length].background);
  startLocal(mode,{names:game.players.map(p=>p.name),rounds:game.maxRounds,equal:false,seed:game.initialSeed,backgrounds:bgs});game.comparison=previous;persist();
 };
 paintProjector();
}
function exportGame(){
 const prize=awards(game);
 const lines=['플레이하는 사회 — 인생 한 바퀴',`${game.maxRounds}라운드 · 시행 정책: ${game.policies.length?game.policies.map(k=>POLICIES[k].name).join(', '):'없음'}`,
  ...game.players.flatMap(p=>['',p.name,
   `출발 ${p.born} / 최종 순자산 ${wealth(p)} / 건강 ${p.health}(최저 ${p.minHealth}) / 역량 ${p.skill} / 도움 ${p.help}회`,
   `정보 공유 ${p.shared}회 / 조언 토큰 사용 ${p.advised}회 / 거래한 팀 ${p.partners.length} / 남은 토큰 ${p.tokens}`,
   `목표: ${GOALS[p.goal].desc} (${GOALS[p.goal].check(p)?'달성':'미달'})`,
   ...(prize[p.id].length?['칭호: '+prize[p.id].map(a=>a.name).join(', ')]:[]),
   ...p.choices.map(c=>`R${c.round} ${c.title}`)]),
  '','라운드별 순자산',...game.history.map(h=>`R${h.round} ${game.players.map((p,i)=>p.name+' '+h.assets[i]).join(' / ')}`),
  ...(game.promises&&game.promises.length?['','약속 기록',...game.promises.map(pr=>`R${pr.round} ${game.players[pr.from].name} → ${game.players[pr.to].name}: ${pr.text} (${pr.kept?'지킴':'미이행'})`)]:[]),
  '','테이블 기록',...game.log.slice().reverse().map(l=>`R${l.round} ${l.text}`)];
 const a=document.createElement('a');a.href=window.URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));a.download='인생한바퀴_플레이기록.txt';a.click();setTimeout(()=>window.URL.revokeObjectURL(a.href),1000);
}
function rules(){
 modal(`<h2>인생 한 바퀴, 이렇게 해요</h2><ol class="rules-list"><li><b>출발선을 뽑아요.</b> 자금과 만남 카드가 다르게 시작해요.</li><li><b>주사위를 굴려요.</b> 1–6칸 이동하고 도착한 사건을 해결해요.</li><li><b>나의 선택을 해요.</b> 돈·건강·역량·관계에는 서로 다른 쓰임이 있어요.</li><li><b>다른 팀과 만나요.</b> 돌봄을 부탁하고, 공동사업을 제안하고, 급전을 빌립니다. 상대는 거절할 수 있어요.</li><li><b>라운드 끝에 시장을 예측해요.</b> 모두 동시에 오를지 내릴지 고르고, 맞힌 팀은 +25를 받아요.</li><li><b>3라운드마다 공동 위기.</b> 모두 같은 사건을 맞지만, 정액 부담과 비례 부담은 체감이 다릅니다.</li><li><b>4라운드마다 사회회의.</b> 새 정책과 그 비용을 함께 결정해요. 마지막 라운드에는 회의 없이 결과를 봐요.</li></ol><p><b>다른 팀 차례에도 할 일이 있어요.</b> 게임당 조언 토큰 2개로 남의 잠긴 선택지를 열어줄 수 있고(신뢰 +1), 멘토·동문 카드가 있으면 상대가 모르는 지원 제도를 공짜로 알려줄 수 있어요(라운드당 1회, 신뢰 +1). 온라인에서는 다른 팀의 선택을 예측할 수도 있습니다.</p><p><b>정보는 자원입니다.</b> 어떤 선택지는 멘토·동문 카드가 있어야 화면에 보입니다. 보이지 않는 팀에게는 "들어본 적 없는 선택지"로만 표시돼요. 멘토·동문 카드가 있으면 다음 6칸도 미리 볼 수 있습니다.</p><p>매 턴 소득을 받고 생활비를 냅니다. 주식은 라운드마다 −18%~+22%의 공통 시장 변화, 주택은 그 변동폭의 1/3이 적용됩니다. 은행 대출에는 라운드당 3% 이자가 붙고, 투자 칸에서 한 번에 최대 300까지 갚을 수 있어요. 다른 팀에게 빌린 돈은 매 턴 합계 최대 50씩 자동 상환됩니다. 받을 돈도 순자산에 포함됩니다. 마지막에는 은행 빚을 제외한 자산 범위에서 현금·투자·주택 순서로 정산하고, 못 받은 금액은 채권자의 손실로 처리합니다. 시장 칸의 보험은 50을 내고 다음 공동 위기 손실을 최대 150까지 줄이는 1회성 보장입니다.</p><p>건강 0이면 소득이 절반이지만 탈락하지 않아요. 순자산·개인 목표·도움의 기록·칭호로 각자의 삶을 돌아봅니다.</p><p class="muted small">온라인은 진행자 화면이 게임을 진행합니다. 진행자가 나가면 일시 정지되며 같은 브라우저에서 이어할 수 있어요. 실명과 실제 가정형편은 입력하지 마세요.</p>`);
}
async function rpc(op,data={},s=session){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),12000);try{const res=await fetch(`${URL}/rest/v1/rpc/nlh_room`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_op:op,p_code:s?.code||'',p_token:s?.token||null,p_data:data}),signal:ctl.signal});const j=await res.json();if(!res.ok)throw Error(j.message||'연결을 확인해주세요.');return j;}catch(e){if(e.name==='AbortError')throw Error('연결이 지연되고 있어요. 잠시 후 다시 시도하세요.');throw e;}finally{clearTimeout(t);}}
async function connect(op){if(busy)return;busy=true;$('setup-error').innerHTML='';document.querySelectorAll('.setup button').forEach(b=>b.disabled=true);try{const name=$('online-name').value.trim()||'새 모둠',code=$('online-code').value.trim().toUpperCase();if(op==='join'&&!/^[A-F0-9]{6}$/.test(code))throw Error('6자리 영문·숫자 방 코드를 확인하세요.');session=await rpc(op,{name},{code});localStorage.setItem(SESSION,JSON.stringify(session));mode='online';beginPoll();}catch(e){$('setup-error').innerHTML=`<p class="error">${esc(e.message)}</p>`;document.querySelectorAll('.setup button').forEach(b=>b.disabled=false);}finally{busy=false;}}
function beginPoll(){clearInterval(pollTimer);clearTimeout(aiTimer);room=null;lastRendered=-1;queued=false;game=null;screen='lobby';mount('<section class="setup panel"><h2>우리 테이블에 연결하는 중…</h2><p class="desc">잠시만 기다려주세요.</p><div id="connection-error"></div></section>');poll();pollTimer=setInterval(poll,1800);}
async function poll(){if(polling||busy||animating||mode!=='online')return;polling=true;try{const r=await rpc('read');if(mode!=='online')return;lastOnline=Date.now();room=r;const prior=game;game=r.state.phase==='lobby'?null:upgradeGame(r.state);if(lastRendered!==r.version){queued=false;lastRendered=r.version;if(game){if(prior&&prior.revision!==game.revision)await animate(prior,game);renderGame();}else lobby();}
 if(session.host&&game&&game.phase!=='done'){
  const pending=r.pending?.[0];if(pending){let next=game;try{next=transition(game,pending.action);}catch(e){toast('처리되지 않은 선택: '+e.message);}await commit(next,pending.id);}
  else if(game.players[actor(game)]?.ai){await commit(transition(game,aiAction(game)));}
 }
 if($('net-status'))$('net-status').textContent=session.host?'진행자 · 온라인 연결됨':Date.now()-new Date(r.updated).getTime()>20000?'진행자 연결을 기다리는 중':'온라인 연결됨';
 }catch(e){if($('connection-error'))$('connection-error').innerHTML=`<p class="error">${esc(e.message)}</p><button id="back-connection">처음으로</button>`;if($('back-connection'))$('back-connection').onclick=home;if($('net-status'))$('net-status').textContent='연결 재시도 중 · 선택은 잠시 기다려주세요';if(Date.now()-lastOnline>12000)queued=false;}finally{polling=false;}}
function lobby(){screen='lobby';mount(`<section class="setup panel"><span class="eyebrow">Your table is ready</span><h1 style="margin-top:10px">친구들을 초대하세요</h1><div class="room-code">${esc(session.code)}</div><div class="row"><button id="copy-code">방 코드 복사</button><button id="copy-link">초대 링크 복사</button><span class="pill">${room.members.length} / 6팀</span></div><div style="margin-top:18px">${room.members.map(m=>`<div class="room-member"><span style="font-size:24px">${ICONS[m.seat]}</span><b>${esc(m.name)}</b><span class="muted small">${m.seat===0?'진행자':m.seat===session.seat?'나':'참가 완료'}</span></div>`).join('')}</div>${session.host?`<label for="online-rounds">게임 길이</label><select id="online-rounds"><option value="8">기본 8라운드</option><option value="12">확장 12라운드</option></select><label class="check"><input id="online-equal" type="checkbox">모두 같은 출발 조건</label><button class="primary wide" id="start-online" ${room.members.length<2?'disabled':''}>${room.members.length<2?'친구 한 팀이 더 필요해요':'모두 모였어요 · 게임 시작'}</button><div class="hint">게임 중 이 화면을 켜 두세요. 진행자가 화면을 나가면 진행이 멈춥니다.</div>`:'<p class="info" style="margin-top:20px">입장 완료! 진행자가 게임을 시작하면 보드판이 열립니다.</p>'}</section>`);$('copy-code').onclick=()=>copy(session.code);$('copy-link').onclick=()=>location.protocol==='file:'?toast('이 HTML 파일과 방 코드를 친구에게 공유해주세요.'):copy(location.origin+location.pathname+'?room='+session.code);if($('start-online'))$('start-online').onclick=async()=>{if(busy)return;busy=true;const rounds=+$('online-rounds').value,equal=$('online-equal').checked;try{const fresh=await rpc('read');room=fresh;if(fresh.state.phase!=='lobby')return;const g=newGame(fresh.members.map(m=>m.name),{rounds,equal});await commit(g);}catch(e){toast(e.message);}finally{busy=false;if(game)renderGame();}};}
async function commit(next,ack){const r=await rpc('commit',{version:room.version,state:next,...(ack?{ack}: {})});if(game)await animate(game,next);room=r;game=r.state;lastRendered=r.version;queued=false;renderGame();}
async function hostAction(a){if(!session?.host||busy)return;busy=true;try{room=await rpc('read');game=upgradeGame(room.state);await commit(transition(game,{...a,expected:game.revision}));}catch(e){toast(e.message);}finally{busy=false;if(game)renderGame();}}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('복사했어요. 친구에게 알려주세요.');}catch{modal(`<h2>복사할 내용</h2><p style="word-break:break-all;user-select:all">${esc(text)}</p>`);}}
const PROJ_CSS=`*{box-sizing:border-box}body{margin:0;background:#f7f4eb;color:#3b3a33;font-family:'Noto Sans KR',system-ui,sans-serif;padding:26px 30px}h1{font-size:30px;margin:0 0 4px}.sub{color:#8a8574;font-size:14px;margin-bottom:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}.card{background:#fffdf5;border:1px solid #e6e0cd;border-left:6px solid var(--pc);border-radius:12px;padding:13px 15px}.card b{font-size:15px}.card .v{font-size:26px;font-weight:800;margin-top:4px}.card .m{font-size:12px;color:#8a8574;margin-top:3px}.big{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px}.stat{background:#efe9d8;border-radius:12px;padding:12px 18px;min-width:150px}.stat span{font-size:12px;color:#7d7867;display:block}.stat b{font-size:24px}.pol{display:inline-block;background:#e2ece4;border-radius:999px;padding:5px 13px;margin-right:7px;font-size:13px}.chart{width:100%;height:auto;background:#fffdf5;border:1px solid #e6e0cd;border-radius:12px;padding:8px}.foot{margin-top:18px;font-size:12px;color:#8a8574}`;
function openProjector(){
 try{
  if(projWin&&!projWin.closed){projWin.focus();paintProjector();return;}
  projWin=window.open('','nlh-projector','width=1280,height=840');
  if(!projWin){toast('팝업이 차단되어 있어요. 브라우저에서 이 페이지의 팝업을 허용해주세요.');return;}
  projWin.document.open();
  projWin.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>인생 한 바퀴 · 진행 화면</title><style>'+PROJ_CSS+'</style></head><body><div id="pj"></div></body></html>');
  projWin.document.close();
  paintProjector();
  toast('진행 화면을 새 창으로 열었어요. 프로젝터로 옮겨주세요.');
 }catch(e){toast('진행 화면을 열 수 없어요.');}
}
function paintProjector(){
 try{
  if(!projWin||projWin.closed||!game)return;
  const host=projWin.document.getElementById('pj');if(!host)return;
  const ws=game.players.map(wealth),hi=Math.max(...ws),lo=Math.min(...ws);
  const gap=lo>0?`${(hi/lo).toFixed(1)}배`:'최하위가 마이너스';
  const stage=game.phase==='done'?'게임 종료':game.phase==='vote'?'사회회의 진행 중':game.phase==='crisis'?'공동 위기 확인 중':game.phase==='forecast'?'시장 예측 중':`${esc(game.players[game.turn].name)}의 차례`;
  host.innerHTML=`<h1>인생 한 바퀴 · ${game.round} / ${game.maxRounds} 라운드 · ${age(game)}세</h1><div class="sub">${stage}</div><div class="big"><div class="stat"><span>1위와 최하위 순자산 차이</span><b>${gap}</b></div><div class="stat"><span>공동기금</span><b>${num(game.fund)}</b></div><div class="stat"><span>${esc(game.market)}</span><b>${game.policies.length?game.policies.map(k=>POLICIES[k].icon).join(' '):'정책 없음'}</b></div></div><div>${game.policies.map(k=>`<span class="pol">${POLICIES[k].icon} ${POLICIES[k].name}</span>`).join('')||''}</div><div class="grid" style="margin-top:16px">${game.players.map(p=>`<div class="card" style="--pc:${COLORS[p.id]}"><b>${ICONS[p.id]} ${esc(p.name)}</b><div class="v">${num(wealth(p))}</div><div class="m">${p.job} · 건강 ${p.health}/6 · 역량 ${p.skill} · 신뢰 ${p.trust}</div><div class="m">도움 ${p.help}회 · 정보 공유 ${p.shared}회 · 토큰 ${p.tokens}개</div></div>`).join('')}</div>${historyChart(game,900,260)}<div class="foot">금액 단위는 게임머니입니다. 현실의 소득·투자수익을 예측하는 모형이 아닙니다.</div>`;
 }catch(e){}
}
window.addEventListener('beforeunload',persist);home();const invite=new window.URLSearchParams(location.search).get('room');if(invite){setup('online');$('online-code').value=invite.slice(0,6);}
