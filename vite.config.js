import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Critical for subdirectory deployment
  
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096, // Files smaller than 4KB will be inlined as base64
    chunkSizeWarningLimit: 1500, // Increase warning threshold
    
    rollupOptions: {
      output: {
        // Properly format asset filenames
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/ttf|woff|woff2/i.test(extType)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        
        // Split chunks properly
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
  
  server: {
    port: 3000,
  }
});