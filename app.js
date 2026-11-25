(function(){
const D = window.DATA, L = D.lists;
const RES='تم الحل', KEEP='حفظ/تعذر الحل';
const fmtD = s => { if(!s) return ''; const [y,m,d]=String(s).split('-'); return `${d}/${m}/${y}`; };
const pct = x => (x*100).toFixed(1)+'%';
const today = new Date(); today.setHours(0,0,0,0);
const days = s => Math.round((today - new Date(s+'T00:00:00'))/864e5);

// أعمدة الصف (0-based): A=0 ... Y=24
const C = {code:0,date:1,title:2,text:3,region:4,sector:5,nature:6,imp:7,auth:8,status:9,refDate:10,refTo:11,doneDate:12,resp:13,age:14,dup:21};
const rows = D.rows.map(r => {
  r = r.slice();
  r[C.resp] = (r[C.date] && r[C.doneDate]) ? Math.round((new Date(r[C.doneDate])-new Date(r[C.date]))/864e5) : '';
  r[C.age]  = (r[C.date] && r[C.status] && r[C.status]!==RES && r[C.status]!==KEEP) ? days(r[C.date]) : '';
  return r;
});

// ---------- مؤشرات ----------
const total = rows.length;
const resolved = rows.filter(r=>r[C.status]===RES).length;
const open = total - resolved;
const urgentOpen = rows.filter(r=>r[C.imp]==='عاجلة/حرجة' && r[C.status]!==RES).length;
const nums = a => a.filter(v=>v!=='' && !isNaN(v));
const avg = a => { a = nums(a); return a.length ? a.reduce((x,y)=>x+Number(y),0)/a.length : null; };
const count = (idx, list) => list.map(k => rows.filter(r=>r[idx]===k).length);
const cStatus = count(C.status, L['حالة الشكوى']);
const cSector = count(C.sector, L['القطاع (الخدمة الرئيسية)']);
const cRegion = count(C.region, L['المنطقة / المدينة']);
const cImp    = count(C.imp, L['درجة الأهمية']);
const cNature = count(C.nature, L['طبيعة الحل المطلوب']);
const top = (labels, vals) => labels[vals.indexOf(Math.max(...vals))];
const referred = rows.filter(r=>r[C.refDate]).length;

const kpiDefs1 = [
 ['إجمالي الشكاوى', total, '#1F4E5F'], ['شكاوى مفتوحة', open, '#B7791F'], ['تم الحل', resolved, '#2E7D32'],
 ['نسبة الحل', total? pct(resolved/total):'—', '#2E7D32'], ['عاجلة/حرجة مفتوحة', urgentOpen, '#C00000'],
 ['متوسط زمن الاستجابة (يوم)', avg(rows.map(r=>r[C.resp]))==null?'—':avg(rows.map(r=>r[C.resp])).toFixed(1), '#1F4E5F']];
const a2 = avg(rows.map(r=>r[C.age]));
const kpiDefs2 = [
 ['شكاوى مكررة', rows.filter(r=>r[C.dup]==='نعم').length, '#6B7280'],
 ['متوسط عمر المفتوحة (يوم)', a2==null?'—':a2.toFixed(1), '#6B7280'],
 ['أكثر قطاع شكاوى', top(L['القطاع (الخدمة الرئيسية)'], cSector), '#1F4E5F', 1],
 ['أكثر منطقة شكاوى', top(L['المنطقة / المدينة'], cRegion), '#1F4E5F', 1],
 ['تمت إحالتها للجهات', referred, '#B7791F'], ['لم تُحَل بعد للجهات', total-referred, '#B7791F']];
const kpiHTML = defs => defs.map(([l,v,c,sm]) =>
  `<div class="kpi"><div class="l" style="background:${c}">${l}</div><div class="v${sm?' sm':''}" style="color:${c}">${v}</div></div>`).join('');
document.getElementById('kpis1').innerHTML = kpiHTML(kpiDefs1);
document.getElementById('kpis2').innerHTML = kpiHTML(kpiDefs2);
document.getElementById('dashTitle').textContent = 'لوحة مؤشرات شكاوى المواطنين — محافظة جنوب سيناء';
document.getElementById('dashSub').textContent = `آخر تحديث: ${fmtD(today.toISOString().slice(0,10).replace(/(\d+)-(\d+)-(\d+)/,'$1-$2-$3'))} | المصدر: شيت «سجل الشكاوى» (تتحدث اللوحة تلقائياً مع أي إضافة أو تعديل)`;
// تصحيح تاريخ اليوم بالتوقيت المحلي
(function(){const t=today;const s=`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
 document.getElementById('dashSub').textContent=`آخر تحديث: ${s}  |  المصدر: شيت «سجل الشكاوى» (تتحدث اللوحة تلقائياً مع أي إضافة أو تعديل)`;})();

// ---------- الأسابيع ----------
const wkLabel = ([a,b]) => { const f=s=>{const [,m,d]=s.split('-');return `${+d}/${+m}`}; return `\u2066${f(a)} – ${f(b)}\u2069`; };
const wkCounts = D.weeks.map(([a,b]) => rows.filter(r=>r[C.date] && r[C.date]>=a && r[C.date]<=b).length);
const wkOut = total - wkCounts.reduce((x,y)=>x+y,0);
const wkLabels = D.weeks.map(wkLabel);

// ---------- جداول داعمة ----------
function block(title, labels, vals, totalLbl='الإجمالي'){
  const t = vals.reduce((a,b)=>a+b,0);
  return `<div class="blk"><h4>${title}</h4><table><tr><th>البند</th><th>العدد</th><th>النسبة</th></tr>`+
    labels.map((l,i)=>`<tr><td>${l}</td><td>${vals[i]}</td><td>${t?pct(vals[i]/t):'0.0%'}</td></tr>`).join('')+
    `<tr class="tot"><td>${totalLbl}</td><td>${t}</td><td>${t?'100.0%':'0.0%'}</td></tr></table></div>`;
}
const natLabels = L['طبيعة الحل المطلوب'];
document.getElementById('tables').innerHTML =
  `<div>${block('توزيع الحالة', L['حالة الشكوى'], cStatus)}${block('درجة الأهمية', L['درجة الأهمية'], cImp)}${block('طبيعة الحل المطلوب', natLabels, cNature)}</div>`+
  `<div>${block('توزيع الشكاوى حسب القطاع', L['القطاع (الخدمة الرئيسية)'], cSector)}`+
    `<div class="blk"><h4>إعدادات الأسابيع</h4><table><tr><th>بداية الأسبوع</th><th>نهاية الأسبوع</th></tr>${D.weeks.map(w=>`<tr><td>${fmtD(w[0])}</td><td>${fmtD(w[1])}</td></tr>`).join('')}</table></div></div>`+
  `<div>${block('توزيع الشكاوى حسب المنطقة', L['المنطقة / المدينة'], cRegion)}${block('الاتجاه الأسبوعي للشكاوى', [...wkLabels,'بدون تاريخ / خارج الأسابيع'], [...wkCounts,wkOut])}</div>`;

// ---------- الرسوم ----------
Chart.defaults.font.family = 'Cairo, Arial, sans-serif';
const base = {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}};
const lblOn = {datalabels:false};
const valLabels = { id:'vl', afterDatasetsDraw(ch){ if(ch.config.type==='doughnut') return;
  const {ctx}=ch; ctx.save(); ctx.font='11px Cairo, Arial'; ctx.fillStyle='#333';
  ch.getDatasetMeta(0).data.forEach((el,i)=>{ const v=ch.data.datasets[0].data[i]; const p=el.tooltipPosition();
    if(ch.options.indexAxis==='y'){ ctx.textAlign='right'; ctx.fillText(v, el.x-4 - 0, p.y+4); } else { ctx.textAlign='center'; ctx.fillText(v, p.x, el.y-4); } });
  ctx.restore(); } };
const bar = (id, labels, vals, color, horiz) => new Chart(document.getElementById(id), {
  type:'bar', plugins:[valLabels],
  data:{labels, datasets:[{data:vals, backgroundColor:color}]},
  options:{...base, indexAxis: horiz?'y':'x', layout:{padding: horiz?{left:24}:{top:16}},
    scales: horiz ? {x:{reverse:true, beginAtZero:true, ticks:{precision:0}}, y:{position:'right', reverse:false}} : {y:{beginAtZero:true,ticks:{precision:0}}}}
});
const palette = ['#5B7DB1','#E58E2B','#7FB069','#C94C4C','#8E7CC3','#B7791F','#6B7280','#2A9D8F'];
new Chart(document.getElementById('c-status'), {type:'doughnut',
  data:{labels:L['حالة الشكوى'], datasets:[{data:cStatus, backgroundColor:palette}]},
  options:{...base, cutout:'55%', plugins:{legend:{display:true, position:'bottom'}}}});
bar('c-sector', L['القطاع (الخدمة الرئيسية)'], cSector, '#1F4E5F', true);
bar('c-region', L['المنطقة / المدينة'], cRegion, '#00897B', true);
bar('c-imp', L['درجة الأهمية'], cImp, '#C00000', false);
bar('c-nature', natLabels, cNature, '#B7791F', true);
new Chart(document.getElementById('c-week'), {type:'line', plugins:[valLabels],
  data:{labels:[...wkLabels,'خارج الأسابيع'], datasets:[{data:[...wkCounts,wkOut], borderColor:'#1F4E5F', backgroundColor:'#1F4E5F', pointRadius:4, tension:0}]},
  options:{...base, layout:{padding:{top:18}}, scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});

// ---------- السجل ----------
document.getElementById('logTitle').textContent = D.title;
document.getElementById('logSub').textContent = D.subtitle;
const widths = [11,12,38,70,16,20,13,13,24,15,13,22,13,12,13,18,13,40,30,16,36,9,28,40,20];
const groups = [['بيانات الشكوى والتصنيف',9,'g-teal'],['المتابعة وحالة الشكوى',6,'g-amber'],['التواصل والتوثيق الميداني',6,'g-amber'],['ضبط جودة البيانات',4,'g-teal']];
const colCls = i => (i===13||i===14) ? 'g-gray' : (i>=9 && i<=20) ? 'g-amber' : 'g-teal';
const tbl = document.getElementById('log');
let sortCol=null, sortDir=1;
tbl.innerHTML = `<colgroup>${widths.map(w=>`<col style="width:${Math.round(w*7.5)}px">`).join('')}</colgroup>
 <thead><tr class="grp">${groups.map(g=>`<th colspan="${g[1]}" class="${g[2]}" style="color:#fff">${g[0]}</th>`).join('')}</tr>
 <tr class="hd">${D.heads.map((h,i)=>`<th class="${colCls(i)}" data-i="${i}">${h}</th>`).join('')}</tr></thead><tbody></tbody>`;
const statusCls = {'جديدة':'c-new','تحت الإجراء':'c-prog','جاري الحل':'c-work','تم الحل':'c-done',[KEEP]:'c-keep'};
const impCls = {'عاجلة/حرجة':'c-crit','متوسطة':'c-mid'};
const dateCols = new Set([1,10,12]);
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function cell(r,i){
  let v = r[i]; if(v===''||v==null) v='';
  if(dateCols.has(i)) v = fmtD(v);
  let cls='', inner = esc(v);
  if(i===2||i===3||i===8||i===20||i===23||i===24) cls='txt';
  if(i===9){ cls = 'status '+(statusCls[v]||''); }
  if(i===7) cls = impCls[v]||'';
  if(i===21 && v==='نعم') cls='c-crit';
  if(i===14 && v!=='' && v>14) cls='old';
  if((i===17||i===18) && v) inner = `<a href="${esc(v)}" target="_blank" rel="noopener">فتح الرابط</a>`;
  return `<td class="${cls}">${inner}</td>`;
}
function fill(sel, label, arr){ document.getElementById(sel).innerHTML = `<option value="">${label}</option>`+arr.map(x=>`<option>${x}</option>`).join(''); }
fill('f-status','الحالة (الكل)',L['حالة الشكوى']); fill('f-imp','الأهمية (الكل)',L['درجة الأهمية']);
fill('f-sector','القطاع (الكل)',L['القطاع (الخدمة الرئيسية)']); fill('f-region','المنطقة (الكل)',L['المنطقة / المدينة']);
function render(){
  const q = document.getElementById('q').value.trim();
  const f = {status:document.getElementById('f-status').value, imp:document.getElementById('f-imp').value,
    sector:document.getElementById('f-sector').value, region:document.getElementById('f-region').value, dup:document.getElementById('f-dup').value};
  let list = rows.filter(r =>
    (!f.status||r[C.status]===f.status)&&(!f.imp||r[C.imp]===f.imp)&&(!f.sector||r[C.sector]===f.sector)&&
    (!f.region||r[C.region]===f.region)&&(!f.dup||r[C.dup]===f.dup)&&
    (!q || (r[C.code]+' '+r[C.title]+' '+r[C.text]).includes(q)));
  if(sortCol!=null) list = list.slice().sort((a,b)=>{ const x=a[sortCol],y=b[sortCol];
    if(x===y) return 0; if(x===''||x==null) return 1; if(y===''||y==null) return -1;
    return (x>y?1:-1)*sortDir; });
  tbl.tBodies[0].innerHTML = list.map(r=>`<tr>${r.map((_,i)=>cell(r,i)).join('')}</tr>`).join('');
  document.getElementById('count').textContent = `عدد النتائج: ${list.length} من ${rows.length}`;
}
['q','f-status','f-imp','f-sector','f-region','f-dup'].forEach(id=>document.getElementById(id).addEventListener('input',render));
document.getElementById('reset').onclick=()=>{ ['q','f-status','f-imp','f-sector','f-region','f-dup'].forEach(id=>document.getElementById(id).value=''); sortCol=null; render(); };
tbl.tHead.rows[1].addEventListener('click',e=>{ const th=e.target.closest('th'); if(!th) return; const i=+th.dataset.i;
  sortDir = (sortCol===i) ? -sortDir : 1; sortCol=i; render(); });
render();

// ---------- القوائم ----------
const keys = Object.keys(L); const maxLen = Math.max(...keys.map(k=>L[k].length));
document.getElementById('lists').innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`+
  Array.from({length:maxLen},(_,i)=>`<tr>${keys.map(k=>`<td>${L[k][i]||''}</td>`).join('')}</tr>`).join('');

// ---------- التبويبات ----------
function show(name){
  if(!document.getElementById('tab-'+name)) name='dashboard';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.id==='tab-'+name));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
}
document.getElementById('tabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b){ location.hash=b.dataset.tab; }});
window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
show(location.hash.slice(1));
})();
