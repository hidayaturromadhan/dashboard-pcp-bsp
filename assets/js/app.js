const storageKey = 'pcp_bsp_monitoring_data_v1';
let currentRole = 'Operator';
let productionChart, statusChart, predictionChart;

const sampleData = [
  {date:'2026-05-22', well:'PDD#021', area:'Pedada', status:'Running', bfpd:820, bopd:312, waterCut:62, efficiency:78, cost:240000000, usdRate:16000, oilPrice:80, remarks:'Normal operation'},
  {date:'2026-05-23', well:'PDD#025', area:'Zamrud', status:'Running', bfpd:760, bopd:298, waterCut:60, efficiency:74, cost:210000000, usdRate:16000, oilPrice:80, remarks:'Stabil'},
  {date:'2026-05-24', well:'PDD#031', area:'West Area', status:'Standby', bfpd:540, bopd:190, waterCut:65, efficiency:61, cost:180000000, usdRate:16050, oilPrice:79, remarks:'Standby pengecekan'},
  {date:'2026-05-25', well:'PDD#044', area:'Pedada', status:'Shutdown', bfpd:0, bopd:0, waterCut:0, efficiency:0, cost:300000000, usdRate:16050, oilPrice:79, remarks:'Shutdown maintenance'},
  {date:'2026-05-26', well:'PDD#052', area:'Zamrud', status:'Running', bfpd:880, bopd:335, waterCut:61, efficiency:82, cost:260000000, usdRate:16100, oilPrice:81, remarks:'Produksi meningkat'},
  {date:'2026-05-27', well:'PDD#021', area:'Pedada', status:'Running', bfpd:840, bopd:320, waterCut:62, efficiency:79, cost:245000000, usdRate:16100, oilPrice:81, remarks:'Normal'}
];

function getData(){
  const stored = localStorage.getItem(storageKey);
  if(!stored){ localStorage.setItem(storageKey, JSON.stringify(sampleData)); return sampleData; }
  return JSON.parse(stored);
}
function saveData(data){ localStorage.setItem(storageKey, JSON.stringify(data)); }
function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n || 0); }
function usd(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n || 0); }
function number(n){ return new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }
function calcRevenue(row){
  const grossUsd = row.bopd * row.oilPrice;
  const grossIdr = grossUsd * row.usdRate;
  const net = grossIdr - row.cost;
  const costPct = grossIdr > 0 ? (row.cost / grossIdr) * 100 : 0;
  return {grossUsd,grossIdr,net,costPct};
}
function sum(data, key){ return data.reduce((a,b)=>a+(Number(b[key])||0),0); }
function avg(data, key){ return data.length ? sum(data,key)/data.length : 0; }

// ── Dark chart defaults ─────────────────────────────────────
const CHART_COLORS = {
  teal:    'rgba(20,184,166,1)',
  sky:     'rgba(56,189,248,1)',
  amber:   'rgba(245,158,11,1)',
  rose:    'rgba(244,63,94,1)',
  violet:  'rgba(139,92,246,1)',
  tealBg:  'rgba(20,184,166,0.12)',
  skyBg:   'rgba(56,189,248,0.12)',
  amberBg: 'rgba(245,158,11,0.12)',
  roseBg:  'rgba(244,63,94,0.12)',
};

function darkChartDefaults(){
  Chart.defaults.color = '#9fb0c7';
  Chart.defaults.borderColor = 'rgba(56,189,248,0.09)';
  Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.animation.duration = 850;
  Chart.defaults.animation.easing = 'easeOutQuart';
  Chart.defaults.plugins.legend.labels.color = '#b7c4d8';
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.borderRadius = 5;
  Chart.defaults.plugins.legend.labels.useBorderRadius = true;
  Chart.defaults.plugins.legend.labels.padding = 18;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(8,14,26,0.96)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(56,189,248,0.25)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
  Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
  Chart.defaults.plugins.tooltip.padding = 13;
  Chart.defaults.plugins.tooltip.cornerRadius = 14;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.scale.grid = { color: 'rgba(56,189,248,0.08)', drawTicks:false };
  Chart.defaults.scale.ticks = { color: '#7890ad', padding: 10 };
}

