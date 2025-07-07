---
sidebar_position: 4
---

# Utility Generators

Interface Forge includes utility generators to help with specific data generation scenarios.

## `CycleGenerator`

The `CycleGenerator` allows you to cycle through a predefined list of values. This is useful when you want a field to have a value from a specific set in a predictable order.

```typescript
import { CycleGenerator } from 'interface-forge';

const statusGenerator = new CycleGenerator(['pending', 'active', 'failed']);

const taskFactory = new Factory(() => ({
    status: statusGenerator.next(),
}));

const task1 = taskFactory.build(); // { status: 'pending' }
const task2 = taskFactory.build(); // { status: 'active' }
const task3 = taskFactory.build(); // { status: 'failed' }
const task4 = taskFactory.build(); // { status: 'pending' } (cycles back)
```

## `SampleGenerator`

The `SampleGenerator` allows you to pick a random value from a given array. This is useful for enums or when a property should be one of several possible values.

```typescript
import { SampleGenerator } from 'interface-forge';

const roleGenerator = new SampleGenerator(['user', 'admin', 'guest']);

const userFactory = new Factory(() => ({
    role: roleGenerator.next(),
}));

const user1 = userFactory.build(); // role could be 'user', 'admin', or 'guest'
const user2 = userFactory.build(); // role could be 'user', 'admin', or 'guest'
```
