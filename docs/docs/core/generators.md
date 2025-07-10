---
sidebar_position: 3
---

# Utility Generators

Control data patterns with specialized generators.

## CycleGenerator

Cycle through predefined values sequentially:

```typescript
import { CycleGenerator } from 'interface-forge';

const statusGenerator = new CycleGenerator(['pending', 'active', 'failed']);

const taskFactory = new Factory<Task>((faker) => ({
    id: faker.string.uuid(),
    status: statusGenerator.next(), // Cycles: pending → active → failed → pending
    title: faker.lorem.sentence(),
}));

const tasks = taskFactory.batch(6);
// Statuses: pending, active, failed, pending, active, failed
```

## SampleGenerator

Random selection without consecutive duplicates:

```typescript
import { SampleGenerator } from 'interface-forge';

const roleGenerator = new SampleGenerator(['user', 'admin', 'guest']);

const userFactory = new Factory<User>((faker) => ({
    id: faker.string.uuid(),
    role: roleGenerator.next(), // Random, but no consecutive duplicates
    name: faker.person.fullName(),
}));
```

## Practical Patterns

### Sequential IDs

```typescript
const idGenerator = new CycleGenerator([1, 2, 3, 4, 5]);

const orderFactory = new Factory<Order>((faker) => ({
    id: idGenerator.next(),
    total: faker.number.float({ min: 10, max: 1000 }),
}));
```

### Weighted Distribution

```typescript
// 50% basic, 30% premium, 20% enterprise
const typeGenerator = new SampleGenerator([
    'basic',
    'basic',
    'basic',
    'basic',
    'basic',
    'premium',
    'premium',
    'premium',
    'enterprise',
    'enterprise',
]);
```

### State Transitions

```typescript
const stateGenerator = new CycleGenerator([
    'draft',
    'pending_review',
    'approved',
    'published',
]);

const articleFactory = new Factory<Article>((faker) => ({
    title: faker.lorem.sentence(),
    status: stateGenerator.next(),
}));
```

### Time Slots

```typescript
const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00'];
const timeGenerator = new CycleGenerator(timeSlots);

const appointmentFactory = new Factory<Appointment>((faker) => ({
    patientName: faker.person.fullName(),
    time: timeGenerator.next(),
    duration: 30,
}));
```

## Advanced Usage

### Combining Generators

```typescript
const priorityGen = new CycleGenerator(['low', 'medium', 'high']);
const categoryGen = new SampleGenerator(['bug', 'feature', 'enhancement']);

const ticketFactory = new Factory<Ticket>((faker) => ({
    id: faker.string.uuid(),
    priority: priorityGen.next(),
    category: categoryGen.next(),
}));
```

### A/B Testing Data

```typescript
const variantGen = new CycleGenerator(['A', 'B']);

const experimentFactory = new Factory<Experiment>((faker) => ({
    userId: faker.string.uuid(),
    variant: variantGen.next(), // Equal A/B distribution
    conversionRate: faker.number.float({ min: 0, max: 1 }),
}));
```

### Load Testing

```typescript
const endpointGen = new CycleGenerator([
    '/api/users',
    '/api/products',
    '/api/orders',
]);

const requestFactory = new Factory<Request>((faker) => ({
    endpoint: endpointGen.next(),
    method: faker.helpers.arrayElement(['GET', 'POST', 'PUT']),
    responseTime: faker.number.int({ min: 50, max: 2000 }),
}));
```

## Factory Integration

Use generators with factory methods:

```typescript
const userFactory = new Factory<User>(factoryFn);

// iterate() - Use with CycleGenerator
const iteratedFactory = userFactory.iterate(statusGenerator);

// sample() - Use with SampleGenerator
const sampledFactory = userFactory.sample(
    [{ role: 'admin' }, { role: 'user' }],
    (template, faker) => ({
        ...userFactory.build(),
        role: template.role,
    }),
);
```
