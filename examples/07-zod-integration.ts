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

import { z } from 'zod';
import { 
    clearZodTypeRegistry, 
    initializeBuiltinZodTypes, 
    registerZodType,
    ZodFactory 
} from '../src/zod';

// Initialize built-in Zod type handlers
initializeBuiltinZodTypes();

// 1. Basic User Schema
const UserSchema = z.object({
    age: z.number().int().min(18).max(120),
    createdAt: z.date(),
    email: z.string().email(),
    id: z.string().uuid(),
    isActive: z.boolean(),
    name: z.string().min(1).max(100),
});

const userFactory = new ZodFactory(UserSchema);

// Generate a single user
const user = userFactory.build();
console.log('Generated user:', user);

// Generate multiple users
const users = userFactory.batch(3);
console.log(`Generated ${users.length} users`);

// Build with overrides
const customUser = userFactory.build({
    email: 'john.doe@example.com',
    name: 'John Doe',
});
console.log('User with overrides:', customUser);

// 2. Complex E-commerce Product Schema
const ProductSchema = z.object({
    category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
    createdAt: z.date(),
    description: z.string().optional(),
    id: z.string().uuid(),
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
            })
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

// 3. Nested Schema with Relationships
const EmployeeSchema = z.object({
    department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
    email: z.string().email(),
    firstName: z.string().min(1),
    id: z.string().uuid(),
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
    id: z.string().uuid(),
    industry: z.string(),
    name: z.string().min(1),
    revenue: z.number().min(0).optional(),
    website: z.string().url().optional(),
});

const companyFactory = new ZodFactory(CompanySchema);
const company = companyFactory.build();
console.log('Generated company:', {
    employeeCount: company.employees.length,
    location: `${company.address.city}, ${company.address.state}`,
    name: company.name,
});

// 4. Union Types
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

// 5. Custom Generators
const OrderSchema = z.object({
    createdAt: z.date(),
    customerId: z.string().describe('customer-id'),
    id: z.string().describe('order-id'),
    notes: z.string().optional(),
    productId: z.string().describe('product-id'),
    quantity: z.number().int().min(1).max(100),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
    total: z.number().min(0),
});

const orderFactory = new ZodFactory(OrderSchema, {
    customGenerators: {
        'customer-id': () => `CUST-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        'order-id': () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        'product-id': () => `PROD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    },
});

const order = orderFactory.build();
console.log('Order with custom IDs:', {
    customerId: order.customerId,
    id: order.id,
    productId: order.productId,
});

// 6. Optional and Nullable Fields
const UserProfileSchema = z.object({
    avatar: z.string().url().optional(),
    bio: z.string().max(500).nullable(),
    createdAt: z.date(),
    displayName: z.string().optional(),
    email: z.string().email(),
    id: z.string().uuid(),
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
                url: z.string().url(),
            })
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

// 7. Custom Zod Type Registration
// Register a handler for BigInt type
registerZodType('ZodBigInt', (_schema, factory) => {
    return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
});

// Register a handler for custom validation types
registerZodType('ZodCustomValidation', (schema, factory) => {
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

// Performance test
const SimpleSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    timestamp: z.date(),
    value: z.number(),
});

const simpleFactory = new ZodFactory(SimpleSchema);
const startTime = Date.now();
const largeDataset = simpleFactory.batch(1000);
const endTime = Date.now();

console.log(`Generated ${largeDataset.length} objects in ${endTime - startTime}ms`);

// Validation test
const StrictSchema = z.object({
    age: z.number().int().min(18).max(100),
    email: z.string().email(),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    website: z.string().url().optional(),
});

const strictFactory = new ZodFactory(StrictSchema);
const testData = strictFactory.batch(10);

let validCount = 0;
testData.forEach((data) => {
    try {
        StrictSchema.parse(data);
        validCount++;
    } catch {
        // Invalid data
    }
});

console.log(`Validation: ${validCount}/${testData.length} objects passed`);

// Clean up custom registrations
clearZodTypeRegistry();