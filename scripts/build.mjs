import { mkdir, cp, writeFile } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','favicon.svg','src']) await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Sito pronto nella cartella dist/');
