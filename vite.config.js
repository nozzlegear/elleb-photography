import { defineConfig } from 'vite'
import { resolve } from 'path'

const { name, version, author, license, repository } = require('./package.json')

const BuildComments = `/*!
 * ${name} v${version}
 * Copyright ${new Date().getFullYear()} ${author.name} <${author.email}> (${repository.url})
 * Licensed under ${license}
 */`

export default defineConfig({
  build: {
    outDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/js/main.ts'),
        'styles/main': resolve(__dirname, 'src/css/main.css'),
        'styles/amp': resolve(__dirname, 'src/css/amp.css')
      },
      output: {
        banner: BuildComments,
        dir: 'assets',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main') {
            return 'scripts/[name].js'
          }
          return '[name].js'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            const name = assetInfo.name.replace('.css', '')
            return `styles/${name}.css`
          }
          return 'assets/[name].[ext]'
        }
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    target: 'es2018'
  },
  css: {
    postcss: {
      plugins: [
        require('postcss-import')(),
        require('postcss-extend')(),
        require('precss')(),
        require('tailwindcss/nesting')(),
        require('tailwindcss')(),
        ...(process.env.NODE_ENV === 'production' ? [
          require('autoprefixer')(),
          require('cssnano')(),
          require('postcss-discard-comments')({ removeAll: true })
        ] : [])
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/assets/**']
    }
  },
  plugins: [
    {
      name: 'copy-images',
      generateBundle() {
        // Copy images from src/img to assets/images
        const fs = require('fs')
        const path = require('path')
        
        const copyDir = (src, dest) => {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true })
          }
          
          const files = fs.readdirSync(src)
          files.forEach(file => {
            const srcPath = path.join(src, file)
            const destPath = path.join(dest, file)
            
            if (fs.statSync(srcPath).isDirectory()) {
              copyDir(srcPath, destPath)
            } else {
              fs.copyFileSync(srcPath, destPath)
            }
          })
        }
        
        copyDir('./src/img', './assets/images')
      }
    },
    {
      name: 'create-hbs-styles',
      closeBundle() {
        // Create HBS style files after build
        const fs = require('fs')
        const postcss = require('postcss')
        
        const createHbsFile = (cssPath, outputPath) => {
          if (fs.existsSync(cssPath)) {
            let css = fs.readFileSync(cssPath, 'utf8')
            css = css.replace('@charset "UTF-8";', '')
            
            postcss([
              require('cssnano')(),
              require('postcss-discard-comments')({ removeAll: true })
            ])
            .process(css, { from: undefined })
            .then(result => {
              fs.writeFileSync(outputPath, result.css)
            })
          }
        }
        
        // Ensure partials directory exists
        if (!fs.existsSync('./partials')) {
          fs.mkdirSync('./partials', { recursive: true })
        }
        if (!fs.existsSync('./partials/amp')) {
          fs.mkdirSync('./partials/amp', { recursive: true })
        }
        
        createHbsFile('./assets/styles/main.css', './partials/main-styles.hbs')
        createHbsFile('./assets/styles/amp.css', './partials/amp/amp-styles.hbs')
      }
    }
  ]
})