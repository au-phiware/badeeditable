import serve from 'rollup-plugin-serve';
import sass from 'rollup-plugin-sass';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const isDevelopment = process.env.NODE_ENV === 'development';

export default {
    input: 'src/index.mjs',
    output: {
        name: 'BadgeEditable',
        file: 'dist/badgeeditable.js',
        format: 'iife',
    },
    plugins: [
        isDevelopment && serve({
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
