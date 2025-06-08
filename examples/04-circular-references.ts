/**
 * Circular References Example
 *
 * This example demonstrates how to handle circular references
 * using the use() method for lazy evaluation.
 */

import { Factory } from 'interface-forge';

interface Department {
    employees: Employee[];
    id: string;
    manager: Employee;
    name: string;
}

interface Employee {
    department: Department;
    id: string;
    name: string;
    subordinates: Employee[];
    supervisor?: Employee;
}

interface Post {
    author: User;
    content: string;
    id: string;
    relatedPosts: Post[];
    title: string;
}

// Define interfaces with circular dependencies
interface User {
    favoritePost?: Post;
    id: string;
    name: string;
    posts: Post[];
}

// Example 1: User and Posts with circular references
const UserFactory = new Factory<User>((faker) => ({
    favoritePost: faker.use(() => PostFactory.build()),
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    posts: faker.use(() => PostFactory.batch(3)),
}));

const PostFactory = new Factory<Post>((faker) => ({
    author: faker.use(() => UserFactory.build()),
    content: faker.lorem.paragraphs(2),
    id: faker.string.uuid(),
    relatedPosts: faker.use(() => PostFactory.batch(2)),
    title: faker.lorem.sentence(),
}));

// Build a user with posts
const user = UserFactory.build();
console.log('User:', user.name);
console.log('Posts by user:', user.posts.length);
console.log('Favorite post:', user.favoritePost?.title);

// Example 2: Organizational hierarchy with circular references
const DepartmentFactory = new Factory<Department>((faker) => ({
    employees: faker.use(() => EmployeeFactory.batch(5)),
    id: faker.string.uuid(),
    manager: faker.use(() => EmployeeFactory.build()),
    name: faker.commerce.department(),
}));

const EmployeeFactory = new Factory<Employee>((faker) => ({
    department: faker.use(() => DepartmentFactory.build()),
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    subordinates: faker.use(() =>
        EmployeeFactory.batch(faker.number.int({ max: 3, min: 0 })),
    ),
    supervisor: faker.datatype.boolean({ probability: 0.8 })
        ? faker.use(() => EmployeeFactory.build())
        : undefined,
}));

// Example 3: Controlling recursion depth
const LimitedUserFactory = new Factory<User>(
    (faker) => ({
        favoritePost: undefined,
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        posts: faker.use(() => LimitedPostFactory.batch(2)),
    }),
    { maxDepth: 3 }, // Limit nesting to 3 levels
);

const LimitedPostFactory = new Factory<Post>(
    (faker) => ({
        author: faker.use(() => LimitedUserFactory.build()),
        content: faker.lorem.paragraphs(2),
        id: faker.string.uuid(),
        relatedPosts: faker.use(() => LimitedPostFactory.batch(1)),
        title: faker.lorem.sentence(),
    }),
    { maxDepth: 3 },
);

// This will stop creating nested objects after 3 levels
const limitedUser = LimitedUserFactory.build();
console.log('Limited depth user:', limitedUser);

// Example 4: Building specific relationship patterns
const createUserWithOwnPosts = () => {
    // First create the user without posts
    const user = UserFactory.build({ favoritePost: undefined, posts: [] });

    // Then create posts that reference this specific user
    const posts = PostFactory.batch(3, { author: user });

    // Update the user's posts
    user.posts = posts;
    [user.favoritePost] = posts;

    return user;
};

const userWithOwnPosts = createUserWithOwnPosts();
console.log(
    'User owns all posts:',
    userWithOwnPosts.posts.every(
        (post) => post.author.id === userWithOwnPosts.id,
    ),
);

// Example 5: Graph structures with self-references
interface GraphNode {
    connections: GraphNode[];
    id: string;
    value: number;
}

const GraphNodeFactory = new Factory<GraphNode>((faker) => ({
    connections: faker.use(() =>
        GraphNodeFactory.batch(faker.number.int({ max: 3, min: 0 })),
    ),
    id: faker.string.uuid(),
    value: faker.number.int({ max: 100, min: 1 }),
}));

// Create a graph with limited depth to avoid infinite recursion
const graphRoot = new Factory<GraphNode>(
    (faker) => ({
        connections: faker.use(() => GraphNodeFactory.batch(3)),
        id: faker.string.uuid(),
        value: faker.number.int({ max: 100, min: 1 }),
    }),
    { maxDepth: 2 },
).build();

console.log('Graph root node:', graphRoot.id);
console.log('Direct connections:', graphRoot.connections.length);
