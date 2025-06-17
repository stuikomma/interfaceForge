<div align="center">
  <img src="https://raw.githubusercontent.com/Goldziher/interface-forge/main/assets/logo.svg" alt="Interface-Forge Logo" width="120" height="120">
  
  # Interface-Forge

[![npm version](https://img.shields.io/npm/v/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)

</div>

Interface-Forge is a TypeScript library for creating strongly typed mock data factories. Built on top of [Faker.js](https://fakerjs.dev/), it provides a powerful `Factory` class that combines Faker's data generation capabilities with TypeScript's type safety, advanced composition patterns, and optional [Zod](https://zod.dev/) schema integration.

📚 **[View Full Documentation](https://goldziher.github.io/interface-forge/)**

## Why Interface-Forge?

- **🔒 Type-Safe by Design**: Full TypeScript support with compile-time type checking for all your test data
- **🚀 Zero Learning Curve**: Extends Faker.js, so all Faker methods work out of the box—if you know Faker, you know Interface-Forge
- **🔄 Powerful Composition**: Build complex object graphs with circular references using the `use()` method for lazy evaluation
- **🎯 Flexible Overrides**: Easily customize any part of your generated data with the `build({ ... })` method
- **🧪 Built for Testing**: Generate single instances, batches, or compose factories together—perfect for unit tests, integration tests, and storybooks
- **📐 Zod Integration**: Generate mock data directly from your Zod schemas with automatic type inference
- **🔗 Hooks & Transforms**: Use `beforeBuild` and `afterBuild` hooks to transform data, validate business rules, or fetch async data
- **🎲 Deterministic Mode**: Seed your factories for reproducible test data across runs

📂 **[Browse Example Code](./examples)** - See Interface-Forge in action with practical examples

## Table of Contents

- [Interface-Forge](#interface-forge)
    - [Why Interface-Forge?](#why-interface-forge)
    - [Installation](#installation)
    - [Basic Example](#basic-example)
    - [Extending Factory](#extending-factory)
    - [API Reference](#api-reference)
        - [Factory Class Methods](#factory-class-methods)
            - [`build`](#build)
            - [`batch`](#batch)
            - [`use`](#use)
            - [`iterate`](#iterate)
            - [`sample`](#sample)
            - [`extend`](#extend)
            - [`compose`](#compose)
            - [`beforeBuild`](#beforebuild)
            - [`afterBuild`](#afterbuild)
            - [`buildAsync`](#buildasync)
            - [`seed`](#seed)
    - [TypeScript Compatibility](#typescript-compatibility)
    - [Faker.js Integration](#fakerjs-integration)
    - [Zod Integration](#zod-integration)
        - [Basic Zod Usage](#basic-zod-usage)
        - [Partial Factory Functions](#partial-factory-functions)
        - [Advanced Zod Features](#advanced-zod-features)
    - [Performance Considerations](#performance-considerations)
    - [Common Patterns](#common-patterns)
    - [Contributing](#contributing)
    - [License](#license)

## Installation

Choose your preferred package manager:

```shell
# npm
npm install --save-dev interface-forge

# yarn
yarn add --dev interface-forge

# pnpm
pnpm add --save-dev interface-forge
```

For Zod integration (optional):

```shell
# npm
npm install zod

# yarn
yarn add zod

# pnpm
pnpm add zod
```

**Note**: ZodFactory supports both Zod v3 and v4.

## Basic Example

To create a factory, you need a TypeScript type:

```typescript
// types.ts

interface User {
    firstName: string;
    lastName: string;
    email: string;
    profile: {
        profession: string;
        gender: string;
        age: number;
    };
}
```

Pass the desired type as a generic argument when instantiating the `Factory` class, alongside default values for the factory:

```typescript
// factories.ts
import { Factory } from 'interface-forge';
import { User } from './types';

const UserFactory = new Factory<User>((factory, iteration) => ({
    firstName: factory.person.firstName(),
    lastName: factory.person.lastName(),
    email: factory.internet.email(),
    profile: {
        profession: factory.person.jobType(),
        gender: factory.person.gender(),
        age: 27 + iteration,
    },
}));
```

Then use the factory to create an object of the desired type in a test file:

```typescript
// User.spec.ts

describe('User', () => {
    const user = UserFactory.build();
    // user == {
    //     firstName: "Johanne",
    //     lastName: "Smith",
    //     email: "js@example.com",
    //     profile: {
    //         profession: "Journalist",
    //         gender: "Female",
    //         age: 27
    //     },
    // }
    // ...
});
```

## Extending Factory

Interface-Forge allows you to extend the base Factory class to add custom functionality:

```typescript
class CustomFactory<T> extends Factory<T> {
    // Add custom methods
    buildWithTimestamp(): T & { timestamp: Date } {
        const instance = this.build();
        return { ...instance, timestamp: new Date() };
    }

    // Override existing methods
    build(kwargs?: Partial<T>): T {
        console.log('Building instance...');
        return super.build(kwargs);
    }
}

const factory = new CustomFactory<User>((f) => ({
    /* ... */
}));
const userWithTimestamp = factory.buildWithTimestamp();
```

## API Reference

### Factory Class Methods

#### `build`

Builds a single object based on the factory's schema. Optionally, you can pass an object to override specific properties.

**Signature:**

```typescript
build(kwargs?: Partial<T>): T
```

**Usage:**

```typescript
const user = UserFactory.build();
// user == {
//     firstName: "Johanne",
//     lastName: "Smith",
//     email: "js@example.com",
//     profile: {
//         profession: "Journalist",
//         gender: "Female",
//         age: 27
//     },
// }

const customUser = UserFactory.build({
    profile: { age: 35 },
});
// customUser.profile.age == 35
```

#### `batch`

Generates a batch of objects based on the factory's schema. Optionally, you can pass an object or an array of objects to override specific properties for each instance.

**Signature:**

```typescript
batch(size: number, kwargs?: Partial<T> | Partial<T>[]): T[]
```

**Usage:**

```typescript
const users = UserFactory.batch(3);
// users == [
//     { ... },
//     { ... },
//     { ... }
// ]

const customUsers = UserFactory.batch(3, {
    profile: { age: 35 },
});
// customUsers == [
//     { ..., profile: { ..., age: 35 } },
//     { ..., profile: { ..., age: 35 } },
//     { ..., profile: { ..., age: 35 } }
// ]

const variedUsers = UserFactory.batch(3, [
    { profile: { age: 30 } },
    { profile: { age: 25 } },
    { profile: { age: 40 } },
]);
// variedUsers == [
//     { ..., profile: { ..., age: 30 } },
//     { ..., profile: { ..., age: 25 } },
//     { ..., profile: { ..., age: 40 } }
// ]
```

#### `batchAsync`

Creates multiple instances asynchronously, allowing use of async factory functions. This method supports both synchronous and asynchronous factory functions and hooks.

**Signature:**

```typescript
batchAsync(size: number, kwargs?: Partial<T> | Partial<T>[]): Promise<T[]>
```

**Usage:**

```typescript
const UserFactory = new Factory<User>(async (factory) => ({
    id: factory.string.uuid(),
    email: factory.internet.email(),
    apiKey: await generateApiKey(), // async operation
}));

// Create 5 users asynchronously
const users = await UserFactory.batchAsync(5);

// With overrides
const admins = await UserFactory.batchAsync(3, { role: 'admin' });

// With individual overrides
const customUsers = await UserFactory.batchAsync(2, [
    { email: 'first@example.com' },
    { email: 'second@example.com' },
]);
```

#### `use`

Creates a reference to a function that can be used within the factory. This method allows for the encapsulation of a function and its arguments, enabling deferred execution.

**Signature:**

```typescript
use<C extends (...args: never) => unknown>(handler: C, ...args: Parameters<C>): ReturnType<C>
```

**Usage:**

```typescript
const complexFactory = new Factory<ComplexObject>((factory) => ({
    name: factory.person.firstName(),
    value: factory.number.int({ min: 1, max: 3 }),
    options: {
        type: '1',
    },
}));

const factoryWithOptions = new Factory<ComplexObject>((factory) => ({
    ...defaults,
    options: {
        type: '1',
        children: factory.use(complexFactory.batch, 2),
    },
}));

const result = factoryWithOptions.build();
// result.options.children == [
//     { ... },
//     { ... }
// ]
```

#### `iterate`

Cycles through the values of an iterable indefinitely.

**Signature:**

```typescript
iterate<T>(iterable: Iterable<T>): Generator<T, T, T>
```

**Usage:**

```typescript
const values = ['Value 1', 'Value 2', 'Value 3'];
const generator = UserFactory.iterate(values);

console.log(generator.next().value); // 'Value 1'
console.log(generator.next().value); // 'Value 2'
console.log(generator.next().value); // 'Value 3'
console.log(generator.next().value); // 'Value 1'
```

#### `sample`

Samples values randomly from an iterable, ensuring no immediate repetitions.

**Signature:**

```typescript
sample<T>(iterable: Iterable<T>): Generator<T, T, T>
```

**Usage:**

```typescript
const values = [1, 2, 3];
const generator = UserFactory.sample(values);

console.log(generator.next().value); // 1 (or 2, or 3)
console.log(generator.next().value); // (different from the previous value)
```

#### `extend`

Extends the current factory to create a new factory with additional or overridden properties. This method allows for factory inheritance, a new factory can be built upon an existing one while adding or modifying properties.

**Signature:**

```typescript
extend<U extends T>(factoryFn: FactoryFunction<U>): Factory<U>
```

**Usage:**

```typescript
// Base factory
const BaseUserFactory = new Factory<BaseUser>((factory) => ({
    id: factory.string.uuid(),
    createdAt: factory.date.recent(),
}));

// Extended factory
const AdminUserFactory = BaseUserFactory.extend<AdminUser>((factory) => ({
    role: 'admin',
    permissions: ['read', 'write', 'delete'],
}));

const admin = AdminUserFactory.build();
// admin == {
//     id: "550e8400-e29b-41d4-a716-446655440000",
//     createdAt: Date,
//     role: "admin",
//     permissions: ["read", "write", "delete"]
// }
```

#### `compose`

Composes the current factory with other factories to create a new factory. This method allows for factory composition, a factory can include properties generated by other factories or static values.

**Signature:**

```typescript
compose<U extends T>(composition: FactoryComposition<U>): Factory<U>
```

**Usage:**

```typescript
// User factory
const UserFactory = new Factory<User>((factory) => ({
    name: factory.person.fullName(),
    email: factory.internet.email(),
}));

// Post factory
const PostFactory = new Factory<Post>((factory) => ({
    title: factory.helpers.arrayElement([
        'Welcome to My Website',
        'About Me',
        'Contact Information',
    ]),
    content: factory.helpers.arrayElement([
        'Thanks for visiting my personal website.',
        'I am a software developer passionate about coding.',
        'Feel free to reach out through the contact form.',
    ]),
}));

// Composed factory
const UserWithPostsFactory = UserFactory.compose<UserWithPosts>({
    posts: PostFactory.batch(3),
});

const userWithPosts = UserWithPostsFactory.build();
// userWithPosts == {
//     name: "Johanne Smith",
//     email: "js@example.com",
//     posts: [
//         { title: "First Post", content: "Content..." },
//         { title: "Second Post", content: "Content..." },
//         { title: "Third Post", content: "Content..." }
//     ]
// }

// Mixing with static values
interface UserWithStatus extends User {
    status: string;
}
const UserWithStatusFactory = UserFactory.compose<UserWithStatus>({
    status: 'active',
});

const user = UserWithStatusFactory.build();
// user == {
//     name: "Johanne Smith",
//     email: "js@example.com",
//     status: "active"
// }
```

#### `partial`

Creates a new factory where all properties are optional (Partial<T>). This is useful for creating test data where only specific fields need to be set, or when working with partial updates.

**Signature:**

```typescript
partial(): Factory<Partial<T>>
```

**Usage:**

```typescript
// Original factory with required fields
const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    name: factory.person.fullName(),
    email: factory.internet.email(),
    age: factory.number.int({ min: 18, max: 80 }),
    isActive: factory.datatype.boolean(),
}));

// Create a partial factory where all fields are optional
const PartialUserFactory = UserFactory.partial();

// Generate partial users with all fields populated
const partialUser = PartialUserFactory.build();
// partialUser: Partial<User> - all properties are generated but optional

// Override only specific fields
const updateData = PartialUserFactory.build({
    email: 'newemail@example.com',
    age: 30,
});
// updateData == {
//     id: "generated-uuid",
//     name: "generated-name",
//     email: "newemail@example.com",
//     age: 30,
//     isActive: true
// }

// Useful for testing partial updates
const patchData = PartialUserFactory.build({
    email: 'updated@example.com',
});
// Can be used for PATCH requests where only email is being updated
```

#### `beforeBuild`

Adds a hook that will be executed before building the instance. Hooks receive the partial parameters (kwargs) and can modify them before the instance is built.

**Signature:**

```typescript
beforeBuild(hook: BeforeBuildHook<T>): this
```

**Usage:**

```typescript
const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    email: '',
    username: '',
})).beforeBuild((params) => {
    // Auto-generate email from username if not provided
    if (!params.email && params.username) {
        params.email = `${params.username}@example.com`;
    }
    return params;
});

const user = UserFactory.build({ username: 'john_doe' });
// user.email == "john_doe@example.com"
```

#### `afterBuild`

Adds a hook that will be executed after building the instance. Hooks are executed in the order they were added and can be either synchronous or asynchronous.

**Signature:**

```typescript
afterBuild(hook: AfterBuildHook<T>): this
```

**Usage:**

```typescript
const ProductFactory = new Factory<Product>((factory) => ({
    id: factory.string.uuid(),
    name: factory.commerce.productName(),
    price: factory.number.float({ min: 10, max: 1000 }),
    formattedPrice: '',
})).afterBuild((product) => {
    // Format price with currency
    product.formattedPrice = `$${product.price.toFixed(2)}`;
    return product;
});

const product = ProductFactory.build();
// product.formattedPrice == "$123.45"
```

#### `buildAsync`

Builds an instance asynchronously with all registered hooks applied in sequence. This method supports both synchronous and asynchronous hooks.

**Signature:**

```typescript
buildAsync(kwargs?: Partial<T>): Promise<T>
```

**Usage:**

```typescript
const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    email: factory.internet.email(),
    isVerified: false,
})).afterBuild(async (user) => {
    // Simulate API call to verify email
    await verifyEmail(user.email);
    user.isVerified = true;
    return user;
});

// Must use buildAsync for async hooks
const user = await UserFactory.buildAsync();
// user.isVerified == true
```

**Important Hook Behavior:**

- Synchronous hooks automatically work with `build()`
- If async hooks are registered, `build()` will throw a `ConfigurationError`
- Use `buildAsync()` when you have async hooks or want consistent async behavior
- Hooks are executed in the order they were registered
- Multiple hooks of the same type can be chained

#### `create`

Creates and persists a single instance to a database using a persistence adapter.

**Signature:**

```typescript
create(kwargs?: Partial<T>, options?: CreateOptions<T>): Promise<T>
```

**Usage:**

```typescript
import { MongooseAdapter } from 'interface-forge/examples/adapters/mongoose-adapter';

const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    email: factory.internet.email(),
    name: factory.person.fullName(),
}));

// Option 1: Set default adapter
const factoryWithDb = UserFactory.withAdapter(new MongooseAdapter(UserModel));
const user = await factoryWithDb.create({ name: 'John' });

// Option 2: Pass adapter in options
const user2 = await UserFactory.create(
    { name: 'Jane' },
    { adapter: new MongooseAdapter(UserModel) },
);
```

#### `createMany`

Creates and persists multiple instances to a database in a batch operation.

**Signature:**

```typescript
createMany(
    size: number,
    kwargs?: Partial<T> | Partial<T>[],
    options?: CreateManyOptions<T>
): Promise<T[]>
```

**Usage:**

```typescript
// Create 5 users with default adapter
const users = await factoryWithDb.createMany(5);

// With individual overrides
const users2 = await factoryWithDb.createMany(3, [
    { role: 'admin' },
    { role: 'user' },
    { role: 'guest' },
]);

// With adapter in options
const users3 = await UserFactory.createMany(10, undefined, {
    adapter: prismaAdapter,
});
```

#### `withAdapter`

Sets the default persistence adapter for the factory instance.

**Signature:**

```typescript
withAdapter(adapter: PersistenceAdapter<T>): this
```

**Usage:**

```typescript
import { PrismaAdapter } from 'interface-forge/examples/adapters/prisma-adapter';
import { TypeORMAdapter } from 'interface-forge/examples/adapters/typeorm-adapter';

// Set default adapter for all operations
const userFactory = new Factory<User>(/* ... */).withAdapter(
    new PrismaAdapter(prisma.user),
);

// Now all create/createMany calls will use this adapter
const user = await userFactory.create();
const users = await userFactory.createMany(5);
```

### Persistence Adapters

Interface-forge supports database persistence through adapters. Example adapters are provided for popular ORMs:

- **Mongoose** (MongoDB)
- **Prisma**
- **TypeORM**

To implement a custom adapter, implement the `PersistenceAdapter` interface:

```typescript
interface PersistenceAdapter<T, R = T> {
    create(data: T): Promise<R>;
    createMany(data: T[]): Promise<R[]>;
}
```

Example custom adapter:

```typescript
class CustomAdapter<T> implements PersistenceAdapter<T> {
    async create(data: T): Promise<T> {
        // Your persistence logic
        return savedData;
    }

    async createMany(data: T[]): Promise<T[]> {
        // Your batch persistence logic
        return savedDataArray;
    }
}
```

### Additional Methods

#### `seed`

Sets the seed for the random number generator to create deterministic data:

**Signature:**

```typescript
seed(seed: number): this
```

**Usage:**

```typescript
const factory = new Factory<User>(/* ... */);
factory.seed(12345);

// Will always generate the same data for the same seed
const user1 = factory.build();
const user2 = factory.build();
```

## TypeScript Compatibility

Interface-Forge is designed to work with TypeScript 5.x and above. It leverages TypeScript's type system to provide type safety and autocompletion for your factories.

## Faker.js Integration

Interface-Forge extends the Faker class from Faker.js, giving you access to all Faker.js functionalities directly from your factory instance. This means you can use any Faker.js method to generate data for your factory.

**Example:**

```typescript
const UserFactory = new Factory<User>((factory) => ({
    // Using Faker.js methods directly
    firstName: factory.person.firstName(),
    lastName: factory.person.lastName(),
    email: factory.internet.email(),
    avatar: factory.image.avatar(),
    bio: factory.lorem.paragraph(),
    // ... other properties
}));
```

For more information about available Faker.js methods, see the [Faker.js documentation](https://fakerjs.dev/api/).

## Zod Integration

Interface-Forge provides seamless integration with [Zod](https://zod.dev/) schemas through the `ZodFactory` class. This allows you to generate mock data that automatically conforms to your Zod schema definitions.

**Zod Version Support**: ZodFactory supports both Zod v3 and Zod v4 schemas automatically. The factory detects the schema version and handles the differences transparently:

- **Zod v3**: Import schemas with `import { z } from 'zod'`
- **Zod v4**: Import schemas with `import { z } from 'zod/v4'`

Both versions work with the same ZodFactory API, so you can use existing v3 schemas without modification while also supporting newer v4 features.

### Basic Zod Usage

```typescript
// Works with both Zod v3 and v4
import { z } from 'zod'; // For Zod v3
// OR
import { z } from 'zod/v4'; // For Zod v4

import { ZodFactory } from 'interface-forge/zod';

const UserSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(18).max(120),
    isActive: z.boolean(),
    role: z.enum(['admin', 'user', 'guest']),
});

const userFactory = new ZodFactory(UserSchema);
const user = userFactory.build();
// Automatically generates data that conforms to the schema
```

### Partial Factory Functions

The `ZodFactory` supports **partial factory functions**, allowing you to customize only specific fields while automatically generating the rest from the schema:

```typescript
import { z } from 'zod'; // Works with both v3 and v4
import { ZodFactory } from 'interface-forge/zod';

const UserSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: z.enum(['admin', 'user', 'guest']),
    createdAt: z.date(),
    settings: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean(),
    }),
});

// Partial factory function - only customize what you need
const userFactory = new ZodFactory(UserSchema, (factory) => ({
    // Only customize these fields for deterministic test data
    role: 'user', // Always create regular users
    name: factory.person.fullName(),
    settings: {
        theme: 'light', // Always use light theme in tests
        // notifications will be auto-generated from schema
    },
    // id, email, createdAt will be auto-generated from schema
}));

const user = userFactory.build();
// user.role === 'user' (from factory)
// user.name === 'John Doe' (from factory)
// user.settings.theme === 'light' (from factory)
// user.settings.notifications === true/false (auto-generated)
// user.id === uuid (auto-generated)
// user.email === valid email (auto-generated)
// user.createdAt === Date (auto-generated)
```

### Benefits of Partial Factory Functions

- **Deterministic where needed**: Customize specific fields for predictable test data
- **Automatic coverage**: Missing fields are automatically generated from the schema
- **Type safety**: Full TypeScript support with schema validation
- **Intuitive**: Only specify what you care about, let ZodFactory handle the rest

### Advanced Zod Features

#### Complex Type Support

ZodFactory supports all major Zod types including:

- Primitives (string, number, boolean, date, etc.)
- Complex types (objects, arrays, tuples, records, maps, sets)
- Unions and discriminated unions
- Enums (both native and Zod enums)
- Nullable and optional fields
- Recursive schemas with depth control
- Refinements and constraints

#### Custom Generators

Register custom generators for specific field types:

```typescript
const factory = new ZodFactory(UserSchema, {
    generators: {
        userId: () => `USR_${Date.now()}`,
        customEmail: (faker) =>
            `test_${faker.string.alphanumeric(5)}@example.com`,
    },
});
```

#### Custom Type Handlers

For advanced customization, register custom handlers for specific Zod types:

```typescript
import { z } from 'zod';
import { ZodFactory } from 'interface-forge/zod';

const factory = new ZodFactory(UserSchema)
    // Single type handler
    .withTypeHandler('ZodFunction', () => () => 'mock function')
    // Multiple type handlers
    .withTypeHandlers({
        ZodPromise: (schema, generator) => Promise.resolve('mock result'),
        ZodBigInt: () => BigInt(42),
        ZodCustomType: (schema, generator, depth) => 'custom value',
    });
```

**Required for Functions and Promises**: Zod `z.function()` and `z.promise()` schemas require custom type handlers as they cannot be automatically generated:

```typescript
const SchemaWithFunction = z.object({
    callback: z.function(),
    asyncResult: z.promise(z.string()),
});

const factory = new ZodFactory(SchemaWithFunction)
    .withTypeHandler('ZodFunction', () => jest.fn())
    .withTypeHandler('ZodPromise', () => Promise.resolve('test result'));
```

#### Schema Validation

All generated data is guaranteed to be valid according to your Zod schema, including:

- String patterns and length constraints
- Number ranges and precision
- Array length requirements
- Custom refinements

### TypeScript Note

When using partial factory functions, TypeScript may show errors because it doesn't recognize that ZodFactory will auto-generate missing required fields. This is a known limitation. Your code will work correctly at runtime, but you may need to use type assertions in some cases:

```typescript
const factory = new ZodFactory(
    Schema,
    (faker) =>
        ({
            // Only some fields defined here
        }) as any,
); // Type assertion if needed
```

### Complete Examples

**Factory Examples**:

- [Basic Usage](./examples/01-basic-usage.ts) - Getting started with factories
- [Advanced Composition](./examples/02-advanced-composition.ts) - Complex object relationships
- [Testing Patterns](./examples/03-testing-examples.ts) - Real-world testing scenarios
- [Circular References](./examples/04-circular-references.ts) - Handling complex relationships
- [Advanced Patterns](./examples/05-advanced-patterns.ts) - Sophisticated generation techniques
- [Hooks & Validation](./examples/06-hooks-and-validation.ts) - Data transformation and validation
- [Factory Extension](./examples/09-factory-extension.ts) - Using extend() for inheritance
- [Generators Comparison](./examples/10-generators-comparison.ts) - iterate() vs sample() methods

**ZodFactory Examples**:

- [Basic Zod Usage](./examples/07-zod-basic.ts) - Simple schemas and API responses
- [Advanced Zod Patterns](./examples/07-zod-integration.ts) - Complex schemas, unions, and recursion
- [Testing with Zod](./examples/07-zod-testing.ts) - Real-world testing scenarios
- [MaxDepth with Zod](./examples/08-zod-maxdepth.ts) - Handling depth limits in nested schemas
- [Custom Type Handlers](./examples/11-zod-custom-handlers.ts) - Functions, promises, and custom types

## Performance Considerations

### Large Batch Generation

When generating large batches, consider:

- Memory usage grows linearly with batch size
- Use streaming or chunking for very large datasets
- Hooks are applied to each instance individually

**Optimization Strategies**:

```typescript
// ❌ Inefficient: Large single batch
const users = UserFactory.batch(10000); // High memory usage

// ✅ Better: Chunked generation
function* generateUsers(total: number, chunkSize: number = 1000) {
    for (let i = 0; i < total; i += chunkSize) {
        const remaining = Math.min(chunkSize, total - i);
        yield UserFactory.batch(remaining);
    }
}

// ✅ Best: Stream processing
async function processUsers(count: number) {
    for (const chunk of generateUsers(count)) {
        await processChunk(chunk);
        // Memory is freed between chunks
    }
}
```

### Memory Optimization

**Factory Reuse**: Create factories once and reuse them:

```typescript
// ❌ Creates new factory each time
function createUser() {
    return new Factory<User>(() => ({
        /* schema */
    })).build();
}

// ✅ Reuse factory instance
const UserFactory = new Factory<User>(() => ({
    /* schema */
}));
function createUser() {
    return UserFactory.build();
}
```

**Deterministic Data**: Use `seed()` for consistent memory patterns:

```typescript
// Consistent memory usage across test runs
const factory = UserFactory.seed(12345);
const users = factory.batch(1000);
```

### Recursive Schemas and MaxDepth Behavior

For recursive or circular data structures:

- Use `maxDepth` option to limit recursion (especially with Zod)
- Prefer `use()` for lazy evaluation to avoid infinite loops
- Consider memory implications of deeply nested structures

#### Important: MaxDepth with Zod Schemas

When using `maxDepth` with ZodFactory, be aware that the factory returns empty objects `{}` when the depth limit is reached. This can cause Zod validation to fail if your schema has required nested fields at the depth limit:

```typescript
// ❌ Problematic: Required nested objects will fail validation
const ProblematicSchema = z.object({
    level1: z.object({
        level2: z.object({
            level3: z.object({
                level4: z.object({
                    value: z.string(), // Required field
                }),
            }),
        }),
    }),
});

const factory = new ZodFactory(ProblematicSchema, { maxDepth: 3 });
// This will throw a ZodError because level4 will be an empty object
// missing the required 'value' field

// ✅ Better: Use optional for deeply nested objects
const CompatibleSchema = z.object({
    level1: z.object({
        level2: z.object({
            level3: z.object({
                level4: z
                    .object({
                        value: z.string(),
                    })
                    .optional(), // Make deep nesting optional
            }),
        }),
    }),
});

const factory = new ZodFactory(CompatibleSchema, { maxDepth: 3 });
const result = factory.build(); // Works correctly

// ✅ Best: Design recursive schemas with optional children
const RecursiveSchema = z.lazy(() =>
    z.object({
        name: z.string(),
        children: z.array(RecursiveSchema).optional(), // Self-referencing with optional
    }),
);

const recursiveFactory = new ZodFactory(RecursiveSchema, { maxDepth: 3 });
```

## Error Handling

### Factory Error Types

Interface-Forge throws specific error types for different scenarios:

```typescript
import { ConfigurationError } from 'interface-forge';

try {
    // ❌ This will throw ConfigurationError
    const factory = new Factory<User>((f) => ({
        name: f.person.fullName(),
        asyncData: Promise.resolve('data'), // Async data in sync factory
    }));

    factory.build(); // Throws: Cannot use build() with async factory functions
} catch (error) {
    if (error instanceof ConfigurationError) {
        console.log('Configuration issue:', error.message);
        // Use buildAsync() instead
        const result = await factory.buildAsync();
    }
}
```

### ZodFactory Error Scenarios

**Schema Validation Failures**:

```typescript
const StrictSchema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
});

const factory = new ZodFactory(StrictSchema);

try {
    const user = factory.build({
        email: 'invalid-email', // Will cause validation error
    });
} catch (error) {
    console.log('Validation failed:', error.message);
    // Handle validation errors gracefully
}
```

**Missing Type Handlers**:

```typescript
const FunctionSchema = z.object({
    callback: z.function(), // Requires custom handler
});

try {
    const factory = new ZodFactory(FunctionSchema);
    factory.build(); // Throws error
} catch (error) {
    console.log('Add type handler:', error.message);

    // Fix by adding handler
    const fixedFactory = factory.withTypeHandler('ZodFunction', () =>
        jest.fn(),
    );
    const result = fixedFactory.build(); // Works
}
```

### Hook Error Handling

```typescript
const factory = new Factory<User>((f) => ({
    /* schema */
}))
    .beforeBuild((params) => {
        if (!params.email) {
            throw new Error('Email is required');
        }
        return params;
    })
    .afterBuild((user) => {
        // Validate business rules
        if (user.age < 0) {
            throw new Error('Invalid age');
        }
        return user;
    });

try {
    const user = factory.build({ age: -5 });
} catch (error) {
    console.log('Hook validation failed:', error.message);
    // Handle or retry with valid data
    const validUser = factory.build({ age: 25, email: 'test@example.com' });
}
```

### Async Error Handling

```typescript
const asyncFactory = new Factory<User>((f) => ({
    /* schema */
})).afterBuild(async (user) => {
    try {
        // Simulate external API call
        const enrichedData = await fetchUserData(user.id);
        return { ...user, ...enrichedData };
    } catch (apiError) {
        // Graceful fallback
        console.warn('API enrichment failed, using defaults');
        return { ...user, enrichmentFailed: true };
    }
});

try {
    const user = await asyncFactory.buildAsync();
} catch (error) {
    console.log('Factory error:', error.message);
}
```

## Common Patterns

### Test Data Factories

```typescript
// Base factory with common fields
const BaseEntityFactory = new Factory<BaseEntity>((f) => ({
    id: f.string.uuid(),
    createdAt: f.date.past(),
    updatedAt: f.date.recent(),
}));

// Extend for specific entities
const UserFactory = BaseEntityFactory.extend<User>((f) => ({
    email: f.internet.email(),
    name: f.person.fullName(),
}));
```

### Stateful Factories

```typescript
let userCounter = 0;
const SequentialUserFactory = new Factory<User>((f) => ({
    id: ++userCounter,
    email: `user${userCounter}@example.com`,
    // ... other fields
}));
```

### Conditional Generation

```typescript
const UserFactory = new Factory<User>((f) => {
    const isPremium = f.datatype.boolean();
    return {
        subscription: isPremium ? 'premium' : 'free',
        features: isPremium
            ? ['feature1', 'feature2', 'feature3']
            : ['feature1'],
        // ... other fields
    };
});
```

## Contributing

We welcome contributions from the community! Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
