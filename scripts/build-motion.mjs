import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../',import.meta.url));
const remotion = dirname(require.resolve('remotion'));
const version = JSON.parse(await readFile(require.resolve('remotion/package.json'),'utf8')).version;
if (version !== '4.0.534') throw new Error('请先核对新版 Remotion 模块路径与许可，再更新构建。');
const remotionLicense = await readFile(join(remotion,'../../LICENSE.md'),'utf8');
const nativeLicense = await readFile(join(root,'skills/mcd-group-dine/references/react-native-LICENSE.txt'),'utf8');
const result = await build({
  absWorkingDir:root,
  entryPoints:['motion/page-motion.mjs'],
  outfile:'skills/mcd-group-dine/scripts/ui-motion.js',
  bundle:true, write:false, minify:true, metafile:true,
  format:'iife', platform:'browser', target:['chrome100','safari15.4','firefox102'],
  legalComments:'inline',
  banner:{js:`/*! Built with Remotion 4.0.534. Third-party notices follow.\n\n${remotionLicense}\n\nReact Native easing / bezier helpers:\n${nativeLicense}\n*/`},
  plugins:[{
    name:'remotion-math-only',
    setup(builder) {
      // The public ESM barrel also initializes the full video renderer.
      // Use the original pinned-package helper files, without rewriting them.
      builder.onResolve({filter:/^remotion$/}, () => ({path:'helpers',namespace:'remotion-math'}));
      builder.onLoad({filter:/.*/,namespace:'remotion-math'}, () => ({
        contents:`export {interpolate} from ${JSON.stringify(join(remotion,'interpolate.js'))};export {Easing} from ${JSON.stringify(join(remotion,'easing.js'))};`,
        loader:'js', resolveDir:root,
      }));
    },
  }],
});
const code = result.outputFiles[0].contents;
if (code.length > 50000) throw new Error('动效脚本超过 50KB 预算，请检查是否引入了播放器或 React 运行时。');
const inputs = Object.keys(result.metafile.inputs).map(path => path.replaceAll('\\','/'));
if (!inputs.some(path=>path.endsWith('remotion/dist/cjs/interpolate.js')) || !inputs.some(path=>path.endsWith('remotion/dist/cjs/easing.js')) || inputs.some(path=>/node_modules\/react(?:-dom)?\//.test(path))) throw new Error('动效必须使用真实 Remotion 插值和缓动模块，且不能打包 React。');
const scripts = join(root,'skills/mcd-group-dine/scripts');
await writeFile(join(scripts,'ui-motion.js'),code);
await copyFile(join(remotion,'../../LICENSE.md'),join(root,'skills/mcd-group-dine/references/remotion-LICENSE.md'));
const source = await readFile(join(root,'motion/page-motion.mjs'),'utf8');
await writeFile(join(scripts,'ui-motion.build.json'),JSON.stringify({remotion:version,bytes:code.length,sha256:createHash('sha256').update(code).digest('hex'),source:'motion/page-motion.mjs',sourceSha256:createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex'),helpers:inputs.filter(path=>path.includes('remotion/dist/')).map(path=>path.slice(path.indexOf('node_modules/'))),runtimeReact:false},null,2)+'\n');
console.log(`Remotion ${version}: ${code.length} bytes, no React/player runtime.`);
