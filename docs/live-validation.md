# 真实联调验证记录（live-validation）

- **日期**：2026-10-23（周五）
- **场景**：麦麦同桌 · 多人拼单助手 —— 使用麦当劳 MCP（`mcp__MDL-MCP`）进行只读联调
- **测试地点**：【上海 · 人民广场】（公开测试地点，非任何私人地址）
- **边界**：仅查询与试算。查询过本账号该门店可用券用于适用性判断；未查询积分账户、历史订单或私人地址，未领券、未扣积分、未创建订单、未付款。
- **配套文档**：`workbuddy-discovery.md`（第一阶段工具发现，位于仓库外 work 目录）；`workbuddy.md`（本任务真实开发对话摘录，项目根目录）

---

## 1. 真实调用清单（按时间顺序）

| # | 工具 | 关键参数 | 服务器时间 | 结果 |
|---|------|----------|-----------|------|
| 1 | `now-time-info` | 无 | 12:44:38 | ✅ 成功，服务器时钟与本机一致（GMT+8） |
| 2 | `query-nearby-stores` | `beType=1`（到店自取）、`searchType=2`、`city=上海`、`keyword=人民广场` | 12:44:38 | ✅ 成功，返回 5 家门店 |
| 3 | `query-meals` | `storeCode=1450713`、`orderType=1`、`beType=1` | 12:44:47 | ✅ 成功，返回全店菜单（约 150 个餐品编码及现价） |
| 4 | `query-meal-detail` | `storeCode=1450713`、`orderType=1`、`beType=1`、`code=1406` | 12:45:06 | ✅ 成功，确认无必选搭配轮次 |
| 5 | `query-store-coupons` | `storeCode=1450713`、`orderType=1`、`beType=1` | 12:45:06 | ✅ 成功，返回 2 张账号券（见第 5 节） |
| 6 | `calculate-price` | `storeCode=1450713`、`orderType=1`、`beType=1`、3 件商品（见第 3 节） | 12:45:31 | ✅ 成功，官方应付 7150 分 |

共 6 次调用，其中核价仅 1 次（无可行券方案，未做第二次试算）。

## 2. 公开门店

- **门店编号**：`1450713`
- **门店名称**：麦当劳上海黄浦华旭国际大厦餐厅
- **地址**：南京东路街道西藏中路336号（公开商业地址）
- **营业时间**：00:00–23:59；查询时 `businessStatus=true`
- 同批次返回的其余门店：1450441（福州路666号）、1450056（南京东路720号）、1450195（西藏中路525号）、1450124（南京西路258号）。选取距离人民广场关键词最近的 1450713。

## 3. 餐品与数量（每人一件，均为「单品」，无需特制/换配）

| 餐品编码 | 名称 | 数量 | 归属 | 官方行小计 |
|---|---|---|---|---|
| 1406 | 板烧鸡腿堡 | 1 | 同学甲 | 2350 分（¥23.50） |
| 1100 | 巨无霸 | 1 | 同学乙 | 2550 分（¥25.50） |
| 1600 | 麦香鱼 | 1 | 同学丙 | 2250 分（¥22.50） |

- 均取自 `query-meals` 菜单中标记「单品」的餐品，单价 ≤ ¥50（个人预算各 5000 分）。
- `query-meal-detail` 抽查 1406：`rounds: []`（无必选搭配），特调项 `minValues: 0`（可省略，按默认选配算价）。

## 4. 真实试算结果（calculate-price）

```json
{
  "price": 7150,
  "discount": 0,
  "productOriginalPrice": 7150,
  "productPrice": 7150,
  "originalPrice": 7150,
  "productList": [
    {"productCode": "1406", "productName": "板烧鸡腿堡", "quantity": 1, "originalSubtotal": 2350, "subtotal": 2350},
    {"productCode": "1100", "productName": "巨无霸",   "quantity": 1, "originalSubtotal": 2550, "subtotal": 2550},
    {"productCode": "1600", "productName": "麦香鱼",   "quantity": 1, "originalSubtotal": 2250, "subtotal": 2250}
  ],
  "takeWayList": [
    {"code": "eat-in", "title": "堂食"},
    {"code": "locker-out", "title": "外带"}
  ]
}
```

- **官方应付总额：7150 分 = ¥71.50**（餐品 7150 − 优惠 0 + 费用 0）。
- 响应未下发 `deliveryPrice` / `packingPrice` / `tablewarePrice` 字段（到店自取场景），经核实后费用计 0，非默认假设。
- 分账结果：同学甲 ¥23.50、同学乙 ¥25.50、同学丙 ¥22.50；三人均在各 5000 分预算内；个人应付之和 = 7150 分 = 官方应付。

## 5. 优惠券查询结论（未使用任何券）

`query-store-coupons` 返回 2 张账号可用券，均为「新人专享 7 折」：适用商品为美式中杯、奶铁中杯——**均不在本购物车内，无可行券方案**，因此未进行带券试算（遵守「最多 1–2 次试算」约束，实际仅 1 次）。券 ID 与券码属账号敏感信息，按规则不入仓库；原始响应仅存档于仓库外 work 目录。

