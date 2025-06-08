/**
 * Zod Integration Example
 *
 * This example demonstrates Interface-Forge's integration with Zod schemas:
 * - Creating factories from Zod schemas
 * - Using custom generators for specific fields
 * - Handling complex nested schemas
 * - Working with Zod unions and optionals
 * - Registering custom Zod type handlers
 *
 * Note: This requires the 'zod' package to be installed
 */

import { z } from 'zod/v4';
import {
    clearZodTypeRegistry,
    initializeBuiltinZodTypes,
    registerZodType,
    ZodFactory,
} from 'interface-forge/zod';

initializeBuiltinZodTypes();

const UserSchema = z.object({
    age: z.number().int().min(18).max(120),
    createdAt: z.date(),
    email: z.email(),
    id: z.uuid(),
    isActive: z.boolean(),
    name: z.string().min(1).max(100),
});

const userFactory = new ZodFactory(UserSchema);

const user = userFactory.build();
console.log('Generated user:', user);

const users = userFactory.batch(3);
console.log(`Generated ${users.length} users`);

const customUser = userFactory.build({
    email: 'john.doe@example.com',
    name: 'John Doe',
});
console.log('User with overrides:', customUser);

const ProductSchema = z.object({
    category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
    createdAt: z.date(),
    description: z.string().optional(),
    id: z.uuid(),
    inStock: z.boolean(),
    name: z.string().min(1).max(200),
    price: z.number().min(0).max(99_999.99),
    ratings: z.object({
        average: z.number().min(1).max(5),
        count: z.number().int().min(0),
    }),
    tags: z.array(z.string()).min(1).max(10),
    updatedAt: z.date().optional(),
    variants: z
        .array(
            z.object({
                available: z.boolean(),
                id: z.string(),
                name: z.string(),
                price: z.number().min(0),
            }),
        )
        .optional(),
});

const productFactory = new ZodFactory(ProductSchema);
const product = productFactory.build();
console.log('Generated product:', {
    category: product.category,
    id: product.id,
    name: product.name,
    price: product.price,
    variantCount: product.variants?.length ?? 0,
});

const EmployeeSchema = z.object({
    department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
    email: z.email(),
    firstName: z.string().min(1),
    id: z.uuid(),
    isActive: z.boolean(),
    lastName: z.string().min(1),
    position: z.string(),
    salary: z.number().int().min(30_000).max(500_000),
    skills: z.array(z.string()).min(1).max(15),
    startDate: z.date(),
});

const CompanySchema = z.object({
    address: z.object({
        city: z.string(),
        country: z.string(),
        state: z.string(),
        street: z.string(),
        zipCode: z.string(),
    }),
    employees: z.array(EmployeeSchema).min(1).max(10),
    foundedAt: z.date(),
    id: z.uuid(),
    industry: z.string(),
    name: z.string().min(1),
    revenue: z.number().min(0).optional(),
    website: z.url().optional(),
});

const companyFactory = new ZodFactory(CompanySchema);
const company = companyFactory.build();
console.log('Generated company:', {
    employeeCount: company.employees.length,
    location: `${company.address.city}, ${company.address.state}`,
    name: company.name,
});

const EventSchema = z.union([
    z.object({
        coordinates: z.object({
            x: z.number(),
            y: z.number(),
        }),
        element: z.string(),
        timestamp: z.date(),
        type: z.literal('click'),
    }),
    z.object({
        direction: z.enum(['up', 'down']),
        position: z.number(),
        timestamp: z.date(),
        type: z.literal('scroll'),
    }),
    z.object({
        key: z.string(),
        modifiers: z.array(z.enum(['ctrl', 'alt', 'shift'])).optional(),
        timestamp: z.date(),
        type: z.literal('keypress'),
    }),
]);

const eventFactory = new ZodFactory(EventSchema);
const events = eventFactory.batch(5);
events.forEach((event) => {
    console.log(`Event type: ${event.type}`);
});

const OrderSchema = z.object({
    createdAt: z.date(),
    customerId: z.string().describe('customer-id'),
    id: z.string().describe('order-id'),
    notes: z.string().optional(),
    productId: z.string().describe('product-id'),
    quantity: z.number().int().min(1).max(100),
    status: z.enum([
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
    ]),
    total: z.number().min(0),
});

const orderFactory = new ZodFactory(OrderSchema, {
    customGenerators: {
        'customer-id': () =>
            `CUST-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        'order-id': () =>
            `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        'product-id': () =>
            `PROD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    },
});

const order = orderFactory.build();
console.log('Order with custom IDs:', {
    customerId: order.customerId,
    id: order.id,
    productId: order.productId,
});

const UserProfileSchema = z.object({
    avatar: z.url().optional(),
    bio: z.string().max(500).nullable(),
    createdAt: z.date(),
    displayName: z.string().optional(),
    email: z.email(),
    id: z.uuid(),
    lastLoginAt: z.date().nullable(),
    settings: z.object({
        notifications: z.object({
            email: z.boolean(),
            push: z.boolean(),
            sms: z.boolean().optional(),
        }),
        privacy: z
            .object({
                profileVisibility: z.enum(['public', 'friends', 'private']),
                showEmail: z.boolean(),
            })
            .optional(),
        theme: z.enum(['light', 'dark']).optional(),
    }),
    socialLinks: z
        .array(
            z.object({
                platform: z.enum(['twitter', 'linkedin', 'github', 'website']),
                url: z.url(),
            }),
        )
        .optional(),
    username: z.string().min(3).max(30),
});

const profileFactory = new ZodFactory(UserProfileSchema);
const profiles = profileFactory.batch(3);
profiles.forEach((profile, index) => {
    console.log(`Profile ${index + 1}:`, {
        hasBio: profile.bio !== null,
        hasDisplayName: profile.displayName !== undefined,
        theme: profile.settings.theme ?? 'default',
        username: profile.username,
    });
});

registerZodType('ZodBigInt', (_schema, factory) => {
    return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
});

registerZodType('ZodCustomValidation', (schema, factory) => {
    // @ts-expect-error - accessing internal _def for custom validation
    const zodType = schema._def as Record<string, unknown>;
    const validationType = zodType.validationType as string;

    switch (validationType) {
        case 'credit-card': {
            return factory.finance.creditCardNumber();
        }
        case 'phone': {
            return factory.phone.number();
        }
        case 'uuid': {
            return factory.string.uuid();
        }
        default: {
            return factory.lorem.word();
        }
    }
});

const SimpleSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    timestamp: z.date(),
    value: z.number(),
});

const simpleFactory = new ZodFactory(SimpleSchema);
const startTime = Date.now();
const largeDataset = simpleFactory.batch(1000);
const endTime = Date.now();

console.log(
    `Generated ${largeDataset.length} objects in ${endTime - startTime}ms`,
);

const StrictSchema = z.object({
    age: z.number().int().min(18).max(100),
    email: z.email(),
    username: z
        .string()
        .min(3)
        .max(20)
        .regex(/^[a-zA-Z0-9_]+$/),
    website: z.url().optional(),
});

const strictFactory = new ZodFactory(StrictSchema);
const testData = strictFactory.batch(10);

let validCount = 0;
testData.forEach((data) => {
    try {
        StrictSchema.parse(data);
        validCount++;
    } catch {
        // Validation failed - this is expected for some generated data
    }
});

console.log(`Validation: ${validCount}/${testData.length} objects passed`);

clearZodTypeRegistry();
