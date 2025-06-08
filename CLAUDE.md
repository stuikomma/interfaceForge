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

### Extending the Factory Class

When extending the `Factory` class (e.g., for Zod integration):

1. **Override key methods**: The `build()` and `batch()` methods should be overridden since the base class uses private methods internally
2. **Type safety**: Use proper TypeScript generics and avoid `any` types. Prefer type predicates from `@tool-belt/type-predicates`
3. **Avoid validation in generation**: Don't call `schema.parse()` during generation as it can cause failures for complex schemas

### Testing Patterns

1. **Test organization**: Use hierarchical `describe` blocks with clear, action-oriented test names
2. **Initialization**: Use `beforeEach` to ensure clean state, especially for registries or global state
3. **Validation tests**: When testing if generated data passes validation, expect some reasonable failure rate (e.g., 80% pass rate)
4. **Avoid order-dependent tests**: Don't test object key order as it's not guaranteed in JavaScript

### Module Organization

1. **Optional features**: Use separate entry points for optional features (e.g., `interface-forge/zod`)
2. **Peer dependencies**: Mark optional dependencies as peer dependencies with `"optional": true` in `peerDependenciesMeta`
3. **Build configuration**: Use Vite's multiple entry points for separate modules

### Common Pitfalls

1. **Numeric enums**: TypeScript numeric enums have reverse mappings that need to be filtered out
2. **String constraints**: When generating strings with min/max length, ensure the generation respects both constraints
3. **Array constraints**: Default min/max values should not conflict with user-specified constraints
4. **Private methods**: The base Factory class uses private methods (`#generate`) that can't be overridden - override public methods instead