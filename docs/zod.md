# Zod Factory Integration

Interface-Forge provides seamless integration with [Zod](https://zod.dev/) schemas through the `ZodFactory` class, allowing you to generate type-safe mock data that automatically conforms to your Zod schema definitions.

## Installation

First, make sure you have `interface-forge` installed:

```bash
npm install --save-dev interface-forge
# or
pnpm add --save-dev interface-forge
# or
yarn add --dev interface-forge
```

Since Zod is declared as an optional peer dependency, you also need to install it separately:

```bash
npm install zod
# or
pnpm add zod
# or
yarn add zod
```

**Important**: The ZodFactory uses Zod v4 API which is available within the Zod v3 package. When importing Zod types, use `import { z } from 'zod/v4'` to access the v4 API.

## Basic Usage

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  isActive: z.boolean(),
  createdAt: z.date(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Create a factory from the Zod schema
const userFactory = new ZodFactory(UserSchema);

// Generate a single user
const user = userFactory.build();

// Generate multiple users
const users = userFactory.batch(10);

// Generate with overrides
const adminUser = userFactory.build({
  isActive: true,
  tags: ['admin', 'power-user']
});
```

## Partial Factory Functions

One of the most powerful features of ZodFactory is the ability to use **partial factory functions**. This allows you to customize only specific fields while automatically generating the rest from the schema:

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
    language: z.string()
  })
});

// Partial factory function - only customize what you need
const userFactory = new ZodFactory(UserSchema, (faker) => ({
  // Only customize these fields for deterministic test data
  name: faker.person.fullName(),
  role: 'user', // Always create regular users
  settings: {
    theme: 'light', // Always use light theme in tests
    // notifications and language will be auto-generated
  },
  // id, email, createdAt will be auto-generated from schema
}));

const user = userFactory.build();
// user.name === 'John Doe' (from factory function)
// user.role === 'user' (from factory function)
// user.settings.theme === 'light' (from factory function)
// user.settings.notifications === true/false (auto-generated)
// user.id === valid UUID (auto-generated)
// user.email === valid email (auto-generated)
```

## Supported Zod Types

### Primitive Types

- **String**: `z.string()` - Generates random alphanumeric strings
- **Number**: `z.number()` - Generates random numbers
- **Boolean**: `z.boolean()` - Generates true/false randomly
- **Date**: `z.date()` - Generates recent dates
- **BigInt**: `z.bigint()` - Generates random bigints
- **Null**: `z.null()` - Always returns null
- **Undefined**: `z.undefined()` - Always returns undefined
- **Any**: `z.any()` - Generates various random types
- **Unknown**: `z.unknown()` - Generates various random types

### String Constraints

The factory respects various string constraints and formats:

```typescript
const schema = z.object({
  // Format constraints
  email: z.string().email(),           // Generates valid email
  url: z.string().url(),               // Generates valid URL
  uuid: z.string().uuid(),             // Generates valid UUID
  cuid: z.string().cuid(),             // Generates valid CUID
  cuid2: z.string().cuid2(),           // Generates valid CUID2
  ulid: z.string().ulid(),             // Generates valid ULID
  
  // Length constraints
  minMax: z.string().min(5).max(20),   // Respects length constraints
  exact: z.string().length(10),        // Generates exact length
  
  // Pattern matching
  pattern: z.string().regex(/^[A-Z]\d{3}$/), // Basic regex support
  
  // Special formats
  datetime: z.string().datetime(),     // ISO datetime string
  date: z.string().date(),            // ISO date string
  time: z.string().time(),            // Time string
  duration: z.string().duration(),     // ISO duration
  ip: z.string().ip(),                // Valid IP address
  ipv4: z.string().ipv4(),            // Valid IPv4
  ipv6: z.string().ipv6(),            // Valid IPv6
  base64: z.string().base64(),        // Base64 encoded string
  jwt: z.string().jwt(),              // JWT token format
});
```

### Number Constraints

```typescript
const schema = z.object({
  // Type constraints
  integer: z.number().int(),           // Generates integers
  float: z.number(),                   // Generates floats
  
  // Range constraints
  positive: z.number().positive(),     // Generates positive numbers
  negative: z.number().negative(),     // Generates negative numbers
  nonpositive: z.number().nonpositive(), // Generates <= 0
  nonnegative: z.number().nonnegative(), // Generates >= 0
  
  // Min/Max constraints
  range: z.number().min(1).max(100),   // Respects min/max
  gte: z.number().gte(10),            // Greater than or equal
  lte: z.number().lte(50),            // Less than or equal
  
  // Special constraints
  multipleOf: z.number().multipleOf(5), // Generates multiples
  finite: z.number().finite(),         // No Infinity/-Infinity
});
```

### Complex Types

#### Objects

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/),
  country: z.string()
});

