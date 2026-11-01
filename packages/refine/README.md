# @momots/refine

Luhn、MOD 11-2 与中国公民身份号码解析和校验工具。当前版本为
`0.1.0-alpha.0`，公开 API 在 alpha 阶段仍可能调整。

## 安装

```bash
bun add @momots/refine@alpha
```

唯一运行时依赖 `date-fns` 会随 refine 自动安装。发布物为 ESM JavaScript
与 TypeScript 声明文件，可在 Bun、Node.js 和浏览器打包器中使用。

## 导入

```ts
import { luhn, iso7064, fromChinaIdCard, isValidChinaIdCard } from '@momots/refine';

import { mod10 } from '@momots/refine/luhn/mod10';
import { mod11_2 } from '@momots/refine/iso7064/mod11-2';
import type { ChinaIdCard, ChinaIdCardInfo } from '@momots/refine/cn/idcard';
```

也可分别从 `@momots/refine/luhn` 与 `@momots/refine/iso7064` 导入 `luhn`、`iso7064`。

`luhn` 与 `iso7064` 是算法层，只校验校验和；`cn/idcard` 是证件层，负责格式、
日期与字段解析，内部调用算法层。

## Luhn

```ts
luhn.mod10('79927398713'); // true
mod10('79927398714'); // false
mod10('059'); // true，保留前导零
mod10('4111 1111 1111 1111'); // false，不自动清理输入
```

输入包含末位校验位，必须至少有两位 ASCII 数字。支持非负安全整数，但保留
前导零或较长号码时应使用字符串。其他输入返回 `false`。

此函数只验证 Luhn 校验和，不判断发卡机构、行业规定长度或账号是否存在。
例如 `00` 满足校验和规则。Luhn 与号码格式检查属于不同层面的检查，参见
[IBM 关于 Luhn 与格式检查的说明](https://www.ibm.com/docs/en/gdp/11.4.0?topic=policies-special-pattern-tests)。

## ISO 7064 MOD 11-2

```ts
iso7064.mod11_2('11010519491231002X'); // true
mod11_2('11010519491231002x'); // true
mod11_2('0000000218250097'); // true，ORCID / ISNI
```

输入为十进制本体码加末位校验字符，校验字符为 `0`–`9` 或 `X`，大小写不敏感。
权重与校验字符按 ISO 7064 固定，与 GB 11643 公民身份号码的权重表一致。
只检查校验和，不判断号码长度；不自动清理空白或分隔符，其他输入返回 `false`。

## 公民身份号码

```ts
const referenceDate = new Date(2026, 0, 1);

isValidChinaIdCard('11010519491231002x', referenceDate); // true
isValidChinaIdCard('invalid', referenceDate); // false
fromChinaIdCard('11010519491231002X', referenceDate);
// { region: '110105', birthDate: '1949-12-31', age: 76, gender: 'F' }
```

支持 18 位号码，依次检查格式、校验位、有效日历日期，以及出生年份不早于
1800、生日不晚于参考日期。
`x` 与 `X` 等价。当前 alpha 不支持旧 15 位号码，不自动去除空白或前后缀。
18 位号码的字段划分可参考
[北京市公安局说明](https://gaj.beijing.gov.cn/hudong/rddf/202003/t20200331_1771804.html)。

- `isValidChinaIdCard(code: unknown, referenceDate?: Date)`：非法号码或无效参考日期返回 `false`；true 分支收窄为 `ChinaIdCard`，false 分支保留原类型。
- `fromChinaIdCard(code: string, referenceDate?: Date)`：返回 `ChinaIdCardInfo`；未通过相同检查时抛出 `RangeError`。
- `region` 保留六位地址码；`birthDate` 为 `yyyy-MM-dd`；`age` 为周岁；`gender` 是号码顺序码表示的 `M` 或 `F`。
- `referenceDate` 默认当前时间，日期与年龄按运行环境的本地日历计算。需要可重复结果时显式传入。
- 不核验行政区划是否真实分配，也不核验实际发证、账号归属或身份真实性。

## 开发与发布验证

```bash
bun run build
bun run test
bun run typecheck:spec
bun pm pack --destination /tmp
```

`prepack` 自动执行构建、测试和测试类型检查。发布配置为公开包，默认使用
`alpha` 标签；发布操作需由维护者显式执行。
