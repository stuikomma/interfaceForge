---
sidebar_position: 2
---

# Advanced Composition

Interface Forge allows you to compose factories to create complex data structures. For example, you can create a factory for a `Post` that has a `User` as an author:

```typescript
interface Post {
    id: string;
    title: string;
    author: User;
}

const postFactory = new Factory<Post>(() => ({
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    author: userFactory.build(),
}));
```

You can also use the `compose` method to combine factories:

```typescript
const postWithUserFactory = postFactory.compose({
    author: userFactory,
});

const post = postWithUserFactory.build();
```
