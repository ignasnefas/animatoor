import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(), 
    viteSingleFile()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Optimize build output
    target: 'esnext', // Use modern JavaScript features
    minify: 'esbuild', // Fast minification
    // Reduce initial bundle
    reportCompressedSize: false,
    sourcemap: false, // Disable source maps in production
    // Optimize CSS
    cssCodeSplit: false, // Single file means no CSS splitting
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'gif.js',
    ],
  },
});
