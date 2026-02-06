import * as path from "node:path";

/**
 * Vite plugin that wraps Svelte components as self-executing modules for Ghost CMS.
 *
 * This plugin transforms Svelte components into standalone JavaScript files that:
 * - Automatically instantiate when loaded via <script> tag
 * - Mount to a target element matching the component's kebab-case filename
 * - Output with a customizable file extension (default: .svelte-loader.js)
 *
 * @param {Object} options - Plugin configuration options
 * @param {string} [options.extension='.svelte-loader.js'] - File extension for wrapper output files
 * @param {string} [options.outputDir] - Directory for output files (e.g., 'js'). If not specified, derives from input path structure.
 *
 * @returns {import('vite').Plugin} Vite plugin object
 *
 * @example
 * // vite.config.js - auto-derive output directory from input
 * import { ghostSveltePlugin } from './vite-plugin-ghost-svelte.mjs';
 *
 * export default defineConfig({
 *   plugins: [
 *     svelte(),
 *     ghostSveltePlugin({ extension: '.svelte-loader.js' })
 *   ],
 *   build: {
 *     rollupOptions: {
 *       input: {
 *         'js/cart-sidebar': './src/js/cart-sidebar.svelte'  // outputs to js/
 *         'components/header': './src/components/header.svelte'  // outputs to components/
 *       }
 *     }
 *   }
 * });
 *
 * @example
 * // vite.config.js - specify explicit output directory
 * ghostSveltePlugin({ extension: '.svelte-loader.js', outputDir: 'scripts' })
 *
 * @example
 * // Usage in Ghost handlebars template
 * // Component file: cart-sidebar.svelte
 * // Target element: <cart-sidebar></cart-sidebar>
 * <cart-sidebar></cart-sidebar>
 * <script type="module" src="{{asset "js/cart-sidebar.svelte-loader.js"}}"></script>
 */
export function ghostSveltePlugin(options = {}) {
  const { extension = '.svelte-loader.js', outputDir } = options;
  // Track which entry points are Svelte components (maps entry key to full path)
  const svelteEntries = new Map();
  // Map virtual IDs to original paths
  const virtualIdMap = new Map();

  return {
    name: 'ghost-svelte',

    // Config hook, identify which input entries are .svelte files
    config(config) {
      const input = config.build?.rollupOptions?.input;
      if (input && typeof input === 'object') {
        for (const [key, value] of Object.entries(input)) {
          if (value.endsWith('.svelte')) {
            svelteEntries.set(key, value);
          }
        }
      }
    },

    resolveId(id) {
      if (id.startsWith("virtual:ghost-svelte-wrapper:"))
        return id;
    },

    load(id, x) {
     if (id.startsWith("virtual:ghost-svelte-wrapper:")) {
        const baseName = id.replace("virtual:ghost-svelte-wrapper:", "");
        const originalPath = virtualIdMap.get(baseName);

        if (!originalPath) {
          throw new Error(`No mapping found for virtual module: ${id}`);
        }

        // Extract component name from base name (e.g. "cart-sidebar")
        // Convert kebab-case to component name
        const componentName = baseName;
        const kebabName = baseName;

        // Import the existing entry
        // Props are passed via data-props attribute as JSON on the target element
        return `
          import { mount } from "svelte";
          import Component from "${originalPath}";

          // Auto-instantiate on load
          // Use requestAnimationFrame to ensure Svelte's reactive context is properly established
          // This prevents the effect_orphan error that occurs when $effect runs outside component init
          if (typeof document !== 'undefined') {
            const doMount = () => {
              const targetTag = '${kebabName}';
              const target = document.querySelector(targetTag);

              if (target) {
                // Parse props from data-props attribute if present
                let props = {};
                const propsAttr = target.getAttribute('data-props');
                if (propsAttr) {
                  try {
                    props = JSON.parse(propsAttr);
                  } catch (e) {
                    console.error('[Ghost Svelte] Failed to parse data-props:', e);
                  }
                }

                mount(Component, { target, props });
              } else {
                console.warn('[Ghost Svelte] Target element <${kebabName}> not found');
              }
            };

            // Schedule mount after current execution context to ensure proper Svelte initialization
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', doMount);
            } else {
              // Use requestAnimationFrame to defer to next frame, ensuring proper reactive context
              requestAnimationFrame(doMount);
            }
          }
        `;
      }
    },

    buildStart() {
      for (const [entryKey, entryPath] of svelteEntries) {
        const baseName = path.basename(entryPath, '.svelte');

        // Store the mapping from baseName to original path
        virtualIdMap.set(baseName, entryPath);

        // Determine output directory
        let dir = outputDir;
        if (!dir) {
          // Derive from entry key structure (e.g., 'js/cart-sidebar' -> 'js/')
          const keyDir = path.dirname(entryKey);
          dir = keyDir === '.' ? '' : keyDir;
        }

        // Build the output path
        const outputPath = dir ? `${dir}/${baseName}${extension}` : `${baseName}${extension}`;

        // Emit as a new entry chunk with a virtual ID that doesn't include .svelte
        this.emitFile({
          type: 'chunk',
          id: `virtual:ghost-svelte-wrapper:${baseName}`,
          fileName: outputPath,
        });
      }
    }
  }
}