const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart, args, pluginOptions) {
    if (!pluginOptions || !pluginOptions.text) return;
    const {ctx, chartArea} = chart;
    if (!chartArea) return;
    ctx.save();
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(pluginOptions.text, centerX, centerY - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(pluginOptions.subtext || '', centerX, centerY + 18);
    ctx.restore();
  }
};

function makeGradient(ctx, color){
  const gradient = ctx.createLinearGradient(0, 0, 0, 360);
  gradient.addColorStop(0, color.replace('1)', '.30)'));
  gradient.addColorStop(.55, color.replace('1)', '.10)'));
  gradient.addColorStop(1, color.replace('1)', '0)'));
  return gradient;
}

function compactRupiahMillion(value){
  return `${number(value)} jt`;
}

function baseLineDataset({label, data, color, yAxisID='y', fill=false, borderDash=[]}){
  return {
    label,
    data,
    yAxisID,
    borderColor: color,
    backgroundColor: fill ? undefined : color.replace('1)', '.10)'),
    borderWidth: 3,
    borderDash,
    tension: .42,
    cubicInterpolationMode: 'monotone',
    fill,
    pointRadius: 3,
    pointHoverRadius: 7,
    pointBorderWidth: 2,
    pointBorderColor: '#0f1d30',
    pointBackgroundColor: color,
    pointHoverBackgroundColor: '#ffffff',
    pointHoverBorderColor: color,
  };
}

function setPage(page){
  document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.menu-link').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  const titles = {dashboard:'Dashboard Aktual', prediction:'Dashboard Prediksi', input:'Input Data Operator', monitoring:'Data Monitoring', report:'Laporan'};
  document.getElementById('pageTitle').textContent = titles[page];
  // Re-render charts after section becomes visible
  if(page === 'dashboard') setTimeout(renderCharts, 50);
  if(page === 'prediction') setTimeout(renderPrediction, 50);
}

function renderCards(){
  const data = getData();
  const running   = data.filter(d=>d.status==='Running').length;
  const shutdown  = data.filter(d=>d.status==='Shutdown').length;
  const standby   = data.filter(d=>d.status==='Standby').length;
  const remaining = data.filter(d=>d.status==='Remaining').length;
  const totalBfpd = sum(data,'bfpd');
  const totalBopd = sum(data,'bopd');
  const avgWater  = avg(data,'waterCut');
  const avgEff    = avg(data,'efficiency');
  const latest    = data[data.length-1] || {usdRate:16000,oilPrice:80};
  const totalCost = sum(data,'cost');
  const grossUsd  = data.reduce((a,b)=>a+calcRevenue(b).grossUsd,0);
  const grossIdr  = data.reduce((a,b)=>a+calcRevenue(b).grossIdr,0);
  const netRevenue= grossIdr - totalCost;
  const costPct   = grossIdr ? (totalCost/grossIdr)*100 : 0;

  const cards = [
    ['PCP Running',       running,                  'Pompa aktif',              'bi-check-circle',   'teal'],
    ['PCP Shutdown',      shutdown,                 'Pompa berhenti',           'bi-x-circle',       'rose'],
    ['PCP Standby',       standby,                  'Pompa standby',            'bi-pause-circle',   'amber'],
    ['Remaining Pump',    remaining,                'Downhole pump',            'bi-tools',          'sky'],
    ['Total BFPD',        number(totalBfpd),        'Barrel Fluid Per Day',     'bi-water',          'sky'],
    ['Total BOPD',        number(totalBopd),        'Barrel Oil Per Day',       'bi-fuel-pump',      'teal'],
    ['Avg Water Cut',     avgWater.toFixed(1)+'%',  'Rata-rata kandungan air',  'bi-percent',        'amber'],
    ['Avg Efficiency',    avgEff.toFixed(1)+'%',    'Rata-rata efisiensi pompa','bi-speedometer',    'sky'],
    ['Kurs USD',          rupiah(latest.usdRate),   'Kurs terbaru',             'bi-currency-dollar','amber'],
    ['ICP / Harga Minyak',usd(latest.oilPrice),    'Harga per barrel',         'bi-cash-coin',      'gold'],
    ['Gross Revenue USD', usd(grossUsd),            'Estimasi pendapatan kotor','bi-graph-up',       'teal'],
    ['Gross Revenue IDR', rupiah(grossIdr),         'Konversi dari USD',        'bi-bank',           'sky'],
    ['Cost PCPP',         rupiah(totalCost),        'Total biaya PCPP',         'bi-wallet2',        'rose'],
    ['Percentage Cost',   costPct.toFixed(2)+'%',   'Cost terhadap revenue',    'bi-pie-chart',      'amber'],
    ['Net Revenue',       rupiah(netRevenue),       'Revenue dikurangi cost',   'bi-trophy',         'teal'],
  ];

  const colorMap = {
    teal:  { icon:'rgba(20,184,166,.15)',  text:'#14b8a6' },
    sky:   { icon:'rgba(56,189,248,.15)',  text:'#38bdf8' },
    amber: { icon:'rgba(245,158,11,.15)',  text:'#f59e0b' },
    rose:  { icon:'rgba(244,63,94,.15)',   text:'#f43f5e' },
    gold:  { icon:'rgba(245,158,11,.15)',  text:'#f59e0b' },
  };

  document.getElementById('actualCards').innerHTML = cards.map(c=>{
    const clr = colorMap[c[4]] || colorMap.sky;
    return `
    <div class="col-sm-6 col-xl-3 col-lg-4">
      <div class="metric-card">
        <div class="metric-top">
          <div style="flex:1;min-width:0">
            <div class="metric-label">${c[0]}</div>
            <div class="metric-value">${c[1]}</div>
          </div>
          <div class="metric-icon" style="background:${clr.icon};color:${clr.text};border-color:${clr.text}22">
            <i class="bi ${c[3]}"></i>
          </div>
        </div>
        <div class="metric-desc mt-2">${c[2]}</div>
      </div>
    </div>`;
  }).join('');

  renderReport({running,shutdown,standby,totalBopd,grossIdr,totalCost,netRevenue,costPct});
}

