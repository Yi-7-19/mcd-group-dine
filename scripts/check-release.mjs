import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const required=['README.md','CONTEST_DECLARATION.md','MCP_INTEGRATION.md','mcp-config.example.json','workbuddy.md','src/cli.mjs','src/normalize-mcp.mjs','docs/live-validation.md','skills/mcd-group-dine/SKILL.md','skills/mcd-group-dine/scripts/cli.mjs','skills/mcd-group-dine/scripts/split.mjs','skills/mcd-group-dine/scripts/report.mjs'];
let failures=[];
for(const p of required)try{if(!(await stat(join(root,p))).size)failures.push(`${p} 为空`);}catch{failures.push(`缺少 ${p}`);}
const declaration=await readFile(join(root,'CONTEST_DECLARATION.md'));
const sha=createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${declaration.length}\0`),declaration])).digest('hex');
if(sha!=='136e76f3160317049f19f5ba03f4d0fedd70fc3c')failures.push('官方声明字节与已核实原文不一致');
const config=JSON.parse(await readFile(join(root,'mcp-config.example.json'),'utf8'));
if(config.mcpServers['mcd-mcp'].headers.Authorization!=='Bearer ${MCD_MCP_TOKEN}')failures.push('配置不符合环境变量占位符要求');
const assets=join(root,'skills/mcd-group-dine/assets/food');
const manifest=JSON.parse(await readFile(join(assets,'manifest.json'),'utf8'));
if(manifest.length!==4||new Set(manifest.map(item=>item.key)).size!==4)failures.push('食物配图必须包含四项独立素材');
for(const item of manifest){const bytes=await readFile(join(assets,item.file));if(bytes.length!==item.bytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)failures.push(`配图校验不一致：${item.file}`);}
const motionDir=join(root,'skills/mcd-group-dine/scripts');
const motion=JSON.parse(await readFile(join(motionDir,'ui-motion.build.json'),'utf8'));
const bundle=await readFile(join(motionDir,'ui-motion.js'));
const motionSource=(await readFile(join(root,motion.source),'utf8')).replaceAll('\r\n','\n');
if(motion.remotion!=='4.0.534'||motion.runtimeReact!==false||bundle.length!==motion.bytes||bundle.length>50000||createHash('sha256').update(bundle).digest('hex')!==motion.sha256||createHash('sha256').update(motionSource).digest('hex')!==motion.sourceSha256)failures.push('Remotion 产物、源文件或体积预算检查失败，请重新构建');
for(const name of ['remotion-LICENSE.md','react-native-LICENSE.txt','THIRD_PARTY_NOTICES.md'])if(!(await stat(join(root,'skills/mcd-group-dine/references',name))).size)failures.push(`缺少第三方说明：${name}`);
async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(item.name))continue;const p=join(dir,item.name);if(item.isDirectory())await scan(p);else if(/\.(md|mjs|js|css|json|yml|yaml|html|svg)$/.test(p)){const text=await readFile(p,'utf8');if(/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|Bearer\s+[A-Za-z0-9_.-]{30,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/.test(text))failures.push(`疑似真实凭证：${p}`);}}}
await scan(root);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('参赛文件、官方声明字节和配置占位符检查通过；未发现扫描规则覆盖的凭证模式。此检查不替代真实 MCP 调用证据核验。');
