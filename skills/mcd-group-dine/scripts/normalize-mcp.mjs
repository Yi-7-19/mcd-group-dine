// Standalone Skill adapter for the observed McDonald's calculate-price response shape.
// Pure function: no network calls, no order creation, no coupon binding, no price guessing.
// Contract: skills/mcd-group-dine/references/input-contract.md
// Live evidence: docs/live-validation.md
//
// 实测响应结构（2026-10-23，到店自取）：
//   data.price            官方应付，单位分
//   data.discount         整单优惠金额，单位分（0 表示无优惠）
//   data.productList[]    { productCode, productName, quantity, originalSubtotal, subtotal }（单位分）
// 本次实测未返回费用字段，且行小计与应付相等。其他费用字段名须由宿主确认后显式指定。
//   data.productPrice / productOriginalPrice / originalPrice  汇总字段（存在时用于交叉校验）
// 优惠语义：productList[].subtotal 已是计入该行优惠后的官方行金额；
// 本次无优惠，不据此推断其他响应的优惠语义。非零优惠须由宿主确认语义后显式启用。

const fail = (message) => { throw new Error(message); };
const isInt = v => Number.isSafeInteger(v);
const FULFILLMENTS = ['pickup', 'delivery', 'dine-in'];
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** 校验并提取商品行；名称与金额只取自响应，缺失即报错，不猜价。 */
function readLines(data) {
  const products = data.productList;
  if (!Array.isArray(products) || !products.length) fail('响应缺少商品列表（data.productList）');
  const seen = new Set();
  return products.map(p => {
    if (!p || typeof p.productCode !== 'string' || !p.productCode.trim()) fail('商品缺少 productCode');
    if (seen.has(p.productCode)) fail(`商品编码重复：${p.productCode}；请宿主先合并数量再归一化`);
    seen.add(p.productCode);
    if (typeof p.productName !== 'string' || !p.productName.trim()) fail(`商品 ${p.productCode} 缺少名称，不得猜测`);
    const subtotalCents = p.subtotal;
    if (!isInt(subtotalCents) || subtotalCents < 0) fail(`商品 ${p.productCode} 小计必须是整数分（单位：分）`);
    const originalSubtotal = p.originalSubtotal;
    if (originalSubtotal != null && (!isInt(originalSubtotal) || originalSubtotal < 0)) fail(`商品 ${p.productCode} 原价小计必须是整数分`);
    if (originalSubtotal != null && originalSubtotal < subtotalCents) fail('原价小计小于现价小计，请回查官方数据');
    return {
      productCode: p.productCode,
      name: p.productName,
      subtotalCents,
      lineDiscountCents: originalSubtotal == null ? 0 : originalSubtotal - subtotalCents
    };
  });
}

/** 只统计响应中实际下发的费用字段；未下发即不计，不把「没返回」当成「已查明为零」之外的任何假设。 */
function readFees(data, fields) {
  if (!Array.isArray(fields) || fields.some(f => typeof f !== 'string' || !f) || new Set(fields).size !== fields.length) fail('feeFields 须为经宿主确认且不重复的费用字段名数组');
  let feeCents = 0;
  for (const field of fields) {
    const value = data[field];
    if (value == null) fail(`已指定的费用字段 ${field} 缺失，请先核实响应`);
    if (!isInt(value) || value < 0) fail(`费用字段 ${field} 必须是整数分`);
    feeCents += value;
  }
  return feeCents;
}

/**
 * @param {object} response 麦当劳 MCP calculate-price 的原始返回
 * @param {object} options
 * @param {Array<{id:string,name:string,budgetCents?:number}>} options.members 2–20 名成员
 * @param {Object<string, Object<string, number>>} options.assignment 餐品编码 → { 成员ID: 权重 }，必填，不猜归属
 * @param {'pickup'|'delivery'|'dine-in'} [options.fulfillment='pickup']
 * @param {string} options.storeId 门店编码
 * @param {string} options.quotedAt 含时区的 ISO 报价时间
 * @param {string} options.evidenceRef 本地脱敏证据引用
 * @param {'equal'|'proportional'} [options.feePolicy='equal']
 * @returns {{members:Array, feePolicy:string, quote:object}} 输入契约对象
 */
