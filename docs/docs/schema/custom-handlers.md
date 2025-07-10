---
sidebar_position: 2
---

# Custom Type Handlers

Handle complex Zod types that require custom generation logic.

## Handler Interface

```typescript
type ZodTypeHandler = (
    schema: ZodType,
    generator: ZodSchemaGenerator,
    currentDepth: number,
) => unknown;
```

## Required Handlers

These Zod types **require** custom handlers:

### Functions

```typescript
const schema = z.object({
    id: z.string(),
    processor: z.function().args(z.string()).returns(z.string()),
});

const factory = new ZodFactory(schema).withTypeHandler(
    'ZodFunction',
    () => (input: string) => `processed: ${input}`,
);
```

### Promises

```typescript
const schema = z.object({
    id: z.string(),
    data: z.promise(z.object({ content: z.string() })),
});

const factory = new ZodFactory(schema).withTypeHandler(
    'ZodPromise',
    (schema, generator) =>
        Promise.resolve({
            content: generator.factory.lorem.paragraph(),
        }),
);

// Use buildAsync for promise-containing schemas
const data = await factory.buildAsync();
```

### Custom Types

```typescript
interface CustomMetadata {
    version: string;
    tags: string[];
}

const schema = z.object({
    id: z.string(),
    metadata: z.custom<CustomMetadata>(),
});

const factory = new ZodFactory(schema).withTypeHandler(
    'ZodCustom',
    (schema, generator) => ({
        version: generator.factory.system.semver(),
        tags: generator.factory.helpers.arrayElements(['tag1', 'tag2']),
    }),
);
```

## Multiple Handlers

Register multiple handlers at once:

```typescript
const factory = new ZodFactory(schema).withTypeHandlers({
    ZodFunction: () => () => 'mock result',
    ZodPromise: (schema, generator) =>
        Promise.resolve(generator.factory.lorem.word()),
    ZodCustom: (schema, generator) => ({
        timestamp: new Date(),
        data: generator.factory.datatype.json(),
    }),
});
```

## Advanced Handlers

### File Upload Handler

```typescript
const fileSchema = z.object({
    file: z.instanceof(File),
    metadata: z.object({
        size: z.number(),
        type: z.string(),
    }),
});

const factory = new ZodFactory(fileSchema).withTypeHandler(
    'ZodType', // instanceof uses ZodType
    (schema, generator) => {
        const content = generator.factory.lorem.paragraphs(3);
        return new File([content], 'test.txt', { type: 'text/plain' });
    },
);
```

### Context-Aware Handler

```typescript
const factory = new ZodFactory(recursiveSchema).withTypeHandler(
    'ZodLazy',
    (schema, generator, currentDepth) => {
        // Depth-aware generation
        const shouldNest = currentDepth < 2;

        return {
            id: generator.factory.string.uuid(),
            level: currentDepth,
            children: shouldNest
                ? [factory.build(), factory.build()]
                : undefined,
        };
    },
);
```

### Async Handler

```typescript
const factory = new ZodFactory(schema).withTypeHandler(
    'ZodPromise',
    async (schema, generator) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        return {
            result: generator.factory.lorem.word(),
            timestamp: new Date(),
        };
    },
);
```

## Built-in Handlers

These types have built-in handlers:

| Type         | Generated Value        |
| ------------ | ---------------------- |
| `ZodBigInt`  | BigInt(0 to 1,000,000) |
| `ZodNaN`     | `Number.NaN`           |
| `ZodUnknown` | Random word            |
| `ZodVoid`    | `undefined`            |

## Error Handling

Missing handlers throw clear errors:

```typescript
const schema = z.object({
    fn: z.function(),
});

try {
    new ZodFactory(schema).build();
} catch (error) {
    console.log(error.message);
    // "No custom type handler registered for ZodFunction..."
}
```

## Testing with Handlers

```typescript
describe('Custom Handlers', () => {
    const mockProcessor = jest.fn().mockReturnValue('processed');

    const factory = new ZodFactory(schema).withTypeHandlers({
        ZodFunction: () => mockProcessor,
    });

    it('should use custom handlers', () => {
        const data = factory.build();

        expect(data.processor).toBe(mockProcessor);

        // Test the mock function
        const result = data.processor('input');
        expect(result).toBe('processed');
        expect(mockProcessor).toHaveBeenCalledWith('input');
    });
});
```

## Performance Tips

```typescript
// ❌ Recreates handlers on each build
function generateData() {
    return new ZodFactory(schema)
        .withTypeHandler('ZodFunction', expensiveHandler)
        .build();
}

// ✅ Reuse factory with handlers
const factory = new ZodFactory(schema).withTypeHandler(
    'ZodFunction',
    expensiveHandler,
);

function generateData() {
    return factory.build();
}
```

## Real-World Example

```typescript
// E-commerce order schema
const orderSchema = z.object({
    id: z.string().uuid(),
    processor: z
        .function()
        .args(
            z.object({
                amount: z.number(),
                currency: z.string(),
            }),
        )
        .returns(
            z.promise(
                z.object({
                    success: z.boolean(),
                    transactionId: z.string().optional(),
                }),
            ),
        ),
    validate: z.custom<(order: any) => boolean>(),
});

const factory = new ZodFactory(orderSchema).withTypeHandlers({
    ZodFunction: () => async (payment) => ({
        success: Math.random() > 0.1, // 90% success rate
        transactionId: Math.random().toString(36),
    }),
    ZodCustom: () => (order) => {
        return order.amount > 0 && order.currency?.length === 3;
    },
});

const order = factory.build();
const result = await order.processor({ amount: 100, currency: 'USD' });
```
