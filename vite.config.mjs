import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { ghostSveltePlugin } from './vite-plugin-ghost-svelte.mjs';
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

// Get the rollup input config to check if entries are Svelte files
const inputConfig = getEntries([
  'js/main.ts',
  'js/pages/products-page.svelte',
  'js/cart-sidebar.svelte',
  'css/main.css',
  'css/amp.css',
  'css/pages/store.css',
]);

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
      external: [],
      input: inputConfig,
      output: {
        banner: BuildComments,
        dir: 'assets',
        entryFileNames: (chunkInfo) => {
          // Check if this entry was originally a .svelte file
          const entryKey = Object.keys(inputConfig).find(key => {
            const normalizedFacadeModuleId = chunkInfo.facadeModuleId?.replace(/\\/g, '/');
            return normalizedFacadeModuleId?.includes(key);
          });

          if (entryKey && inputConfig[entryKey].endsWith('.svelte')) {
            // Output Svelte files as .svelte.js
            return '[name].svelte.js';
          }

          return '[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            let name = assetInfo.name.replace('.css', '')
            return name.includes("css/") ? `styles/${name}.css` : `styles/css/${name}.css`;
          }
          return 'assets/[name].[ext]'
        },
        // Enable proper code splitting for modules
        inlineDynamicImports: false
      }
    },
    sourcemap: true,
    minify: process.env.NODE_ENV === 'production',
    target: 'es2022'
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
      ignored: ['**/node_modules/**', '**/dist/**', '**/assets/**', '**/partials/**/*.hbs']
    }
  },
  plugins: [
    svelte({
       configFile: path.resolve(__dirname, "./svelte.config.mjs"),
       compilerOptions: {
           runes: true,
           experimental: {
             async: true,
           }
       },
    }),
    ghostSveltePlugin({
        extension: '.svelte-loader.js'
    }),
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
      async closeBundle() {
        // Create HBS style files after build

        const createHbsFile = async (cssPath, outputPath) => {
          if (fs.existsSync(cssPath)) {
            let css = fs.readFileSync(cssPath, 'utf8')
            css = css.replace('@charset "UTF-8";', '')

            const result = await postcss([
              cssnano(),
              postcssDiscardComments({ removeAll: true })
            ])
            .process(css, { from: undefined })

            // Only write if content has changed to prevent infinite rebuild loops
            const newContent = result.css
            let existingContent = ''
            if (fs.existsSync(outputPath)) {
              existingContent = fs.readFileSync(outputPath, 'utf8')
            }

            if (newContent !== existingContent) {
              fs.writeFileSync(outputPath, newContent)
            }
          }
        }

        // Ensure partials directory exists
        if (!fs.existsSync('./partials')) {
          fs.mkdirSync('./partials', { recursive: true })
        }
        if (!fs.existsSync('./partials/amp')) {
          fs.mkdirSync('./partials/amp', { recursive: true })
        }

        await createHbsFile('./assets/styles/css/main.css', './partials/main-styles.hbs')
        await createHbsFile('./assets/styles/css/amp.css', './partials/amp/amp-styles.hbs')
      }
    }
  ]
})
