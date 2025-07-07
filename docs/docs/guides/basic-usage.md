---
sidebar_position: 1
---

# Basic Usage

Creating a factory with Interface Forge is simple. First, define an interface for the data you want to generate:

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
}
```

Next, create a factory for the `User` interface. The factory takes a function that returns a default object, using `faker` to generate realistic data.

```typescript
import { Factory } from 'interface-forge';
import { faker } from '@faker-js/faker';

const userFactory = new Factory<User>(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    isAdmin: false,
}));
```

## Building an Object

You can use the `build()` method to generate a single object with default values:

```typescript
const user = userFactory.build();
// {
//   id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
//   name: 'John Doe',
//   email: 'john.doe@example.com',
//   isAdmin: false
// }
```

## Overriding Default Values

The `build()` method accepts an optional object to override the default values for specific fields:

```typescript
const adminUser = userFactory.build({
    name: 'Admin User',
    isAdmin: true,
});
// {
//   id: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
//   name: 'Admin User',
//   email: 'jane.doe@example.com',
//   isAdmin: true
// }
```

## Generating Batches

You can generate multiple objects at once using the `batch()` method:

```typescript
const users = userFactory.batch(3);
// Returns an array of 3 user objects
```

You can also provide overrides when generating a batch. The overrides will be applied to every object in the array.

```typescript
const adminUsers = userFactory.batch(2, { isAdmin: true });
// Returns an array of 2 user objects, both with isAdmin: true
```
