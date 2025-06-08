/* eslint-disable unicorn/no-new-array */

import { en, Faker, LocaleDefinition, Randomizer } from '@faker-js/faker';
import { isFunction, isIterator, isRecord } from '@tool-belt/type-predicates';
import { CycleGenerator, SampleGenerator } from './generators';
import { merge, Ref } from './utils';

export { Ref } from './utils';

export type FactoryComposition<T> = {
    [K in keyof T]?: Factory<T[K]> | T[K];
};

export type FactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => FactorySchema<T>;

export type FactorySchema<T> = {
    [K in keyof T]:
        | Generator<T[K], T[K], T[K]>
        | Ref<T[K], (...args: unknown[]) => T[K]>
        | T[K];
};

type AfterBuildHook<T> = (obj: T) => Promise<T> | T;

type BeforeBuildHook<T> = (
    params: Partial<T>,
) => Partial<T> | Promise<Partial<T>>;
/**
 * A factory class for generating type-safe mock data by extending Faker.js functionality.
 * Provides methods for creating single instances, batches, and complex object compositions
 * with support for circular references through depth control.
 *
 * @template T - The type of objects this factory generates
 */
export class Factory<T> extends Faker {
    private afterBuildHooks: AfterBuildHook<T>[] = [];
    private beforeBuildHooks: BeforeBuildHook<T>[] = [];
    private readonly factory: FactoryFunction<T>;
    private readonly maxDepth: number;

    constructor(
        factory: FactoryFunction<T>,
        options?: {
            /**
             * The locale data to use for this instance.
             * If an array is provided, the first locale that has a definition for a given property will be used.
             */
            locale?: LocaleDefinition | LocaleDefinition[];
            /**
             * Maximum recursion depth for nested factory references.
             * Default is 10. Set to 0 to disable nested generation.
             */
            maxDepth?: number;
            /**
             * The Randomizer to use.
             * Specify this only if you want to use it to achieve a specific goal,
             * such as sharing the same random generator with other instances/tools.
             */
            randomizer?: Randomizer;
        },
    ) {
        super({
            locale: options?.locale ?? en,
            randomizer: options?.randomizer,
        });

        this.factory = factory;
        this.maxDepth = options?.maxDepth ?? 10;
    }

    /**
     * Adds a hook that will be executed after building the instance.
     *
     * @param hook. Function that takes the result and returns the result.
     * @param hook
     * @returns The current Factory instance.
     */
    afterBuild(hook: (result: T) => Promise<T> | T): this {
        if (typeof hook !== 'function') {
            throw new TypeError('Hook must be a function');
        }
        this.afterBuildHooks.push(hook);
        return this;
    }

