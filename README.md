# 麦麦同桌 · 多人拼单助手

**把一群人的「吃什么、花多少、谁付多少」变成一份清楚的账单。**

麦麦同桌基于麦当劳中国 MCP，为宿舍同学、同事、朋友聚餐收集每人预算和餐品偏好，查询真实门店菜单与优惠，通过官方 `calculate-price` 核价，再生成精确到分的分账清单。

本项目由一个账号组织一笔普通点餐订单，不是跨账号拼单平台。它不会生成群邀请、转账或自动下单；主题派对预约也不是本项目的拼单流程。

## 能做什么

- **每个人单独算预算**：整单未超预算，也会提示某位成员是否超支。
- **共享餐品有归属**：一份小食可按人数均分，也可按成员同意的份额分摊。
- **优惠不乱叠加**：对可行候选逐一官方试算，只比较本次查到的方案，不宣称全局最低价。
- **分钱不差一分**：全程整数分与最大余数法；个人应付之和必须等于官方总额。
- **结果便于分享**：输出 HTML、Markdown、JSON；HTML 可通过浏览器打印保存为 PDF。

## 立即体验

需要 Node.js 20 或更新版本，运行分账和生成报告**无需安装 npm 依赖**。HTML 已内置食物图片与构建好的 Remotion 动效，移到其他目录或断网也可打开。

```sh
node src/cli.mjs examples/demo.json --out examples/demo-report.html
node --test tests/*.test.mjs
```

用浏览器打开 [演示账单](examples/demo-report.html)。示例中的价格、成员、餐品均为模拟数据，不代表麦当劳实时售卖信息。

还可查看 [真实核价账单](examples/live-report.html) 与 [真实调用记录](docs/live-validation.md)：2026-10-23 在上海公开测试门店查到三件餐品，官方核价共 71.50 元；这是当次测试快照，不代表当前价格或你的所在地。

演示为三人拼单：餐品合计 77.00 元、整单优惠 10.00 元、费用 6.00 元，应付 73.00 元。三人分别承担 **24.62、27.24、21.14 元**。

## 页面体验

![麦麦同桌响应式账单预览](docs/ui/desktop.png)

页面采用红、黄、奶油白的快餐品牌视觉，配有四张原创生成的食物图、逐人预算卡片、餐品图片卡片和可展开的分摊明细。手机先展示整单总额，再查看个人账单；桌面保留侧边总额。复制清单具备加载、成功和手动复制回退，打印自动包含全部明细。

首屏渐入、按钮反馈、卡片及明细箭头由 **Remotion 4.0.534** 的插值和缓动模块驱动。尊重系统减少动态效果偏好，保留键盘焦点和精细指针专用的一体薯条包装箭头（默认红色、可点击金色）。本轮进一步调整了中文字号、紧凑分账卡片、图片完整构图与导航定位，另见[本轮视觉修订](docs/UI_REFINEMENT.md)。完整要求核对、截图与验证边界见 [视觉升级验收](docs/UI_UPGRADE.md)。

