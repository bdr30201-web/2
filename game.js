(() => {
  'use strict';
  const KEY='regina-gdp-academy-v3';
  const CHAPTER_SIZE=CHAPTERS[0].questions.length;
  const CHAPTER_TOTAL=CHAPTERS.reduce((count,chapter)=>count+chapter.questions.length,0);
  const BOSS_TOTAL=BOSS_QUESTIONS.length;
  const TOTAL=CHAPTER_TOTAL+BOSS_TOTAL;
  const BOSS={title:'어둠의 레지나쌤',short:'종합 보스',symbol:'⚡',focus:`6개 챕터를 함께 연결하는 마지막 ${BOSS_TOTAL}문제`};
  const BASE=()=>({index:0,lives:3,seenBoss:false,finished:false,pendingCorrect:false,muted:false});
  const app=document.getElementById('app');
  const shuffle=xs=>{const copy=[...xs];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
  const chapterAt=index=>index>=CHAPTER_TOTAL?CHAPTERS.length:Math.floor(index/CHAPTER_SIZE);
  const questionAt=index=>index>=CHAPTER_TOTAL?BOSS_QUESTIONS[index-CHAPTER_TOTAL]:CHAPTERS[chapterAt(index)].questions[index%CHAPTER_SIZE];
  const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const plural=(n,unit)=>`${n}${unit}`;

  function restore(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null');
      if(raw && Number.isInteger(raw.index) && raw.index>=0 && raw.index<=TOTAL && Number.isInteger(raw.lives) && raw.lives>=1 && raw.lives<=3){
        return {...BASE(),...raw,finished:raw.index===TOTAL};
      }
      // 기존 6×10+13 진행 기록을 6×9+8 구조의 가장 가까운 위치로 옮긴다.
      const previous=JSON.parse(localStorage.getItem('regina-gdp-academy-v2')||'null');
      if(previous && Number.isInteger(previous.index) && previous.index>=0 && previous.index<=73){
        let index;
        if(previous.finished||previous.index>=73)index=TOTAL;
        else if(previous.index>=60)index=CHAPTER_TOTAL+Math.min(previous.index-60,BOSS_TOTAL-1);
        else index=Math.floor(previous.index/10)*CHAPTER_SIZE+Math.min(previous.index%10,CHAPTER_SIZE-1);
        return {...BASE(),index,lives:3,seenBoss:index>=CHAPTER_TOTAL?!!previous.seenBoss:false,finished:index===TOTAL,muted:!!previous.muted};
      }
      const legacy=JSON.parse(localStorage.getItem('regina-gdp-academy-v1')||'null');
      if(legacy && Number.isInteger(legacy.index) && legacy.index>=0 && legacy.index<=60){
        const index=legacy.index>=60?CHAPTER_TOTAL:Math.floor(legacy.index/10)*CHAPTER_SIZE+Math.min(legacy.index%10,CHAPTER_SIZE-1);
        return {...BASE(),index,lives:3,muted:!!legacy.muted};
      }
    }catch{}
    return BASE();
  }
  let state=restore();
  let selected=new Set(),ordered=[],classified={},numeric='';
  let options=[],items=[];
  let feedback=null,transition=null,cineTimer=null;
  let audioContext=null;
  function save(){localStorage.setItem(KEY,JSON.stringify(state));}
  function note(freq=650,duration=.2,delay=0){
    if(state.muted)return;
    try{
      audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
      const at=audioContext.currentTime+delay,osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,at);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.095,at+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain).connect(audioContext.destination);osc.start(at);osc.stop(at+duration+.02);
    }catch{}
  }
  function chime(good){if(good){note(659,.45);note(988,.55,.1);}else{note(275,.35);note(207,.4,.12);}}
  function getChapter(){return CHAPTERS[chapterAt(state.index)]||BOSS;}
  function prepare(){
    selected=new Set();ordered=[];classified={};numeric='';feedback=null;
    if(state.index<TOTAL){const q=questionAt(state.index);options=q.options?shuffle(q.options):[];items=q.type==='order'?shuffle(q.items):q.type==='classify'?shuffle(q.items):[];}
  }
  prepare();

  function renderShell(){
    const ch=getChapter(),boss=state.index>=CHAPTER_TOTAL&&!state.finished;
    document.body.classList.toggle('boss-mode',boss);
    const completed=state.finished?TOTAL:state.index;
    const hearts=Array.from({length:3},(_,i)=>`<span class="life ${i<state.lives?'full':'empty'}" aria-hidden="true">♥</span>`).join('');
    app.innerHTML=`<div class="app-shell">
      <header class="topbar">
        <div class="brand"><span class="brand-icon" aria-hidden="true">♫</span><div><strong>시장·GDP 뮤직벨 아카데미</strong><small>레지나쌤과 경제의 소리를 찾아라</small></div></div>
        <div class="top-stats"><span class="progress-label">진행 <b>${completed} / ${TOTAL}</b></span><div class="life-count" aria-label="현재 ${boss?'보스전':'챕터'} 남은 목숨 ${state.lives}개. 모두 사용하면 ${boss?'보스전':'현재 챕터'} 첫 문제로 돌아갑니다."><small>${boss?'보스':'이 장'}</small>${hearts}<b>${state.lives}/3</b></div></div>
        <div class="top-actions"><button class="quiet-button" id="soundBtn" aria-label="효과음 ${state.muted?'켜기':'끄기'}">${state.muted?'소리 켜기':'소리 끄기'}</button><button class="quiet-button" id="restartBtn">처음부터</button></div>
      </header>
      <nav class="chapter-rail" aria-label="6개 챕터와 별도 보스전 진행 상황">${[...CHAPTERS,BOSS].map((chapter,i)=>`<div class="rail-item ${i===chapterAt(state.index)&&!state.finished?'current':''} ${i<chapterAt(state.index)||state.finished?'done':''} ${i===CHAPTERS.length?'boss-rail':''}"><span class="rail-index">${i<chapterAt(state.index)||state.finished?'✓':i===CHAPTERS.length?'B':String(i+1).padStart(2,'0')}</span><span class="rail-name">${esc(chapter.short)}</span><span class="rail-fill" style="width:${state.finished||i<chapterAt(state.index)?100:i===chapterAt(state.index)?i===CHAPTERS.length?(state.index-CHAPTER_TOTAL)/BOSS_TOTAL*100:(state.index%CHAPTER_SIZE)/CHAPTER_SIZE*100:0}%"></span></div>`).join('')}</nav>
      <section class="play-grid">
        <aside class="character-card">
          <div class="character-art"><img src="./regina.png" alt="다람쥐 음악 선생님 레지나쌤이 빨간 뮤직벨을 든 모습"></div>
          <div class="character-caption"><div class="caption-title">레지나쌤 <span>뮤직벨</span></div><p id="teacherSpeech">${boss?'“힘내! 틀리면 내가 힌트를 들려줄게.”':'“조건 하나씩 확인하면 답이 들려!”'}</p></div>
        </aside>
        <div class="question-card" id="questionArea"></div>
        <aside class="side-card ${boss?'boss-side':''}">${boss?'<img class="boss-aside-art" src="./dark-regina.png" alt="어둠의 레지나쌤">':''}<div class="side-heading">${boss?'FINAL BOSS':'오늘의 악보'}</div>
          ${boss?'':`<div class="side-symbol">${esc(ch.symbol)}</div>`}<h2>${esc(ch.title)}</h2><p>${esc(ch.focus)}</p>
          ${boss?`<div class="boss-life"><strong>보스의 방어막</strong><div class="boss-life-track"><span style="width:${Math.max(0,BOSS_TOTAL-(state.index-CHAPTER_TOTAL)-(state.pendingCorrect?1:0))/BOSS_TOTAL*100}%"></span></div><b>${Math.max(0,BOSS_TOTAL-(state.index-CHAPTER_TOTAL)-(state.pendingCorrect?1:0))} / ${BOSS_TOTAL}</b></div>`:''}
          <div class="side-rule"><span class="side-rule-icon">↻</span>${boss?'보스전':'각 챕터'} 목숨은 3개입니다.<br>모두 잃으면 ${boss?'보스전':'현재 챕터'} 첫 문제부터 다시 시작합니다.</div>
        </aside>
      </section>
      <footer class="footerbar"><span>생산 규모를 듣고, 숫자 너머의 삶도 살펴보세요.</span><span>${state.finished?'종합 보스 격파':boss?`FINAL BOSS · ${state.index-CHAPTER_TOTAL+1} / ${BOSS_TOTAL}`:`CHAPTER ${chapterAt(state.index)+1} · ${state.index%CHAPTER_SIZE+1} / ${CHAPTER_SIZE}`}</span></footer>
    </div>`;
    document.getElementById('soundBtn').onclick=()=>{state.muted=!state.muted;save();render();};
    document.getElementById('restartBtn').onclick=()=>{
      if(confirm('진행 기록과 남은 목숨을 지우고 첫 문제부터 시작할까요?'))restart(false);
    };
  }
  function canSubmit(q){
    if(q.type==='single')return selected.size===1;
    if(q.type==='multi')return selected.size===q.answer.length;
    if(q.type==='number')return /^\d+$/.test(numeric.trim());
    if(q.type==='order')return ordered.length===q.items.length;
    if(q.type==='classify')return Object.keys(classified).length===q.items.length;
    return false;
  }
  function questionControls(q){
    if(q.type==='single'||q.type==='multi'){
      return `<div class="choice-grid">${options.map((option,i)=>`<button class="option ${selected.has(option)?'selected':''}" data-option="${i}" aria-pressed="${selected.has(option)}"><span class="option-key">${i+1}</span><span>${esc(option)}</span></button>`).join('')}</div>`;
    }
    if(q.type==='number')return `<div class="number-work"><div class="number-label">계산 결과를 입력하세요 <span>단위: ${esc(q.unit)}</span></div><div class="number-row"><input id="numberAnswer" inputmode="numeric" type="text" pattern="[0-9]*" autocomplete="off" value="${esc(numeric)}" placeholder="숫자 입력" aria-label="계산 결과"><strong>${esc(q.unit)}</strong></div></div>`;
    if(q.type==='order')return `<div class="order-work"><div class="selected-order">${ordered.length?ordered.map((item,i)=>`<button data-remove="${i}" class="order-picked"><b>${i+1}</b>${esc(item)} <span>×</span></button>`).join(''):'<span class="empty-line">아래 조각을 순서대로 누르세요.</span>'}</div><div class="order-options">${items.filter(item=>!ordered.includes(item)).map(item=>`<button data-add="${esc(item)}" class="order-chip">${esc(item)}</button>`).join('')}</div></div>`;
    if(q.type==='classify')return `<div class="classify-list">${items.map((item,i)=>`<div class="classify-row"><span>${esc(item.text)}</span><div role="group" aria-label="${esc(item.text)} 분류"><button data-class="${i}:yes" class="${classified[item.text]===true?'active':''}" aria-pressed="${classified[item.text]===true}">포함</button><button data-class="${i}:no" class="${classified[item.text]===false?'active':''}" aria-pressed="${classified[item.text]===false}">제외</button></div></div>`).join('')}</div>`;
    return '';
  }
  const typeTitle={single:'한 가지 고르기',multi:'근거 여러 개 고르기',number:'계산하기',order:'순서 맞추기',classify:'둘로 분류하기'};
  function graphSvg(chart){
    if(chart.kind==='shift'){
      const shift=chart.shift,of=shift.endsWith('right')?38:-38;
      const d=shift.startsWith('D'),startD='114,38 310,238',startS='114,238 310,38';
      const moved=d?`${114+of},38 ${310+of},238`:`${114+of},238 ${310+of},38`;
      const x=212+of/2,y=d?138-of/2:138+of/2;
      return `<div class="graph-title">곡선 이동 · ${d?'수요':'공급'} ${of>0?'오른쪽':'왼쪽'}</div><svg class="market-graph" viewBox="0 0 410 290" role="img" aria-label="${d?'수요':'공급'} 곡선이 ${of>0?'오른쪽':'왼쪽'}으로 이동한 그래프. 이전 균형점과 새 균형점이 표시되어 있음">
        <line x1="55" y1="22" x2="55" y2="252" class="axis"/><line x1="55" y1="252" x2="380" y2="252" class="axis"/>
        <text x="57" y="18" class="axis-label">가격 P</text><text x="315" y="282" class="axis-label">거래량 Q</text>
        <polyline points="${startD}" class="curve baseline-demand"/><polyline points="${startS}" class="curve baseline-supply"/>
        <polyline points="${moved}" class="curve changed-curve ${d?'demand':'supply'}"/>
        <circle cx="212" cy="138" r="6" class="old-dot"/><circle cx="${x}" cy="${y}" r="8" class="new-dot"/>
        <path d="M212 138 L${x} ${y}" class="shift-arrow" marker-end="url(#arrowhead)"/><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#f6d17e"/></marker></defs>
        <text x="312" y="233" class="curve-label demand-label">수요</text><text x="312" y="44" class="curve-label supply-label">공급</text>
        <text x="${x+10}" y="${y-8}" class="curve-label new-label">새 균형</text>
      </svg><div class="graph-legend"><span><i class="legend-old"></i>처음</span><span><i class="legend-new"></i>변동 후</span></div>`;
    }
    const data=chart,priceMin=Math.min(...data.prices)-2,priceMax=Math.max(...data.prices)+2;
    const values=[...data.demand,...data.supply],quantityMin=Math.min(...values)-Math.max(2,(Math.max(...values)-Math.min(...values))*.14),quantityMax=Math.max(...values)+Math.max(2,(Math.max(...values)-Math.min(...values))*.14);
    const x=q=>60+(q-quantityMin)/(quantityMax-quantityMin)*310;
    const y=p=>250-(p-priceMin)/(priceMax-priceMin)*215;
    const points=xs=>xs.map((q,i)=>`${x(q).toFixed(1)},${y(data.prices[i]).toFixed(1)}`).join(' ');
    const ticks=[...new Set(values)].sort((a,b)=>a-b);
    const activeIndex=data.prices.indexOf(data.active);
    const active=activeIndex<0?'':`<line x1="60" y1="${y(data.active)}" x2="380" y2="${y(data.active)}" class="active-price"/><circle cx="${x(data.demand[activeIndex])}" cy="${y(data.active)}" r="8" class="demand-dot"/><circle cx="${x(data.supply[activeIndex])}" cy="${y(data.active)}" r="8" class="supply-dot"/>`;
    return `<div class="graph-title">가격( ${esc(data.priceUnit)} ) · 수량( ${esc(data.quantityUnit)} )</div><svg class="market-graph" viewBox="0 0 410 290" role="img" aria-label="가격별 수요량과 공급량 곡선${data.active?' 및 현재 가격 '+data.active+data.priceUnit:''}">
      ${data.prices.map(price=>`<line x1="60" y1="${y(price)}" x2="380" y2="${y(price)}" class="gridline"/><text x="40" y="${y(price)+5}" class="tick" text-anchor="end">${price}</text>`).join('')}
      ${ticks.map(quantity=>`<line x1="${x(quantity)}" y1="25" x2="${x(quantity)}" y2="250" class="gridline faint"/><text x="${x(quantity)}" y="273" class="tick" text-anchor="middle">${quantity}</text>`).join('')}
      <line x1="60" y1="22" x2="60" y2="251" class="axis"/><line x1="60" y1="250" x2="384" y2="250" class="axis"/>
      <polyline points="${points(data.demand)}" class="curve demand"/><polyline points="${points(data.supply)}" class="curve supply"/>${active}
      <text x="${x(data.demand[0])+8}" y="${y(data.prices[0])-7}" class="curve-label demand-label">수요</text>
      <text x="${x(data.supply[0])-38}" y="${y(data.prices[0])-7}" class="curve-label supply-label">공급</text>
    </svg><div class="graph-legend"><span><i class="legend-demand"></i>수요</span><span><i class="legend-supply"></i>공급</span><span><i class="legend-price"></i>표시 가격</span></div>`;
  }
  function renderQuestion(){
    const q=questionAt(state.index),ch=getChapter();
    const area=document.getElementById('questionArea');
    area.classList.toggle('has-graph',!!q.chart);
    area.innerHTML=`<div class="question-top"><span class="chapter-name">${state.index>=CHAPTER_TOTAL?'<img class="boss-mini" src="./dark-regina.png" alt="">':''}${esc(ch.symbol)}　${esc(ch.title)}</span><span class="question-type">${typeTitle[q.type]}</span>${state.index>=CHAPTER_TOTAL?`<div class="boss-hp-inline" aria-label="보스 방어막 ${BOSS_TOTAL-(state.index-CHAPTER_TOTAL)-(state.pendingCorrect?1:0)}개 남음"><span>방어막</span><i><b style="width:${(BOSS_TOTAL-(state.index-CHAPTER_TOTAL)-(state.pendingCorrect?1:0))/BOSS_TOTAL*100}%"></b></i><strong>${BOSS_TOTAL-(state.index-CHAPTER_TOTAL)-(state.pendingCorrect?1:0)}/${BOSS_TOTAL}</strong></div>`:''}</div>
      <div class="question-head"><div class="question-number">${state.index>=CHAPTER_TOTAL?'보스 문제':'챕터 문제'} <b>${state.index>=CHAPTER_TOTAL?state.index-CHAPTER_TOTAL+1:state.index%CHAPTER_SIZE+1}</b><span> / ${state.index>=CHAPTER_TOTAL?BOSS_TOTAL:CHAPTER_SIZE}</span></div><h1>${esc(q.prompt)}</h1></div>
      <div class="answer-space">${q.chart?`<div class="graph-layout"><div class="graph-panel">${graphSvg(q.chart)}</div><div class="graph-answers">${questionControls(q)}</div></div>`:questionControls(q)}</div>
      ${feedback?`<div class="feedback ${feedback.kind}" role="status"><span class="feedback-icon">${feedback.kind==='good'?'♬':'🔔'}</span><div><strong>${feedback.kind==='good'?'정확해요! 화음이 완성됐어요.':'레지나쌤의 뮤직벨 힌트'}</strong><p>${esc(feedback.text)}</p></div></div>`:''}
      <div class="question-bottom"><p>${q.type==='multi'?`정확히 ${q.answer.length}개 선택하세요.`:q.type==='order'?'조각을 차례대로 누르세요. 누른 조각을 다시 눌러 수정할 수 있습니다.':q.type==='classify'?'각 상황마다 포함 또는 제외를 선택하세요.':'답을 고른 뒤 결정 버튼을 누르세요.'}</p><button id="submitBtn" class="primary-button" ${!canSubmit(q)&&!feedback?'disabled':''}>${feedback?.kind==='good'?'다음 문제 →':feedback?.kind==='hint'?'힌트 확인, 다시 시도':'결정 확정 →'}</button></div>`;
    area.querySelectorAll('[data-option]').forEach(btn=>btn.onclick=()=>{
      if(feedback)return;
      const value=options[Number(btn.dataset.option)];
      if(q.type==='single'){selected=new Set([value]);}
      else if(selected.has(value))selected.delete(value);
      else if(selected.size<q.answer.length)selected.add(value);
      renderQuestion();
    });
    const input=area.querySelector('#numberAnswer');
    if(input){input.oninput=event=>{numeric=event.target.value.replace(/[^\d]/g,'');document.getElementById('submitBtn').disabled=!canSubmit(q);};input.onkeydown=event=>{if(event.key==='Enter'&&!document.getElementById('submitBtn').disabled)onSubmit();};}
    area.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>{if(feedback)return;ordered.push(btn.dataset.add);renderQuestion();});
    area.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>{if(feedback)return;ordered.splice(Number(btn.dataset.remove),1);renderQuestion();});
    area.querySelectorAll('[data-class]').forEach(btn=>btn.onclick=()=>{if(feedback)return;const [index,value]=btn.dataset.class.split(':');classified[items[Number(index)].text]=value==='yes';renderQuestion();});
    document.getElementById('submitBtn').onclick=onSubmit;
    const speech=document.getElementById('teacherSpeech');
    if(feedback) speech.textContent=feedback.kind==='hint'?`“${q.hint}”`:'“좋아! 이제 다음 마디로 가자.”';
  }
  function isCorrect(q){
    if(q.type==='single')return selected.has(q.answer);
    if(q.type==='multi')return selected.size===q.answer.length&&q.answer.every(x=>selected.has(x));
    if(q.type==='number')return Number(numeric)===q.answer;
    if(q.type==='order')return ordered.length===q.answer.length&&ordered.every((x,i)=>x===q.answer[i]);
    if(q.type==='classify')return q.items.every(x=>classified[x.text]===x.include);
    return false;
  }
  function onSubmit(){
    const q=questionAt(state.index);
    if(feedback?.kind==='good'){
      state.pendingCorrect=false;state.index++;
      if(state.index>=TOTAL){state.finished=true;save();render();note(523,.45);note(659,.45,.13);note(784,.7,.26);return;}
      if(state.index<=CHAPTER_TOTAL && state.index%CHAPTER_SIZE===0){
        state.lives=3;
        transition=Math.floor((state.index-1)/CHAPTER_SIZE);
        save();prepare();render();return;
      }
      save();
      prepare();render();return;
    }
    if(feedback?.kind==='hint'){prepare();renderQuestion();return;}
    if(!canSubmit(q))return;
    const good=isCorrect(q);
    chime(good);
    if(good){state.pendingCorrect=true;feedback={kind:'good',text:q.note};save();render();if(state.index>=CHAPTER_TOTAL){app.classList.add('boss-hit');setTimeout(()=>app.classList.remove('boss-hit'),650);}}
    else{
      state.lives--;save();
      if(state.lives<=0){restartStage();return;}
      feedback={kind:'hint',text:q.hint};render();
      app.classList.add('shudder');if(state.index>=CHAPTER_TOTAL)app.classList.add('boss-reply');setTimeout(()=>{app.classList.remove('shudder','boss-reply');},650);
    }
  }
  function restartStage(){
    const boss=state.index>=CHAPTER_TOTAL;
    state.index=boss?CHAPTER_TOTAL:Math.floor(state.index/CHAPTER_SIZE)*CHAPTER_SIZE;
    state.lives=3;state.pendingCorrect=false;state.finished=false;
    save();prepare();render();
    const layer=document.createElement('div');layer.className='reset-flash';
    layer.innerHTML=`<strong>${boss?'보스전':'이번 챕터'}의 목숨 3개를 모두 사용했어요</strong><span>${boss?'보스전':'이 챕터'} 첫 문제부터 다시 시작합니다.</span><button>다시 도전 →</button>`;
    document.body.appendChild(layer);
    const close=()=>layer.remove();layer.querySelector('button').onclick=close;setTimeout(close,2600);
  }
  function restart(){
    clearTimeout(cineTimer);transition=null;const muted=state.muted;
    document.querySelector('.victory-scene')?.remove();
    state={...BASE(),muted};save();prepare();render();
  }
  function showTransition(){
    if(transition===null)return;
    const completed=CHAPTERS[transition],next=CHAPTERS[transition+1]||BOSS;
    const layer=document.createElement('div');layer.className='scene-overlay chapter-scene';
    layer.innerHTML=`<div class="scene-panel"><span class="scene-kicker">CHAPTER ${transition+1} CLEAR</span><div class="scene-bell">🔔</div><h2>${esc(completed.title)} 완주</h2><p>${esc(completed.focus)}</p><div class="scene-divider"></div><strong>${transition===5?'이제 여섯 장의 모든 내용을 시험합니다':'다음 악보 · '+esc(next.title)}</strong><button class="primary-button">${transition===5?`${BOSS_TOTAL}문제 최종 보스에게 도전 →`:'다음 챕터 시작 →'}</button></div>`;
    document.body.appendChild(layer);
    layer.querySelector('button').onclick=()=>{layer.remove();transition=null;render();};
  }
  function showBossCinematic(){
    if(state.seenBoss||state.finished||state.index!==CHAPTER_TOTAL||transition!==null)return;
    const layer=document.createElement('div');layer.className='scene-overlay boss-cinematic';
    layer.innerHTML=`<div class="lightning"></div><div class="storm-notes" aria-hidden="true"><span>♬</span><span>♭</span><span>♪</span><span>♮</span><span>♫</span></div><img src="./dark-regina.png" alt="번개 치는 음악 학교 성 앞에 선 어둠의 레지나쌤"><div class="boss-cine-copy"><span>FINAL BOSS · ${BOSS_TOTAL} QUESTIONS</span><h2>어둠의 레지나쌤</h2><p>“시장부터 GDP까지, 모든 악보를 읽어 보아라!”</p></div><button class="skip-cinematic">연출 건너뛰기</button>`;
    document.body.appendChild(layer);
    const close=()=>{if(!layer.isConnected)return;layer.remove();state.seenBoss=true;save();clearTimeout(cineTimer);};
    layer.querySelector('button').onclick=close;
    cineTimer=setTimeout(close,8500);
    note(155,1.1);note(207,1.2,.7);
  }
  function renderEnding(){
    document.body.classList.remove('boss-mode');
    const area=document.getElementById('questionArea');
    area.innerHTML='<div class="ending"><div class="ending-medal">♬</div><h1>6개 챕터와 최종 보스를 완주했어요!</h1><p>수요·공급의 균형과 GDP 숫자 뒤에 있는 사람들의 삶을 함께 읽어 냈습니다.</p></div>';
    document.querySelector('.victory-scene')?.remove();
    const layer=document.createElement('div');layer.className='scene-overlay victory-scene';
    layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','최종 보스 승리와 냥냥코인 보상');
    layer.innerHTML=`<div class="victory-glow" aria-hidden="true"></div><div class="coin-rain" aria-hidden="true">${Array.from({length:32},(_,i)=>`<span style="--left:${i*3.1}%;--duration:${(3.7+i*.11).toFixed(2)}s;--delay:${(-i*.36).toFixed(2)}s">냥</span>`).join('')}</div><div class="victory-content"><span class="victory-overline">FINAL BOSS CLEARED · ${TOTAL} / ${TOTAL}</span><div class="victory-medal">✦ 🐱 ✦</div><h1>냥냥코인을<br>가져가!</h1><p>어둠의 레지나쌤을 물리쳤어요.<br>여섯 장의 경제 악보를 모두 완성했습니다!</p><div class="victory-summary"><span>시장 가격 · 수요와 공급의 상호 작용</span><span>GDP · 국내 생산의 가치와 그 한계</span></div><button id="playAgain" class="primary-button">처음부터 다시 연주하기 ↻</button></div>`;
    document.body.appendChild(layer);
    layer.querySelector('#playAgain').onclick=()=>restart();
    const speech=document.getElementById('teacherSpeech');speech.textContent='“숫자도 읽고 사람의 삶도 살펴봤구나!”';
  }
  function render(){
    renderShell();
    if(state.finished){renderEnding();return;}
    if(state.pendingCorrect && !feedback){feedback={kind:'good',text:questionAt(state.index).note};}
    renderQuestion();
    if(transition!==null){showTransition();return;}
    showBossCinematic();
  }
  window.addEventListener('keydown',event=>{
    if(state.finished||feedback||document.querySelector('.scene-overlay')||event.target.tagName==='INPUT')return;
    const q=questionAt(state.index);
    if((q.type==='single'||q.type==='multi')&&/^[1-4]$/.test(event.key)){
      const item=document.querySelector(`[data-option="${Number(event.key)-1}"]`);if(item)item.click();
    }
    if(event.key==='Enter'&&canSubmit(q)){event.preventDefault();onSubmit();}
  });
  render();
})();