function renderCharts(){
  darkChartDefaults();
  if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('centerText')) {
    Chart.register(centerTextPlugin);
  }
  const data = getData();
  const labels  = data.map(d=>d.date.slice(5));
  const bopd    = data.map(d=>d.bopd);
  const revenue = data.map(d=>Math.round(calcRevenue(d).grossIdr/1000000));
  const cost    = data.map(d=>Math.round(d.cost/1000000));
  const net     = data.map(d=>Math.round(calcRevenue(d).net/1000000));

  const productionCanvas = document.getElementById('productionChart');
  const pctx = productionCanvas.getContext('2d');

  if(productionChart) productionChart.destroy();
  const bopdDataset = baseLineDataset({label:'BOPD', data:bopd, color:CHART_COLORS.teal, yAxisID:'yBopd', fill:true});
  bopdDataset.backgroundColor = makeGradient(pctx, CHART_COLORS.teal);

  productionChart = new Chart(productionCanvas,{
    type:'line',
    data:{labels,datasets:[
      bopdDataset,
      baseLineDataset({label:'Gross Revenue (Juta Rp)', data:revenue, color:CHART_COLORS.sky, yAxisID:'yMoney'}),
      baseLineDataset({label:'Cost (Juta Rp)', data:cost, color:CHART_COLORS.rose, yAxisID:'yMoney'}),
      baseLineDataset({label:'Net Revenue (Juta Rp)', data:net, color:CHART_COLORS.amber, yAxisID:'yMoney'}),
    ]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      layout:{padding:{top:8,right:8,bottom:2,left:2}},
      plugins:{
        legend:{position:'bottom', align:'start'},
        tooltip:{
          callbacks:{
            label(ctx){
              const label = ctx.dataset.label || '';
              const value = ctx.parsed.y || 0;
              return label.includes('BOPD') ? `${label}: ${number(value)} barrel` : `${label}: ${compactRupiahMillion(value)}`;
            }
          }
        }
      },
      scales:{
        x:{grid:{display:false}, ticks:{maxRotation:0}},
        yBopd:{
          type:'linear', position:'left', beginAtZero:true,
          title:{display:true,text:'Produksi BOPD',color:'#94a3b8',font:{weight:'700'}},
          ticks:{callback:v=>number(v)}
        },
        yMoney:{
          type:'linear', position:'right', beginAtZero:true,
          title:{display:true,text:'Finansial Juta Rp',color:'#94a3b8',font:{weight:'700'}},
          grid:{drawOnChartArea:false},
          ticks:{callback:v=>`${number(v)} jt`}
        }
      }
    }
  });

  const statuses     = ['Running','Shutdown','Standby','Remaining'];
  const statusValues = statuses.map(s=>data.filter(d=>d.status===s).length);
  const statusColors = ['#14b8a6','#f43f5e','#f59e0b','#38bdf8'];
  const totalStatus = statusValues.reduce((a,b)=>a+b,0);
  if(statusChart) statusChart.destroy();
  statusChart = new Chart(document.getElementById('statusChart'),{
    type:'doughnut',
    data:{labels:statuses, datasets:[{
      data: statusValues,
      backgroundColor: ['rgba(20,184,166,.78)','rgba(244,63,94,.78)','rgba(245,158,11,.78)','rgba(56,189,248,.78)'],
      borderColor:     statusColors,
      borderWidth: 2,
      hoverOffset: 10,
      spacing: 4,
      borderRadius: 8
    }]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'70%',
      plugins:{
        legend:{display:false},
        centerText:{text:number(totalStatus), subtext:'TOTAL PCP'},
        tooltip:{callbacks:{label(ctx){ return `${ctx.label}: ${ctx.parsed} unit`; }}}
      }
    }
  });

  const legend = document.getElementById('statusChartLegend');
  if(legend){
    legend.innerHTML = statuses.map((s,i)=>`
      <div class="legend-pill">
        <span><span class="dot" style="background:${statusColors[i]};color:${statusColors[i]}"></span>${s}</span>
        <strong>${statusValues[i]}</strong>
      </div>`).join('');
  }
  renderPrediction();
}

