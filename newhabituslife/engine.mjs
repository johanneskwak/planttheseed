export const COLORS=['#dc795a','#579287','#d4aa4a','#7894bf','#aa7ca2','#8d9f5c'];
export const ICONS=['🦊','🐳','🐥','🐻','🐰','🐢'];
export const TYPES={start:['출발','⚑','#e4e8d2'],learn:['배움','📚','#e5ecdf'],chance:['인생 카드','✦','#f6e3d4'],network:['만남','🤝','#e6e0ed'],market:['투자','▥','#dce9e8'],care:['돌봄','♥','#f3dfdc'],community:['우리 사회','⚖','#e7e5ce'],rest:['쉼표','☘','#e0e9d8'],career:['커리어','💼','#dee5f0']};
export const BOARD=['start','learn','chance','network','market','care','rest','community','career','chance','learn','network','market','care','community','rest','chance','career','market','network','care','learn','chance','community','rest','market','network','chance'];
export const BACKGROUNDS=[{name:'스스로 길을 찾는 집',cash:300,skill:1,trust:1,card:'친구',desc:'시작 자금은 적지만, 서로 챙기는 친구가 있어요.'},{name:'차근차근 준비하는 집',cash:650,skill:2,trust:1,card:'멘토',desc:'배움을 도와줄 멘토와 함께 출발해요.'},{name:'선택의 여유가 있는 집',cash:1100,skill:2,trust:2,card:'동문',desc:'넉넉한 자금과 새로운 기회를 알려줄 선배가 있어요.'}];
export const POLICIES={care:{name:'공공 돌봄',icon:'♥',desc:'이후 소득의 10%를 공동기금에 납부. 돌봄 비용 100 → 30, 휴식 효과 +1.'},education:{name:'교육 사다리',icon:'📚',desc:'이후 소득의 10%를 납부. 배움 비용 100 → 30, 훈련 비용 120 → 50.'},housing:{name:'주거 지원',icon:'⌂',desc:'이후 소득의 10%를 납부. 무주택자 생활비 40 → 10.'}};
export const GOALS=[{name:'나만의 기반',desc:'순자산을 출발보다 600 이상 늘리기',check:p=>wealth(p)>=p.born+600},{name:'건강한 삶',desc:'건강 5 이상 · 순자산이 출발 이상',check:p=>p.health>=5&&wealth(p)>=p.born},{name:'함께 사는 삶',desc:'도움·기부 3회 이상 실천하기',check:p=>p.help>=3},{name:'배움의 여정',desc:'역량 7 이상 · 만남 카드 2장 이상',check:p=>p.skill>=7&&p.cards.length>=2}];
export const wealth=p=>Math.round(p.cash+p.stocks+p.home-p.debt);
export const age=g=>g.round===1?8:g.round===2?15:22+(g.round-3)*5;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function log(g,text){g.log.unshift({round:g.round,text});g.log=g.log.slice(0,100);}
function pay(p,cost){const paid=Math.min(p.cash,cost);p.cash-=paid;p.debt+=cost-paid;}
function gain(p,n){p.cash+=n;}
function health(p,n){p.health=clamp(p.health+n,0,6);}
export function newGame(names,{seed=Date.now()>>>0,rounds=8,equal=false,ai=[]}={}){
 let g={version:1,seed,initialSeed:seed,round:1,maxRounds:rounds,turn:0,phase:'roll',players:[],fund:0,policies:[],log:[],history:[],die:null,event:null,offer:null,votes:{},market:'출발선',revision:0};
 if(names.length<2||names.length>6)throw Error('2~6팀으로 시작하세요.');
 names.forEach((name,i)=>{const b=equal?1:Math.floor(random(g)*3),bg=BACKGROUNDS[b];g.players.push({id:i,name:String(name).trim().slice(0,12)||`${i+1}팀`,ai:ai.includes(i),background:b,born:bg.cash,cash:bg.cash,debt:0,stocks:0,home:0,skill:bg.skill,trust:bg.trust,health:5,cards:[bg.card],salary:0,job:'학생',pos:0,goal:i%4,help:0,visits:[],choices:[],usedHelp:false});});
 log(g,'서로 다른 출발선. 주사위를 굴려 나의 인생을 시작하세요.');return g;
}
export function actor(g){if(g.phase==='offer')return g.offer.to;if(g.phase==='vote')return g.players.find(p=>g.votes[p.id]===undefined)?.id;return g.turn;}
export function options(g){let p=g.players[g.turn],e=g.event;if(!e)return[];const o=(id,title,desc,disabled=false)=>({id,title,desc,disabled});
 switch(e.type){
 case 'learn':return[o('study','배움에 투자하기',`현금 −${g.policies.includes('education')?30:100} · 역량 +2`,p.cash<(g.policies.includes('education')?30:100)),o('work','생활비부터 마련하기','현금 +100 · 역량 +1 · 건강 −1'),o('library','도서관에서 길 찾기','역량 +1 · 멘토 카드 획득')];
 case 'career':return[o('professional','전문 역량으로 도전','역량 6 필요 · 매 턴 소득 240 · 준비비 150',p.skill<6||p.cash<150),o('company','추천받은 일자리','역량 3 · 신뢰 2 필요 · 매 턴 소득 190',p.skill<3||p.trust<2),o('craft','현장 경험으로 시작','매 턴 소득 150 · 역량 +1'),o('train','일하며 다시 준비','매 턴 소득 100 · 역량 +2 · 다음 커리어 칸에서 이직')];
 case 'network':return[o('mentor','멘토에게 질문하기','역량 +1 · 멘토 카드 · 장학·훈련에 활용'),o('friend','친구와 시간을 보내기','건강 +1 · 신뢰 +1 · 친구 카드'),o('alumni','새 모임에 참여하기','현금 −80 · 신뢰 +2 · 동문 카드',p.cash<80)];
 case 'care':return[o('pay','돌봄 서비스를 이용하기',`현금 −${careCost(g,p)} · 건강 유지`,p.cash<careCost(g,p)),o('self','직접 돌보기','현금 지출 없음 · 건강 −2 · 신뢰 +1'),o('fund','공동기금 지원받기','기금 −80 · 현금 부담 없음',g.fund<80),o('ask','다른 플레이어에게 부탁','상대가 수락하면 상대 현금 −60 · 두 사람 신뢰 +1',p.usedHelp||g.players.every(q=>q.id===p.id||q.cash<60))];
 case 'market':return[o('invest','주식 꾸러미 매수','현금 −200 → 투자자산 +200 · 매 라운드 공동 시장 변동',p.cash<200),o('home','내 집 마련','현금 −900 → 주택 +900 · 이후 생활비 면제',p.cash<900||p.home>0),o('sell','투자금 회수','투자자산을 모두 현금으로 바꾸기',p.stocks<=0),o('save','예금으로 기다리기','현금 +20 · 투자 위험을 지지 않아요')];
 case 'community':return[o('donate','공동기금에 출자하기','현금 −60 · 기금 +60 · 신뢰 +1 · 도움 실천 +1',p.cash<60),o('business','함께 작은 사업 시작','서로 100 출자 · 각자 50 손실 또는 90 이익 · 수락 필요',p.cash<100||p.usedHelp||g.players.every(q=>q.id===p.id||q.cash<100)),o('volunteer','시간으로 함께하기','건강 −1 · 기금 +30 · 도움 실천 +1',p.health<1)];
 case 'rest':return[o('rest','푹 쉬어가기',`건강 +${g.policies.includes('care')?3:2}`),o('hobby','취미 모임에 가기','현금 −40 · 건강 +1 · 신뢰 +1',p.cash<40),o('side','이번엔 부업하기','현금 +110 · 건강 −1')];
 default:
 if(e.variant===0)return[o('repair','고장 난 생활도구 수리','현금 −70 · 역량 +1',p.cash<70),o('borrow','친구에게 빌려 쓰기','친구 카드로 비용 없이 해결',!p.cards.includes('친구')),o('delay','수리를 미루기','건강 −1 · 지출 없음')];
 if(e.variant===1)return[o('scholar','새로운 기회에 지원하기','멘토/동문 카드 또는 역량 4 · 현금 +180',!p.cards.some(c=>['멘토','동문'].includes(c))&&p.skill<4),o('search','정보를 더 찾아보기','역량 +1 · 멘토 카드 획득')];
 return[o('train','전환 교육에 참여하기',`현금 −${g.policies.includes('education')?50:120} · 역량 +2 · 소득 +30`,p.cash<(g.policies.includes('education')?50:120)),o('overtime','추가 일을 맡기','현금 +140 · 건강 −1'),o('recover','나를 먼저 돌보기','건강 +1')];
 }
}
function careCost(g,p){return g.policies.includes('care')?30:p.cards.includes('친구')?60:100;}
const TITLES={learn:['배움의 갈림길','배우고 싶은 것이 생겼어요. 지금의 여유와 미래의 기회 사이에서 선택하세요.'],career:['나의 첫 명함, 다음 가능성','지금까지 쌓은 역량과 관계가 선택할 수 있는 일자리에 영향을 줍니다.'],network:['우연한 만남이 여는 문','돈으로만 얻을 수 없는 기회. 어떤 관계를 쌓고 싶나요?'],care:['누군가를 돌봐야 할 때','같은 사건도 이용할 수 있는 도움에 따라 부담이 달라져요.'],market:['오늘의 돈, 내일의 선택','자산을 불릴 수도, 잃을 수도 있어요. 시장 변화는 모두에게 함께 적용됩니다.'],community:['우리라서 가능한 일','내 자원을 함께 쓰면, 다음 위기에서 누군가의 선택지가 생깁니다.'],rest:['잠깐, 쉬어가도 괜찮아','건강이 0이면 다음 소득이 절반이 됩니다. 내 삶의 속도를 정해보세요.']};
export function eventText(e){return TITLES[e.type]||[['뜻밖의 수리비','생활에 필요한 도구가 고장 났어요. 돈, 관계, 시간을 어떻게 쓸까요?'],['나에게도 이런 기회가?','장학·프로젝트 지원 공고를 발견했어요. 정보를 알아보는 경험도 자산이 됩니다.'],['세상이 바뀌고 있어요','새로운 기술이 등장했어요. 배우거나, 더 일하거나, 숨을 고를 수 있어요.']][e.variant];}
function endTurn(g){g.phase='result';g.offer=null;}
function finishRound(g){
 const rate=[-.18,-.08,.05,.12,.22][Math.floor(random(g)*5)];g.market=`이번 시장 ${rate>=0?'+':''}${Math.round(rate*100)}%`;
 for(const p of g.players){p.stocks=Math.round(p.stocks*(1+rate));if(p.home)p.home=Math.round(p.home*(1+rate/3));if(p.debt){const interest=Math.ceil(p.debt*.03);p.debt+=interest;}}
 g.history.push({round:g.round,assets:g.players.map(wealth)});log(g,`${g.market} · 주식에 공통 적용, 주택에는 변동폭의 1/3 적용. 대출 이자 3%.`);
 if(g.round>=g.maxRounds){g.phase='done';return;}
 if(g.round%4===0){g.phase='vote';g.votes={};return;}
 nextRound(g);
}
function nextRound(g){g.round++;g.turn=0;g.phase='roll';g.event=null;g.die=null;}
export function transition(source,a){
 const g=structuredClone(source),p=g.players[g.turn];if(!a||g.phase==='done')throw Error('이미 마친 게임입니다.');
 if(a.expected!==undefined&&a.expected!==g.revision&&!(a.type==='vote'&&g.phase==='vote'&&a.round===g.round))throw Error('화면이 갱신되었습니다. 다시 선택해주세요.');
 if(g.phase==='vote'){
  if(a.type!=='vote'||!g.players[a.actor]||g.votes[a.actor]!==undefined||!['care','education','housing','none'].includes(a.value))throw Error('투표를 확인해주세요.');
  if(g.policies.includes(a.value))throw Error('이미 시행 중인 정책입니다.');g.votes[a.actor]=a.value;
  if(Object.keys(g.votes).length===g.players.length){const tally={};Object.values(g.votes).forEach(v=>tally[v]=(tally[v]||0)+1);const entries=Object.entries(tally).sort((a,b)=>b[1]-a[1]);const winner=entries[0][1]===entries[1]?.[1]?'none':entries[0][0];if(winner!=='none')g.policies.push(winner);log(g,winner==='none'?'사회회의: 현행 유지 (동률이면 현행 유지).':`사회회의: ${POLICIES[winner].name} 채택. 이후 소득에서 정책별 10%를 공동기금으로 냅니다.`);nextRound(g);}
 }else{
 if(a.actor!==actor(g))throw Error('지금 행동할 플레이어가 아닙니다.');
 if(a.type==='roll'&&g.phase==='roll'){
  g.die=1+Math.floor(random(g)*6);const from=p.pos;p.pos=(p.pos+g.die)%BOARD.length;p.visits.push(p.pos);p.usedHelp=false;
  let type=BOARD[p.pos];if(type==='start')type='chance';if(g.round===1||g.round===2)type='learn';if(g.round===3)type='career';
  let income=g.round<3?60:p.salary; if(p.health===0)income=Math.floor(income/2);let tax=Math.round(income*.1*g.policies.length);p.cash+=income-tax;g.fund+=tax;
  const living=g.round<3||p.home?0:g.policies.includes('housing')?10:40;pay(p,living);
  g.event={type,variant:Math.floor(random(g)*3),from,income,tax,living};g.phase='choice';log(g,`${p.name} · 주사위 ${g.die} → ${TYPES[type][0]}. 소득 +${income}, 세금 −${tax}, 생활비 −${living}.`);
 }else if(a.type==='choose'&&g.phase==='choice'){
  const op=options(g).find(o=>o.id===a.value);if(!op||op.disabled)throw Error('선택 조건이 충족되지 않았습니다.');const t=g.event.type;
  if(a.value==='ask'||a.value==='business'){g.phase='target';g.pending=a.value;g.revision++;return g;}
  p.choices.push({round:g.round,title:op.title});log(g,`${p.name}: ${op.title}`);
  if(t==='learn'){if(a.value==='study'){pay(p,g.policies.includes('education')?30:100);p.skill+=2;}if(a.value==='work'){gain(p,100);p.skill++;health(p,-1);}if(a.value==='library'){p.skill++;addCard(p,'멘토');}}
  else if(t==='career'){const jobs={professional:['전문 직업인',240],company:['기업 구성원',190],craft:['현장 전문가',150],train:['일하는 학습자',100]};[p.job,p.salary]=jobs[a.value];if(a.value==='professional')pay(p,150);if(a.value==='craft')p.skill++;if(a.value==='train')p.skill+=2;}
  else if(t==='network'){if(a.value==='mentor'){p.skill++;addCard(p,'멘토');}if(a.value==='friend'){health(p,1);p.trust++;addCard(p,'친구');}if(a.value==='alumni'){pay(p,80);p.trust+=2;addCard(p,'동문');}}
  else if(t==='care'){if(a.value==='pay')pay(p,careCost(g,p));if(a.value==='self'){health(p,-2);p.trust++;}if(a.value==='fund')g.fund-=80;}
  else if(t==='market'){if(a.value==='invest'){pay(p,200);p.stocks+=200;}if(a.value==='home'){pay(p,900);p.home=900;}if(a.value==='sell'){gain(p,p.stocks);p.stocks=0;}if(a.value==='save')gain(p,20);}
  else if(t==='community'){if(a.value==='donate'){pay(p,60);g.fund+=60;p.trust++;p.help++;}if(a.value==='volunteer'){health(p,-1);g.fund+=30;p.help++;}}
  else if(t==='rest'){if(a.value==='rest')health(p,g.policies.includes('care')?3:2);if(a.value==='hobby'){pay(p,40);health(p,1);p.trust++;}if(a.value==='side'){gain(p,110);health(p,-1);}}
  else{if(a.value==='repair'){pay(p,70);p.skill++;}if(a.value==='delay')health(p,-1);if(a.value==='scholar')gain(p,180);if(a.value==='search'){p.skill++;addCard(p,'멘토');}if(a.value==='train'){pay(p,g.policies.includes('education')?50:120);p.skill+=2;p.salary+=30;}if(a.value==='overtime'){gain(p,140);health(p,-1);}if(a.value==='recover')health(p,1);}
  endTurn(g);
 }else if(a.type==='target'&&g.phase==='target'){
  if(a.value==='cancel'){g.phase='choice';}else{const q=g.players[a.value],cost=g.pending==='ask'?60:100;if(!q||q.id===p.id||q.cash<cost)throw Error('선택할 수 없는 상대입니다.');g.offer={from:p.id,to:q.id,kind:g.pending};g.phase='offer';log(g,`${p.name} → ${q.name}: ${g.pending==='ask'?'돌봄 도움 요청':'공동사업 제안'}`);}
 }else if(a.type==='respond'&&g.phase==='offer'){
  if(!['yes','no'].includes(a.value))throw Error('응답을 확인하세요.');const q=g.players[g.offer.to],kind=g.offer.kind;p.usedHelp=true;
  if(a.value==='yes'){const cost=kind==='ask'?60:100;if(q.cash<cost||kind==='business'&&p.cash<100)throw Error('현금이 부족합니다.');if(kind==='ask'){pay(q,60);q.help++;p.trust++;q.trust++;log(g,`${q.name}이 ${p.name}의 돌봄을 도왔어요. 비용 60, 두 사람 신뢰 +1.`);}else{const profit=random(g)<.35?-50:90;gain(p,profit);gain(q,profit);p.trust++;q.trust++;log(g,`공동사업 결과: ${p.name}·${q.name} 각각 ${profit>0?'+':''}${profit}. 신뢰 +1.`);}p.choices.push({round:g.round,title:kind==='ask'?'도움을 받아 돌봄 해결':'공동사업 성사'});endTurn(g);}
  else{log(g,`${q.name}은 이번 제안을 정중히 거절했어요.`);g.offer=null;g.phase='choice';}
 }else if(a.type==='next'&&g.phase==='result'){if(g.turn<g.players.length-1){g.turn++;g.phase='roll';g.event=null;g.die=null;}else finishRound(g);}
 else throw Error('현재 단계에서 할 수 없는 행동입니다.');
 }
 g.revision++;return g;
}
function addCard(p,c){if(!p.cards.includes(c))p.cards.push(c);}
export function aiAction(g,id=actor(g)){
 const base={actor:id,expected:g.revision};if(g.phase==='roll')return{...base,type:'roll'};if(g.phase==='result')return{...base,type:'next'};
 if(g.phase==='vote')return{...base,type:'vote',value:Object.keys(POLICIES).find(k=>!g.policies.includes(k))||'none'};
 if(g.phase==='offer')return{...base,type:'respond',value:g.players[id].cash>180?'yes':'no'};
 if(g.phase==='target'){const q=g.players.find(q=>q.id!==g.turn&&q.cash>=(g.pending==='ask'?60:100));return{...base,type:'target',value:q?.id??'cancel'};}
 const valid=options(g).filter(o=>!o.disabled),p=g.players[g.turn];let choice;
 if(p.health<3)choice=valid.find(o=>['rest','friend','recover'].includes(o.id));
 if(!choice&&g.event.type==='career')choice=valid[0];
 if(!choice)choice=valid[(g.round+id)%valid.length];return{...base,type:'choose',value:choice.id};
}
