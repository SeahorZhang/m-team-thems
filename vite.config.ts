import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey';
import { version, description, author, license } from "./package.json";

function formatYYMMDD(date = new Date()) {
  return (
    String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0")
  );
}
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIME__: JSON.stringify(formatYYMMDD()),
  },
  build: {
    minify: 'esbuild',
    cssMinify: 'esbuild',
    target: 'es2020',
    sourcemap: false,
  },
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: mode === 'development'
          ? 'M-Team 新版页面主题 列表大图预览-demo'
          : 'M-Team 新版页面主题 列表大图预览',
        version,
        description,
        author,
        license,
        match: ['*.m-team.*'],
        icon: 'https://next.m-team.cc/favicon.ico',
      },
    }),
  ],
}))
