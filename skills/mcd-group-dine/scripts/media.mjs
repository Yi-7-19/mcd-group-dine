import {readFileSync} from 'node:fs';
const cache = new Map();
// Embed the optimized local assets so generated bills work when moved or offline.
export function foodImage(key) {
  if (!['hero','chicken','double-beef','fish'].includes(key)) throw new Error('未知餐品图片');
  if (!cache.has(key)) cache.set(key,'data:image/webp;base64,' + readFileSync(new URL(`../assets/food/${key}.webp`,import.meta.url)).toString('base64'));
  return cache.get(key);
}
export function productImageKey(name) {
  if (/板烧|鸡腿堡|烤鸡堡/.test(name)) return 'chicken';
  if (/巨无霸|双层.*牛/.test(name)) return 'double-beef';
  if (/麦香鱼|鱼排堡/.test(name)) return 'fish';
  return null;
}
