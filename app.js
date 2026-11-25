(function(){
const D = window.DATA, L = D.lists;
const RES='تم الحل', KEEP='حفظ/تعذر الحل';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtD = s => { if(!s) return ''; const [y,m,d]=String(s).split('-'); return `${d}/${m}/${y}`; };
const pct = x => (x*100).toFixed(1)+'%';
const today = new Date(); today.setHours(0,0,0,0);
const days = s => Math.round((today - new Date(s+'T00:00:00'))/864e5);
const C = {code:0,date:1,title:2,text:3,region:4,sector:5,nature:6,imp:7,auth:8,status:9,refDate:10,refTo:11,doneDate:12,resp:13,age:14,dup:21,wk:25};

// ---------- الأسابيع ----------
const LRI='\u2066', PDI='\u2069';
const wkLabel = ([a,b]) => { const f=s=>{const [,m,d]=s.split('-');return `${+d}/${+m}`}; return `${LRI}${f(a)} – ${f(b)}${PDI}`; };
const wkLabels = D.weeks.map(wkLabel);
const weekOf = d => { for(let i=0;i<D.weeks.length;i++){ if(d && d>=D.weeks[i][0] && d<=D.weeks[i][1]) return String(i); } return 'out'; };
const weekName = k => k==='out' ? 'خارج الأسابيع' : wkLabels[+k];

const rows = D.rows.map(r => { r=r.slice();
  r[C.resp] = (r[C.date] && r[C.doneDate]) ? Math.round((new Date(r[C.doneDate])-new Date(r[C.date]))/864e5) : '';
  r[C.age]  = (r[C.date] && r[C.status] && r[C.status]!==RES && r[C.status]!==KEEP) ? days(r[C.date]) : '';
  r[C.wk] = weekOf(r[C.date]); return r; });

// ---------- الأبعاد والتصفية ----------
const DIMS = {
  status:{label:'الحالة', idx:C.status, list:L['حالة الشكوى'], sort:false},
  sector:{label:'القطاع', idx:C.sector, list:L['القطاع (الخدمة الرئيسية)'], sort:true},
  region:{label:'المنطقة', idx:C.region, list:L['المنطقة / المدينة'], sort:true},
  imp:{label:'الأهمية', idx:C.imp, list:L['درجة الأهمية'], sort:false},
  nature:{label:'طبيعة الحل', idx:C.nature, list:L['طبيعة الحل المطلوب'], sort:true},
};
const F = {status:'',sector:'',region:'',imp:'',nature:'',week:'',dup:'',q:''};
const match = (r, skip) => {
  for(const k in DIMS){ if(k!==skip && F[k] && r[DIMS[k].idx]!==F[k]) return false; }
  if(skip!=='week' && F.week && r[C.wk]!==F.week) return false;
  if(F.dup && r[C.dup]!==F.dup) return false;
  if(F.q && !(r[C.code]+' '+r[C.title]+' '+r[C.text]).includes(F.q)) return false;
  return true;
};
const rowsFor = skip => rows.filter(r=>match(r,skip));
// ترتيب ثابت (حسب الإجمالي الكلي) كي لا تتبدل مواقع الأعمدة عند التصفية
for(const k in DIMS){ const d=DIMS[k]; const tot=d.list.map(x=>rows.filter(r=>r[d.idx]===x).length);
  d.order = d.list.map((_,i)=>i); if(d.sort) d.order.sort((a,b)=>tot[b]-tot[a]||a-b);
  d.labels = d.order.map(i=>d.list[i]); }
const countDim = (k) => { const d=DIMS[k], rs=rowsFor(k); return d.labels.map(x=>rs.filter(r=>r[d.idx]===x).length); };
const countWeek = () => { const rs=rowsFor('week'); return [...D.weeks.map((_,i)=>rs.filter(r=>r[C.wk]===String(i)).length), rs.filter(r=>r[C.wk]==='out').length]; };
const WEEK_KEYS = [...D.weeks.map((_,i)=>String(i)),'out'];

function toggle(k,v){ F[k] = (F[k]===v) ? '' : v; renderAll(); }

// ---------- شريط التصفية ----------
function renderChips(){
  const items = [];
  for(const k in DIMS) if(F[k]) items.push([k, `${DIMS[k].label}: ${F[k]}`]);
  if(F.week) items.push(['week', `الأسبوع: ${weekName(F.week)}`]);
  if(F.dup) items.push(['dup', `مكررة: ${F.dup}`]);
  if(F.q) items.push(['q', `بحث: ${F.q}`]);
  const bar = $('chipbar');
  bar.classList.toggle('on', items.length>0);
  bar.innerHTML = items.length ? `<b>التصفية الحالية:</b>`+items.map(([k,t])=>`<span class="chip" data-k="${k}" title="إلغاء">${esc(t)} ✕</span>`).join('')+`<span class="chip clear" data-k="*">مسح الكل</span>` : '';
}
$('chipbar').addEventListener('click',e=>{ const c=e.target.closest('.chip'); if(!c) return;
  if(c.dataset.k==='*'){ for(const k in F) F[k]=''; $('q').value=''; } else { F[c.dataset.k]=''; if(c.dataset.k==='q') $('q').value=''; }
  renderAll(); });

// ---------- المؤشرات ----------
const top = (labels, vals) => Math.max(0,...vals)===0 ? '—' : labels[vals.indexOf(Math.max(...vals))];
const avg = a => { a=a.filter(v=>v!==''&&!isNaN(v)); return a.length ? a.reduce((x,y)=>x+Number(y),0)/a.length : null; };
const f1 = n => n.toFixed(1);
const KPI1 = [
 ['total','إجمالي الشكاوى','📋','#1F4E5F', fr=>fr.length],
 ['open','شكاوى مفتوحة','📂','#B7791F', fr=>fr.filter(r=>r[C.status]!==RES).length],
 ['res','تم الحل','✅','#2E7D32', fr=>fr.filter(r=>r[C.status]===RES).length, ()=>toggle('status',RES)],
 ['rate','نسبة الحل','📈','#2E7D32', fr=>fr.length? fr.filter(r=>r[C.status]===RES).length/fr.length*100 : 0, null, n=>f1(n)+'%'],
 ['urg','عاجلة/حرجة مفتوحة','🚨','#C00000', fr=>fr.filter(r=>r[C.imp]==='عاجلة/حرجة'&&r[C.status]!==RES).length, ()=>toggle('imp','عاجلة/حرجة')],
 ['resp','متوسط زمن الاستجابة (يوم)','⏱','#1F4E5F', fr=>avg(fr.map(r=>r[C.resp])), null, f1],
];
const KPI2 = [
 ['dup','شكاوى مكررة','🔁','#6B7280', fr=>fr.filter(r=>r[C.dup]==='نعم').length, ()=>toggle('dup','نعم')],
 ['age','متوسط عمر المفتوحة (يوم)','🕒','#6B7280', fr=>avg(fr.map(r=>r[C.age])), null, f1],
 ['tsec','أكثر قطاع شكاوى','🏷','#1F4E5F', fr=>top(DIMS.sector.labels, DIMS.sector.labels.map(x=>fr.filter(r=>r[C.sector]===x).length)), null, null, true],
 ['treg','أكثر منطقة شكاوى','📍','#1F4E5F', fr=>top(DIMS.region.labels, DIMS.region.labels.map(x=>fr.filter(r=>r[C.region]===x).length)), null, null, true],
 ['ref','تمت إحالتها للجهات','📨','#B7791F', fr=>fr.filter(r=>r[C.refDate]).length],
 ['nref','لم تُحَل بعد للجهات','⏳','#B7791F', fr=>fr.filter(r=>!r[C.refDate]).length],
];
function buildKpis(){
  const h = defs => defs.map(d=>`<div class="kpi${d[5]?' click':''}" id="k-${d[0]}" style="--c:${d[3]}"><div class="top"><span class="ic">${d[2]}</span><span class="l">${d[1]}</span></div><div class="v${d[7]?' txt':''}">0</div></div>`).join('');
  $('kpis1').innerHTML=h(KPI1); $('kpis2').innerHTML=h(KPI2);
  [...KPI1,...KPI2].forEach(d=>{ if(d[5]) $('k-'+d[0]).addEventListener('click',d[5]); });
}
const shown = {};
function setKpi(d, fr){
  const el = $('k-'+d[0]).querySelector('.v'); const val = d[4](fr);
  if(typeof val==='string'){ el.textContent=val; return; }
  if(val===null){ el.textContent='—'; shown[d[0]]=null; return; }
  const fmt = d[6] || (n=>Math.round(n)); const from = shown[d[0]]??0; shown[d[0]]=val;
  const t0=performance.now(); const dur=550;
  (function step(t){ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3); el.textContent = fmt(from+(val-from)*e); if(p<1) requestAnimationFrame(step); })(t0);
}

// ---------- الرسوم ----------
Chart.defaults.font.family = 'Cairo, Arial, sans-serif';
Chart.defaults.animation.duration = 500;
const charts = {};
const hl = (color, labels, k) => labels.map(x => (!F[k] || F[k]===x) ? color : color+'44');
const tipPct = ctx => { const t=ctx.dataset.data.reduce((a,b)=>a+b,0); const v=ctx.parsed.x!==undefined&&ctx.chart.options.indexAxis==='y'?ctx.parsed.x:(ctx.parsed.y!==undefined?ctx.parsed.y:ctx.parsed); return ` ${v} شكوى (${t?pct(v/t):'0.0%'})`; };
const valLabels = { id:'vl', afterDatasetsDraw(ch){ if(ch.config.type==='doughnut') return; const {ctx}=ch;
  ctx.save(); ctx.font='600 11px Cairo, Arial'; ctx.fillStyle='#333';
  ch.getDatasetMeta(0).data.forEach((el,i)=>{ const v=ch.data.datasets[0].data[i]; const p=el.tooltipPosition();
    if(ch.options.indexAxis==='y'){ ctx.textAlign='right'; ctx.fillText(v, el.x-5, p.y+4); } else { ctx.textAlign='center'; ctx.fillText(v, p.x, el.y-5); } });
  ctx.restore(); } };
const centerText = { id:'ct', afterDraw(ch){ if(ch.config.type!=='doughnut') return; const {ctx,chartArea:a}=ch;
  const tot=ch.data.datasets[0].data.reduce((x,y)=>x+y,0); const cx=(a.left+a.right)/2, cy=(a.top+a.bottom)/2;
  ctx.save(); ctx.textAlign='center'; ctx.fillStyle='#1F4E5F'; ctx.font='800 30px Cairo, Arial'; ctx.fillText(tot,cx,cy+6);
  ctx.font='600 12px Cairo, Arial'; ctx.fillStyle='#6B7280'; ctx.fillText('شكوى',cx,cy+24); ctx.restore(); } };
const hover = (e,els)=>{ e.native.target.style.cursor = els.length ? 'pointer':'default'; };
const palette = ['#5B7DB1','#E58E2B','#F2C14E','#7FB069','#8E7CC3','#6B7280'];
const STATUS_COLORS = ['#4F7CAC','#F2C14E','#E58E2B','#4CAF50','#9AA5AB'];

function mkBar(id, k, color, horiz){
  const d = DIMS[k];
  charts[k] = new Chart($(id), { type:'bar', plugins:[valLabels],
    data:{labels:d.labels, datasets:[{data:countDim(k), backgroundColor:hl(color,d.labels,k), borderRadius:4, maxBarThickness:26}]},
    options:{responsive:true, maintainAspectRatio:false, indexAxis:horiz?'y':'x', onHover:hover,
      interaction:{mode:'nearest',axis:horiz?'y':'x',intersect:false},
      onClick:(e,els)=>{ if(els.length) toggle(k, d.labels[els[0].index]); },
      layout:{padding: horiz?{left:28}:{top:18}},
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:tipPct}}},
      scales: horiz ? {x:{reverse:true,beginAtZero:true,ticks:{precision:0}}, y:{position:'right',grid:{display:false}}} : {y:{beginAtZero:true,ticks:{precision:0}}, x:{grid:{display:false}}}}});
  charts[k]._color=color;
}
function mkAll(){
  const ds = DIMS.status;
  charts.status = new Chart($('c-status'), { type:'doughnut', plugins:[centerText],
    data:{labels:ds.labels, datasets:[{data:countDim('status'), backgroundColor:hl2(ds), borderWidth:2, borderColor:'#fff', hoverOffset:8}]},
    options:{responsive:true, maintainAspectRatio:false, cutout:'62%', onHover:hover,
      onClick:(e,els)=>{ if(els.length) toggle('status', ds.labels[els[0].index]); },
      plugins:{legend:{position:'bottom', labels:{usePointStyle:true}, onClick:(e,item)=>toggle('status', ds.labels[item.index])}, tooltip:{callbacks:{label:tipPct}}}}});
  mkBar('c-sector','sector','#1F4E5F',true);
  mkBar('c-region','region','#00897B',true);
  mkBar('c-imp','imp','#C00000',false);
  mkBar('c-nature','nature','#B7791F',true);
  const wl=[...wkLabels,'خارج الأسابيع'];
  charts.week = new Chart($('c-week'), { type:'line', plugins:[valLabels],
    data:{labels:wl, datasets:[{data:countWeek(), borderColor:'#1F4E5F', backgroundColor:'rgba(31,78,95,.12)', fill:true, tension:.25, pointRadius:wkPR(), pointBackgroundColor:wkPC(), pointHoverRadius:8}]},
    options:{responsive:true, maintainAspectRatio:false, onHover:hover, interaction:{mode:'nearest',axis:'x',intersect:false},
      onClick:(e,els)=>{ if(els.length) toggle('week', WEEK_KEYS[els[0].index]); },
      layout:{padding:{top:20}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label:tipPct}}},
      scales:{y:{beginAtZero:true,ticks:{precision:0}}, x:{grid:{display:false}}}}});
}
function hl2(ds){ return ds.labels.map((x,i)=> (!F.status||F.status===x) ? STATUS_COLORS[i%5] : STATUS_COLORS[i%5]+'44'); }
function wkPR(){ return WEEK_KEYS.map(k=> F.week===k ? 9 : 5); }
function wkPC(){ return WEEK_KEYS.map(k=> (!F.week||F.week===k) ? '#1F4E5F' : '#9db3bb'); }
function updateCharts(){
  for(const k of ['sector','region','imp','nature']){ const c=charts[k], d=DIMS[k];
    c.data.datasets[0].data=countDim(k); c.data.datasets[0].backgroundColor=hl(c._color,d.labels,k); c.update(); }
  charts.status.data.datasets[0].data=countDim('status'); charts.status.data.datasets[0].backgroundColor=hl2(DIMS.status); charts.status.update();
  const w=charts.week; w.data.datasets[0].data=countWeek(); w.data.datasets[0].pointRadius=wkPR(); w.data.datasets[0].pointBackgroundColor=wkPC(); w.update();
}

