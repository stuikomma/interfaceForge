# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interface-forge is a TypeScript library for creating strongly typed mock data factories using Faker.js. It provides a `Factory` class that extends Faker.js functionality with type-safe mock data generation, batch operations, and factory composition.

## Essential Commands

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run a single test file
pnpm test src/index.spec.ts

# Lint code (auto-fixes issues)
pnpm lint

# Type check
pnpm typecheck

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

## Architecture

The library has a modular structure:

- `src/index.ts` - Contains the `Factory` class and all related types
  - Main export: `Factory` class extending Faker
  - Type exports: `FactoryFunction`, `FactorySchema`, `FactoryComposition`
  - Key methods: `build()`, `batch()`, `use()`, `iterate()`, `sample()`, `extend()`, `compose()`, `afterBuild()`, `beforeBuild()`, `buildAsync()`

- `src/zod.ts` - Optional Zod schema integration (separate entry point)
  - Export: `ZodFactory` class extending `Factory`
  - Supports generating mock data from Zod schemas
  - Custom type registry for extensibility
  - Available via `interface-forge/zod` import

- `src/errors.ts` - Custom error types
- `src/generators.ts` - Generator utilities (`CycleGenerator`, `SampleGenerator`)
- `src/utils.ts` - Utility functions and `Ref` class

- Test files follow `.spec.ts` pattern for each module
- Examples in `examples/` directory demonstrate usage patterns

The build output supports both CommonJS and ES modules, with TypeScript declarations included. The Zod integration is optional via peer dependency.

## Development Workflow

1. **Before committing**: The project uses husky git hooks that automatically run linters and enforce conventional commit messages
2. **Testing**: All new features should include corresponding tests in the spec file
3. **Type Safety**: The project uses strict TypeScript configuration - ensure all code is properly typed
4. **Code Style**: ESLint and Prettier are configured with strict rules - run `pnpm lint` before committing

## Key Learnings and Patterns

### Zod v4 Integration Details

**Zod v4 Usage**: This project uses Zod v4, which is imported from `"zod/v4"`. Key considerations:

1. **Internal Structure**: Zod v4 schemas use `_zod.def` for internal properties (not `_def` from v3)
2. **Global Registry**: Zod v4 doesn't have a global registry; use schema metadata via `.meta()` and `.describe()`
3. **Type Predicates**: Use type predicates from `@tool-belt/type-predicates` for safe type checking
4. **Internal Types**: Access core types from `"zod/v4/core"` - includes `$ZodType`, `$ZodChecks`, `$ZodObjectDef`, etc.

**Default Max Depth**: The universal default max depth is set in `src/constants.ts` as `DEFAULT_MAX_DEPTH = 5`. This is used across both base Factory and ZodFactory to ensure consistent depth limiting behavior.

### Extending the Factory Class

When extending the `Factory` class (e.g., for Zod integration):

1. **Override key methods**: The `build()` and `batch()` methods should be overridden since the base class uses private methods internally
2. **Type safety**: Use proper TypeScript generics and avoid `any` types. Prefer type predicates from `@tool-belt/type-predicates`
3. **Schema validation**: ZodFactory validates generated data using `schema.parse()` but handles special cases (promises, functions) that require different approaches

### Testing Patterns

1. **Test organization**: Use hierarchical `describe` blocks with clear, action-oriented test names
2. **Initialization**: Use `beforeEach` to ensure clean state, especially for registries or global state
3. **Validation tests**: When testing if generated data passes validation, expect some reasonable failure rate (e.g., 80% pass rate)
4. **Avoid order-dependent tests**: Don't test object key order as it's not guaranteed in JavaScript

### Module Organization

1. **Optional features**: Use separate entry points for optional features (e.g., `interface-forge/zod`)
2. **Peer dependencies**: Mark optional dependencies as peer dependencies with `"optional": true` in `peerDependenciesMeta`
3. **Build configuration**: Use Vite's multiple entry points for separate modules

### Known Limitations with Zod v4

**Functions and Promises**: Due to Zod v4's validation constraints, `z.function()` and `z.promise()` schemas cannot be automatically generated and require custom type handlers:

```typescript
// Functions require custom handlers
const factory = new ZodFactory(schema).withTypeHandler(
  'ZodFunction', 
  () => () => 'your function implementation'
);

// Promises require custom handlers  
const factory = new ZodFactory(schema).withTypeHandler(
  'ZodPromise',
  (schema, generator) => Promise.resolve('your promise result')
);
```

**Complex Recursive Schemas**: Deeply nested recursive schemas with `z.lazy()` may hit depth limits and require careful maxDepth tuning or custom handlers.

**MaxDepth Behavior**: When using the `maxDepth` option, schemas should be designed to accommodate depth limiting:

```typescript
// ❌ Problematic: Required nested objects will fail validation at depth limit
const problematicSchema = z.object({
  level1: z.object({
    level2: z.object({
      level3: z.object({
        level4: z.object({ value: z.string() }) // Required - will fail at maxDepth=3
      })
    })
  })
});

// ✅ Better: Use optional nested objects for depth limiting compatibility
const compatibleSchema = z.object({
  level1: z.object({
    level2: z.object({
      level3: z.object({
        level4: z.object({ value: z.string() }).optional() // Optional - works with maxDepth
      })
    })
  })
});

// ✅ Best: Design schemas with natural depth limits
const recursiveSchema = z.lazy(() => z.object({
  name: z.string(),
  children: z.array(recursiveSchema).optional() // Self-referencing with optional children
}));
```

The factory returns empty objects `{}` when hitting the depth limit, so deeper required fields will cause Zod validation to fail.

### Common Pitfalls

1. **Numeric enums**: TypeScript numeric enums have reverse mappings that need to be filtered out
2. **String constraints**: When generating strings with min/max length, ensure the generation respects both constraints
3. **Array constraints**: Default min/max values should not conflict with user-specified constraints
4. **Private methods**: The base Factory class uses private methods (`#generate`) that can't be overridden - override public methods instead
5. **Zod v4 Schema Differences**: Some schemas (like `z.function()`) don't have the standard `_zod` property and need special handling
6. **Async Validation**: Zod v4 requires `parseAsync()` for schemas containing promises; handle with try-catch for sync operations
7. **Depth Counting**: Both base Factory and ZodFactory use 0-indexed depth counting with `>=` comparison for depth limits