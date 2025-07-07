---
sidebar_position: 1
---

# The Factory

The `Factory` is the heart of Interface Forge. It is a class that you instantiate to create a blueprint for generating objects of a specific type.

## How it Works

A `Factory` is initialized with a "definition function" that returns a default version of the object you want to create. This function is where you define the shape of your data and use `faker` to populate its fields.

```typescript
import { Factory } from 'interface-forge';
import { faker } from '@faker-js/faker';

interface User {
    username: string;
    email: string;
}

// The definition function returns a default User
const userFactory = new Factory<User>(() => ({
    username: faker.internet.userName(),
    email: faker.internet.email(),
}));
```

Every time you call `userFactory.build()`, this definition function is executed to produce a new object.

## Type Safety

The `Factory` is strongly typed. The generic `Factory<User>` ensures that:

1. The object returned by the definition function must match the `User` interface.
2. The `build()` method will always return an object of type `User`.
3. When you provide overrides to `build()`, they must be a `Partial<User>`.

This compile-time safety catches errors early and makes refactoring a breeze.

## Immutability

Factories are immutable. Methods like `extend()` or `afterBuild()` do not modify the original factory. Instead, they return a _new_ factory instance with the added behavior.

```typescript
const baseFactory = new Factory(() => ({ a: 1 }));
const extendedFactory = baseFactory.extend({ b: 2 });

// baseFactory is unchanged
console.log(baseFactory.build()); // { a: 1 }

// extendedFactory has the new behavior
console.log(extendedFactory.build()); // { a: 1, b: 2 }
```

This design prevents side effects and makes your test setup more predictable and easier to reason about.
