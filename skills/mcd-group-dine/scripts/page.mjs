import {readFileSync} from 'node:fs';
import {foodImage,productImageKey} from './media.mjs';
import {brandCursorCss} from './cursor.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount = value => (value/100).toFixed(2);
const money = value => `¥${amount(value)}`;
const discountMoney = value => value ? '−'+money(value) : money(0);
const paths = {
  people:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-3-5"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  print:'<path d="M6 9V3h12v6M6 18H3v-8h18v8h-3M6 14h12v7H6zM17 11h1"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v12h5"/>',
  pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bag:'<path d="M5 7h14l1 14H4L5 7ZM8 7V5a4 4 0 0 1 8 0v2"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  food:'<path d="M3 14h18M4 18h16M5 21h14M4 10a8 6 0 0 1 16 0H4Z"/><path d="m8 6 1 1m4-2 1 1"/>',
  fries:'<path d="m6 10 2 12h10l2-12H6Z"/><path d="M8 10V3m4 7V1m4 9V4m3 6V2"/><path d="M10 16h6"/>',
};
const icon=(name,extra='')=>`<svg ${extra} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.info}</svg>`;
const row=(label,value,extra='')=>`<div class="data-row ${extra}"><dt>${label}</dt><dd>${value}</dd></div>`;
const scriptJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

