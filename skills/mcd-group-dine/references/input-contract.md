# 归一化报价契约

本项目的 JSON 是本地分账输入，不是麦当劳官方 API 请求格式。由宿主查看真实响应后映射。模拟示例随 Skill 放在 `assets/demo.json`，完整仓库也有 `examples/demo.json`。

- members：2–20 人。每项 id 唯一，name 为昵称，budgetCents 为可选整数分预算。
- feePolicy：equal（所有列出成员均摊费用）或 proportional（按餐品金额比例分摊）。
- quote.mode：demo 或 mcp。demo 始终显示模拟数据提示。
- 真实报价另需 sourceTool="calculate-price"、storeId、fulfillment（pickup/delivery/dine-in）、quotedAt（含时区 ISO 时间）、evidenceRef（本地脱敏调用记录引用）。这些字段是来源声明，不是密码学证明，须与客户端真实调用记录核验。
- quote.items：id、name、subtotalCents（整行金额，含数量及已计入该行的优惠）、shares（成员 ID 到非负整数权重，正金额至少一个正权重）。一个人的餐品为 {"a":1}，三人均分为 {"a":1,"b":1,"c":1}。
- quote.basketDiscountCents：尚未计入行小计的额外整单优惠，默认 0。
- quote.feeCents：所有附加费用合计，默认 0。
- quote.payableCents：该方案官方应付金额；必须等于各行小计之和减整单优惠加费用。

餐品价格和优惠全部使用整数分，禁止先转浮点元计算。未知费用不可默认为“官方零费用”，应先查明。不要将 raw 响应中的“优惠前金额”“优惠后金额”混用。金额不守恒时程序拒绝生成，不能用随意补差使账面通过。

## 已有响应适配器

`scripts/normalize-mcp.mjs` 导出的 normalizeMcpQuote 可处理本次实测的 data.productList / data.price 结构，具体调用例子见完整仓库测试。它只证明了无优惠到店响应的映射，不能据此推断其他场景的字段语义。

宿主确认响应中 data.discount 包含行内优惠后，才可显式指定 `discountSemantics: 'total-includes-line'`；否则遇到非零优惠会拒绝猜测。费用字段须按当次 schema 确认后通过 `feeFields: ['实际字段名']` 显式传入，不能照抄未验证的字段名。字段未知或金额不守恒时应由宿主回查并按本契约手动映射。

套餐的单独组成若没有官方分项价格，可以整套归属一个人；共享套餐则用经成员同意的份额分摊，不虚构组成单价。
