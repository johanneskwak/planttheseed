
const COLORS=['#dc795a','#579287','#d4aa4a','#7894bf','#aa7ca2','#8d9f5c'];
const ICONS=['🦊','🐳','🐥','🐻','🐰','🐢'];
const TYPES={start:['출발','⚑','#e4e8d2'],learn:['배움','📚','#e5ecdf'],chance:['인생 카드','✦','#f6e3d4'],network:['만남','🤝','#e6e0ed'],market:['투자','▥','#dce9e8'],care:['돌봄','♥','#f3dfdc'],community:['우리 사회','⚖','#e7e5ce'],rest:['쉼표','☘','#e0e9d8'],career:['커리어','💼','#dee5f0']};
const BOARD=['start','learn','chance','network','market','care','rest','community','career','chance','learn','network','market','care','community','rest','chance','career','market','network','care','learn','chance','community','rest','market','network','chance'];
const BACKGROUNDS=[{name:'스스로 길을 찾는 집',cash:300,skill:1,trust:1,card:'친구',desc:'시작 자금은 적지만, 서로 챙기는 친구가 있어요.'},{name:'차근차근 준비하는 집',cash:650,skill:2,trust:1,card:'멘토',desc:'배움을 도와줄 멘토와 함께 출발해요.'},{name:'선택의 여유가 있는 집',cash:1100,skill:2,trust:2,card:'동문',desc:'넉넉한 자금과 새로운 기회를 알려줄 선배가 있어요.'}];
const POLICIES={
 care:{name:'공공 돌봄',icon:'♥',desc:'돌봄 비용 100 → 30, 휴식 효과 +1. 이후 소득의 10%를 공동기금에 납부.',tax:'이후 소득에서 10%를 공동기금으로 냅니다.'},
 education:{name:'교육 사다리',icon:'📚',desc:'배움 비용 100 → 30, 전환 훈련 120 → 50. 이후 소득의 10%를 납부.',tax:'이후 소득에서 10%를 공동기금으로 냅니다.'},
 housing:{name:'주거 지원',icon:'⌂',desc:'무주택 팀의 생활비 40 → 10. 이후 소득의 10%를 납부.',tax:'이후 소득에서 10%를 공동기금으로 냅니다.'},
 progressive:{name:'자산별 차등 부담',icon:'⇅',desc:'라운드 시작 자산이 중앙값보다 높으면 소득의 15%, 나머지는 5%를 추가 납부. 같은 자산에는 같은 비율을 적용합니다.',tax:'라운드 시작 자산 기준으로 15% 또는 5%를 추가 납부합니다.'}
};
const GOALS=[{name:'나만의 기반',desc:'순자산을 출발보다 600 이상 늘리기',check:p=>wealth(p)>=p.born+600},{name:'건강한 삶',desc:'건강 5 이상 · 순자산이 출발 이상',check:p=>p.health>=5&&wealth(p)>=p.born},{name:'함께 사는 삶',desc:'도움·기부 3회 이상 실천하기',check:p=>p.help>=3},{name:'배움의 여정',desc:'역량 7 이상 · 만남 카드 2장 이상',check:p=>p.skill>=7&&p.cards.length>=2}];
const outstanding=p=>(p.loans||[]).reduce((s,l)=>s+Math.max(0,l.due-l.paid),0);
const receivable=p=>(p.receivables||[]).reduce((sum,l)=>sum+Math.max(0,l.due-l.paid),0);
const wealth=p=>Math.round(p.cash+p.stocks+p.home+receivable(p)-p.debt-outstanding(p));
const age=g=>g.round===1?8:g.round===2?15:22+(g.round-3)*5;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const CRISES=[
 {id:'slump',name:'경기 침체',kind:'flat',note:'일자리가 줄고 물건이 안 팔려요. 모두 같은 금액을 부담합니다.'},
 {id:'epidemic',name:'감염병 유행',kind:'flat',hp:-1,note:'모두 같은 금액을 부담하고, 건강이 1 줄어듭니다.'},
 {id:'inflation',name:'물가 급등',kind:'rate',note:'가진 만큼 부담합니다. 순자산의 15%가 줄어듭니다.'},
 {id:'shock',name:'금융 불안',kind:'rate',note:'가진 만큼 부담합니다. 순자산의 15%가 줄어듭니다.'}
];
const AWARDS=[
 {key:'help',name:'제일 많이 나눈 팀',line:p=>`기부·자원봉사·돌봄 도움 ${p.help}회`,score:p=>p.help},
 {key:'shared',name:'길을 알려준 팀',line:p=>`아는 제도를 ${p.shared}번 알려줬어요`,score:p=>p.shared},
 {key:'advised',name:'문을 열어준 팀',line:p=>`조언 토큰으로 남의 선택지를 ${p.advised}번 열었어요`,score:p=>p.advised},
 {key:'health',name:'끝까지 건강한 팀',line:p=>`가장 낮았을 때도 건강 ${p.minHealth}`,score:p=>p.minHealth},
 {key:'partners',name:'가장 넓게 거래한 팀',line:p=>`${p.partners.length}개 팀과 주고받았어요`,score:p=>p.partners.length},
 {key:'declined',name:'그래도 계속 말 건 팀',line:p=>`제안이 ${p.declined}번 거절당했는데도 다시 제안했어요`,score:p=>p.declined},
 {key:'forecast',name:'시장을 읽은 팀',line:p=>`시장 예측 ${p.forecastRight}번 적중`,score:p=>p.forecastRight},
 {key:'guess',name:'사람을 읽은 팀',line:p=>`다른 팀의 선택을 ${p.guessRight}번 맞혔어요`,score:p=>p.guessRight}
];
function awards(g){
 const out={};g.players.forEach(p=>out[p.id]=[]);
 for(const a of AWARDS){
  const best=Math.max(...g.players.map(a.score));if(best<=0)continue;
  g.players.filter(p=>a.score(p)===best).forEach(p=>out[p.id].push({name:a.name,line:a.line(p)}));
 }
 g.players.filter(p=>!p.everDebt).forEach(p=>out[p.id].push({name:'한 번도 빚지지 않은 팀',line:'생활비와 선택을 가진 돈 안에서 해결했어요'}));
 const kept={};(g.promises||[]).forEach(pr=>{if(pr.kept)kept[pr.from]=(kept[pr.from]||0)+1;});
 const bestKept=Math.max(0,...Object.values(kept));
 if(bestKept>0)Object.entries(kept).filter(([,v])=>v===bestKept).forEach(([k])=>out[k].push({name:'약속을 지킨 팀',line:`강제력 없는 약속 ${bestKept}개를 지켰어요`}));
 return out;
}
function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function log(g,text){g.log.unshift({round:g.round,text});g.log=g.log.slice(0,400);}
function pay(p,cost){const paid=Math.min(p.cash,cost);p.cash-=paid;const short=cost-paid;if(short>0){p.debt+=short;p.everDebt=true;}}
function gain(p,n){p.cash+=n;}
function health(p,n){p.health=clamp(p.health+n,0,6);p.minHealth=Math.min(p.minHealth??p.health,p.health);}
function newGame(names,{seed=Date.now()>>>0,rounds=8,equal=false,ai=[],backgrounds=null}={}){
 let g={version:3,seed,initialSeed:seed,round:1,maxRounds:rounds,turn:0,phase:'roll',players:[],fund:0,policies:[],log:[],history:[],taxRates:[],comparison:null,die:null,event:null,offer:null,votes:{},forecasts:{},guesses:{},promises:[],crisis:null,pending:null,loanTarget:null,market:'출발선',rate:0,revision:0};
 if(names.length<2||names.length>6)throw Error('2~6팀으로 시작하세요.');
 names.forEach((name,i)=>{const rnd=equal?1:Math.floor(random(g)*3);const b=backgrounds?((backgrounds[i]%3)+3)%3:equal?1:rnd,bg=BACKGROUNDS[b];g.players.push({id:i,name:String(name).trim().slice(0,12)||`${i+1}팀`,ai:ai.includes(i),background:b,born:bg.cash,cash:bg.cash,debt:0,stocks:0,home:0,skill:bg.skill,trust:bg.trust,health:5,minHealth:5,cards:[bg.card],salary:0,job:'학생',pos:0,goal:i%4,help:0,visits:[],choices:[],usedHelp:false,tokens:2,loans:[],receivables:[],insurance:0,insuredSavings:0,defaultLoss:0,promiseRound:-1,shared:0,sharedRound:-1,advised:0,declined:0,partners:[],everDebt:false,guessRight:0,forecastRight:0});});
 g.history.push({round:0,assets:g.players.map(wealth)});snapshotTax(g);
 log(g,'서로 다른 출발선. 주사위를 굴려 나의 인생을 시작하세요.');return g;
}
function actor(g){if(g.phase==='offer')return g.offer.to;if(g.phase==='crisis')return 0;if(g.phase==='vote')return g.players.find(p=>g.votes[p.id]===undefined)?.id;if(g.phase==='forecast')return g.players.find(p=>g.forecasts[p.id]===undefined)?.id;return g.turn;}
function hasInfo(p){return p.cards.some(c=>c==='멘토'||c==='동문');}
function partner(p,q){if(!p.partners)p.partners=[];if(!q.partners)q.partners=[];if(!p.partners.includes(q.id))p.partners.push(q.id);if(!q.partners.includes(p.id))q.partners.push(p.id);}
function repayLoans(g,p){let budget=Math.min(50,p.cash);for(const l of(p.loans||[])){const amount=Math.min(budget,l.due-l.paid);if(amount<=0)continue;p.cash-=amount;budget-=amount;l.paid+=amount;gain(g.players[l.from],amount);syncClaim(g,p,l);log(g,`${p.name} → ${g.players[l.from].name} 차용금 ${amount} 상환 · 남은 금액 ${l.due-l.paid}.`);}}
function syncClaim(g,p,l){const q=g.players[l.from];q.receivables??=[];let c=q.receivables.find(c=>c.id===l.id);if(!c){c={id:l.id,to:p.id};q.receivables.push(c);}c.due=l.due;c.paid=l.paid;}
function settleFinalLoans(g){
 for(const p of g.players)for(const l of p.loans){let due=l.due-l.paid;if(due<=0)continue;let amount=Math.min(due,Math.max(0,p.cash+p.stocks+p.home-p.debt));const recovered=amount;for(const k of ['cash','stocks','home']){const use=Math.min(p[k],amount);p[k]-=use;amount-=use;}l.paid+=recovered;gain(g.players[l.from],recovered);let loss=l.due-l.paid;if(loss){g.players[l.from].defaultLoss+=loss;l.defaulted=loss;l.due=l.paid;}syncClaim(g,p,l);log(g,`최종 차용 정산 · ${p.name} → ${g.players[l.from].name} ${recovered} 회수${loss?`, 미회수 ${loss} 상각`:''}.`);}
 if(g.history.length)g.history[g.history.length-1].assets=g.players.map(wealth);
}
function fate(g,kind,round,seat){let h=g.initialSeed>>>0;for(const c of `${kind}:${round}:${seat}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
function snapshotTax(g){const sorted=g.players.map(wealth).sort((a,b)=>a-b),n=sorted.length;const mid=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;g.taxRates=g.players.map(p=>wealth(p)>mid?.15:.05);}
function contextOf(g){return {round:g.round,turn:g.turn,phase:g.phase,eventId:g.event?.id||`${g.round}:${g.turn}`};}
function upgradeGame(g){
 if(g.version===3)return g;g=structuredClone(g);g.version=3;g.promises??=[];g.forecasts??={};g.guesses??={};g.taxRates??=[];
 g.players.forEach(p=>{Object.assign(p,{receivables:[],insurance:p.insurance||0,insuredSavings:p.insuredSavings||0,defaultLoss:p.defaultLoss||0,promiseRound:p.promiseRound??-1,minHealth:p.minHealth??p.health,tokens:p.tokens??2,loans:p.loans||[],shared:p.shared||0,sharedRound:p.sharedRound??-1,advised:p.advised||0,declined:p.declined||0,partners:p.partners||[],everDebt:p.everDebt||p.debt>0,guessRight:p.guessRight||0,forecastRight:p.forecastRight||0});});
 g.players.forEach(p=>p.loans.forEach((l,i)=>{l.id??=`legacy-${p.id}-${i}`;p.everDebt=true;syncClaim(g,p,l);}));
 if(!g.history.some(h=>h.round===0))g.history.unshift({round:0,assets:g.players.map(p=>p.born)});snapshotTax(g);if(g.event)g.event.id=`${g.round}:${g.turn}`;return g;
}
function options(g){
 const p=g.players[g.turn],e=g.event;if(!e)return[];
 const unl=e.unlocked||[],shr=e.shared||[],others=g.players.filter(q=>q.id!==p.id);
 const o=(id,title,desc,cash=false,req=false,info=false)=>{const r=!!req&&!unl.includes(id);return{id,title,desc,cash:!!cash,req:r,info:!!info,known:!info||hasInfo(p)||shr.includes(id),disabled:!!cash||r,advisable:r&&!cash};};
 const ed=g.policies.includes('education'),ca=g.policies.includes('care');
 switch(e.type){
 case 'learn':return[
  o('study','배움에 투자하기',`현금 −${ed?30:100} · 역량 +2`,p.cash<(ed?30:100)),
  o('work','생활비부터 마련하기','현금 +100 · 역량 +1 · 건강 −1'),
  o('library','도서관에서 길 찾기','역량 +1 · 멘토 카드 획득'),
  o('ged','평생교육 과정 신청하기','현금 −20 · 역량 +2 · 있는 줄 아는 사람만 신청해요',p.cash<20,false,true)];
 case 'career':return[
  o('professional','전문 역량으로 도전','역량 6 필요 · 매 턴 소득 240 · 준비비 150',p.cash<150,p.skill<6),
  o('company','추천받은 일자리','역량 3 · 신뢰 2 필요 · 매 턴 소득 190',false,p.skill<3||p.trust<2),
  o('craft','현장 경험으로 시작','매 턴 소득 150 · 역량 +1'),
  o('train','일하며 다시 준비','매 턴 소득 100 · 역량 +2'),
  o('public','공공기관 채용 공고 확인','역량 3 필요 · 매 턴 소득 200 · 준비비 없음 · 공고를 본 사람만 지원해요',false,p.skill<3,true)];
 case 'network':return[
  o('mentor','멘토에게 질문하기','역량 +1 · 멘토 카드'),
  o('friend','친구와 시간을 보내기','건강 +1 · 신뢰 +1 · 친구 카드'),
  o('alumni','새 모임에 참여하기','현금 −80 · 신뢰 +2 · 동문 카드',p.cash<80),
  o('program','청년 지원 프로그램 신청','현금 +120 · 신뢰 +1 · 공고를 아는 사람만 신청해요',false,false,true)];
 case 'care':return[
  o('pay','돌봄 서비스를 이용하기',`현금 −${careCost(g,p)} · 건강 유지`,p.cash<careCost(g,p)),
  o('self','직접 돌보기','현금 지출 없음 · 건강 −2 · 신뢰 +1'),
  o('fund','공동기금 지원받기','기금 −80 · 현금 부담 없음',g.fund<80),
  o('ask','다른 팀에게 부탁','상대가 수락하면 상대 현금 −60 · 두 사람 신뢰 +1',p.usedHelp||others.every(q=>q.cash<60)),
  o('voucher','돌봄 바우처 신청하기','비용 없음 · 건강 유지 · 역량 +1 · 제도를 아는 사람만 신청해요',false,false,true)];
 case 'market':{
  const canLoan=!p.usedHelp&&outstanding(p)===0&&others.some(q=>q.cash>=200);
  const list=[
   o('invest','주식 꾸러미 매수','현금 −200 → 투자자산 +200 · 매 라운드 공동 시장 변동',p.cash<200),
   o('home','내 집 마련','현금 −900 → 주택 +900 · 이후 생활비 면제',p.cash<900||p.home>0),
   o('sell','투자금 회수','투자자산을 모두 현금으로 바꾸기',p.stocks<=0),
   o('insure','다음 위기에 대비하기','보험료 −50 · 다음 공동 위기 손실 최대 150 보장 · 1회성',p.cash<50||p.insurance>0),
   o('save','예금으로 기다리기','현금 +20 · 투자 위험을 지지 않아요'),
   o('saving','청년 자산형성 적금 신청','현금 −100 → 투자자산 +160 · 조건을 아는 사람만 신청해요',p.cash<100,false,true)];
  if(p.debt>0)list.push(o('repay','빚 갚기',`현금으로 대출 상환 · 한 번에 최대 300 · 현재 잔액 ${p.debt}`,p.cash<1));
  if(canLoan)list.push(o('loan','다른 팀에게 급전 요청','200을 빌리고 이자를 붙여 갚기 · 상대가 수락해야 성사'));
  return list;}
 case 'community':return[
  o('donate','공동기금에 출자하기','현금 −60 · 기금 +60 · 신뢰 +1 · 도움 실천 +1',p.cash<60),
  o('business','함께 작은 사업 시작','서로 100 출자 · 각자 50 회수(−50) 또는 190 회수(+90) · 수락 필요',p.cash<100||p.usedHelp||others.every(q=>q.cash<100)),
  o('volunteer','시간으로 함께하기','건강 −1 · 기금 +30 · 도움 실천 +1',p.health<1),
  o('grant','주민참여예산 제안하기','비용 없음 · 기금 +80 · 신뢰 +1 · 도움 실천 +1 · 절차를 아는 사람만 써요',false,false,true)];
 case 'rest':return[
  o('rest','푹 쉬어가기',`건강 +${ca?3:2}`),
  o('hobby','취미 모임에 가기','현금 −40 · 건강 +1 · 신뢰 +1',p.cash<40),
  o('side','이번엔 부업하기','현금 +110 · 건강 −1'),
  o('clinic','무료 건강검진 이용하기','비용 없음 · 건강 +2 · 대상이라는 걸 아는 사람만 써요',false,false,true)];
 default:
  if(e.variant===0)return[
   o('repair','고장 난 생활도구 수리','현금 −70 · 역량 +1',p.cash<70),
   o('borrow','친구에게 빌려 쓰기','친구 카드로 비용 없이 해결',false,!p.cards.includes('친구')),
   o('delay','수리를 미루기','건강 −1 · 지출 없음'),
   o('tool','공구 대여소 이용하기','비용 없음 · 역량 +1 · 그런 곳이 있다는 걸 알아야 해요',false,false,true)];
  if(e.variant===1)return[
   o('scholar','새로운 기회에 지원하기','멘토·동문 카드 또는 역량 4 필요 · 현금 +180',false,!p.cards.some(c=>c==='멘토'||c==='동문')&&p.skill<4),
   o('search','정보를 더 찾아보기','역량 +1 · 멘토 카드'),
   o('counsel','지원 제도 상담 창구 가기','현금 +100 · 역량 +1 · 창구가 있다는 걸 알아야 해요',false,false,true)];
  return[
   o('train2','전환 교육에 참여하기',`현금 −${ed?50:120} · 역량 +2 · 소득 +30`,p.cash<(ed?50:120)),
   o('overtime','추가 일을 맡기','현금 +140 · 건강 −1'),
   o('recover','나를 먼저 돌보기','건강 +1'),
   o('retrain','국비 지원 훈련 신청','비용 없음 · 역량 +2 · 소득 +20 · 공고를 본 사람만 신청해요',false,false,true)];
 }
}
function careCost(g,p){return g.policies.includes('care')?30:p.cards.includes('친구')?60:100;}
const TITLES={learn:['배움의 갈림길','배우고 싶은 것이 생겼어요. 지금의 여유와 미래의 기회 사이에서 선택하세요.'],career:['나의 첫 명함, 다음 가능성','지금까지 쌓은 역량과 관계가 선택할 수 있는 일자리에 영향을 줍니다.'],network:['우연한 만남이 여는 문','돈으로만 얻을 수 없는 기회. 어떤 관계를 쌓고 싶나요?'],care:['누군가를 돌봐야 할 때','같은 사건도 이용할 수 있는 도움에 따라 부담이 달라져요.'],market:['오늘의 돈, 내일의 선택','자산을 불릴 수도, 잃을 수도 있어요. 시장 변화는 모두에게 함께 적용됩니다.'],community:['우리라서 가능한 일','내 자원을 함께 쓰면, 다음 위기에서 누군가의 선택지가 생깁니다.'],rest:['잠깐, 쉬어가도 괜찮아','건강이 0이면 다음 소득이 절반이 됩니다. 내 삶의 속도를 정해보세요.']};
function eventText(e){return TITLES[e.type]||[['뜻밖의 수리비','생활에 필요한 도구가 고장 났어요. 돈, 관계, 시간을 어떻게 쓸까요?'],['나에게도 이런 기회가?','장학·프로젝트 지원 공고를 발견했어요. 정보를 알아보는 경험도 자산이 됩니다.'],['세상이 바뀌고 있어요','새로운 기술이 등장했어요. 배우거나, 더 일하거나, 숨을 고를 수 있어요.']][e.variant];}
function endTurn(g){g.phase='result';g.offer=null;g.pending=null;g.loanTarget=null;}
function finishRound(g){g.phase='forecast';g.forecasts={};}
function applyCrisis(g){
 const c=CRISES[Math.floor(fate(g,'crisis',g.round,0)*CRISES.length)],amount=60+25*g.round;
 g.crisis={id:c.id,name:c.name,kind:c.kind,note:c.note,amount,round:g.round,hits:[]};
 for(const p of g.players){
  const before=wealth(p),gross=c.kind==='flat'?amount:Math.max(0,Math.round(before*.15));
  const policyRelief=c.id==='epidemic'&&g.policies.includes('care')?Math.min(gross,60):0;
  const covered=Math.min(p.insurance||0,Math.max(0,gross-policyRelief)),loss=gross-policyRelief-covered;
  if(p.insurance){p.insurance=0;p.insuredSavings+=covered;}pay(p,loss);
  if(c.hp&&!g.policies.includes('care'))health(p,c.hp);
  g.crisis.hits.push({id:p.id,name:p.name,gross,covered,policyRelief,loss,share:Math.round(loss/Math.max(1,before)*100)});
 }
 log(g,`공동 위기 · ${c.name} (${c.kind==='flat'?`모두 ${amount} 부담`:'순자산의 15% 부담'}) · ${g.crisis.hits.map(h=>`${h.name} −${h.loss}`).join(' · ')}`);
}
function advanceRound(g){
 if(g.round>=g.maxRounds){settleFinalLoans(g);g.phase='done';return;}
 if(g.round%4===0){g.phase='vote';g.votes={};return;}
 nextRound(g);
}
function resolveRound(g){
 const rate=[-.18,-.08,.05,.12,.22][Math.floor(fate(g,'market',g.round,0)*5)];g.rate=rate;g.market=`이번 시장 ${rate>=0?'+':''}${Math.round(rate*100)}%`;
 const up=rate>=0,hits=[];
 for(const p of g.players){const f=g.forecasts[p.id];if(f&&(f==='up')===up){gain(p,25);p.forecastRight++;hits.push(p.name);}}
 for(const p of g.players){p.stocks=Math.round(p.stocks*(1+rate));if(p.home)p.home=Math.round(p.home*(1+rate/3));if(p.debt){p.debt+=Math.ceil(p.debt*.03);}}
 log(g,`${g.market} · 주식에 공통 적용, 주택에는 변동폭의 1/3 적용. 대출 이자 3%.`);
 log(g,hits.length?`시장 예측 적중 · ${hits.join(', ')} (각 +25)`:'이번 시장을 맞힌 팀은 없었어요.');
 const crisisTime=g.round%3===0&&g.round<g.maxRounds;
 if(crisisTime)applyCrisis(g);else g.crisis=null;
 g.history.push({round:g.round,assets:g.players.map(wealth)});
 if(crisisTime){g.phase='crisis';return;}
 advanceRound(g);
}
function nextRound(g){g.round++;g.turn=0;g.phase='roll';g.event=null;g.die=null;snapshotTax(g);}
function handleFree(g,a){
 const me=g.players[a.actor];if(!me)throw Error('플레이어를 확인해주세요.');
 if(a.type==='promise'){
  const to=g.players[a.value&&a.value.to],text=String((a.value&&a.value.text)||'').trim().slice(0,60);
  if(!to||to.id===me.id||!text)throw Error('약속할 상대와 내용을 확인해주세요.');
  if(me.promiseRound===g.round)throw Error('약속은 라운드마다 한 번만 남길 수 있어요.');
  if(g.promises.filter(x=>x.from===me.id&&!x.kept).length>=3)throw Error('아직 지키지 못한 약속이 3개 있어요.');
  me.promiseRound=g.round;g.promises.push({id:g.promises.length,from:me.id,to:to.id,text,round:g.round,kept:false});
  log(g,`약속 기록 · ${me.name} → ${to.name}: ${text}`);return;
 }
 if(a.type==='keep'){
  const pr=g.promises[a.value];if(!pr||pr.kept)throw Error('확인할 약속이 없습니다.');
  if(pr.to!==me.id)throw Error('약속을 받은 팀만 확인할 수 있어요.');
  pr.kept=true;pr.keptRound=g.round;g.players[pr.from].trust++;
  log(g,`약속 이행 · ${g.players[pr.from].name}이 ${me.name}에게 한 약속을 지켰어요. 신뢰 +1.`);return;
 }
 if(g.phase!=='choice')throw Error('지금은 다른 팀을 도울 수 없어요.');
 if(me.id===g.turn)throw Error('내 차례에는 쓸 수 없어요.');
 const op=options(g).find(o=>o.id===a.value);
 if(a.type==='advise'){
  if(!op||!op.advisable)throw Error('조언으로 열 수 있는 선택지가 아닙니다.');
  if(me.tokens<1)throw Error('남은 조언 토큰이 없어요.');
  me.tokens--;me.advised++;me.trust++;
  if(!g.event.unlocked)g.event.unlocked=[];g.event.unlocked.push(a.value);
  if(me.ai)g.event.aiAssisted=true;
  log(g,`${me.name}이 조언 토큰을 썼어요. ${g.players[g.turn].name}의 "${op.title}"이 열렸습니다. 신뢰 +1.`);return;
 }
 if(a.type==='share'){
  if(!op||!op.info||op.known)throw Error('알려줄 정보가 아닙니다.');
  if(!hasInfo(me))throw Error('멘토·동문 카드가 있어야 알려줄 수 있어요.');
  if(me.sharedRound===g.round)throw Error('이번 라운드에는 이미 정보를 나눴어요.');
  me.sharedRound=g.round;me.shared++;me.trust++;
  if(!g.event.shared)g.event.shared=[];g.event.shared.push(a.value);
  if(me.ai)g.event.aiAssisted=true;
  log(g,`${me.name}이 ${g.players[g.turn].name}에게 "${op.title}"을 알려줬어요. 신뢰 +1.`);return;
 }
 if(a.type==='guess'){
  if(g.guesses[me.id]!==undefined)throw Error('이미 예측했어요.');
  if(!op||!op.known)throw Error('알고 있는 선택지만 예측할 수 있어요.');
  g.guesses[me.id]=a.value;return;
 }
 throw Error('알 수 없는 행동입니다.');
}
function transition(source,a){
 const g=structuredClone(source),p=g.players[g.turn];if(!a||g.phase==='done')throw Error('이미 마친 게임입니다.');
 if(!Number.isInteger(a.actor)||!g.players[a.actor])throw Error('플레이어를 확인해주세요.');
 const scoped=['advise','share','guess'].includes(a.type);
 if(scoped&&(a.round!==g.round||a.turn!==g.turn||a.eventId!==(g.event?.id||`${g.round}:${g.turn}`)))throw Error('이미 지나간 차례에 대한 행동입니다.');
 const free=['promise','keep','advise','share','guess'].includes(a.type);
 const loose=(a.type==='vote'&&g.phase==='vote')||(a.type==='forecast'&&g.phase==='forecast');
 if(a.expected!==undefined&&a.expected!==g.revision&&!free&&!(loose&&a.round===g.round))throw Error('화면이 갱신되었습니다. 다시 선택해주세요.');
 if(free){handleFree(g,a);g.revision++;return g;}
 if(g.phase==='vote'){
  if(a.type!=='vote'||!g.players[a.actor]||g.votes[a.actor]!==undefined||!['care','education','housing','progressive','none'].includes(a.value))throw Error('투표를 확인해주세요.');
  if(g.policies.includes(a.value))throw Error('이미 시행 중인 정책입니다.');g.votes[a.actor]=a.value;
  if(Object.keys(g.votes).length===g.players.length){
   const tally={};Object.values(g.votes).forEach(v=>tally[v]=(tally[v]||0)+1);
   const entries=Object.entries(tally).sort((x,y)=>y[1]-x[1]);
   const winner=entries[0][1]===(entries[1]&&entries[1][1])?'none':entries[0][0];
   if(winner!=='none')g.policies.push(winner);
   log(g,winner==='none'?'사회회의: 현행 유지 (동률이면 현행 유지).':`사회회의: ${POLICIES[winner].name} 채택. ${POLICIES[winner].tax}`);
   nextRound(g);
  }
 }else if(g.phase==='forecast'){
  if(a.type!=='forecast'||!g.players[a.actor]||g.forecasts[a.actor]!==undefined||!['up','down'].includes(a.value))throw Error('예측을 확인해주세요.');
  g.forecasts[a.actor]=a.value;
  if(Object.keys(g.forecasts).length===g.players.length)resolveRound(g);
 }else if(g.phase==='crisis'){
  if(a.type!=='ack'||a.actor!==0)throw Error('위기 카드를 확인해주세요.');
  advanceRound(g);
 }else{
 if(a.actor!==actor(g))throw Error('지금 행동할 플레이어가 아닙니다.');
 if(a.type==='roll'&&g.phase==='roll'){
  g.die=1+Math.floor(fate(g,'dice',g.round,g.turn)*6);const from=p.pos;p.pos=(p.pos+g.die)%BOARD.length;p.visits.push(p.pos);p.usedHelp=false;g.guesses={};
  let type=BOARD[p.pos];if(type==='start')type='chance';if(g.round===1||g.round===2)type='learn';if(g.round===3)type='career';
  let income=g.round<3?60:p.salary;if(p.health===0)income=Math.floor(income/2);
  const tax=Math.round(income*.1*g.policies.filter(k=>k!=='progressive').length)+progressiveTax(g,p,income);
  p.cash+=income-tax;g.fund+=tax;
  const living=g.round<3||p.home?0:g.policies.includes('housing')?10:40;pay(p,living);
  repayLoans(g,p);
  g.event={type,variant:Math.floor(fate(g,'event',g.round,g.turn)*3),id:`${g.round}:${g.turn}`,from,income,tax,living,unlocked:[],shared:[]};g.phase='choice';
  log(g,`${p.name} · 주사위 ${g.die} → ${TYPES[type][0]}. 소득 +${income}, 세금 −${tax}, 생활비 −${living}.`);
 }else if(a.type==='choose'&&g.phase==='choice'){
  const op=options(g).find(o=>o.id===a.value);if(!op||op.disabled||!op.known)throw Error('선택 조건이 충족되지 않았습니다.');const t=g.event.type;

  if(Object.keys(g.guesses).length){
   const right=Object.keys(g.guesses).filter(k=>g.guesses[k]===a.value).map(k=>{g.players[k].guessRight++;return g.players[k].name;});
   log(g,right.length?`선택 예측 적중 · ${right.join(', ')}`:'이번 선택을 맞힌 팀은 없었어요.');
  }
  g.guesses={};
  if(['ask','business','loan'].includes(a.value)){g.phase='target';g.pending=a.value;g.revision++;return g;}
  p.choices.push({round:g.round,title:op.title});log(g,`${p.name}: ${op.title}`);
  if(t==='learn'){
   if(a.value==='study'){pay(p,g.policies.includes('education')?30:100);p.skill+=2;}
   if(a.value==='work'){gain(p,100);p.skill++;health(p,-1);}
   if(a.value==='library'){p.skill++;addCard(p,'멘토');}
   if(a.value==='ged'){pay(p,20);p.skill+=2;}
  }else if(t==='career'){
   const jobs={professional:['전문 직업인',240],company:['기업 구성원',190],craft:['현장 전문가',150],train:['일하는 학습자',100],public:['공공기관 구성원',200]};
   p.job=jobs[a.value][0];p.salary=jobs[a.value][1];
   if(a.value==='professional')pay(p,150);
   if(a.value==='craft')p.skill++;
   if(a.value==='train')p.skill+=2;
  }else if(t==='network'){
   if(a.value==='mentor'){p.skill++;addCard(p,'멘토');}
   if(a.value==='friend'){health(p,1);p.trust++;addCard(p,'친구');}
   if(a.value==='alumni'){pay(p,80);p.trust+=2;addCard(p,'동문');}
   if(a.value==='program'){gain(p,120);p.trust++;}
  }else if(t==='care'){
   if(a.value==='pay')pay(p,careCost(g,p));
   if(a.value==='self'){health(p,-2);p.trust++;}
   if(a.value==='fund')g.fund-=80;
   if(a.value==='voucher')p.skill++;
  }else if(t==='market'){
   if(a.value==='invest'){pay(p,200);p.stocks+=200;}
   if(a.value==='home'){pay(p,900);p.home=900;}
   if(a.value==='sell'){gain(p,p.stocks);p.stocks=0;}
   if(a.value==='insure'){pay(p,50);p.insurance=150;}
   if(a.value==='save')gain(p,20);
   if(a.value==='saving'){pay(p,100);p.stocks+=160;}
   if(a.value==='repay'){const amt=Math.min(p.cash,300,p.debt);p.cash-=amt;p.debt-=amt;log(g,`${p.name}이 대출 ${amt}을 갚았어요. 남은 잔액 ${p.debt}.`);}
  }else if(t==='community'){
   if(a.value==='donate'){pay(p,60);g.fund+=60;p.trust++;p.help++;}
   if(a.value==='volunteer'){health(p,-1);g.fund+=30;p.help++;}
   if(a.value==='grant'){g.fund+=80;p.trust++;p.help++;}
  }else if(t==='rest'){
   if(a.value==='rest')health(p,g.policies.includes('care')?3:2);
   if(a.value==='hobby'){pay(p,40);health(p,1);p.trust++;}
   if(a.value==='side'){gain(p,110);health(p,-1);}
   if(a.value==='clinic')health(p,2);
  }else{
   if(a.value==='repair'){pay(p,70);p.skill++;}
   if(a.value==='delay')health(p,-1);
   if(a.value==='tool')p.skill++;
   if(a.value==='scholar')gain(p,180);
   if(a.value==='search'){p.skill++;addCard(p,'멘토');}
   if(a.value==='counsel'){gain(p,100);p.skill++;}
   if(a.value==='train2'){pay(p,g.policies.includes('education')?50:120);p.skill+=2;p.salary+=30;}
   if(a.value==='overtime'){gain(p,140);health(p,-1);}
   if(a.value==='recover')health(p,1);
   if(a.value==='retrain'){p.skill+=2;p.salary+=20;}
  }
  endTurn(g);
 }else if(a.type==='target'&&g.phase==='target'){
  if(a.value==='cancel'){g.phase='choice';g.pending=null;}
  else{
   const q=g.players[a.value],cost=g.pending==='ask'?60:g.pending==='business'?100:200;
   if(!q||q.id===p.id||q.cash<cost)throw Error('선택할 수 없는 상대입니다.');
   if(g.pending==='loan'){g.loanTarget=q.id;g.phase='rate';}
   else{g.offer={from:p.id,to:q.id,kind:g.pending};g.phase='offer';log(g,`${p.name} → ${q.name}: ${g.pending==='ask'?'돌봄 도움 요청':'공동사업 제안'}`);}
  }
 }else if(a.type==='rate'&&g.phase==='rate'){
  if(a.value==='cancel'){g.phase='choice';g.loanTarget=null;g.pending=null;}
  else{
   const r=+a.value;if(![10,20,30].includes(r))throw Error('이자율을 확인해주세요.');
   const q=g.players[g.loanTarget];if(!q||q.cash<200)throw Error('상대가 빌려줄 현금이 부족합니다.');
   g.offer={from:p.id,to:q.id,kind:'loan',rate:r};g.phase='offer';
   log(g,`${p.name} → ${q.name}: 200을 이자 ${r}%로 빌려달라고 요청했어요.`);
  }
 }else if(a.type==='respond'&&g.phase==='offer'){
  if(!['yes','no'].includes(a.value))throw Error('응답을 확인하세요.');
  const q=g.players[g.offer.to],kind=g.offer.kind;p.usedHelp=true;
  if(a.value==='yes'){
   if(kind==='ask'){
    if(q.cash<60)throw Error('현금이 부족합니다.');
    pay(q,60);q.help++;p.trust++;q.trust++;partner(p,q);
    log(g,`${q.name}이 ${p.name}의 돌봄을 도왔어요. 비용 60, 두 사람 신뢰 +1.`);
   }else if(kind==='business'){
    if(p.cash<100||q.cash<100)throw Error('현금이 부족합니다.');
    pay(p,100);pay(q,100);const back=fate(g,'business',g.round,g.turn)<.35?50:190;gain(p,back);gain(q,back);p.trust++;q.trust++;partner(p,q);
    log(g,`공동사업 · ${p.name}·${q.name} 각자 100 출자 → 각자 ${back} 회수 (${back>100?'이익 +90':'손실 −50'}). 신뢰 +1.`);
   }else{
    if(q.cash<200)throw Error('현금이 부족합니다.');
    pay(q,200);gain(p,200);const due=Math.round(200*(1+g.offer.rate/100));
    const loan={id:`${g.round}:${p.id}:${p.loans.length}`,from:q.id,due,paid:0,rate:g.offer.rate,round:g.round};p.loans.push(loan);p.everDebt=true;syncClaim(g,p,loan);partner(p,q);
    log(g,`${q.name}이 ${p.name}에게 200을 빌려줬어요. 이자 ${g.offer.rate}%, 갚을 금액 ${due}. 매 턴 최대 50씩 자동 상환됩니다.`);
   }
   p.choices.push({round:g.round,title:kind==='ask'?'도움을 받아 돌봄 해결':kind==='business'?'공동사업 성사':`이자 ${g.offer.rate}%로 급전 마련`});
   endTurn(g);
  }else{p.declined++;log(g,`${q.name}은 이번 제안을 정중히 거절했어요.`);g.offer=null;g.phase='choice';g.pending=null;g.loanTarget=null;}
 }else if(a.type==='next'&&g.phase==='result'){
  if(g.turn<g.players.length-1){g.turn++;g.phase='roll';g.event=null;g.die=null;}else finishRound(g);
 }
 else throw Error('현재 단계에서 할 수 없는 행동입니다.');
 }
 g.revision++;return g;
}
function progressiveTax(g,p,income){return g.policies.includes('progressive')&&income>0?Math.round(income*(g.taxRates?.[p.id]??.05)):0;}
function addCard(p,c){if(!p.cards.includes(c))p.cards.push(c);}
function aiAction(g,id=actor(g)){
 const base={actor:id,expected:g.revision,...contextOf(g)};
 if(g.phase==='roll')return{...base,type:'roll'};
 if(g.phase==='result')return{...base,type:'next'};
 if(g.phase==='crisis')return{...base,type:'ack'};
 if(g.phase==='forecast')return{...base,type:'forecast',value:(g.round+id)%2?'up':'down'};
 if(g.phase==='vote'){
  const me=g.players[id];
  const order=me.health<=3?['care','education','housing','progressive']:me.skill<5?['education','care','progressive','housing']:!me.home?['housing','progressive','education','care']:['progressive','education','housing','care'];
  return{...base,type:'vote',value:order.find(k=>!g.policies.includes(k))||'none'};
 }
 if(g.phase==='offer'){
  const me=g.players[id],k=g.offer.kind;
  const ok=k==='ask'?me.cash>=180:k==='business'?me.cash>=260:me.cash>=340&&g.offer.rate>=20;
  return{...base,type:'respond',value:ok?'yes':'no'};
 }
 if(g.phase==='rate')return{...base,type:'rate',value:20};
 if(g.phase==='target'){
  const cost=g.pending==='ask'?60:g.pending==='business'?100:200;
  const q=g.players.find(x=>x.id!==g.turn&&x.cash>=cost);
  return{...base,type:'target',value:q?q.id:'cancel'};
 }
 const valid=options(g).filter(o=>!o.disabled&&o.known),p=g.players[g.turn];
 let choice;
 if(p.health<3)choice=valid.find(o=>['rest','clinic','friend','recover'].includes(o.id));
 if(!choice&&p.debt>=400)choice=valid.find(o=>o.id==='repay');
 if(!choice&&p.cash<60&&g.event.type==='market')choice=valid.find(o=>o.id==='loan');
 if(!choice&&g.event.type==='career')choice=valid[0];
 if(!choice)choice=valid.find(o=>o.info)||valid[(g.round+id)%valid.length];
 return{...base,type:'choose',value:choice.id};
}
function aiAssist(g){
 if(g.phase!=='choice'||!g.event||g.event.aiAssisted)return null;
 const ops=options(g),helpers=g.players.filter(q=>q.ai&&q.id!==g.turn);
 const roll=Math.floor(fate(g,'assist',g.round,g.turn)*100);
 const unknown=ops.filter(o=>!o.known);
 if(unknown.length&&roll<55){
  const sharer=helpers.find(q=>hasInfo(q)&&q.sharedRound!==g.round);
  if(sharer)return{actor:sharer.id,type:'share',value:unknown[0].id,expected:g.revision,...contextOf(g)};
 }
 const adv=ops.filter(o=>o.advisable);
 if(adv.length&&roll<35){
  const giver=helpers.find(q=>q.tokens>0);
  if(giver)return{actor:giver.id,type:'advise',value:adv[0].id,expected:g.revision,...contextOf(g)};
 }
 return null;
}

export {receivable, fate, snapshotTax, upgradeGame, contextOf, COLORS, ICONS, TYPES, BOARD, BACKGROUNDS, POLICIES, GOALS, CRISES, outstanding, wealth, age, clamp, newGame, transition, actor, options, eventText, aiAction, aiAssist, hasInfo, awards};