## 6. 归一化映射（MCP 响应 → 输入契约）

由 `src/normalize-mcp.mjs` 完成，映射规则：

| MCP 响应字段 | 契约字段 | 说明 |
|---|---|---|
| `data.price` | `quote.payableCents` | 官方应付（分） |
| `data.productList[].productCode` | `quote.items[].id` | 餐品编码即行 ID |
| `data.productList[].productName` | `quote.items[].name` | 名称直接取自响应 |
| `data.productList[].subtotal` | `quote.items[].subtotalCents` | 已计入该行优惠的官方行金额 |
| `data.productList[].originalSubtotal − subtotal` | 行优惠（中间量） | 用于从整单优惠中剥离已计入各行的部分 |
| `data.discount` | `quote.basketDiscountCents` | 本次为 0；非零优惠须先由宿主确认包含行内优惠的语义，才启用相应映射 |
| 经宿主确认并显式指定的费用字段 | `quote.feeCents` | 本次未返回费用字段且行合计等于应付，核实为 0；不推断未实测字段名 |
| 调用参数 `storeCode` | `quote.storeId` | 响应不含门店号，由宿主调用参数提供 |
| 调用场景 | `quote.fulfillment` | 到店自取 → `pickup` |
| `now-time-info` / 调用时刻 | `quote.quotedAt` | 含时区 ISO 时间 |
| 本文档 | `quote.evidenceRef` | 本地脱敏证据引用 |
| 宿主收集 | `members` / `assignment` | 成员与餐品归属只能由宿主显式提供，归一化不猜测 |

守恒校验：`Σ行小计 − 整单优惠 + 费用 = 官方应付`，不成立即报错停止，不补差。

## 7. 测试结果

WorkBuddy 首轮执行为 49 项通过。随后复核优惠/费用语义并新增拒绝猜测的边界测试，该轮 `node --test tests/*.test.mjs`：**51 个测试全部通过（51 pass / 0 fail）**，覆盖：

- `tests/normalize-mcp.test.mjs`（26 项）：真实响应归一化与守恒、共享权重归属、已明确语义的合成优惠/费用边界、拒绝未知优惠/费用语义、`examples/live-quote.json` 与 fixture 归一化结果一致，以及缺金额、浮点、重复编码、不守恒、缺时区、未知成员等拒绝场景。优惠/费用合成用例不作为带券或外送已实测的证据。
- `tests/split.test.mjs`（分账引擎，既有）+ `tests/cli.test.mjs`（CLI 与 Skill 独立复制，既有）：全部通过。

后续页面升级另增加了一个独立 Skill 生成带图片与 Remotion 的离线 HTML 回归测试，当前版本合计 **52 项测试通过**。页面和交互验证见 [UI_UPGRADE.md](UI_UPGRADE.md)；此项新增测试不代表再次进行了实时 MCP 联调。

产物：`examples/live-quote.json`（脱敏归一化报价）、`examples/live-report.html`（CLI 生成的 MCP 试算账单，含「MCP 试算账单」标识与「来源尚需核验」提示）。

## 8. 发现的问题与注意事项（已记录，未改动既有实现）

1. **特制传参规则的实际语义**：MCP 工具说明要求「含 unselectedKey 的特调组必须全部传入」，但实测**不传 `modification` 时按默认选配算价成功**（1406 特调组 `minValues:0`）。结论：该规则仅在主动特调时适用；归一化与联调链路对「无特制」餐品直接省略 `modification`。
2. **`enjoyed` / `enjoyable` 字段实际未返回**：schema 文档描述了已享受/可享受优惠对象，但本次响应未下发；`normalize-mcp.mjs` 对此容错（不依赖即不存在），若后续版本下发可扩展为券方案提示。
3. **到店自取无费用字段**：响应不含配送/打包/餐具费字段，`feeCents=0` 是经核实的结果；外送场景必须重新核对，不能复用。
4. **party-\* 链路更正**：`party-order-create` 等为麦当劳主题派对预约，不是多人点餐拼单 API；更正已追加至第一阶段文档 `workbuddy-discovery.md` 第 6 节。
5. **汇总字段可作交叉校验**：`productPrice` / `originalPrice` 与各行小计之和不符时归一化报错，可防响应被篡改或字段错位。
6. **同一购物车仅一次核价**：因无可行券方案，未产生第二方案；如后续引入可用券，按 Skill 规则分别对无券/有券方案调用 `calculate-price` 后比较。

## 9. 隐私与合规

- 本文档及仓库内文件不含 Token、Authorization、账号信息、券码、付款信息。
- 工具调用记录（其中券响应含账号券码）仅存于仓库外本地 work 目录，不进入仓库、不公开。
- 测试门店与地点均为公开信息；成员使用昵称（同学甲/乙/丙），无真实个人信息。
