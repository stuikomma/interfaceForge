---
sidebar_position: 1
---

# Zod Integration

Generate mock data directly from Zod schemas with automatic validation.

## Basic Usage

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().int().min(18).max(65),
});

const userFactory = new ZodFactory(userSchema);

// Generated data automatically passes schema validation
const user = userFactory.build();
const users = userFactory.batch(5);
```

## Schema Constraints

ZodFactory respects all schema constraints:

```typescript
const productSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(3).max(50),
    price: z.number().positive().max(10000),
    tags: z.array(z.string()).min(1).max(5),
    inStock: z.boolean(),
    rating: z.number().min(0).max(5).optional(),
});

const factory = new ZodFactory(productSchema);
// All constraints automatically respected
```

## String Formats

Automatic generation for Zod string formats:

```typescript
const schema = z.object({
    email: z.string().email(),
    uuid: z.string().uuid(),
    url: z.string().url(),
    jwt: z.string().jwt(),
    base64: z.string().base64(),
    cuid: z.string().cuid(),
    ipv4: z.string().ip({ version: 'v4' }),
    isoDate: z.string().date(),
    isoDateTime: z.string().datetime(),
});

// All formats generate valid values automatically
const data = new ZodFactory(schema).build();
```

## Complex Schemas

### Nested Objects

```typescript
const userSchema = z.object({
    id: z.string().uuid(),
    profile: z.object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        dateOfBirth: z.date(),
    }),
    settings: z.object({
        notifications: z.boolean(),
        theme: z.enum(['light', 'dark']),
    }),
});
```

### Arrays and Collections

```typescript
const teamSchema = z.object({
    name: z.string(),
    members: z.array(userSchema).min(3).max(10),
    tags: z.set(z.string()),
    metadata: z.record(z.string(), z.unknown()),
});
```

### Discriminated Unions

```typescript
const eventSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('user_login'),
        userId: z.string(),
        timestamp: z.date(),
    }),
    z.object({
        type: z.literal('purchase'),
        productId: z.string(),
        amount: z.number().positive(),
    }),
]);

const factory = new ZodFactory(eventSchema);
// Generates mix of both event types
```

## Recursive Schemas

Use depth control for recursive schemas:

```typescript
const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        id: z.string().uuid(),
        name: z.string(),
        children: z.array(categorySchema).optional(),
    }),
);

const factory = new ZodFactory(categorySchema, { maxDepth: 3 });
// Prevents infinite recursion
```

## Overrides and Customization

Override generated values:

```typescript
const factory = new ZodFactory(userSchema);

// Override specific fields
const admin = factory.build({
    name: 'Admin User',
    email: 'admin@company.com',
});

// Batch with overrides
const testUsers = factory.batch(5, [{ role: 'admin' }, { role: 'user' }]);
```

## API Response Mocking

```typescript
const apiResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        users: z.array(userSchema),
        pagination: z.object({
            page: z.number().min(1),
            total: z.number().min(0),
            hasNextPage: z.boolean(),
        }),
    }),
    errors: z.array(z.string()).optional(),
});

const factory = new ZodFactory(apiResponseSchema);

// Generate success response
const success = factory.build({ success: true });

// Generate error response
const error = factory.build({
    success: false,
    data: undefined,
    errors: ['Validation failed'],
});
```

## Testing Integration

```typescript
import { describe, it, expect } from 'vitest';

describe('User API', () => {
    const factory = new ZodFactory(userSchema);

    it('should generate valid user data', () => {
        const user = factory.build();

        // Data automatically passes schema validation
        expect(() => userSchema.parse(user)).not.toThrow();
    });

    it('should handle test scenarios', () => {
        const scenarios = factory.batch(10);

        scenarios.forEach((user) => {
            expect(user.age).toBeGreaterThanOrEqual(18);
            expect(user.email).toMatch(/@/);
        });
    });
});
```

## Version Compatibility

Works with both Zod v3 and v4:

```typescript
// Both imports work
import { z } from 'zod/v4';
import { z } from 'zod';

import { ZodFactory } from 'interface-forge/zod';
```

## Limitations

Some types require [custom handlers](./custom-handlers):

- `z.function()` - Need specific implementations
- `z.promise()` - Need async value generation
- `z.custom()` - Need domain-specific logic

See [Custom Handlers](./custom-handlers) for solutions.
