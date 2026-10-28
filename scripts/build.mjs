import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await Promise.all(['index.html','styles.css'].map(f=>copyFile(`web/${f}`,`dist/${f}`)));
await build({entryPoints:['web/app.js'],outfile:'dist/app.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
console.log('Built browser-only Token Risk in dist/');