function budgetState(person) {
  if (person.budgetCents == null) return {kind:'is-unknown',label:'待补充个人预算',detail:'预算未提供，暂不判断是否超支。',fill:0,icon:'info'};
  if (person.overBudgetCents) return {kind:'is-over',label:`超预算 ${money(person.overBudgetCents)}`,detail:`个人预算 ${money(person.budgetCents)}，需要调整餐品。`,fill:100,icon:'info'};
  return {kind:'',label:`预算内 · 上限 ${money(person.budgetCents)}`,detail:`还在预算内，余 ${money(person.budgetCents-person.dueCents)}。`,fill:person.budgetCents===0?0:Math.min(100,Math.round(person.dueCents/person.budgetCents*100)),icon:'check'};
}
function personCard(person,index,lines) {
  const b=budgetState(person);
  const owned=lines.filter(line=>(line.shares[person.id]??0)>0);
  return `<article class="person-card"><div class="person-top"><div class="person-header"><div class="person-identity"><span class="avatar" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><h3>${escape(person.name)}</h3></div><div class="person-pay"><p class="person-label">本次应付</p><p class="person-amount ${amount(person.dueCents).length>=9?'is-wide':''}" aria-label="应付 ${amount(person.dueCents)} 元"><span class="currency">¥</span>${amount(person.dueCents)}</p></div></div><p class="budget-state ${b.kind}">${icon(b.icon)}<span>${b.label}</span></p><div class="budget-track ${b.kind}" style="--budget-fill:${b.fill}%" aria-hidden="true"><span></span></div><span class="sr-only">${b.detail}</span><dl class="person-totals">${row('餐品分摊',money(person.grossCents))}${row('整单优惠',discountMoney(person.discountCents))}${row('附加费用',money(person.feeCents))}</dl></div><details class="person-details"><summary><span>餐品明细 <span class="sr-only">${escape(person.name)}</span></span>${icon('chevron','class="chevron"')}</summary><div class="member-items">${owned.length?owned.map(line=>`<div class="member-line"><span>${escape(line.name)}</span><span>${money(line.allocatedCents[person.id]??0)}</span></div>`).join(''):'<p>本单未分配餐品。</p>'}</div></details></article>`;
}
function productCard(line,people) {
  const key=productImageKey(line.name);
  const visual=key?`<div class="food-photo-wrap"><img class="food-photo" src="${foodImage(key)}" alt="${escape(line.name)}的 AI 食物示意图" width="640" height="640" loading="lazy" decoding="async"><span class="illustration-label">AI 餐品示意</span></div>`:`<div class="food-neutral">${icon('food')}<span>${Object.keys(line.shares).filter(id=>line.shares[id]>0).length>1?'共享餐品':'本单餐品'}</span></div>`;
  return `<article class="food-card">${visual}<div class="food-body"><h3>${escape(line.name)}</h3><p class="food-price">${money(line.subtotalCents)}<small>餐品小计</small></p><div class="food-owners" aria-label="餐品归属及分享权重">${Object.entries(line.shares).filter(([,weight])=>weight>0).map(([id,weight])=>`<span class="owner-chip">${escape(people.find(person=>person.id===id)?.name??id)} × ${weight}</span>`).join('')}</div></div></article>`;
}
function formattedDate(value) {
  const date=new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
function shareText(report) {
  const lines=['麦麦同桌 · 拼单清单',report.mode==='demo'?'演示数据，不是实时价格。':'MCP 试算快照，价格以官方实时结果为准。'];
  if(report.storeId) lines.push(`门店：${report.storeName??report.storeId}`);
  if(report.quotedAt) lines.push(`报价时间：${report.quotedAt}`);
  lines.push(`整单应付：${money(report.payableCents)}`,'');
  report.people.forEach(person=>lines.push(`${person.name}：${money(person.dueCents)}（餐品 ${money(person.grossCents)} − 整单优惠 ${money(person.discountCents)} + 费用 ${money(person.feeCents)}；${budgetState(person).label}）`));
  lines.push('',`餐品小计 ${money(report.subtotalCents)} · 整单优惠 ${money(report.discountCents)} · 附加费用 ${money(report.feeCents)}`,
    `费用${report.feePolicy==='equal'?'在所有成员间均摊':'按餐品金额比例分摊'}；未创建订单或收款。`);
  return lines.join('\n');
}

export function htmlReport(report) {
  const people=report.people??[],lines=report.lines??[];
  const css=readFileSync(new URL('./ui-styles.css',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./ui-print.css',import.meta.url),'utf8')+'\n'+brandCursorCss();
  const motion=readFileSync(new URL('./ui-motion.js',import.meta.url),'utf8');
  const client=readFileSync(new URL('./ui-client.js',import.meta.url),'utf8');
  const mode=report.mode==='demo'?'演示账单':'MCP 试算账单';
  const date=formattedDate(report.quotedAt);
  const fulfillment={pickup:'到店取餐',delivery:'麦乐送','dine-in':'堂食'}[report.fulfillment]??'模拟场景';
  const budget=report.budgetsComplete?(report.withinBudget?'每位成员都在自己的预算内。':'有成员超出预算，请调整餐品后重新试算。'):'部分成员尚未提供预算，暂不能确认全员符合预算。';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#c72029"><meta name="color-scheme" content="light"><title>麦麦同桌 · 拼单账单</title><style>${css}</style></head>
<body><a class="skip-link" href="#people-title">跳到分账清单</a><header class="site-header"><div class="container header-inner"><a class="brand" href="#top" aria-label="麦麦同桌，回到页面顶部"><span class="brand-mark">${icon('fries')}</span><span class="brand-type"><strong>麦麦同桌</strong><small>GOOD FOOD. FAIR SHARE.</small></span></a><nav class="nav" aria-label="账单内容导航"><a href="#people" aria-current="location">每个人的账单</a><a href="#food">这单吃什么</a><a href="#rules">分摊规则</a></nav><div class="header-actions"><span class="mode-badge">${icon('receipt')}${mode}</span><button class="button button-quiet" type="button" data-print aria-label="打印账单或保存为 PDF">${icon('print')}<span>打印账单</span></button></div></div></header>
<noscript><style>[data-copy],[data-print]{display:none!important}</style><p class="noscript-note">清单与餐品明细可正常查看。复制请手动选择文字，打印请使用浏览器菜单。</p></noscript>
<main id="top"><section class="hero-wrap" aria-labelledby="hero-title"><div class="container hero"><div class="hero-copy"><p class="eyebrow">一起点餐，分得明白</p><h1 id="hero-title">同一桌的快乐，<br><em>每一分都清楚。</em></h1><p class="hero-description">${people.length} 人拼单，餐品各有归属，共享餐品也能分清。<br>${escape(budget)}</p><div class="hero-actions"><a class="button button-primary" href="#people-title">查看分账清单 ${icon('arrow')}</a><button class="button button-secondary" type="button" data-copy>${icon('copy')}复制清单</button></div><p class="hero-assurance">${icon('check')}只做试算和分账，未创建订单或收款。</p></div><figure class="hero-visual"><div class="hero-photo-wrap"><img class="hero-photo" src="${foodImage('hero')}" width="1200" height="800" alt="汉堡、金黄薯条与冰饮组成的暖色聚餐氛围图" fetchpriority="high" decoding="async"></div><div class="hero-sticker"><span class="sticker-icon" aria-hidden="true">${people.length}</span><span><strong>一起吃，更开心</strong><small>位同桌伙伴 · 每一份都清楚</small></span></div><figcaption class="photo-note">AI 氛围示意，实际餐品以本单明细为准</figcaption></figure></div></section>
<div class="container workspace"><div class="order-context" aria-label="报价背景"><span class="context-part">${icon('pin')}<span>门店：<b>${escape(report.storeName??report.storeId??'模拟数据')}</b></span></span><span class="context-part">${icon('bag')}<span>方式：<b>${escape(fulfillment)}</b></span></span><span class="context-part">${icon('clock')}<span>${date?`报价：<time datetime="${escape(report.quotedAt)}">${escape(date)}</time>（北京时间）`:'离线演示 · 非实时价格'}</span></span></div>
<div class="layout"><aside class="summary-column" aria-labelledby="summary-title"><section class="summary-card"><div class="summary-head"><p class="eyebrow">这一桌，分得明白</p><h2 id="summary-title">整单应付</h2><p class="summary-amount ${amount(report.payableCents).length>=9?'is-wide':''}" aria-label="整单应付 ${amount(report.payableCents)} 元"><span class="currency">¥</span>${amount(report.payableCents)}</p><p class="summary-sub">${icon('check')}${people.length} 人分账之和 = ${money(report.payableCents)}</p></div><div class="summary-content"><details class="summary-breakdown" open><summary><span>优惠与费用明细</span>${icon('chevron','class="chevron"')}</summary><dl class="summary-lines">${row('餐品小计',money(report.subtotalCents))}${row('整单优惠',discountMoney(report.discountCents),'discount')}${row('附加费用',money(report.feeCents))}${row('合计应付',money(report.payableCents),'summary-final')}</dl></details><p class="summary-status">${icon(report.budgetsComplete&&report.withinBudget?'check':'info')}<span>${escape(budget)}</span></p><button class="button button-primary" type="button" data-print>${icon('print')}打印 / 存为 PDF</button><p class="summary-foot">打印时会包含完整分账与餐品明细</p></div></section></aside>
<div class="main-column"><section class="content-section" id="people" aria-labelledby="people-title"><div class="section-heading"><span class="section-number" aria-hidden="true">01</span><h2 id="people-title" tabindex="-1">每个人的账单</h2><span class="section-count">${people.length} 位同桌伙伴</span></div><p class="section-description">餐品归各自，优惠与费用按约定分摊。点开明细，查看每一项餐品。</p><div class="people-grid">${people.length?people.map((person,index)=>personCard(person,index,lines)).join(''):'<p class="empty-state">暂时没有成员。请在客户端补充成员信息后重新生成账单。</p>'}</div></section>
<section class="content-section" id="food" aria-labelledby="food-title"><div class="section-heading"><span class="section-number" aria-hidden="true">02</span><h2 id="food-title" tabindex="-1">这单吃什么</h2><span class="section-count">${lines.length} 项餐品</span></div><p class="section-description">图片为食物示意；价格、归属与分享权重以本次报价清单为准。</p><div class="food-grid">${lines.length?lines.map(line=>productCard(line,people)).join(''):'<p class="empty-state">尚无餐品明细，请在客户端核对购物车后重新试算。</p>'}</div></section>
<section class="content-section" id="rules" aria-labelledby="rules-title"><div class="section-heading"><span class="section-number" aria-hidden="true">03</span><h2 id="rules-title" tabindex="-1">分摊规则</h2></div><details class="rules-card" open><summary><span>这笔账，是这样分的</span>${icon('chevron','class="chevron"')}</summary><div class="rules-body"><ol><li>餐品按归属或分享权重分摊，共享餐品的份额由成员约定。</li><li>整单优惠按各人餐品金额比例分摊；已经计入餐品小计的优惠不会重复扣减。</li><li>附加费用${report.feePolicy==='equal'?'在所有列出的成员间均摊':'按各人餐品金额比例分摊'}。</li><li>金额全程按整数分计算。分不足一分钱时采用最大余数法，余数相同按成员 ID 顺序补齐。</li></ol></div></details><div class="summary-notice"><strong>${report.mode==='demo'?'这是模拟账单':'这是当次试算快照'}</strong><p>${escape(report.notice)}</p></div></section></div></div>
<section class="bottom-actions" aria-label="分享分账清单"><div><strong>分清楚了，就一起开吃吧。</strong><p>把每个人的应付和分摊说明复制给同桌伙伴。</p></div><button class="button button-primary" type="button" data-copy>${icon('copy')}复制分账清单</button></section><section class="manual-copy" id="manual-copy" hidden aria-labelledby="manual-copy-title"><h3 id="manual-copy-title">手动复制分账清单</h3><p>浏览器未允许自动复制。下方文字已选中，可使用系统的复制操作。</p><label class="sr-only" for="copy-text">完整分账清单</label><textarea id="copy-text" readonly spellcheck="false"></textarea><button class="button button-quiet" id="close-manual" type="button">${icon('close')}收起手动复制</button></section>
<footer class="site-footer"><div><p class="footer-signature">麦麦同桌 · 一起吃，分得明白</p><p>独立参赛作品，非麦当劳官方产品。AI 配图为示意，不代表官方商品外观。</p></div><p class="footer-end">餐品、优惠、价格和供应以官方实时结果为准。<br>当前为试算账单，未创建订单或收款。</p></footer></div></main><div class="status-message" id="action-status" role="status" aria-live="polite" aria-atomic="true" hidden></div><script type="application/json" id="bill-copy-data">${scriptJson(shareText(report))}</script><script>${motion}</script><script>${client}</script></body></html>`;
}
