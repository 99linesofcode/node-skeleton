import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// The mechanical rules of the `architecture` skill, enforced over the source
// root `src/`. Every failure message opens with the rule's name (`direction`,
// `sideways`, `suffix`, `public-interface`) so a finding cites it as is.
// `shape` is `boundaries/no-unknown-files`: a file in no place of the shape
// fails it. The config names no context: contexts are captured from the path.

// Role folders. A file in one sits directly in the folder and, for the
// application and adapter roles, carries the role's suffix. Domain names stay
// bare glossary nouns.
const ROLES = [
  {
    type: 'action',
    folder: 'src/Core/*/Application/Actions',
    suffix: 'Action',
  },
  { type: 'query', folder: 'src/Core/*/Application/Queries', suffix: 'Query' },
  {
    type: 'listener',
    folder: 'src/Core/*/Application/Listeners',
    suffix: 'Listener',
  },
  { type: 'port', folder: 'src/Core/*/Application/Ports', suffix: 'Port' },
  {
    type: 'data',
    folder: 'src/Core/*/Application/DataTransferObjects',
    suffix: 'Data',
  },
  { type: 'model', folder: 'src/Core/*/Domain/Models', suffix: '' },
  { type: 'event', folder: 'src/Core/*/Domain/Events', suffix: '' },
  {
    type: 'value-object',
    folder: 'src/Core/*/Domain/ValueObjects',
    suffix: '',
  },
  { type: 'domain-service', folder: 'src/Core/*/Domain/Services', suffix: '' },
];

const APPLICATION = ['action', 'query', 'listener', 'port', 'data'];
const DOMAIN = ['model', 'event', 'value-object', 'domain-service'];
const CONTEXT = [...APPLICATION, ...DOMAIN];
const ADAPTERS = ['driving-adapter', 'driven-adapter'];

const element = (types, captured) => ({
  element: { types: { anyOf: types }, ...(captured && { captured }) },
});
const sameContext = (types) =>
  element(types, { context: '{{from.element.captured.context}}' });
const otherContext = (types) =>
  element(types, { context: '!{{from.element.captured.context}}' });

