// This entrypoint also works when only the Skill directory is installed.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, extname} from 'node:path';
import {splitBill, rankPlans} from './split.mjs';
import {markdownReport, htmlReport} from './report.mjs';
try {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('用法：node src/cli.mjs input.json [--out report.html|report.md|report.json]\n支持单个报价，或 {"plans": [...]} 多方案。数据须由宿主按真实 MCP schema 归一化；示例为演示数据。');
  } else {
    const rest = args.slice(1);
    if (rest.length && (rest.length !== 2 || rest[0] !== '--out')) throw new Error('未知参数；请使用 --help');
    const input = JSON.parse(await readFile(args[0], 'utf8'));
    const ranked = input.plans ? rankPlans(input.plans) : null;
    const result = ranked ? ranked[0] : splitBill(input);
    const path = rest[1];
    const extension = path ? extname(path).toLowerCase() : '.md';
    if (!['.html','.md','.json'].includes(extension)) throw new Error('输出只支持 .html、.md 或 .json');
    const rendered = extension === '.html' ? htmlReport(result) : extension === '.json' ? JSON.stringify(ranked ? {recommended: result, plans: ranked} : result, null, 2) + '\n' : markdownReport(result);
    if (path) { await mkdir(dirname(path), {recursive:true}); await writeFile(path, rendered, 'utf8'); console.log(`已生成：${path}`); }
    else console.log(rendered);
    if (ranked) console.error(`已比较 ${ranked.length} 个候选方案。此推荐仅适用于提供的候选，不代表全局最低价。`);
  }
} catch (error) {console.error(`无法生成分账：${error.message}`); process.exitCode = 1;}
