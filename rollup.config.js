import serve from 'rollup-plugin-serve';
import sass from 'rollup-plugin-sass';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.js',
    output: {
        name: 'badgeeditable',
        file: 'dist/badgeeditable.js',
        format: 'iife',
    },
    plugins: [
        serve({
            contentBase: ['dist', 'static'],
        }),
        sass({
            output: true,
        }),
        json(),
        resolve(),
        commonjs(),
    ],
};