// ---------- الجداول الداعمة (تفاعلية) ----------
function block(title, k){
  const d=DIMS[k], vals=countDim(k), t=vals.reduce((a,b)=>a+b,0);
  return `<div class="blk"><h4>${title}</h4><table><tr><th>البند</th><th>العدد</th><th>النسبة</th></tr>`+
    d.labels.map((l,i)=>`<tr class="rowc${F[k]===l?' sel':''}" data-k="${k}" data-v="${esc(l)}"><td>${esc(l)}</td><td>${vals[i]}</td><td>${t?pct(vals[i]/t):'0.0%'}</td></tr>`).join('')+
    `<tr class="tot"><td>الإجمالي</td><td>${t}</td><td>${t?'100.0%':'0.0%'}</td></tr></table></div>`;
}
function weekBlock(){
  const vals=countWeek(), t=vals.reduce((a,b)=>a+b,0), names=[...wkLabels,'بدون تاريخ / خارج الأسابيع'];
  return `<div class="blk"><h4>الاتجاه الأسبوعي للشكاوى</h4><table><tr><th>الأسبوع</th><th>العدد</th><th>النسبة</th></tr>`+
    WEEK_KEYS.map((k,i)=>`<tr class="rowc${F.week===k?' sel':''}" data-k="week" data-v="${k}"><td>${names[i]}</td><td>${vals[i]}</td><td>${t?pct(vals[i]/t):'0.0%'}</td></tr>`).join('')+
    `<tr class="tot"><td>الإجمالي</td><td>${t}</td><td>${t?'100.0%':'0.0%'}</td></tr></table></div>`;
}
function renderTables(){
  $('tables').innerHTML = `<div>${block('توزيع الحالة','status')}${block('درجة الأهمية','imp')}${block('طبيعة الحل المطلوب','nature')}</div>`+
    `<div>${block('توزيع الشكاوى حسب القطاع','sector')}<div class="blk"><h4>إعدادات الأسابيع</h4><table><tr><th>بداية الأسبوع</th><th>نهاية الأسبوع</th></tr>${D.weeks.map(w=>`<tr><td>${fmtD(w[0])}</td><td>${fmtD(w[1])}</td></tr>`).join('')}</table></div></div>`+
    `<div>${block('توزيع الشكاوى حسب المنطقة','region')}${weekBlock()}</div>`;
}
$('tables').addEventListener('click',e=>{ const tr=e.target.closest('tr.rowc'); if(tr) toggle(tr.dataset.k, tr.dataset.v); });

