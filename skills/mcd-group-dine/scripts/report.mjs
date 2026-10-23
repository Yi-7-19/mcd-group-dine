// Standalone report renderer, bundled with the installable Skill.
export const money = value => `¥${(value / 100).toFixed(2)}`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function markdownReport(r) {
  const table = v => String(v).replace(/[|\r\n]/g, ' ');
  const context = r.mode === 'mcp' ? `门店：${table(r.storeName ?? r.storeId)}；方式：${table(r.fulfillment)}；报价时间：${table(r.quotedAt)}。\n\n` : '';
  return `# 麦麦同桌 · 拼单账单\n\n${r.notice}\n\n${context}` +
    `整单应付：${money(r.payableCents)}；餐品小计 ${money(r.subtotalCents)}，整单优惠 ${money(r.discountCents)}，附加费用 ${money(r.feeCents)}。\n\n` +
    '| 成员 | 餐品分摊 | 整单优惠 | 费用 | 应付 | 预算状态 |\n|---|---:|---:|---:|---:|---|\n' +
    r.people.map(p => `| ${table(p.name)} | ${money(p.grossCents)} | −${money(p.discountCents)} | ${money(p.feeCents)} | ${money(p.dueCents)} | ${p.overBudgetCents == null ? '未提供预算' : p.overBudgetCents ? `超 ${money(p.overBudgetCents)}` : '预算内'} |`).join('\n') +
    `\n\n分摊规则：餐品按归属/分享权重分摊；整单优惠按餐品金额比例分摊；附加费用${r.feePolicy === 'equal' ? '在所有成员间均摊' : '按餐品金额比例分摊'}；不足一分按最大余数法、成员 ID 排序补齐。\n\n当前为试算账单，未创建订单或收款。\n`;
}
export {htmlReport} from './page.mjs';
