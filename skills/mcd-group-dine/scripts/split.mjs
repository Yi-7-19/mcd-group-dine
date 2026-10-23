// Self-contained Skill arithmetic. Never calls an API or creates an order.
const fail = (message) => { throw new Error(message); };
const cents = (v, label) => {
  if (!Number.isSafeInteger(v) || v < 0 || v > 100_000_000) fail(`${label} 必须是 0–100000000 的整数分`);
  return v;
};
const sum = xs => xs.reduce((a, b) => a + b, 0);

/** Largest remainders with stable member-id ties; all arithmetic uses BigInt. */
export function allocate(total, weights) {
  cents(total, '待分摊金额');
  const ids = Object.keys(weights).sort();
  if (!ids.length) fail('缺少分摊成员');
  for (const id of ids) if (!Number.isSafeInteger(weights[id]) || weights[id] < 0) fail('分摊权重必须为非负安全整数');
  const denominator = ids.reduce((a, id) => a + BigInt(weights[id]), 0n);
  if (!denominator && total) fail('正金额不能分配给零权重');
  if (!denominator) return Object.fromEntries(ids.map(id => [id, 0]));
  const result = Object.fromEntries(ids.map(id => [id, Number(BigInt(total) * BigInt(weights[id]) / denominator)]));
  const order = ids.map(id => ({id, rem: BigInt(total) * BigInt(weights[id]) % denominator}))
    .sort((a, b) => a.rem === b.rem ? (a.id < b.id ? -1 : 1) : a.rem > b.rem ? -1 : 1);
  const remainder = total - sum(Object.values(result));
  for (let i = 0; i < remainder; i++) result[order[i].id]++;
  return result;
}

export function splitBill(input) {
  if (!input || typeof input !== 'object') fail('需要 JSON 对象');
  const {members, quote} = input;
  if (!Array.isArray(members) || members.length < 2 || members.length > 20) fail('拼单人数须为 2–20 人');
  const ids = new Set();
  for (const m of members) {
    if (!m || !/^[a-zA-Z0-9_-]{1,40}$/.test(m.id) || ['__proto__','constructor','prototype'].includes(m.id) || ids.has(m.id)) fail('成员 ID 必须唯一且仅含字母、数字、下划线、连字符');
    if (typeof m.name !== 'string' || !m.name.trim() || m.name.length > 80) fail('成员需提供简短称呼');
    ids.add(m.id);
    if (m.budgetCents != null) cents(m.budgetCents, '个人预算');
  }
  if (!quote || !Array.isArray(quote.items) || !quote.items.length || quote.items.length > 100) fail('报价需含 1–100 个餐品');
  if (!['demo','mcp'].includes(quote.mode)) fail('报价 mode 只能是 demo 或 mcp');
  if (quote.mode === 'mcp' && (quote.sourceTool !== 'calculate-price' || !quote.storeId || !['pickup','delivery','dine-in'].includes(quote.fulfillment) || typeof quote.quotedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(quote.quotedAt) || !Number.isFinite(Date.parse(quote.quotedAt)) || !quote.evidenceRef)) fail('真实报价需有 calculate-price 来源、门店、就餐方式、含时区时间及本地证据引用');
  const gross = Object.fromEntries([...ids].map(id => [id, 0]));
  const seen = new Set();
  const lines = quote.items.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) fail('餐品 ID 不可为空或重复');
    seen.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim()) fail('餐品缺少名称');
    cents(item.subtotalCents, '餐品小计');
    if (!item.shares || typeof item.shares !== 'object' || Array.isArray(item.shares) || !Object.keys(item.shares).length) fail('餐品需指定归属或分享权重');
    for (const id of Object.keys(item.shares)) if (!ids.has(id)) fail(`未知成员 ${id}`);
    const shares = allocate(item.subtotalCents, item.shares);
    for (const [id, amount] of Object.entries(shares)) gross[id] += amount;
    return {...item, allocatedCents: shares};
  });
  const subtotalCents = cents(sum(Object.values(gross)), '餐品总额');
  const discountCents = cents(quote.basketDiscountCents ?? 0, '整单优惠');
  const feeCents = cents(quote.feeCents ?? 0, '附加费用');
  const payableCents = cents(quote.payableCents, '官方应付总额');
  if (discountCents > subtotalCents) fail('整单优惠不能超过餐品总额');
  if (payableCents !== subtotalCents - discountCents + feeCents) fail('报价金额不守恒：请回查官方明细，勿自行补差');
  const policy = input.feePolicy ?? 'equal';
  if (!['equal','proportional'].includes(policy)) fail('费用分摊仅支持 equal 或 proportional');
  const discount = allocate(discountCents, gross);
  const feeWeights = policy === 'equal' ? Object.fromEntries([...ids].map(id => [id, 1])) : gross;
  const fees = allocate(feeCents, feeWeights);
  const people = members.map(m => {
    const dueCents = gross[m.id] - discount[m.id] + fees[m.id];
    return {...m, grossCents: gross[m.id], discountCents: discount[m.id], feeCents: fees[m.id], dueCents,
      overBudgetCents: m.budgetCents == null ? null : Math.max(0, dueCents - m.budgetCents)};
  });
  if (sum(people.map(p => p.dueCents)) !== payableCents) fail('分账金额不守恒');
  return {title: '麦麦同桌', mode: quote.mode, sourceTool: quote.sourceTool ?? null, quotedAt: quote.quotedAt ?? null,
    storeId: quote.storeId ?? null, storeName: quote.storeName ?? null, fulfillment: quote.fulfillment ?? null, evidenceRef: quote.evidenceRef ?? null,
    feePolicy: policy, subtotalCents, discountCents, feeCents, payableCents, people, lines,
    withinBudget: people.every(p => p.overBudgetCents === null || p.overBudgetCents === 0),
    budgetsComplete: people.every(p => p.budgetCents != null),
    notice: quote.mode === 'demo' ? '演示数据，不是实时价格。' : '分账依据提供的 MCP 试算数据，来源尚需由客户端调用记录核验；价格及供应以官方实时结果为准。'};
}

/** Only rank candidates supplied by the host after separate official quotes. */
export function rankPlans(plans) {
  if (!Array.isArray(plans) || !plans.length) fail('至少提供一个官方试算方案');
  if (plans.length > 5) fail('最多比较 5 个有依据的候选方案');
  const identity = plan => JSON.stringify(plan.members?.map(m => [m.id, m.budgetCents ?? null]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
  const baseline = identity(plans[0]);
  for (const plan of plans) if (identity(plan) !== baseline || plan.quote?.mode !== plans[0].quote?.mode || plan.quote?.storeId !== plans[0].quote?.storeId || plan.quote?.fulfillment !== plans[0].quote?.fulfillment) fail('比较方案必须使用相同成员、预算、门店、方式及报价模式');
  return plans.map(plan => ({label: plan.label ?? '未命名方案', ...splitBill(plan)}))
    .sort((a, b) => Number(b.withinBudget) - Number(a.withinBudget) ||
      sum(a.people.map(p => p.overBudgetCents ?? 0)) - sum(b.people.map(p => p.overBudgetCents ?? 0)) || a.payableCents - b.payableCents);
}