const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0).max(120),
  address: AddressSchema,  // Nested object
  isActive: z.boolean()
});

const factory = new ZodFactory(UserSchema);
```

#### Arrays

```typescript
const schema = z.object({
  // Basic array
  tags: z.array(z.string()),
  
  // With length constraints
  items: z.array(z.number()).min(1).max(5),
  
  // Exact length
  coordinates: z.array(z.number()).length(2),
  
  // Non-empty
  requiredTags: z.array(z.string()).nonempty(),
});
```

#### Tuples

```typescript
const schema = z.object({
  // Fixed tuple
  point: z.tuple([z.number(), z.number()]),
  
  // With rest elements
  data: z.tuple([z.string(), z.number()]).rest(z.boolean()),
});
```

#### Unions and Discriminated Unions

```typescript
// Regular union
const StatusSchema = z.union([
  z.literal('pending'),
  z.literal('approved'),
  z.literal('rejected')
]);

// Discriminated union
const NotificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  }),
  z.object({
    type: z.literal('sms'),
    to: z.string().regex(/^\+\d{10,15}$/),
    message: z.string().max(160)
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string(),
    title: z.string(),
    body: z.string()
  })
]);

const factory = new ZodFactory(z.object({
  status: StatusSchema,
  notification: NotificationSchema
}));
```

#### Enums

```typescript
// Zod enum
const RoleSchema = z.enum(['admin', 'user', 'guest']);

// Native enum
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING'
}
const StatusSchema = z.nativeEnum(Status);

const factory = new ZodFactory(z.object({
  role: RoleSchema,
  status: StatusSchema
}));
```

#### Records and Maps

```typescript
const schema = z.object({
  // Record with string keys
  metadata: z.record(z.string(), z.unknown()),
  
  // Record with specific key pattern
  scores: z.record(z.string().regex(/^player_\d+$/), z.number()),
  
  // Map type
  cache: z.map(z.string(), z.any()),
});
```

#### Sets

```typescript
const schema = z.object({
  // Basic set
  uniqueTags: z.set(z.string()),
  
  // With size constraints
  limitedSet: z.set(z.number()).min(1).max(5),
});
```

### Special Types

#### Optional and Nullable

```typescript
const schema = z.object({
  // Optional field (can be undefined)
  middleName: z.string().optional(),
  
  // Nullable field (can be null)
  deletedAt: z.date().nullable(),
  
  // Both optional and nullable
  nickname: z.string().optional().nullable(),
});
```

#### Default Values

```typescript
const schema = z.object({
  // Will use default if not provided
  role: z.enum(['user', 'admin']).default('user'),
  credits: z.number().default(100),
  tags: z.array(z.string()).default([]),
});
```

#### Transformations

```typescript
const schema = z.object({
  // Note: Transformations are applied after generation
  email: z.string().email().transform(str => str.toLowerCase()),
  tags: z.array(z.string()).transform(arr => [...new Set(arr)]),
});
```

#### Refinements

```typescript
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ZodFactory will generate valid data that passes refinements
```

## Advanced Features

### Custom Generators

You can register custom generators for specific field types:

```typescript
const UserSchema = z.object({
  id: z.string().describe('userId'),  // Use describe to tag fields
  email: z.string().email().describe('customEmail'),
  score: z.number().describe('gameScore')
});

