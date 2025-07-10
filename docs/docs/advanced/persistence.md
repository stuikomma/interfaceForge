---
sidebar_position: 1
---

# Persistence

Save generated objects directly to databases through adapters.

## Quick Start

```typescript
import { Factory } from 'interface-forge';

// Set default adapter
const userFactory = new Factory<User>(factoryFn).withAdapter(
    new MongooseAdapter(UserModel),
);

// Create and save to database
const user = await userFactory.create();
const users = await userFactory.createMany(10);
```

## PersistenceAdapter Interface

```typescript
interface PersistenceAdapter<T, R = T> {
    create(data: T): Promise<R>;
    createMany(data: T[]): Promise<R[]>;
}
```

## Database Adapters

### Mongoose (MongoDB)

```typescript
import mongoose from 'mongoose';

class MongooseAdapter<T> implements PersistenceAdapter<T> {
    constructor(private model: mongoose.Model<T>) {}

    async create(data: T): Promise<T> {
        const doc = new this.model(data);
        return doc.save();
    }

    async createMany(data: T[]): Promise<T[]> {
        return this.model.insertMany(data);
    }
}

// Usage
const adapter = new MongooseAdapter(UserModel);
const factory = userFactory.withAdapter(adapter);
```

### Prisma

```typescript
import { PrismaClient } from '@prisma/client';

class PrismaAdapter<T> implements PersistenceAdapter<T> {
    constructor(
        private prisma: PrismaClient,
        private model: keyof PrismaClient,
    ) {}

    async create(data: T): Promise<T> {
        return (this.prisma[this.model] as any).create({ data });
    }

    async createMany(data: T[]): Promise<T[]> {
        const results = await Promise.all(
            data.map((item) => this.create(item)),
        );
        return results;
    }
}

// Usage
const adapter = new PrismaAdapter(prisma, 'user');
```

### TypeORM

```typescript
import { Repository } from 'typeorm';

class TypeORMAdapter<T> implements PersistenceAdapter<T> {
    constructor(private repository: Repository<T>) {}

    async create(data: T): Promise<T> {
        const entity = this.repository.create(data);
        return this.repository.save(entity);
    }

    async createMany(data: T[]): Promise<T[]> {
        const entities = this.repository.create(data);
        return this.repository.save(entities);
    }
}
```

## Methods

### create()

Generate and persist single object:

```typescript
// With default adapter
const user = await userFactory.create();

// With overrides
const admin = await userFactory.create({ role: 'admin' });

// With specific adapter
const user = await userFactory.create(
    { name: 'John' },
    { adapter: new CustomAdapter() },
);
```

### createMany()

Generate and persist multiple objects:

```typescript
// Simple batch
const users = await userFactory.createMany(10);

// With overrides
const admins = await userFactory.createMany(5, { role: 'admin' });

// Cycling overrides
const mixed = await userFactory.createMany(6, [
    { role: 'admin' },
    { role: 'user' },
    { role: 'guest' },
]);
```

## Advanced Patterns

### Multiple Adapters

```typescript
class UserService {
    constructor(
        private mongoAdapter: MongooseAdapter<User>,
        private postgresAdapter: PrismaAdapter<User>,
    ) {}

    async createInMongo(userData: Partial<User>) {
        return userFactory.create(userData, {
            adapter: this.mongoAdapter,
        });
    }

    async createInPostgres(userData: Partial<User>) {
        return userFactory.create(userData, {
            adapter: this.postgresAdapter,
        });
    }
}
```

### Transactions

```typescript
class TransactionalAdapter<T> implements PersistenceAdapter<T> {
    constructor(
        private prisma: PrismaClient,
        private model: keyof PrismaClient,
        private transaction?: any,
    ) {}

    async create(data: T): Promise<T> {
        const client = this.transaction || this.prisma;
        return (client[this.model] as any).create({ data });
    }
}

// Usage with transaction
await prisma.$transaction(async (tx) => {
    const adapter = new TransactionalAdapter(prisma, 'user', tx);
    const users = await userFactory.createMany(5, {}, { adapter });
    // All users created in same transaction
});
```

### Seeding

```typescript
async function seedDatabase() {
    // Create admins
    const admins = await userFactory.createMany(3, {
        role: 'admin',
        isActive: true,
    });

    // Create users for each admin
    for (const admin of admins) {
        await userFactory.createMany(10, {
            managerId: admin.id,
            role: 'user',
        });
    }
}
```

## Hooks Integration

Persistence works with factory hooks:

```typescript
const factory = userFactory
    .withAdapter(adapter)
    .beforeBuild((data) => {
        data.email = data.email?.toLowerCase();
        return data;
    })
    .afterBuild(async (user) => {
        await sendWelcomeEmail(user.email);
        return user;
    });

// Hooks execute during create operations
const user = await factory.create();
```

## Error Handling

```typescript
try {
    const user = await userFactory.create();
} catch (error) {
    if (error instanceof ConfigurationError) {
        console.error('No adapter configured');
    }
    // Handle database errors
}
```
