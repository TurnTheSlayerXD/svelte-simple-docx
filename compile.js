import { compile } from 'svelte/compiler';
import { readFileSync, writeFileSync } from 'fs';


const src = readFileSync('./main.svelte').toString();
const result = compile(src, {
    name: 'svelte_component',
    customElement: true,
});

writeFileSync('./dist-svelte/code.js', result.js?.code);
writeFileSync('./dist-svelte/map.json', result.js?.map.toString());