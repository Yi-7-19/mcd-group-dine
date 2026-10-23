# workbuddy.md — 本任务真实开发对话摘录

> **性质声明**：本文档是 2026-10-23「麦麦同桌」第二阶段联调任务的**真实开发对话摘录**，按实际发生顺序整理用户任务、工具调用结果、编写的代码与验证结果。**不是完整原始导出**，未包含全部中间过程与完整响应原文；不包含任何虚构上下文。涉及隐私的原始响应（如含券码的返回）按规则只存于仓库外目录，本文档及仓库内一律不保存。

---

## 一、实际用户任务（原文摘录）

### 第一阶段任务（当日 12:37）

> 我要参加麦当劳程序员创意开发大赛，作品方向已确定：麦麦同桌，多人拼单助手。请在本任务里协助真实开发和联调。先做第一阶段：使用已配置的麦当劳 MCP，确认实际可调用工具与参数 schema，重点 now-time-info、query-nearby-stores、query-meals、query-meal-detail、query-store-coupons、calculate-price。现在只实际调用 now-time-info 与 campaign-calendar 测试连通性，不需要也不要查地址、账户、下单、领券、兑换或抽奖。将工具可见性、参数名与必填项、两个真实调用是否成功及简短脱敏摘要，写入 …workbuddy-discovery.md。不要写入任何 Token、Authorization、个人信息或原始配置。若工具不可见如实记录。保留本次真实对话供后续 workbuddy.md 使用。完成后等待我提供代码进行第二阶段验证。

### 第二阶段任务（当日 12:42）

