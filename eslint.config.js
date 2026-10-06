import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// Build output is compiled, not authored — linting it produces false
// failures on whatever the compiler emitted.
//
// Boundary enforcement (see ARCHITECTURE.md): the path locates the module,
// the name locates the role. Elements are the module folders under src/;
// the entry point is the package's public surface. As modules grow, extend
// the matrix below — a naming standard without a gate erodes one change at
// a time.
export default tseslint.config(
  { ignores: ['build/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts', 'src/**/*.mts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        // Deeper patterns first: a file classifies by its deepest matching
        // folder, so only src-root files fall through to the entry element.
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'module', pattern: 'src/*/**' },
        { type: 'entry', pattern: 'src' },
      ],
      // The plugin delegates import resolution to this resolver — without it
      // every intra-src import is "unknown" and the policies never fire.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // The public surface re-exports modules and may use the kernel.
            {
              from: { element: { type: 'entry' } },
              allow: { to: { element: { types: { anyOf: ['module', 'shared'] } } } },
            },
            // Modules consume the kernel; never the entry, never each other
            // (extend this allow-list when a real cross-module edge appears).
            {
              from: { element: { type: 'module' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'shared' } },
              disallow: { to: { element: { types: { anyOf: ['module', 'entry'] } } } },
              message: 'The shared kernel imports from no module.',
            },
          ],
        },
      ],
      // Every src file must belong to an element — new files declare their
      // place in the structure from the first commit.
      'boundaries/no-unknown-files': 'error',
    },
  },
);
