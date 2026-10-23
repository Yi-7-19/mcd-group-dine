import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allocate, splitBill, rankPlans} from '../src/split.mjs';
import {htmlReport} from '../src/report.mjs';
const fixture = () => JSON.parse(readFileSync(new URL('../examples/demo.json', import.meta.url)));
test('演示总额守恒并逐人检查预算', () => {
 const r=splitBill(fixture());
 assert.equal(r.people.reduce((s,p)=>s+p.dueCents,0),7300);
 // 优惠 1000 分的最大余数：a=338，b=376，c=286。
 assert.deepEqual(r.people.map(p=>p.dueCents),[2462,2724,2114]);
 assert.equal(r.withinBudget,true);
});
test('共享餐品一分钱只分配一次，成员排序不影响结果',()=>{
 assert.deepEqual(allocate(1,{c:1,a:1,b:1}),{a:1,b:0,c:0});
 assert.deepEqual(allocate(1,{b:1,c:1,a:1}),{a:1,b:0,c:0});
});
test('最大余数权重极大时仍然精确',()=>{
 const r=allocate(99999999,{a:Number.MAX_SAFE_INTEGER,b:Number.MAX_SAFE_INTEGER-1,c:1});
 assert.equal(Object.values(r).reduce((a,b)=>a+b),99999999);
 assert.equal(r.c,0);
});
test('全额优惠与均摊费用',()=>{
 const f=fixture();f.quote.basketDiscountCents=7700;f.quote.payableCents=600;
 assert.deepEqual(splitBill(f).people.map(p=>p.dueCents),[200,200,200]);
});
test('按金额比例分摊费用仍守恒',()=>{
 const f=fixture();f.feePolicy='proportional';const r=splitBill(f);
 assert.equal(r.people.reduce((s,p)=>s+p.feeCents,0),600);
 assert.equal(r.people.reduce((s,p)=>s+p.dueCents,0),7300);
});
test('超预算不被整单预算掩盖',()=>{
 const f=fixture();f.members[0].budgetCents=1000;const r=splitBill(f);
 assert.equal(r.withinBudget,false);assert.equal(r.people[0].overBudgetCents,1462);
});
test('缺失预算明确未知',()=>{
 const f=fixture();delete f.members[0].budgetCents;const r=splitBill(f);
 assert.equal(r.budgetsComplete,false);assert.equal(r.people[0].overBudgetCents,null);
 assert.match(htmlReport(r),/部分成员尚未提供预算/);
});
for(const [name,mutate,pattern] of [
 ['浮点元误作分',f=>f.quote.items[0].subtotalCents=22.5,/整数分/],
 ['未知归属',f=>f.quote.items[0].shares={stranger:1},/未知成员/],
 ['零分享权重',f=>f.quote.items[0].shares={a:0},/零权重/],
 ['重复成员',f=>f.members.push({...f.members[0]}),/成员 ID/],
 ['重复餐品',f=>f.quote.items.push({...f.quote.items[0]}),/餐品 ID/],
 ['负优惠',f=>f.quote.basketDiscountCents=-1,/整数分/],
 ['优惠大于总额',f=>f.quote.basketDiscountCents=9000,/不能超过/],
 ['应付与明细不符',f=>f.quote.payableCents=7299,/不守恒/],
 ['伪造实时模式缺少来源',f=>f.quote.mode='mcp',/真实报价/],
 ['错误费用规则',f=>f.feePolicy='random',/仅支持/],
 ['原型属性成员',f=>f.members[0].id='__proto__',/成员 ID/]
]) test(`拒绝${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>splitBill(f),pattern);});
test('不信任输入名称里的 HTML',()=>{
 const f=fixture();f.members[0].name='<img src=x onerror=alert(1)>';const html=htmlReport(splitBill(f));
 assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));
});
test('真实报价记录来源但不会自行声称证据已核验',()=>{
 const f=fixture();Object.assign(f.quote,{mode:'mcp',sourceTool:'calculate-price',storeId:'test-store',fulfillment:'pickup',quotedAt:'2026-10-23T12:00:00+08:00',evidenceRef:'private/test-call'});
 assert.match(splitBill(f).notice,/尚需/);
});
test('候选优先满足每个人预算，之后才比较总价',()=>{
 const a=fixture();a.label='原方案';const b=fixture();b.label='低总额但个人超预算';b.quote.items[0].subtotalCents=4000;b.quote.items[1].subtotalCents=1500;b.quote.items[2].subtotalCents=800;b.quote.payableCents=7100;
 assert.equal(rankPlans([b,a])[0].label,'原方案');
});
test('不允许用改变个人预算或门店的报价冒充候选',()=>{
 const a=fixture(),b=fixture();b.members[0].budgetCents=99999;
 assert.throws(()=>rankPlans([a,b]),/相同成员/);
});
test('1000 组确定性随机分摊均守恒且不负数',()=>{
 let seed=1024;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let i=0;i<1000;i++) {const total=rand(100000);const weights=Object.fromEntries(Array.from({length:2+rand(18)},(_,j)=>[`p${j}`,1+rand(100000)]));const r=allocate(total,weights);assert.equal(Object.values(r).reduce((a,b)=>a+b),total);assert.ok(Object.values(r).every(n=>n>=0));}
});