    /**
     * Generates an array of instances using the factory's schema.
     * Supports both uniform overrides (same for all instances) and individual overrides per instance.
     *
     * @param size Number of instances to generate (must be non-negative integer)
     * @param kwargs Either a single partial object (applied to all) or an array of partials (one per instance)
     * @returns Array of generated instances
     * @throws {Error} If size is negative or not an integer
     *
     * @example
     * const ProductFactory = new Factory<Product>((factory) => ({
     *     id: factory.string.uuid(),
     *     name: factory.commerce.productName(),
     *     price: factory.number.float({ min: 10, max: 100 }),
     * }));
     *
     * // Create 5 products
     * const products = ProductFactory.batch(5);
     *
     * // Create 3 products with the same category
     * const electronics = ProductFactory.batch(3, { category: 'Electronics' });
     *
     * // Create products with individual overrides
     * const customProducts = ProductFactory.batch(2, [
     *     { name: 'Special Product 1', price: 99.99 },
     *     { name: 'Special Product 2', price: 149.99 }
     * ]);
     */
    batch = (size: number, kwargs?: Partial<T> | Partial<T>[]): T[] => {
        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        if (kwargs) {
            const generator = this.iterate<Partial<T>>(
                Array.isArray(kwargs) ? kwargs : ([kwargs] as Partial<T>[]),
            );

            return new Array(size)
                .fill(null)
                .map((_, i) => this.#generate(i, generator.next().value, 0));
        }

        return new Array(size)
            .fill(null)
            .map((_, i) => this.#generate(i, undefined, 0));
    };
    /**
     * Adds a hook that will be executed before building the instance.
     *
     * @param hook. Function that takes partial parameters and returns partial parameters.
     * @param hook
     * @returns The current Factory instance.
     */
    beforeBuild(hook: BeforeBuildHook<T>): this {
        if (!isFunction(hook)) {
            throw new TypeError('Hook must be a function');
        }
        this.beforeBuildHooks.push(hook);
        return this;
    }

    /**
     * Generates a single instance of type T using the factory's schema.
     * Properties can be overridden by passing a partial object.
     *
     * @param kwargs Properties to override in the generated instance
     * @returns A new instance with factory-generated values merged with any overrides
     *
     * @example
     * const UserFactory = new Factory<User>((factory) => ({
     *     id: factory.string.uuid(),
     *     name: factory.person.fullName(),
     *     email: factory.internet.email(),
     * }));
     *
     * // Build with defaults
     * const user = UserFactory.build();
     *
     * // Build with overrides
     * const adminUser = UserFactory.build({
     *     email: 'admin@example.com'
     * });
     */
    build = (kwargs?: Partial<T>): T => {
        return this.#generate(0, kwargs, 0);
    };

    /**
     * Constructs an instance of T by applying hooks before and after construction.
     *
     * @param kwargs - Partial parameters for instance construction.
     * @returns A promise that resolves to a T instance.
     */
    async buildWithHooks(kwargs?: Partial<T>): Promise<T> {
        let params = kwargs ?? {};
        let result: T;

        for (const hook of this.beforeBuildHooks) {
            params = await hook(params);
        }

        result = this.build(params);

        for (const hook of this.afterBuildHooks) {
            result = await hook(result);
        }
        return result;
    }

    /**
     * Creates a new factory by merging this factory's schema with additional properties.
     * Composed properties can be static values or other factory instances.
     *
     * @template U The composed type (must extend the base type T)
     * @param composition Object mapping property names to values or factories
     * @returns A new factory that generates objects with combined properties
     *
     * @example
     * const UserFactory = new Factory<User>((factory) => ({
     *     name: factory.person.fullName(),
     *     email: factory.internet.email(),
     * }));
     *
     * const PostFactory = new Factory<Post>((factory) => ({
     *     title: factory.lorem.sentence(),
     *     content: factory.lorem.paragraph(),
     * }));
     *
     * const UserWithPostsFactory = UserFactory.compose({
     *     posts: PostFactory.batch(3),
     * });
     */
    compose<U extends T>(composition: FactoryComposition<U>): Factory<U> {
        return new Factory<U>(
            (_factory, iteration) => {
                const baseValues = this.factory(
                    this,
                    iteration,
                ) as FactorySchema<U>;
                const composedValues = Object.fromEntries(
                    Object.entries(composition).map(
                        ([key, value]) =>
                            [
                                key,
                                value instanceof Factory
                                    ? value.build()
                                    : value,
                            ] as [string, unknown],
                    ),
                );
                return { ...baseValues, ...composedValues } as FactorySchema<U>;
            },
            { maxDepth: this.maxDepth },
        );
    }

    /**
     * Creates a new factory that inherits from this factory's schema with modifications.
     * Unlike compose(), extend() provides access to the factory instance for dynamic property generation.
     *
     * @template U The extended type (must extend the base type T)
     * @param factoryFn Function that returns properties to merge with the base schema
     * @returns A new factory with inherited and extended properties
     *
     * @example
     * const BaseUserFactory = new Factory<BaseUser>((factory) => ({
     *     id: factory.datatype.uuid(),
     *     createdAt: factory.date.recent(),
     * }));
     *
     * const AdminUserFactory = BaseUserFactory.extend<AdminUser>((factory) => ({
     *     role: 'admin',
     *     permissions: ['read', 'write', 'delete'],
     * }));
     */
    extend<U extends T>(factoryFn: FactoryFunction<U>): Factory<U> {
        return new Factory<U>(
            (factory, iteration) => {
                const baseValues = this.factory(
                    this,
                    iteration,
                ) as FactorySchema<U>;
                const extendedValues = factoryFn(factory, iteration);
                return { ...baseValues, ...extendedValues };
            },
            { maxDepth: this.maxDepth },
        );
    }

    /**
     * Creates a generator that yields values from an iterable in sequential, cyclic order.
     * Values must be explicitly requested via the generator's next() method. When all values
     * have been yielded, the generator starts over from the beginning.
     *
     * @template T The type of elements in the iterable
     * @param iterable An iterable containing values to cycle through (must not be empty)
     * @returns A generator that yields values in order, restarting after the last element
     * @throws {Error} If the iterable is empty
     *
     * @example
     * const UserFactory = new Factory<User>((factory) => ({
     *     id: factory.string.uuid(),
     *     name: factory.person.fullName(),
     *     role: factory.iterate(['admin', 'user', 'moderator']),
     *     status: factory.iterate(['active', 'inactive']),
     * }));
     *
     * // Creates users with roles cycling through: admin, user, moderator, admin, user...
     * const users = UserFactory.batch(5);
     */
    iterate<T>(iterable: Iterable<T>): Generator<T, T, T> {
        const generator = new CycleGenerator(iterable);
        return generator.generate();
    }

    /**
     * Creates a generator that yields random values from an iterable without consecutive duplicates.
     * Each value is randomly selected with replacement, but the generator ensures the same value
     * is never returned twice in a row (unless the iterable contains only one element).
     *
     * @template T The type of elements in the iterable
     * @param iterable An iterable containing values to sample from (must not be empty)
     * @returns A generator that yields random values without consecutive repetition
     * @throws {Error} If the iterable is empty
     *
     * @example
     * const ProductFactory = new Factory<Product>((factory) => ({
     *     id: factory.string.uuid(),
     *     name: factory.commerce.productName(),
     *     category: factory.sample(['Electronics', 'Books', 'Clothing', 'Food']),
     *     color: factory.sample(['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White']),
     * }));
     *
     * // Creates products with random categories and colors (no consecutive duplicates)
     * const products = ProductFactory.batch(10);
     */
    sample<T>(iterable: Iterable<T>): Generator<T, T, T> {
        const generator = new SampleGenerator(iterable);
        return generator.generate();
    }

    /**
     * Creates a reference to a function call for lazy evaluation within factory definitions.
     * The function and its arguments are stored but not executed until the factory builds an object.
     * Essential for creating relationships between factories without causing infinite recursion.
     *
     * @template C The function type
     * @param handler The function to call during object generation
     * @param args Arguments to pass to the function when called
     * @returns A reference that will execute the function during build
     *
     * @example
     * const PostFactory = new Factory<Post>((factory) => ({
     *     id: factory.string.uuid(),
     *     title: factory.lorem.sentence(),
     *     content: factory.lorem.paragraphs(3),
     * }));
     *
     * const UserFactory = new Factory<User>((factory) => ({
     *     id: factory.string.uuid(),
     *     name: factory.person.fullName(),
     *     posts: factory.use(PostFactory.batch, 3),
     *     favoritePost: factory.use(PostFactory.build),
     * }));
     *
     * // Creates a user with 3 posts and a favorite post
     * const user = UserFactory.build();
     */
    use<R, A extends unknown[]>(handler: (...args: A) => R, ...args: A): R {
        return new Ref({ args, handler }) as R;
    }

    #generate(iteration: number, kwargs?: Partial<T>, depth = 0): T {
        if (depth >= this.maxDepth) {
            // Return null/undefined for nested factories when max depth is reached
            return null as T;
        }

        // Create a depth-limited version of this factory for nested calls
        const depthLimitedFactory = new Proxy(this, {
            get(target, prop) {
                if (prop === 'build') {
                    return (buildKwargs?: Partial<T>) =>
                        target.#generate(0, buildKwargs, depth + 1);
                }
                if (prop === 'batch') {
                    return (
                        size: number,
                        batchKwargs?: Partial<T> | Partial<T>[],
                    ) => {
                        if (depth + 1 >= target.maxDepth) {
                            return null;
                        }
                        if (!Number.isInteger(size) || size < 0) {
                            throw new Error(
                                'Batch size must be a non-negative integer',
                            );
                        }
                        if (size === 0) {
                            return [];
                        }
                        if (batchKwargs) {
                            const generator = target.iterate<Partial<T>>(
                                Array.isArray(batchKwargs)
                                    ? batchKwargs
                                    : ([batchKwargs] as Partial<T>[]),
                            );
                            return new Array(size)
                                .fill(null)
                                .map((_, i) =>
                                    target.#generate(
                                        i,
                                        generator.next().value,
                                        depth + 1,
                                    ),
                                );
                        }
                        return new Array(size)
                            .fill(null)
                            .map((_, i) =>
                                target.#generate(i, undefined, depth + 1),
                            );
                    };
                }
                return Reflect.get(target, prop);
            },
        });

        const defaults = this.factory(
            depthLimitedFactory as Factory<T>,
            iteration,
        );

        if (kwargs) {
            return merge(
                this.#parseValue(defaults),
                this.#parseValue(kwargs),
            ) as T;
        }

        return this.#parseValue(defaults) as T;
    }

    #parseValue(value: unknown): unknown {
        if (value instanceof Ref) {
            return value.callHandler();
        }

        if (isIterator(value)) {
            return (value as Iterator<unknown>).next().value;
        }

        if (isRecord(value)) {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(
                value as Record<string, unknown>,
            )) {
                result[key] = this.#parseValue(val);
            }
            return result;
        }

        return value;
    }
}