function renderPrediction(){
  darkChartDefaults();
  if (typeof Chart !== 'undefined' && !Chart.registry.plugins.get('centerText')) {
    Chart.register(centerTextPlugin);
  }
  const data = getData();
  const period = document.getElementById('predictionPeriod')?.value || 'harian';
  const windowSize = period === 'bulanan' ? 6 : period === 'mingguan' ? 4 : 3;
  const last = data.slice(-windowSize);
  const latest = data[data.length-1] || {usdRate:16000,oilPrice:80};
  const predictedBopd    = avg(last,'bopd');
  const predictedCost    = avg(last,'cost');
  const predictedWater   = avg(last,'waterCut');
  const predictedEff     = avg(last,'efficiency');
  const predictedGrossUsd= predictedBopd * latest.oilPrice;
  const predictedGrossIdr= predictedGrossUsd * latest.usdRate;
  const predictedNet     = predictedGrossIdr - predictedCost;
  const predictedPct     = predictedGrossIdr ? (predictedCost / predictedGrossIdr) * 100 : 0;

  const cards = [
    ['Prediksi BOPD',      number(predictedBopd),    `Moving Average ${windowSize} data terakhir`, 'sky'],
    ['Prediksi Revenue USD',usd(predictedGrossUsd),  'Prediksi BOPD x ICP',      'teal'],
    ['Prediksi Revenue Rp', rupiah(predictedGrossIdr),'Revenue USD x kurs',       'teal'],
    ['Prediksi Cost PCPP',  rupiah(predictedCost),   'Rata-rata cost terakhir',   'rose'],
    ['Prediksi Cost %',     predictedPct.toFixed(2)+'%','Cost terhadap revenue',  'amber'],
    ['Prediksi Net Revenue',rupiah(predictedNet),    'Revenue dikurangi cost',    'teal'],
    ['Prediksi Water Cut',  predictedWater.toFixed(1)+'%','Estimasi kandungan air','amber'],
    ['Prediksi Efisiensi',  predictedEff.toFixed(1)+'%', 'Estimasi performa pompa','sky'],
  ];

  document.getElementById('predictionCards').innerHTML = cards.map(c=>`
    <div class="col-sm-6 col-xl-3 col-lg-4">
      <div class="metric-card">
        <div class="metric-label">${c[0]}</div>
        <div class="metric-value">${c[1]}</div>
        <div class="metric-desc mt-1">${c[2]}</div>
      </div>
    </div>`).join('');

  const labels    = data.map(d=>d.date.slice(5)).concat(['Prediksi']);
  const actual    = data.map(d=>d.bopd).concat(null);
  const forecastLine = data.map(()=>null);
  if(data.length){ forecastLine[forecastLine.length-1] = data[data.length-1].bopd; }
  forecastLine.push(Math.round(predictedBopd));

  const predictionCanvas = document.getElementById('predictionChart');
  const ctx = predictionCanvas.getContext('2d');
  if(predictionChart) predictionChart.destroy();

  const actualDataset = baseLineDataset({label:'BOPD Aktual', data:actual, color:CHART_COLORS.teal, fill:true});
  actualDataset.backgroundColor = makeGradient(ctx, CHART_COLORS.teal);

  predictionChart = new Chart(predictionCanvas,{
    type:'line',
    data:{labels,datasets:[
      actualDataset,
      baseLineDataset({label:'BOPD Prediksi', data:forecastLine, color:CHART_COLORS.amber, fill:false, borderDash:[8,5]}),
    ]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      layout:{padding:{top:8,right:12,bottom:2,left:2}},
      plugins:{
        legend:{position:'bottom', align:'start'},
        tooltip:{callbacks:{label(ctx){ return `${ctx.dataset.label}: ${number(ctx.parsed.y || 0)} barrel`; }}}
      },
      scales:{
        x:{grid:{display:false}, ticks:{maxRotation:0}},
        y:{beginAtZero:true, title:{display:true,text:'Produksi BOPD',color:'#94a3b8',font:{weight:'700'}}, ticks:{callback:v=>number(v)}}
      }
    }
  });
}

