/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental features of Interface-Forge:
 * - Creating a simple factory
 * - Building single instances
 * - Building batches
 * - Overriding default values
 */

import { Factory } from 'interface-forge';

interface User {
    age: number;
    createdAt: Date;
    email: string;
    id: string;
    isActive: boolean;
    name: string;
}

const UserFactory = new Factory<User>((factory) => ({
    age: factory.number.int({ max: 80, min: 18 }),
    createdAt: factory.date.past(),
    email: factory.internet.email(),
    id: factory.string.uuid(),
    isActive: factory.datatype.boolean(),
    name: factory.person.fullName(),
}));

const user = UserFactory.build();
console.log('Single user:', user);

const users = UserFactory.batch(5);
console.log(`Generated ${users.length} users`);

const customUser = UserFactory.build({
    email: 'john@example.com',
    isActive: true,
    name: 'John Doe',
});
console.log('Custom user:', customUser);

const activeUsers = UserFactory.batch(3, {
    age: 25,
    isActive: true,
});
console.log('Active users:', activeUsers);

const companyName = UserFactory.company.name();
const futureDate = UserFactory.date.future();
console.log('Company:', companyName, 'Future date:', futureDate);
