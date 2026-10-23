import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('Skill 单独复制到临时目录仍能输出账单',()=>{
 const temp=mkdtempSync(join(tmpdir(),'mcd-skill-test-'));
 cpSync(join(root,'skills/mcd-group-dine'),join(temp,'skill'),{recursive:true});
 const out=join(temp,'bill.json');
 const run=spawnSync(process.execPath,[join(temp,'skill/scripts/cli.mjs'),join(root,'examples/demo.json'),'--out',out],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(readFileSync(out,'utf8')).payableCents,7300);
});
test('未知输出格式失败且给出可操作说明',()=>{
 const run=spawnSync(process.execPath,[join(root,'src/cli.mjs'),join(root,'examples/demo.json'),'--out','bill.exe'],{encoding:'utf8'});
 assert.equal(run.status,1);assert.match(run.stderr,/输出只支持/);
});
test('单独安装的 Skill 可在任意输出目录生成带有效 WebP 的离线 HTML',()=>{
 const temp=mkdtempSync(join(tmpdir(),'mcd-html-test-'));
 cpSync(join(root,'skills/mcd-group-dine'),join(temp,'skill'),{recursive:true});
 const out=join(temp,'portable-bill.html');
 const run=spawnSync(process.execPath,[join(temp,'skill/scripts/cli.mjs'),join(root,'examples/live-quote.json'),'--out',out],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const html=readFileSync(out,'utf8');
 assert.ok(html.includes('remotion-4.0.534'));
 assert.ok(html.includes('Remotion License'));
 assert.ok(html.includes('Copyright (c) Facebook, Inc. and its affiliates.'));
 assert.equal((html.match(/<script\b[^>]*\bsrc=/g)??[]).length,0);
 const images=[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(images.length,4);
 for(const source of images){
   assert.ok(source.startsWith('data:image/webp;base64,'));
   const bytes=Buffer.from(source.split(',')[1],'base64');
   assert.equal(bytes.subarray(0,4).toString(),'RIFF');
   assert.equal(bytes.subarray(8,12).toString(),'WEBP');
   assert.ok(bytes.length>1000);
 }
});
