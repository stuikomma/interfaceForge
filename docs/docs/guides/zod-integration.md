---
sidebar_position: 3
---

# Zod Integration

Interface Forge provides a `ZodFactory` that can generate mock data directly from your Zod schemas. First, define a Zod schema:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
});
```

Next, create a `ZodFactory` from the schema:

```typescript
import { ZodFactory } from 'interface-forge/zod';

const userFactory = new ZodFactory(UserSchema);
```

Now you can use the factory to generate a single user:

```typescript
const user = userFactory.build();
```

Or a batch of users:

```typescript
const users = userFactory.batch(5);
```
