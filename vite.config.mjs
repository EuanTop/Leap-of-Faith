import {defineConfig} from 'vite';
import {controlPlugin} from './scripts/control.mjs';
export default defineConfig({cacheDir:'artifacts/.vite',plugins:[controlPlugin()],server:{host:'127.0.0.1',port:5175,strictPort:true}});