// ---------- الشكاوى المطابقة ----------
const statusCls = {'جديدة':'c-new','تحت الإجراء':'c-prog','جاري الحل':'c-work','تم الحل':'c-done',[KEEP]:'c-keep'};
const impCls = {'عاجلة/حرجة':'c-crit','متوسطة':'c-mid'};
const impRank = {'عاجلة/حرجة':0,'متوسطة':1,'عادية':2};
function renderMatch(){
  const fr = rowsFor(null).slice().sort((a,b)=>(impRank[a[C.imp]]??3)-(impRank[b[C.imp]]??3)||(a[C.code]>b[C.code]?1:-1));
  $('matchCount').textContent = `(${fr.length} شكوى — الأعلى أهمية أولاً)`;
  const shownRows = fr.slice(0,10);
  $('match').innerHTML = shownRows.length ? `<tr><th>الكود</th><th>التاريخ</th><th>نص الشكوى</th><th>القطاع</th><th>المنطقة</th><th>الأهمية</th><th>الحالة</th></tr>`+
    shownRows.map(r=>`<tr><td class="b">${esc(r[C.code])}</td><td class="b">${fmtD(r[C.date])}</td><td class="t">${esc(String(r[C.text]).slice(0,170))}${String(r[C.text]).length>170?'…':''}</td><td class="b">${esc(r[C.sector])}</td><td class="b">${esc(r[C.region])}</td><td class="b"><span class="bd ${impCls[r[C.imp]]||''}">${esc(r[C.imp])}</span></td><td class="b"><span class="bd ${statusCls[r[C.status]]||''}">${esc(r[C.status])}</span></td></tr>`).join('')
    : `<tr><td class="empty">لا توجد شكاوى مطابقة للتصفية الحالية</td></tr>`;
  $('toLog').textContent = `عرض الكل (${fr.length}) في سجل الشكاوى ←`;
}
$('toLog').onclick = ()=>{ location.hash='log'; };

