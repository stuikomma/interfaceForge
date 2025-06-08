# Interface-Forge Examples

This directory contains comprehensive examples demonstrating various features and use cases of Interface-Forge.

## Table of Contents

### [01. Basic Usage](./01-basic-usage.ts)

Learn the fundamentals of Interface-Forge:

- Creating simple factories
- Building single instances with `build()`
- Generating batches with `batch()`
- Overriding default values
- Using Faker methods directly

### [02. Advanced Composition](./02-advanced-composition.ts)

Explore factory composition techniques:

- Composing multiple factories together
- Creating complex object graphs
- Using `compose()` for factory composition
- Working with `iterate()` for progressive data
- Building relationships between entities

### [03. Testing Examples](./03-testing-examples.ts)

See how Interface-Forge integrates with testing frameworks:

- Unit test scenarios
- Integration test patterns
- Jest/Vitest test examples
- Storybook story data generation
- Snapshot testing approaches

### [04. Circular References](./04-circular-references.ts)

Handle complex data structures with circular dependencies:

- Using `use()` for lazy evaluation
- Managing bi-directional relationships
- Controlling recursion depth with `maxDepth`
- Building self-referential structures
- Creating graph-like data models

### [05. Advanced Patterns](./05-advanced-patterns.ts)

Advanced techniques for sophisticated scenarios:

- State-based factories
- Using `sample()` for controlled randomness
- Temporal data patterns
- Weighted distributions
- Deterministic data with seeds

## Running the Examples

To run any example:

```bash
# Install dependencies
npm install interface-forge

# Run with TypeScript
npx tsx examples/01-basic-usage.ts

# Or compile and run
npx tsc examples/01-basic-usage.ts --outDir dist
node dist/01-basic-usage.js
```

## Key Concepts

### Factory Creation

Every factory is created by instantiating the `Factory` class with a function that returns your data structure:

```typescript
const MyFactory = new Factory<MyType>((faker) => ({
    // Use faker methods to generate data
}));
```

### The Faker Parameter

Since `Factory` extends Faker, the parameter passed to your factory function is the factory instance itself, giving you access to all Faker.js methods plus Interface-Forge specific methods like `use()`, `sample()`, etc.

### Type Safety

All examples are written in TypeScript to demonstrate the full type safety benefits. The generated data will always match your defined interfaces.

## Contributing

Have an interesting use case or pattern? Feel free to contribute additional examples by submitting a pull request!
