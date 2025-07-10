---
sidebar_position: 2
---

# Factory Composition

Build complex objects by combining simpler factories.

## The compose() Method

Merge multiple factory definitions while maintaining type safety:

```typescript
interface User {
    id: string;
    name: string;
}

interface ContactInfo {
    email: string;
    phone: string;
}

interface FullUser extends User, ContactInfo {
    isVerified: boolean;
}

const userFactory = new Factory<User>((faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
}));

const contactFactory = new Factory<ContactInfo>((faker) => ({
    email: faker.internet.email(),
    phone: faker.phone.number(),
}));

// Compose factories
const fullUserFactory = userFactory.compose<FullUser>({
    email: contactFactory.build().email,
    phone: contactFactory.build().phone,
    isVerified: true,
});
```

## Factory-Based Composition

Use entire factories as property values:

```typescript
const enhancedUserFactory = userFactory.compose<EnhancedUser>({
    profile: profileFactory, // Will call profileFactory.build()
    address: addressFactory, // Will call addressFactory.build()
    membershipLevel: 'gold',
});
```

## Nested Composition

Build hierarchies by composing multiple times:

```typescript
// Base → Employee → Manager → Executive
const personFactory = new Factory<Person>(personFn);
const employeeFactory = personFactory.compose<Employee>({
    /* employee props */
});
const managerFactory = employeeFactory.compose<Manager>({
    /* manager props */
});
const executiveFactory = managerFactory.compose<Executive>({
    /* executive props */
});
```

## Conditional Composition

Create different compositions based on conditions:

```typescript
function createAccountFactory(type: 'basic' | 'premium' | 'enterprise') {
    const baseComposition = { type, isActive: true };

    switch (type) {
        case 'basic':
            return baseFactory.compose<BasicAccount>({
                ...baseComposition,
                storageLimit: 1,
                features: ['basic-support'],
            });
        case 'premium':
            return baseFactory.compose<PremiumAccount>({
                ...baseComposition,
                storageLimit: 100,
                features: ['priority-support', 'analytics'],
            });
        case 'enterprise':
            return baseFactory.compose<EnterpriseAccount>({
                ...baseComposition,
                storageLimit: -1, // unlimited
                dedicatedManager: userFactory,
            });
    }
}
```

## Composition with Relationships

Build object graphs:

```typescript
const teamFactory = userFactory.compose<Team>({
    name: faker.company.name(),
    manager: userFactory,
    members: () => userFactory.batch(faker.number.int({ min: 3, max: 8 })),
    project: projectFactory,
});
```

## Async Composition

Works with async factories:

```typescript
const userFactory = new Factory<User>(async (faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
}));

const composedFactory = userFactory.compose<UserWithProfile>({
    profile: asyncProfileFactory,
    isActive: true,
});

// Use buildAsync for async composition
const user = await composedFactory.buildAsync();
```

## Best Practices

1. **Type Safety**: Ensure composed types extend the base type
2. **Factory Reuse**: Create factory instances once, reuse in compositions
3. **Performance**: Avoid creating new factories in compositions
4. **Logical Grouping**: Group related properties into composable factories

```typescript
// ❌ Inefficient
const bad = userFactory.compose({
    profile: new Factory(profileFn), // New instance each build
});

// ✅ Efficient
const profileFactory = new Factory(profileFn);
const good = userFactory.compose({
    profile: profileFactory, // Reused instance
});
```
