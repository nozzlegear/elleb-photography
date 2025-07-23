import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import postcssImport from 'postcss-import'
import postcssExtend from 'postcss-extend'
import precss from 'precss'
import tailwindcssNesting from 'tailwindcss/nesting'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import postcssDiscardComments from 'postcss-discard-comments'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))
const { name, version, author, license, repository } = packageJson

// Function to map entry points and preserve folder structure
const getEntries = (entryPoints) => entryPoints.reduce((entries, file) => {
    const key = file.replace(/\.(svelte|tsx?|jsx?|css)$/, '');
    entries[key] = path.resolve(__dirname, "src", file);
    return entries;
}, {});

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
      input: getEntries([
        'js/main.ts',
        'js/medusa/index.ts',
        'css/main.css',
        'css/amp.css'
      ]),
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
        postcssImport(),
        postcssExtend(),
        precss(),
        tailwindcssNesting(),
        tailwindcss(),
        ...(process.env.NODE_ENV === 'production' ? [
          autoprefixer(),
          cssnano(),
          postcssDiscardComments({ removeAll: true })
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

        const createHbsFile = (cssPath, outputPath) => {
          if (fs.existsSync(cssPath)) {
            let css = fs.readFileSync(cssPath, 'utf8')
            css = css.replace('@charset "UTF-8";', '')

            postcss([
              cssnano(),
              postcssDiscardComments({ removeAll: true })
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