export default tseslint.config(
  // Build output is compiled, not authored.
  { ignores: ['build/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,mjs,ts,mts}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'composition-root', pattern: 'src/index.mts', mode: 'full' },
        // The shared kernel comes before the contexts, which `*` would match.
        {
          type: 'shared-kernel',
          pattern: 'src/Core/SharedKernel/**/*.ts',
          mode: 'full',
        },
        ...ROLES.map(({ type, folder, suffix }) => ({
          type,
          pattern: `${folder}/*${suffix}.ts`,
          mode: 'full',
          capture: ['context', 'name'],
        })),
        {
          type: 'driving-adapter',
          pattern: 'src/UserInterface/*/**/*Adapter.ts',
          mode: 'full',
          capture: ['mechanism'],
        },
        {
          type: 'driven-adapter',
          pattern: 'src/Infrastructure/*/**/*Adapter.ts',
          mode: 'full',
          capture: ['tool'],
        },
        { type: 'lib', pattern: 'src/Lib/**/*.ts', mode: 'full' },
        // Tests mirror `src/` and may reach any of it.
        { type: 'test', pattern: 'tests/**/*', mode: 'full' },
        // Everything else in the repository is outside the module.
        { type: 'outside', pattern: '!(src|tests)/**/*', mode: 'full' },
        { type: 'outside', pattern: '*', mode: 'full' },
      ],
      // The element patterns name files, so the suffix is part of the place:
      // that takes `mode: 'full'`, which v7 marks legacy and warns about.
      'boundaries/legacy-warnings': false,
      // The plugin delegates import resolution to this resolver; without it
      // every intra-src import is unknown and the policies never fire.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          checkUnknownLocals: true,
          // A dependency no policy allows breaks the dependency rule.
          message:
            'direction: {{from.element.types}} may not import {{dependency.source}}{{#if to.element.types}} ({{to.element.types}}){{/if}}. Dependencies point inward (UserInterface, Infrastructure -> Application -> Domain) and downward (-> Core/SharedKernel -> Lib -> language).',
          policies: [
            // Inward and downward.
            {
              from: element(['composition-root', 'test']),
              allow: {
                to: [
                  element([
                    'composition-root',
                    'shared-kernel',
                    'lib',
                    'test',
                    ...CONTEXT,
                    ...ADAPTERS,
                  ]),
                ],
              },
            },
            {
              from: element(['driving-adapter']),
              allow: {
                to: [
                  element([...CONTEXT, 'shared-kernel', 'lib']),
                  element(['driving-adapter'], {
                    mechanism: '{{from.element.captured.mechanism}}',
                  }),
                ],
              },
            },
            {
              from: element(['driven-adapter']),
              allow: {
                to: [
                  element([...CONTEXT, 'shared-kernel', 'lib']),
                  element(['driven-adapter'], {
                    tool: '{{from.element.captured.tool}}',
                  }),
                ],
              },
            },
            {
              from: element(APPLICATION),
              allow: {
                to: [sameContext(CONTEXT), element(['shared-kernel', 'lib'])],
              },
            },
            {
              from: element(DOMAIN),
              allow: {
                to: [sameContext(DOMAIN), element(['shared-kernel', 'lib'])],
              },
            },
            {
              from: element(['shared-kernel']),
              allow: { to: element(['shared-kernel', 'lib']) },
            },
            { from: element(['lib']), allow: { to: element(['lib']) } },
            // The core uses no tool directly: every tool sits behind a port.
            // Code outside the core may use packages and Node built-ins.
            {
              from: element([
                'composition-root',
                'test',
                'outside',
                'lib',
                ...ADAPTERS,
              ]),
              allow: { to: { module: { origin: ['external', 'core'] } } },
            },
            // Never sideways between contexts.
            {
              from: element(CONTEXT),
              disallow: { to: otherContext(CONTEXT) },
              message:
                'sideways: context {{from.element.captured.context}} may not import context {{to.element.captured.context}}. Contexts meet only through events in Core/SharedKernel.',
            },
            // Outside code sees the module's public interface only.
            {
              from: element(['outside']),
              allow: {
                to: element(['composition-root', ...APPLICATION, 'event']),
              },
            },
            {
              from: element(['outside']),
              disallow: {
                to: [
                  element([
                    'shared-kernel',
                    'lib',
                    'test',
                    'model',
                    'value-object',
                    'domain-service',
                    ...ADAPTERS,
                  ]),
                  { element: { isUnknown: true }, module: { origin: 'local' } },
                ],
              },
              message:
                'public-interface: code outside the module may import only src/index.mts, Core/*/Application/** and Core/*/Domain/Events/**, not {{dependency.source}}{{#if to.element.types}} ({{to.element.types}}){{/if}}.',
            },
          ],
        },
      ],
    },
  },
  // `suffix`: a file in an application or adapter role folder carries the
  // role's suffix. `boundaries/no-unknown-files` already fails it, but cannot
  // take a message; this names the rule.
  ...[
    ...ROLES.filter(({ suffix }) => suffix).map(({ folder, suffix }) => ({
      files: [`${folder}/**`],
      ignores: [`${folder}/*${suffix}.ts`],
      where: `${folder.split('/').pop()}/`,
      suffix,
    })),
    ...['src/UserInterface/*', 'src/Infrastructure/*'].map((folder) => ({
      files: [`${folder}/**`],
      ignores: [`${folder}/**/*Adapter.ts`],
      where: `${folder.split('/')[1]}/`,
      suffix: 'Adapter',
    })),
  ].map(({ files, ignores, where, suffix }) => ({
    files,
    ignores,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: `suffix: a file in ${where} is named <Name>${suffix}.ts.`,
        },
      ],
    },
  })),
);
