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
}
```

Next, create a factory for the `User` interface:

```typescript
import { Factory } from 'interface-forge';

const userFactory = new Factory<User>(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
}));
```

Now you can use the factory to generate a single user:

```typescript
const user = userFactory.build();
```

Or a batch of users:

```typescript
const users = userFactory.batch(5);
```
