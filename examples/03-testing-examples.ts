/**
 * Testing Examples
 *
 * This example demonstrates how to use Interface-Forge in various
 * testing scenarios with popular testing frameworks.
 */

import { Factory } from 'interface-forge';

interface CartItem {
    product: Product;
    quantity: number;
}

interface Order {
    createdAt: Date;
    customerId: string;
    id: string;
    items: CartItem[];
    status: 'delivered' | 'pending' | 'processing' | 'shipped';
    total: number;
}

// Domain models
interface Product {
    category: string;
    id: string;
    inStock: boolean;
    name: string;
    price: number;
}

// Factories
const ProductFactory = new Factory<Product>((faker) => ({
    category: faker.commerce.department(),
    id: faker.string.uuid(),
    inStock: faker.datatype.boolean({ probability: 0.8 }),
    name: faker.commerce.productName(),
    price: Number.parseFloat(faker.commerce.price()),
}));

const CartItemFactory = new Factory<CartItem>((faker) => ({
    product: ProductFactory.build(),
    quantity: faker.number.int({ max: 5, min: 1 }),
}));

const OrderFactory = new Factory<Order>((faker) => {
    const items = CartItemFactory.batch(faker.number.int({ max: 5, min: 1 }));
    const total = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
    );

    return {
        createdAt: faker.date.recent(),
        customerId: faker.string.uuid(),
        id: faker.string.uuid(),
        items,
        status: faker.helpers.arrayElement([
            'pending',
            'processing',
            'shipped',
            'delivered',
        ]),
        total,
    };
});

// Example 1: Unit Test Scenario
// Testing a price calculation function
function calculateDiscount(order: Order, discountPercentage: number): number {
    return order.total * (discountPercentage / 100);
}

// Create test data
const testOrder = OrderFactory.build({ total: 100 });
console.log('Discount test:', calculateDiscount(testOrder, 10) === 10);

// Example 2: Integration Test Scenario
// Testing with specific product categories
const electronicProducts = ProductFactory.batch(5, {
    category: 'Electronics',
    inStock: true,
});

const outOfStockOrder = OrderFactory.build({
    items: electronicProducts.map((product) => ({
        product: { ...product, inStock: false },
        quantity: 1,
    })),
});

console.log(
    'Out of stock order test:',
    outOfStockOrder.items.every((item) => !item.product.inStock),
);

// Example 3: Vitest/Jest Example Structure
/*
describe('Order Processing', () => {
    it('should calculate order total correctly', () => {
        const order = OrderFactory.build({
            items: [
                { product: ProductFactory.build({ price: 10 }), quantity: 2 },
                { product: ProductFactory.build({ price: 20 }), quantity: 1 }
            ]
        });
        
        expect(order.total).toBe(40);
    });
    
    it('should handle empty orders', () => {
        const emptyOrder = OrderFactory.build({ items: [] });
        expect(emptyOrder.total).toBe(0);
    });
    
    it('should generate unique IDs', () => {
        const orders = OrderFactory.batch(100);
        const uniqueIds = new Set(orders.map(o => o.id));
        expect(uniqueIds.size).toBe(100);
    });
});
*/

// Example 4: Storybook Story Example
/*
export default {
    title: 'Components/OrderList',
    component: OrderList,
};

export const Default = {
    args: {
        orders: OrderFactory.batch(5)
    }
};

export const PendingOrders = {
    args: {
        orders: OrderFactory.batch(10, { status: 'pending' })
    }
};

export const LargeOrders = {
    args: {
        orders: OrderFactory.iterate((faker, i) => ({
            total: 1000 + (i * 500),
            items: CartItemFactory.batch(10 + i)
        })).batch(5)
    }
};
*/

// Example 5: Snapshot Testing
const snapshotData = OrderFactory.build({
    createdAt: new Date('2024-01-01'),
    customerId: 'customer-456',
    id: 'test-order-123',
    status: 'pending',
});

console.log('Snapshot test data:', JSON.stringify(snapshotData, null, 2));