const factory = new ZodFactory(UserSchema, {
  generators: {
    userId: () => `USR_${Date.now()}`,
    customEmail: () => `test_${Date.now()}@example.com`,
    gameScore: () => Math.floor(Math.random() * 1000)
  }
});
```

### Working with Recursive Schemas

For recursive or self-referential schemas, use the `maxDepth` option to control generation:

```typescript
interface Comment {
  id: string;
  text: string;
  replies: Comment[];
}

const CommentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    text: z.string(),
    replies: z.array(CommentSchema)
  })
);

// Limit recursion depth to prevent infinite generation
const factory = new ZodFactory(
  z.object({ comments: z.array(CommentSchema) }),
  { maxDepth: 3 }
);
```

### Using Hooks

ZodFactory supports the same hooks as the base Factory class:

```typescript
const factory = new ZodFactory(UserSchema)
  .beforeBuild((params) => {
    // Modify params before building
    return {
      ...params,
      createdAt: new Date('2024-01-01')
    };
  })
  .afterBuild((user) => {
    // Post-process the generated user
    console.log('Generated user:', user.id);
    return user;
  });
```

### Async Factory Functions

For async operations, use `buildAsync`:

```typescript
const factory = new ZodFactory(UserSchema, async (faker) => ({
  name: faker.person.fullName(),
  avatarUrl: await fetchRandomAvatar(),
}));

const user = await factory.buildAsync();
```

## Examples

### Testing Example

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

// Define your domain schema
const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100),
  price: z.number().positive().multipleOf(0.01),
  inStock: z.boolean(),
  category: z.enum(['electronics', 'clothing', 'food']),
  tags: z.array(z.string()).default([])
});

// Create test factory
const productFactory = new ZodFactory(ProductSchema, (faker) => ({
  name: faker.commerce.productName(),
  price: Number(faker.commerce.price()),
  // Other fields auto-generated
}));

describe('Product Service', () => {
  it('should create a product', async () => {
    const testProduct = productFactory.build({
      inStock: true,
      category: 'electronics'
    });
    
    const result = await productService.create(testProduct);
    expect(result.id).toBeDefined();
  });
  
  it('should handle multiple products', async () => {
    const products = productFactory.batch(10);
    const results = await productService.bulkCreate(products);
    expect(results).toHaveLength(10);
  });
});
```

### API Response Mocking

```typescript
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    users: z.array(UserSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive()
  }).nullable(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).nullable(),
  timestamp: z.string().datetime()
});

const apiFactory = new ZodFactory(ApiResponseSchema, (faker) => ({
  timestamp: new Date().toISOString(),
}));

// Generate success response
const successResponse = apiFactory.build({
  success: true,
  error: null
});

// Generate error response
const errorResponse = apiFactory.build({
  success: false,
  data: null,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'The requested user does not exist'
  }
});
```

## Migration from createFactoryFromZod

If you were using the older `createFactoryFromZod` function, migrate to the new `ZodFactory` class:

```typescript
// Old API (deprecated)
import { createFactoryFromZod } from 'interface-forge/zod';
const factory = createFactoryFromZod(schema);

// New API
import { ZodFactory } from 'interface-forge/zod';
const factory = new ZodFactory(schema);
```

The new API provides better TypeScript support, partial factory functions, and all the features of the base Factory class.

## See Also

- [Basic Example](https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-basic.ts)
- [Advanced Example](https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-integration.ts)
- [Testing Example](https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-testing.ts)
- [Main Documentation](https://github.com/goldziher/interface-forge#readme)