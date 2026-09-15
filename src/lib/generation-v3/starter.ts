export const V3_STARTER_TEMPLATE_VERSION = 'form-v3-vite-starter-1';

// These files must match the source files baked into the qualified E2B template.
// Package manifests stay in the template and are never accepted from the model.
export const V3_STARTER_FILES: Array<{ path: string; content: string }> = [
  { path: 'index.html', content: '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>FORM artifact</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n' },
  { path: 'src/main.tsx', content: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);\n" },
  { path: 'src/App.tsx', content: "export default function App() {\n  return <main><h1>FORM artifact</h1></main>;\n}\n" },
  { path: 'src/styles.css', content: ':root { font-family: system-ui, sans-serif; color: #171717; background: #f7f7f4; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-width: 320px; }\nbutton, input { font: inherit; }\n' },
  { path: 'vite.config.ts', content: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n" },
  { path: 'tsconfig.json', content: '{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"lib":["ES2020","DOM","DOM.Iterable"],"module":"ESNext","skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"isolatedModules":true,"noEmit":true,"jsx":"react-jsx","strict":true},"include":["src"]}\n' },
  { path: 'tsconfig.node.json', content: '{"compilerOptions":{"composite":true,"skipLibCheck":true,"module":"ESNext","moduleResolution":"bundler","allowSyntheticDefaultImports":true,"strict":true},"include":["vite.config.ts"]}\n' },
];
