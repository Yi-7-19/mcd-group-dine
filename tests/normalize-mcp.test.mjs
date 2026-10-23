import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMcpQuote} from '../src/normalize-mcp.mjs';
import {splitBill} from '../src/split.mjs';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/calculate-price-live.sanitized.json', import.meta.url)));
const members = [
  {id: 'a', name: '同学甲', budgetCents: 5000},
  {id: 'b', name: '同学乙', budgetCents: 5000},
  {id: 'c', name: '同学丙', budgetCents: 5000}
];
const options = () => ({
  members,
  assignment: {'1406': {a: 1}, '1100': {b: 1}, '1600': {c: 1}},
  fulfillment: 'pickup',
  storeId: '1450713',
  quotedAt: '2026-10-23T12:45:31+08:00',
  evidenceRef: 'docs/live-validation.md'
});

test('归一化真实 calculate-price 响应并保持金额守恒', () => {
  const q = normalizeMcpQuote(fixture(), options());
  assert.equal(q.quote.mode, 'mcp');
  assert.equal(q.quote.sourceTool, 'calculate-price');
  assert.equal(q.quote.storeId, '1450713');
  assert.equal(q.quote.fulfillment, 'pickup');
  assert.equal(q.quote.payableCents, 7150);
  assert.equal(q.quote.basketDiscountCents, 0);
  assert.equal(q.quote.feeCents, 0);
  const r = splitBill(q);
  assert.deepEqual(r.people.map(p => p.dueCents), [2350, 2550, 2250]);
  assert.equal(r.withinBudget, true);
  assert.equal(r.people.reduce((s, p) => s + p.dueCents, 0), 7150);
});

test('商品行名称与金额来自响应，不猜测', () => {
  const q = normalizeMcpQuote(fixture(), options());
  assert.deepEqual(q.quote.items.map(i => [i.id, i.name, i.subtotalCents]),
    [['1406', '板烧鸡腿堡', 2350], ['1100', '巨无霸', 2550], ['1600', '麦香鱼', 2250]]);
});

test('共享餐品按权重归属且分账守恒', () => {
  const q = normalizeMcpQuote(fixture(), {...options(), assignment: {'1406': {a: 1, b: 1}, '1100': {b: 1}, '1600': {c: 1}}});
  const r = splitBill(q);
  assert.equal(r.lines[0].allocatedCents.a + r.lines[0].allocatedCents.b, 2350);
  assert.equal(r.people.reduce((s, p) => s + p.dueCents, 0), 7150);
});

test('合成边界：宿主明确确认优惠语义后避免重复扣减', () => {
  const f = fixture();
  f.data.productList[0].originalSubtotal = 2500; // 行优惠 150
  f.data.discount = 250;                          // 整单优惠 250 → 整单层级 100
  f.data.productOriginalPrice = 7300; f.data.originalPrice = 7300; f.data.price = 7050;
  const q = normalizeMcpQuote(f, {...options(), discountSemantics:'total-includes-line'});
  assert.equal(q.quote.basketDiscountCents, 100);
  assert.equal(q.quote.payableCents, 7050);
  assert.equal(splitBill(q).people.reduce((s, p) => s + p.dueCents, 0), 7050);
});

test('合成边界：仅统计宿主显式确认的附加费用字段', () => {
  const f = fixture();
  f.data.packingPrice = 200; f.data.price = 7350;
  const q = normalizeMcpQuote(f, {...options(), feeFields:['packingPrice']});
  assert.equal(q.quote.feeCents, 200);
  assert.equal(q.quote.payableCents, 7350);
  assert.equal(splitBill(q).people.reduce((s, p) => s + p.dueCents, 0), 7350);
});

test('examples/live-quote.json 与 fixture 归一化结果一致', () => {
  const live = JSON.parse(readFileSync(new URL('../examples/live-quote.json', import.meta.url)));
  assert.deepEqual(live, normalizeMcpQuote(fixture(), options()));
  assert.equal(splitBill(live).payableCents, 7150);
});

test('不会从无优惠的实测推断非零优惠语义', () => {
  const f=fixture();f.data.discount=100;f.data.price=7050;
  assert.throws(()=>normalizeMcpQuote(f,options()),/语义尚未确认/);
});
test('未确认费用字段或显式字段缺失时拒绝猜测', () => {
  const f=fixture();f.data.unknownFee=200;f.data.price=7350;
  assert.throws(()=>normalizeMcpQuote(f,options()),/不守恒/);
  assert.throws(()=>normalizeMcpQuote(f,{...options(),feeFields:['missingFee']}),/缺失/);
});

const rejectCases = [
  ['响应失败', f => { f.success = false; }, null, /成功/],
  ['缺少 data', f => { delete f.data; }, null, /data/],
  ['缺少应付金额', f => { delete f.data.price; }, null, /data\.price/],
  ['缺少商品列表', f => { delete f.data.productList; }, null, /productList/],
  ['商品缺少名称', f => { f.data.productList[0].productName = ''; }, null, /缺少名称/],
  ['小计为浮点', f => { f.data.productList[0].subtotal = 2350.5; }, null, /整数分/],
  ['商品编码重复', f => { f.data.productList[1].productCode = '1406'; }, null, /重复/],
  ['金额不守恒', f => { f.data.price = 7100; }, null, /不守恒/],
  ['行优惠大于整单优惠', f => { f.data.productList[0].originalSubtotal = 2500; }, null, /不一致/],
  ['汇总字段与各行不符', f => { f.data.productPrice = 7000; }, null, /不一致/],
  ['未指定归属', null, {assignment: {'1406': {a: 1}, '1100': {b: 1}}}, /未指定归属/],
  ['未知成员归属', null, {assignment: {'1406': {a: 1}, '1100': {b: 1}, '1600': {stranger: 1}}}, /未知成员/],
  ['权重全为零', null, {assignment: {'1406': {a: 0}, '1100': {b: 1}, '1600': {c: 1}}}, /权重/],
  ['报价时间缺时区', null, {quotedAt: '2026-10-23T12:45:31'}, /时区/],
  ['缺少证据引用', null, {evidenceRef: ''}, /evidenceRef/],
  ['缺少门店编码', null, {storeId: ''}, /storeId/],
  ['非法就餐方式', null, {fulfillment: 'drive-thru'}, /就餐方式/],
  ['成员不足两人', null, {members: [members[0]]}, /2–20/]
];
for (const [name, mutateFixture, overrideOptions, pattern] of rejectCases) {
  test(`拒绝${name}`, () => {
    const f = fixture();
    if (mutateFixture) mutateFixture(f);
    assert.throws(() => normalizeMcpQuote(f, {...options(), ...(overrideOptions || {})}), pattern);
  });
}
