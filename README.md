# Interface-Forge

[![npm version](https://img.shields.io/npm/v/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)

Interface-Forge is a TypeScript library for creating strongly typed mock data factories. Built on top of [Faker.js](https://fakerjs.dev/), it provides a powerful `Factory` class that combines Faker's data generation capabilities with TypeScript's type safety, advanced composition patterns, and optional [Zod](https://zod.dev/) schema integration.

## Why Interface-Forge?

- **🔒 Type-Safe by Design**: Full TypeScript support with compile-time type checking for all your test data
- **🚀 Zero Learning Curve**: Extends Faker.js, so all Faker methods work out of the box—if you know Faker, you know Interface-Forge
- **🔄 Powerful Composition**: Build complex object graphs with circular references using the `use()` method for lazy evaluation
- **🎯 Flexible Overrides**: Easily customize any part of your generated data with the `build({ ... })` method
- **🧪 Built for Testing**: Generate single instances, batches, or compose factories together—perfect for unit tests, integration tests, and storybooks
- **📐 Zod Integration**: Generate mock data directly from your Zod schemas with automatic type inference
- **🔗 Hooks & Transforms**: Use `beforeBuild` and `afterBuild` hooks to transform data, validate business rules, or fetch async data
- **🎲 Deterministic Mode**: Seed your factories for reproducible test data across runs

📚 **[View Full API Documentation](https://goldziher.github.io/interface-forge/)**

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

**Note**: The ZodFactory uses Zod v4 API which is included in the standard Zod v3 package. No additional installation is required.

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

**Important**: The ZodFactory uses Zod v4 API which is available within the Zod v3 package. When importing Zod types, use `import { z } from 'zod/v4'` to access the v4 API.

### Basic Zod Usage

```typescript
import { z } from 'zod/v4'; // Note: Using Zod v4 API
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
import { z } from 'zod/v4';
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

- [Basic Zod Usage](./examples/07-zod-basic.ts) - Simple schemas and API responses
- [Advanced Zod Patterns](./examples/07-zod-integration.ts) - Complex schemas, unions, and recursion
- [Testing with Zod](./examples/07-zod-testing.ts) - Real-world testing scenarios
- [MaxDepth with Zod](./examples/08-zod-maxdepth.ts) - Handling depth limits in nested schemas

## Performance Considerations

### Large Batch Generation

When generating large batches, consider:

- Memory usage grows linearly with batch size
- Use streaming or chunking for very large datasets
- Hooks are applied to each instance individually

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
                    value: z.string() // Required field
                })
            })
        })
    })
});

const factory = new ZodFactory(ProblematicSchema, { maxDepth: 3 });
// This will throw a ZodError because level4 will be an empty object
// missing the required 'value' field

// ✅ Better: Use optional for deeply nested objects
const CompatibleSchema = z.object({
    level1: z.object({
        level2: z.object({
            level3: z.object({
                level4: z.object({
                    value: z.string()
                }).optional() // Make deep nesting optional
            })
        })
    })
});

const factory = new ZodFactory(CompatibleSchema, { maxDepth: 3 });
const result = factory.build(); // Works correctly

// ✅ Best: Design recursive schemas with optional children
const RecursiveSchema = z.lazy(() => z.object({
    name: z.string(),
    children: z.array(RecursiveSchema).optional() // Self-referencing with optional
}));

const recursiveFactory = new ZodFactory(RecursiveSchema, { maxDepth: 3 });
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
