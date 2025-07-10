---
sidebar_position: 3
---

# Depth Control

Manage object nesting and prevent infinite recursion in complex schemas.

## The Problem

Recursive schemas can cause infinite loops:

```typescript
interface Category {
    id: string;
    name: string;
    parent?: Category;
    children?: Category[];
}

// Without depth control, this could recurse infinitely
const categoryFactory = new Factory<Category>((faker) => ({
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    parent: categoryFactory.build(), // ⚠️ Infinite recursion
    children: categoryFactory.batch(3), // ⚠️ Infinite recursion
}));
```

## The Solution: maxDepth

Set maximum nesting depth to prevent infinite recursion:

```typescript
const categoryFactory = new Factory<Category>(
    factoryFn,
    { maxDepth: 3 }, // Stop at 3 levels deep
);
```

## How It Works

When `maxDepth` is reached:

- Factory returns empty object `{}`
- Zod schemas return appropriate fallback values
- Prevents stack overflow errors

## Factory Example

```typescript
interface TreeNode {
    id: string;
    value: string;
    children: TreeNode[];
}

const treeFactory = new Factory<TreeNode>(
    (faker) => ({
        id: faker.string.uuid(),
        value: faker.lorem.word(),
        children:
            faker.number.int({ min: 0, max: 3 }) > 0
                ? treeFactory.batch(2) // Recursive call
                : [],
    }),
    { maxDepth: 4 },
);

const tree = treeFactory.build();
// Tree will be at most 4 levels deep
```

## ZodFactory Example

```typescript
const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        id: z.string().uuid(),
        name: z.string(),
        children: z.array(categorySchema).optional(),
    }),
);

const factory = new ZodFactory(categorySchema, { maxDepth: 3 });
const category = factory.build();
// Automatically limits nesting to 3 levels
```

## Best Practices

### Design Schemas for Depth Limiting

```typescript
// ❌ Required nested objects fail at depth limit
const problematicSchema = z.object({
    level1: z.object({
        level2: z.object({
            level3: z.object({
                value: z.string(), // Required - will fail at maxDepth=2
            }),
        }),
    }),
});

// ✅ Optional nested objects work with depth limiting
const compatibleSchema = z.object({
    level1: z
        .object({
            level2: z
                .object({
                    level3: z
                        .object({
                            value: z.string(),
                        })
                        .optional(), // Optional - works with maxDepth
                })
                .optional(),
        })
        .optional(),
});
```

### Use Conditional Logic

```typescript
const factory = new Factory<TreeNode>((faker, iteration) => {
    const currentDepth = getCurrentDepth(); // Custom depth tracking

    return {
        id: faker.string.uuid(),
        value: faker.lorem.word(),
        children:
            currentDepth < 3
                ? factory.batch(faker.number.int({ min: 0, max: 2 }))
                : [], // Stop recursion manually
    };
});
```

### Lazy References

```typescript
import { Ref } from 'interface-forge';

const parentRef = new Ref<Category>();

const categoryFactory = new Factory<Category>((faker) => ({
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    parent: parentRef.get(), // Lazy reference
    children: [],
}));

// Set reference after creation to avoid recursion
const parent = categoryFactory.build();
parentRef.set(parent);
```

## Custom Depth Handlers

For ZodFactory, implement custom handlers for recursive types:

```typescript
const factory = new ZodFactory(recursiveSchema, {
    maxDepth: 3,
}).withTypeHandler('ZodLazy', (schema, generator, currentDepth) => {
    if (currentDepth >= 2) {
        return null; // Stop recursion early
    }

    return {
        id: generator.factory.string.uuid(),
        children: generator.factory.helpers.maybe(() => [
            factory.build(),
            factory.build(),
        ]),
    };
});
```

## Performance Considerations

### Memory Usage

```typescript
// ❌ Deep nesting uses lots of memory
const deepFactory = new Factory<DeepObject>(
    factoryFn,
    { maxDepth: 20 }, // Very deep
);

// ✅ Reasonable depth for most use cases
const reasonableFactory = new Factory<DeepObject>(
    factoryFn,
    { maxDepth: 5 }, // Reasonable depth
);
```

### Generation Speed

```typescript
// Test different depths for performance
console.time('depth-3');
const shallow = factory.build(); // maxDepth: 3
console.timeEnd('depth-3');

console.time('depth-10');
const deep = factory.build(); // maxDepth: 10
console.timeEnd('depth-10');
```

## Testing with Depth Control

```typescript
describe('Tree Generation', () => {
    it('should respect depth limits', () => {
        const factory = new Factory<TreeNode>(factoryFn, { maxDepth: 3 });

        const tree = factory.build();

        // Verify maximum depth
        const maxDepth = calculateDepth(tree);
        expect(maxDepth).toBeLessThanOrEqual(3);
    });

    it('should handle different depths', () => {
        [1, 3, 5].forEach((depth) => {
            const factory = new Factory<TreeNode>(factoryFn, {
                maxDepth: depth,
            });

            const tree = factory.build();
            expect(calculateDepth(tree)).toBeLessThanOrEqual(depth);
        });
    });
});

function calculateDepth(node: TreeNode): number {
    if (!node.children?.length) return 1;
    return 1 + Math.max(...node.children.map(calculateDepth));
}
```

## Default Depth

The universal default is `DEFAULT_MAX_DEPTH = 5`, providing a good balance between complexity and performance for most use cases.