仅在修改动效源代码后需要安装构建依赖；普通使用者可直接运行项目随附的构建产物：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build:motion
npm run build:reports
```

动效源码在 `motion/page-motion.mjs`，构建结果随 Skill 一并提供。第三方代码许可见 [第三方说明](skills/mcd-group-dine/references/THIRD_PARTY_NOTICES.md)。

## 在 AI 客户端使用

Skill 入口是 [skills/mcd-group-dine/SKILL.md](skills/mcd-group-dine/SKILL.md)。MCP 的配置方式和实际调用流程见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。

已有麦当劳 MCP 的 WorkBuddy：按[官方技能导入说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)，在「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」导入本项目的 Skill 包；也可让当前任务读取上述 SKILL.md。Skill 已自带分账脚本和模拟示例，不依赖完整仓库。客户端的导入入口、目录权限和脚本执行能力取决于实际版本。

使用支持 Agent Skills 的客户端，可通过 skills CLI 用户级安装：

```sh
npx skills add Yi-7-19/mcd-group-dine --skill mcd-group-dine -g --agent codex --agent claude-code
```

发布后该命令才可从 GitHub 拉取本项目。只会安装指定且兼容的客户端；**这不会自动给所有 AI 软件配置 MCP**。WorkBuddy 的连接器应在 WorkBuddy 中独立启用；如 skills CLI 不能识别该宿主，按其技能管理入口导入。不要把配置中的 Token 放进代码或公开仓库。

可直接对 WorkBuddy 说：

> 读取本地 mcd-group-dine/SKILL.md。我们三人到店取餐，A 预算 30 元、B 预算 30 元、C 预算 25 元，各要一份主餐，可以共享小食。先问清地点和忌口，再查门店菜单、官方核价，给我分账清单，先不要下单。

另一个例子：

> A 和 B 各自的餐品自己付，一份小食按 2:1 分享；配送费均摊。使用本门店实际可用优惠券分别试算，不要领取新券，看看谁超预算。

## 分账规则

1. 各餐品整行金额按明确归属或共享权重分摊。
2. 未计入行小计的额外整单优惠，按各人餐品金额比例分摊。
3. 附加费用默认在**所有列出的成员**间均摊；经确认可改为金额比例。
4. 分不足一分时采用最大余数法；余数相同按成员 ID 排序补齐。
5. 所有个人应付之和必须等于官方应付；不一致时拒绝生成，要求回查真实报价。

这是透明、确定的费用分摊约定，不代表官方逐人定价，也不代表优惠券归属的唯一公平规则。若组员不接受，先调整分享/费用约定，再重新计算。

官方套餐如没有分项价格，应整套归属一人，或作为共享行按约定份额分摊，不虚构套餐内部单价。

## 从真实报价生成账单

宿主依据真实 `calculate-price` 响应归一化为 [输入契约](skills/mcd-group-dine/references/input-contract.md) 后执行：

```sh
node src/cli.mjs quote.local.json --out bill.html
node src/cli.mjs quote.local.json --out bill.md
node src/cli.mjs quote.local.json --out bill.json
```

多个官方核价候选使用 `{"plans":[...]}`。推荐优先考虑逐人预算，其次比较超支和总价，仅对输入候选负责。预算缺失会明确提示，不把未知预算称为全员符合预算。

## 目录

| 路径 | 用途 |
|---|---|
| skills/mcd-group-dine/ | Skill、调用约束和输入契约 |
| src/ | 本地分账、报告生成及命令行程序 |
| examples/ | 模拟示例与生成的账单 |
| tests/ | 金额守恒、分摊边界和异常输入测试 |
| motion/ | Remotion 页面动效源码 |
| docs/UI_UPGRADE.md | 视觉升级验收、操作截图和验证范围 |
| CONTEST_DECLARATION.md | 官方参赛声明原文 |
| MCP_INTEGRATION.md | MCP 接入、工具流程与实际验证范围 |
| mcp-config.example.json | 仅含环境变量占位符的示例配置 |
| workbuddy.md | 真实 WorkBuddy 开发上下文摘录 |

## 参赛与许可

本项目为麦当劳程序员创意开发大赛独立参赛作品，非麦当劳官方产品。使用麦当劳 MCP 须遵守其服务条款；餐品、优惠、价格和供应状态以官方实时结果为准。

原创代码采用 MIT 许可；Remotion 等第三方代码保留各自许可。麦当劳商标、官方服务和官方原文的权利属于各自权利人，不因代码许可而获得额外授权。项目不包含官方品牌图片或 Logo。

规则来源：[官方活动仓库](https://github.com/M-China/mcd-developer-innovation-challenge)、[完整活动规则](https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/activityGuidelines.md)、[官方 MCP 文档](https://github.com/M-China/mcd-mcp-server)。报名截止时间为北京时间 2026-10-25 23:59。
