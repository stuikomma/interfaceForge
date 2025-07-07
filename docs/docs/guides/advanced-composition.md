---
sidebar_position: 2
---

# Advanced Composition

Interface Forge provides powerful tools for creating complex and realistic data structures by composing and extending factories.

## Composing Factories

When one of your interfaces contains another, you can compose their factories. This ensures that nested objects are generated with their own specific logic.

```typescript
interface Post {
    id: string;
    title: string;
    author: User; // Nested User interface
}

// Assuming userFactory is already defined
const postFactory = new Factory<Post>(() => ({
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    author: userFactory.build(), // Use the userFactory to build the author
}));

const post = postFactory.build();
// post.author will be a fully-formed User object
```

## Extending Factories

Sometimes, you need a variation of a factory. Instead of creating a new one from scratch, you can `extend()` an existing factory.

For example, let's create an `AdminUserFactory` from our `userFactory`:

```typescript
const adminUserFactory = userFactory.extend({
    isAdmin: true,
});

const admin = adminUserFactory.build();
// admin.isAdmin will always be true
```

You can also provide a function to the `extend` method to access the parent factory's properties:

```typescript
const personalizedAdminFactory = userFactory.extend((parent) => ({
    ...parent,
    name: `Admin ${parent.name}`,
    isAdmin: true,
}));
```

## Using Hooks (`afterBuild`)

Hooks allow you to run custom logic after an object has been built. The `afterBuild` hook is a function that receives the newly created object and can be used to perform side effects or modify the object further.

For example, you could use it to save a user to a database after it's been created:

```typescript
import { db } from './database';

const userFactoryWithSave = userFactory.afterBuild((user) => {
    // This code runs after a user is built
    db.save(user);
    return user; // You must return the object
});

// This will generate a user and save it to the database
const savedUser = userFactoryWithSave.build();
```

The `afterBuild` hook is especially useful for tasks that need to happen after the entire object graph is resolved.