// ---------- السجل ----------
$('logTitle').textContent = D.title; $('logSub').textContent = D.subtitle;
const widths = [11,12,38,70,16,20,13,13,24,15,13,22,13,12,13,18,13,40,30,16,36,9,28,40,20];
const groups = [['بيانات الشكوى والتصنيف',9,'g-teal'],['المتابعة وحالة الشكوى',6,'g-amber'],['التواصل والتوثيق الميداني',6,'g-amber'],['ضبط جودة البيانات',4,'g-teal']];
const colCls = i => (i===13||i===14) ? 'g-gray' : (i>=9 && i<=20) ? 'g-amber' : 'g-teal';
const tbl = $('log'); let sortCol=null, sortDir=1;
tbl.innerHTML = `<colgroup>${widths.map(w=>`<col style="width:${Math.round(w*7.5)}px">`).join('')}</colgroup>
 <thead><tr class="grp">${groups.map(g=>`<th colspan="${g[1]}" class="${g[2]}" style="color:#fff">${g[0]}</th>`).join('')}</tr>
 <tr class="hd">${D.heads.map((h,i)=>`<th class="${colCls(i)}" data-i="${i}">${h}</th>`).join('')}</tr></thead><tbody></tbody>`;
const dateCols = new Set([1,10,12]);
function cell(r,i){
  let v = r[i]; if(v===''||v==null) v=''; if(dateCols.has(i)) v=fmtD(v);
  let cls='', inner=esc(v);
  if([2,3,8,20,23,24].includes(i)) cls='txt';
  if(i===9) cls='status '+(statusCls[v]||''); if(i===7) cls=impCls[v]||'';
  if(i===21 && v==='نعم') cls='c-crit'; if(i===14 && v!=='' && v>14) cls='old';
  if((i===17||i===18) && v) inner=`<a href="${esc(v)}" target="_blank" rel="noopener">فتح الرابط</a>`;
  return `<td class="${cls}">${inner}</td>`;
}
function fill(sel,label,arr){ $(sel).innerHTML=`<option value="">${label}</option>`+arr.map(x=>`<option>${esc(x)}</option>`).join(''); }
fill('f-status','الحالة (الكل)',L['حالة الشكوى']); fill('f-imp','الأهمية (الكل)',L['درجة الأهمية']);
fill('f-sector','القطاع (الكل)',L['القطاع (الخدمة الرئيسية)']); fill('f-region','المنطقة (الكل)',L['المنطقة / المدينة']);
fill('f-nature','طبيعة الحل (الكل)',L['طبيعة الحل المطلوب']);
const selMap = {'f-status':'status','f-imp':'imp','f-sector':'sector','f-region':'region','f-nature':'nature','f-dup':'dup'};
function renderLog(){
  for(const id in selMap) if($(id).value!==F[selMap[id]]) $(id).value=F[selMap[id]];
  let list = rowsFor(null);
  if(sortCol!=null) list = list.slice().sort((a,b)=>{ const x=a[sortCol],y=b[sortCol]; if(x===y) return 0; if(x===''||x==null) return 1; if(y===''||y==null) return -1; return (x>y?1:-1)*sortDir; });
  tbl.tBodies[0].innerHTML = list.map(r=>`<tr>${r.slice(0,25).map((_,i)=>cell(r,i)).join('')}</tr>`).join('');
  $('count').textContent = `عدد النتائج: ${list.length} من ${rows.length}`;
}
for(const id in selMap) $(id).addEventListener('input',()=>{ F[selMap[id]]=$(id).value; renderAll(); });
$('q').addEventListener('input',()=>{ F.q=$('q').value.trim(); renderAll(); });
$('reset').onclick=()=>{ for(const k in F) F[k]=''; $('q').value=''; sortCol=null; renderAll(); };
tbl.tHead.rows[1].addEventListener('click',e=>{ const th=e.target.closest('th'); if(!th) return; const i=+th.dataset.i; sortDir=(sortCol===i)?-sortDir:1; sortCol=i; renderLog(); });

// ---------- القوائم ----------
const keys=Object.keys(L), maxLen=Math.max(...keys.map(k=>L[k].length));
$('lists').innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`+Array.from({length:maxLen},(_,i)=>`<tr>${keys.map(k=>`<td>${esc(L[k][i]||'')}</td>`).join('')}</tr>`).join('');

// ---------- تجميع ----------
const t=today; $('updated').textContent = `آخر تحديث: ${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
buildKpis();
function renderAll(){
  const fr = rowsFor(null);
  [...KPI1,...KPI2].forEach(d=>setKpi(d,fr));
  updateCharts(); renderTables(); renderMatch(); renderLog(); renderChips();
}
mkAll(); renderAll();

// ---------- التبويبات ----------
function show(name){
  if(!$('tab-'+name)) name='dashboard';
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active', x.id==='tab-'+name));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  window.scrollTo(0,0);
}
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) location.hash=b.dataset.tab; });
window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
show(location.hash.slice(1));
})();
