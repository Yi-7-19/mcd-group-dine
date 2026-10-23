# MCP 调用约束

2026-10-23 在 WorkBuddy 的麦当劳连接器中发现并检查过以下 schema。宿主前缀可变化，以当前实际工具列表为准。

| 工具 | 关键参数 |
|---|---|
| now-time-info | 无必填参数 |
| query-nearby-stores | beType、searchType；按位置搜索时需 city、keyword |
| query-meals | storeCode、orderType、beType |
| query-meal-detail | storeCode、orderType、beType、code |
| query-store-coupons | storeCode、orderType、beType |
| calculate-price | storeCode、orderType、beType、items，items 中须用实际 productCode 和 quantity |

到店自取已检查的组合为 orderType=1、beType=1，不传 beCode。得来速、外送、团餐的业务编码要求不同，应检查实际 schema，不把到店请求直接复用。套餐换配、预约时间、特制参数应来自详情和实际 schema。

普通多人点餐使用菜单与试算链路。`party-order-create` 等属于主题活动预约业务，不是通用多人拼单 API。

优惠券、餐品编码和配置仅在本地保存；公开示例默认使用模拟数据。当前报价字段如不满足输入契约，宿主必须先归一化，不能把原始响应盲目当作契约输入。