function renderTable(filtered){
  const data = filtered || getData();
  document.getElementById('monitoringTable').innerHTML = data.map(row=>{
    const r = calcRevenue(row);
    return `<tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94a3b8">${row.date}</span></td>
      <td><strong style="color:#e2eaf6">${row.well}</strong></td>
      <td><span style="color:#94a3b8">${row.area}</span></td>
      <td><span class="badge-status status-${row.status.toLowerCase()}">${row.status}</span></td>
      <td>${number(row.bfpd)}</td>
      <td><strong style="color:#14b8a6">${number(row.bopd)}</strong></td>
      <td>${row.waterCut}%</td>
      <td>${row.efficiency}%</td>
      <td><span style="font-size:13px">${rupiah(r.grossIdr)}</span></td>
      <td><strong style="color:${r.net>=0?'#10b981':'#f43f5e'}">${rupiah(r.net)}</strong></td>
    </tr>`;
  }).join('');
}

function renderReport(metric){
  const items = [
    ['Total BOPD',      number(metric.totalBopd),          'bi-fuel-pump',  '#14b8a6'],
    ['Gross Revenue',   rupiah(metric.grossIdr),            'bi-graph-up',   '#38bdf8'],
    ['Total Cost PCPP', rupiah(metric.totalCost),           'bi-wallet2',    '#f43f5e'],
    ['Net Revenue',     rupiah(metric.netRevenue),          'bi-trophy',     '#10b981'],
    ['Percentage Cost', metric.costPct.toFixed(2)+'%',      'bi-pie-chart',  '#f59e0b'],
    ['PCP Running',     metric.running + ' unit',           'bi-check-circle','#14b8a6'],
  ];
  document.getElementById('reportSummary').innerHTML = items.map(i=>`
    <div class="col-md-6">
      <div class="p-3 rounded-4 bg-light d-flex align-items-center gap-3">
        <div style="width:40px;height:40px;border-radius:12px;background:${i[3]}20;color:${i[3]};display:grid;place-items:center;font-size:18px;flex-shrink:0">
          <i class="bi ${i[2]}"></i>
        </div>
        <div>
          <small class="text-muted">${i[0]}</small>
          <h5 class="mb-0" style="font-family:'Syne',sans-serif;color:#fff">${i[1]}</h5>
        </div>
      </div>
    </div>`).join('');
}