export function normalizeMcpQuote(response, options = {}) {
  if (!response || typeof response !== 'object' || response.success !== true) fail('响应不是成功的 MCP 返回（success !== true）');
  const data = response.data;
  if (!data || typeof data !== 'object') fail('响应缺少 data 对象');

  const payableCents = data.price;
  if (!isInt(payableCents) || payableCents < 0) fail('响应缺少可用的官方应付金额（data.price，单位分）；不得猜测价格');

  const lines = readLines(data);
  const feeCents = readFees(data, options.feeFields ?? []);

  const discount = data.discount ?? 0;
  if (!isInt(discount) || discount < 0) fail('整单优惠（data.discount）必须是整数分');
  const lineDiscountCents = lines.reduce((sum, l) => sum + l.lineDiscountCents, 0);
  const basketDiscountCents = discount - lineDiscountCents;
  if (basketDiscountCents < 0) fail('各行优惠之和大于整单优惠：响应明细不一致，请回查官方数据');
  if ((discount !== 0 || lineDiscountCents !== 0) && options.discountSemantics !== 'total-includes-line') fail('非零优惠的接口语义尚未确认；宿主须核实后指定 discountSemantics，不能从无优惠实测猜测');

  const itemsTotal = lines.reduce((sum, l) => sum + l.subtotalCents, 0);
  if (data.productPrice != null && data.productPrice !== itemsTotal) fail(`商品现价汇总（${data.productPrice}）与各行小计之和（${itemsTotal}）不一致`);
  if (data.originalPrice != null) {
    const originalTotal = lines.reduce((sum, l) => sum + l.subtotalCents + l.lineDiscountCents, 0);
    if (data.originalPrice !== originalTotal) fail(`原价汇总（${data.originalPrice}）与各行原价之和（${originalTotal}）不一致`);
  }
  if (itemsTotal - basketDiscountCents + feeCents !== payableCents) {
    fail(`报价金额不守恒：餐品 ${itemsTotal} − 整单优惠 ${basketDiscountCents} + 费用 ${feeCents} ≠ 应付 ${payableCents}；请回查官方明细，勿自行补差`);
  }

  const members = options.members;
  if (!Array.isArray(members) || members.length < 2 || members.length > 20) fail('成员须为 2–20 人');
  const ids = new Set();
  for (const m of members) {
    if (!m || typeof m.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(m.id) || ids.has(m.id)) fail('成员 ID 必须唯一且仅含字母、数字、下划线、连字符');
    if (typeof m.name !== 'string' || !m.name.trim()) fail('成员需提供称呼');
    ids.add(m.id);
    if (m.budgetCents != null && (!isInt(m.budgetCents) || m.budgetCents < 0)) fail('成员预算必须是整数分');
  }

  const assignment = options.assignment;
  if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) fail('缺少餐品归属（assignment）：宿主必须指定每件餐品归谁，不能猜测');
  const items = lines.map(line => {
    const shares = assignment[line.productCode];
    if (!shares || typeof shares !== 'object' || Array.isArray(shares)) fail(`餐品 ${line.productCode}（${line.name}）未指定归属成员`);
    const keys = Object.keys(shares);
    if (!keys.length) fail(`餐品 ${line.productCode} 的归属不能为空`);
    let positive = 0;
    for (const key of keys) {
      if (!ids.has(key)) fail(`餐品 ${line.productCode} 的归属包含未知成员 ${key}`);
      if (!isInt(shares[key]) || shares[key] < 0) fail('归属权重必须为非负整数');
      positive += shares[key];
    }
    if (!positive) fail(`餐品 ${line.productCode} 的归属权重不能全为 0`);
    return {id: line.productCode, name: line.name, subtotalCents: line.subtotalCents, shares};
  });

  const fulfillment = options.fulfillment ?? 'pickup';
  if (!FULFILLMENTS.includes(fulfillment)) fail('就餐方式仅支持 pickup、delivery、dine-in');
  const storeId = options.storeId;
  if (typeof storeId !== 'string' || !storeId.trim()) fail('真实报价需要门店编码 storeId');
  const quotedAt = options.quotedAt;
  if (typeof quotedAt !== 'string' || !ISO_WITH_ZONE.test(quotedAt) || !Number.isFinite(Date.parse(quotedAt))) fail('报价时间须为含时区的 ISO 时间（如 2026-10-23T12:45:31+08:00）');
  const evidenceRef = options.evidenceRef;
  if (typeof evidenceRef !== 'string' || !evidenceRef.trim()) fail('真实报价需要本地证据引用 evidenceRef');

  if (options.feePolicy != null && !['equal','proportional'].includes(options.feePolicy)) fail('费用分摊规则仅支持 equal 或 proportional');
  return {
    members: members.map(m => ({...m})),
    feePolicy: options.feePolicy === 'proportional' ? 'proportional' : 'equal',
    quote: {
      mode: 'mcp',
      sourceTool: 'calculate-price',
      storeId,
      fulfillment,
      quotedAt,
      evidenceRef,
      items,
      basketDiscountCents,
      feeCents,
      payableCents
    }
  };
}
