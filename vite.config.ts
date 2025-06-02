import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import monkey, { cdn } from 'vite-plugin-monkey';
import svgr from "vite-plugin-svgr";
import tailwindcss from '@tailwindcss/vite'
import { name, version, description, author } from "./package.json";


// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString()),
  },
  plugins: [
    react(),
    svgr({ svgrOptions: { icon: true } }),
    tailwindcss(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name,
        version,
        description,
        author,
        match: ['https://next.m-team.cc/*'],
        icon: 'https://next.m-team.cc/favicon.ico',
      },
      build: {
        externalGlobals: {
          react: cdn.jsdelivr('React', 'umd/react.production.min.js'),
          'react-dom': cdn.jsdelivr('ReactDOM', 'umd/react-dom.production.min.js'),
          antd: cdn.jsdelivr('antd', 'antd.min.js'),
          '@ant-design/icons': cdn.jsdelivr('@ant-design/icons', 'index.umd.min.js'),
        },
      },
    }),
  ],
})