function refreshAll(){ renderCards(); renderCharts(); renderTable(); }

// ── Event Listeners ───────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', e=>{
  e.preventDefault();
  currentRole = document.getElementById('loginRole').value;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('sidebarRole').textContent = currentRole;
  document.getElementById('activeRoleBadge').textContent = currentRole;
  document.getElementById('sidebarName').textContent = currentRole === 'Operator' ? 'Operator BSP' : 'Monitor BSP';
  document.querySelectorAll('.operator-only').forEach(el=>el.style.display = currentRole==='Operator' ? 'flex' : 'none');
  if(currentRole === 'Monitor') setPage('dashboard');
  // Delay so canvas elements are fully visible before Chart.js renders
  setTimeout(refreshAll, 100);
});

document.getElementById('logoutBtn').addEventListener('click',()=>document.getElementById('loginScreen').classList.remove('hidden'));
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('show');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
document.getElementById('toggleSidebar').addEventListener('click',()=>{
  const open = document.getElementById('sidebar').classList.toggle('show');
  document.getElementById('sidebarOverlay').classList.toggle('show', open);
});
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.querySelectorAll('.menu-link').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();
  setPage(a.dataset.page);
  closeSidebar();
}));
document.getElementById('refreshBtn').addEventListener('click', refreshAll);

document.getElementById('monitoringForm').addEventListener('submit', e=>{
  e.preventDefault();
  const row = {
    date:       inputDate.value,
    well:       wellName.value,
    area:       fieldArea.value,
    status:     pcpStatus.value,
    bfpd:       Number(bfpd.value),
    bopd:       Number(bopd.value),
    waterCut:   Number(waterCut.value),
    efficiency: Number(efficiency.value),
    cost:       Number(cost.value),
    usdRate:    Number(usdRate.value),
    oilPrice:   Number(oilPrice.value),
    remarks:    remarks.value
  };
  if(row.bopd > row.bfpd){ alert('BOPD tidak boleh lebih besar dari BFPD.'); return; }
  if(row.waterCut < 0 || row.waterCut > 100 || row.efficiency < 0 || row.efficiency > 100){
    alert('Water Cut dan Efisiensi harus 0-100%.'); return;
  }
  const data = getData();
  const duplicate = data.some(d=>d.date===row.date && d.well===row.well);
  if(duplicate && !confirm('Data tanggal dan sumur yang sama sudah ada. Tetap simpan?')) return;
  data.push(row); saveData(data);
  e.target.reset();
  inputDate.valueAsDate = new Date();
  refreshAll();
  setPage('dashboard');
  alert('Data berhasil disimpan!');
});

document.getElementById('applyFilter').addEventListener('click',()=>{
  const date = filterDate.value;
  const kw   = filterKeyword.value.toLowerCase();
  const filtered = getData().filter(d=>
    (!date || d.date===date) &&
    (!kw   || `${d.well} ${d.area} ${d.status}`.toLowerCase().includes(kw))
  );
  renderTable(filtered);
});
document.getElementById('resetFilter').addEventListener('click',()=>{ filterDate.value=''; filterKeyword.value=''; renderTable(); });

document.getElementById('exportCsv').addEventListener('click',()=>{
  const rows   = getData();
  const header = ['Tanggal','Sumur','Area','Status','BFPD','BOPD','Water Cut','Efisiensi','Cost','Kurs USD','Harga Minyak','Gross Revenue IDR','Net Revenue'];
  const csv    = [header.join(','), ...rows.map(r=>[r.date,r.well,r.area,r.status,r.bfpd,r.bopd,r.waterCut,r.efficiency,r.cost,r.usdRate,r.oilPrice,calcRevenue(r).grossIdr,calcRevenue(r).net].join(','))].join('\n');
  const blob   = new Blob([csv],{type:'text/csv'});
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = 'laporan-monitoring-pcp-bsp.csv'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('predictionPeriod').addEventListener('change', ()=>setTimeout(renderPrediction, 50));
inputDate.valueAsDate = new Date();

// Init — DO NOT render charts here; canvas is hidden until login
renderCards();
renderTable();