> 进入第二阶段，项目目录是 …outputs/mcd-group-dine。先阅读 skills/mcd-group-dine/SKILL.md、src/split.mjs 和输入契约。请注意第一阶段提示中有一处需纠正：party-order-create 等是麦当劳主题派对预约，绝不能当成普通多人点餐拼单链路；请在第一阶段文档末尾追加更正。
> 请真实完成只读联调：以【上海·人民广场】作为公开测试地点（不是我的地址），query-nearby-stores 查询到店取餐门店，query-meals 查询菜单，选 3 件无需特制/换配的独立餐品（每人一件，预算各 50 元），必要时 query-meal-detail，使用 calculate-price 对同一购物车核价。允许查询该门店本账号优惠券并试算可用券方案，但不能领券/扣积分/创建订单/付款，也不需要任何私人地址。尽量仅做 1–2 次试算。
> 请根据真实返回结构，在项目中编写 src/normalize-mcp.mjs，能把本次实际 calculate-price 响应归一化为输入契约（如字段不足，明确报告，不猜价格），并加入对应脱敏响应 fixture 与 tests/normalize-mcp.test.mjs。保存公共测试餐品的脱敏归一化报价 examples/live-quote.json，保存脱敏真实调用证据 docs/live-validation.md，记录工具名、公开门店、餐品和数量、真实应付、归一化映射、测试结果；不要保存 Token、真实账号、券码、付款信息。原始私人响应如确需中间文件只能放仓库以外的 work 目录，不可公开。
> 最后运行 node --test tests/*.test.mjs 和 CLI 生成 examples/live-report.html。请另在项目根目录生成 workbuddy.md，明确是本任务真实开发对话摘录，逐段保留实际用户任务、工具调用结果、你编写的代码和验证结果，不得虚构上下文、不得称为完整原始导出。不要改动 CONTEST_DECLARATION.md 或其他已有实现；如发现问题写入 docs/live-validation.md。完成后停下，不发布 GitHub、不报名。

---

## 二、第一阶段执行（12:37–12:42，真实结果）

1. **工具发现**：通过工具检索确认 `mcp__MDL-MCP` 可见，共 38 个工具；加载了 7 个重点工具的 schema（参数名与必填项已逐项记录）。
2. **真实调用 ① `now-time-info`**：✅ 成功，`success=true, code=200`，服务器时间 2026-10-23 12:37:54（GMT+8），与本机一致；仅返回时间信息，无个人信息。
3. **真实调用 ② `campaign-calendar`**：✅ 成功，返回 2026 年 10 月全月营销活动 20+ 条（PEACEMINUSONE 联名周边加价购、G-DRAGON 韩式风味新品、麦金学期卡等），纯公开营销内容。
4. **产出**：`workbuddy-discovery.md`（工具可见性、6 个重点工具 schema、两次调用脱敏摘要；无 Token/授权/个人信息）。
5. **追加更正**（第二阶段按用户指示）：该文档末尾新增第 6 节，更正 `party-order-create` 等 `party-*` / `query-party-*` 工具属麦当劳**主题派对预约**业务，不是多人点餐拼单链路。

## 三、第二阶段真实联调（12:44–12:45，6 次调用，全部成功）

| 顺序 | 工具 | 参数要点 | 真实结果摘要 |
|---|---|---|---|
| 1 | `now-time-info` | 无 | 12:44:38，与本机一致 |
| 2 | `query-nearby-stores` | `beType=1`、`searchType=2`、`city=上海`、`keyword=人民广场` | 返回 5 家公开门店；选取最近的 **1450713 麦当劳上海黄浦华旭国际大厦餐厅（西藏中路336号）** |
| 3 | `query-meals` | `storeCode=1450713`、`orderType=1`、`beType=1` | 返回全店菜单（约 150 个餐品编码及现价/原价） |
| 4 | `query-meal-detail` | `code=1406` | `rounds: []`（无必选搭配）；特调项 `minValues: 0`（可省略） |
| 5 | `query-store-coupons` | 同上门店参数 | 仅 2 张「新人专享 7 折」券，适用美式中杯/奶铁中杯，**不在本购物车 → 无可行券方案** |
| 6 | `calculate-price` | 3 件商品（1406×1、1100×1、1600×1） | **官方应付 7150 分 = ¥71.50**；行小计 2350/2550/2250；优惠 0；未下发任何费用字段 |

- 餐品选择：板烧鸡腿堡 1406（¥23.50）、巨无霸 1100（¥25.50）、麦香鱼 1600（¥22.50），均为菜单中标「单品」的独立餐品，每人一件、各 ≤ ¥50 预算。
- 核价共 1 次（无可行券方案，未做第二次试算）。
- 未领券、未扣积分、未创建订单、未付款、未查私人地址、积分账户或历史订单；门店券为本账号的只读查询。
- 调用结果记录存档于仓库外本地 work 目录（其中 `query-store-coupons` 返回含账号券码，不公开）。

## 四、编写的代码与文件（本次新增，未改动既有实现）

本节记录 WorkBuddy 初版开发过程，后续代码复核见文末补充；初版对未实测优惠/费用字段的假定已收紧，不能作为官方接口语义依据。

1. **`src/normalize-mcp.mjs`**（新增）：把真实 `calculate-price` 响应归一化为输入契约。纯函数、不发请求、不猜价：
   - `data.price → quote.payableCents`；`productList[].subtotal → items[].subtotalCents`；`productCode/productName → items[].id/name`；
   - 整单优惠只记尚未计入各行的部分：`basketDiscountCents = data.discount − Σ(originalSubtotal − subtotal)`；
   - 费用只统计响应实际下发的 `deliveryPrice/packingPrice/tablewarePrice`；
   - 成员与餐品归属（`assignment`）必须由宿主显式提供，否则报错；
   - 强制守恒校验：`Σ行小计 − 整单优惠 + 费用 = 官方应付`，并交叉校验 `productPrice/originalPrice` 汇总字段；任何不成立都明确报错停止。
2. **`tests/fixtures/calculate-price-live.sanitized.json`**（新增）：本次真实核价响应的脱敏副本（去除 traceId，其余原样）。
3. **`tests/normalize-mcp.test.mjs`**（新增）：初版 24 项，后续复核增至 26 项；覆盖归一化守恒、名称不猜测、共享权重、合成优惠/费用边界、与 `examples/live-quote.json` 一致性，以及缺价格、浮点、重复编码、不守恒、缺时区、未知成员、成员不足两人等拒绝场景。
4. **`examples/live-quote.json`**（新增）：由归一化模块从脱敏 fixture 真实生成的契约报价（mode=mcp，storeId=1450713，payableCents=7150）。
5. **`docs/live-validation.md`**（新增）：脱敏真实调用证据——工具名、公开门店、餐品与数量、真实应付、归一化映射表、测试结果、6 条发现的问题（含特制传参规则实际语义、`enjoyed/enjoyable` 未下发、party-\* 更正等）。
6. **`examples/live-report.html`**（新增）：CLI 由 `examples/live-quote.json` 生成的「MCP 试算账单」，含「来源尚需核验」提示。

> 说明：会话期间仓库中出现了其他文件（`LICENSE`、`README.md`、`MCP_INTEGRATION.md`、`scripts/check-release.mjs`、`tests/cli.test.mjs`、`src/*.mjs` 改为向 `skills/mcd-group-dine/scripts/` 转发等），均非本对话产生，本对话未创建也未改动它们；`CONTEST_DECLARATION.md` 未改动。

## 五、验证结果（真实运行输出）

- WorkBuddy 首轮 `node --test tests/*.test.mjs`：**49 个测试全部通过（pass 49 / fail 0）**，含初版新增 24 个归一化测试与既有 25 个 split/cli 测试。
- `node src/cli.mjs examples/live-quote.json --out examples/live-report.html`：生成成功；JSON 复核显示每人应付 2350/2550/2250 分，合计 7150 分 = 官方应付，三人均在 5000 分预算内。
- HTML 抽检：包含「MCP 试算账单」标识、门店 1450713、金额 ¥71.50/¥23.50/¥25.50/¥22.50 与「尚需核验」提示。

## 六、边界与合规小结

- 全程只读联调：无领券、扣积分、下单、付款、私人地址/积分账户/历史订单查询；查询过本账号门店券用于适用性判断。
- 仓库内无 Token、Authorization、账号、券码、付款信息；敏感原始响应仅在仓库外 work 目录。
- 测试地点与门店为公开信息；成员为昵称（同学甲/乙/丙）。
- 按任务要求：完成后停下，未发布 GitHub、未报名。

## 七、后续复核补充（非 WorkBuddy 对话原文）

后续由当前 Codex 协作任务复核：无优惠、无费用的真实响应不能证明非零优惠及其他费用的字段语义。适配器已改为要求宿主明确确认 `discountSemantics` 和 `feeFields`，并新增两项拒绝猜测的边界测试。最终共 51 项测试通过。适配器现随 Skill 打包于 `skills/mcd-group-dine/scripts/normalize-mcp.mjs`，`src/normalize-mcp.mjs` 为兼容转发入口。上述开发过程中的初版实现说明保留用于区分修改来源，当前行为以源码和最终验证记录为准。

其后用户要求升级已有页面，Codex 在保留上述业务逻辑的基础上完成视觉与交互改造，新增独立 Skill 输出带图片离线 HTML 的回归检查，当前为 52 项本地测试。页面使用 Remotion 辅助模块；该轮页面工作不属于 WorkBuddy 对话原文，验收另见 `docs/UI_UPGRADE.md`。
