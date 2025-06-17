/* eslint-disable unicorn/no-new-array */

import { en, Faker, LocaleDefinition, Randomizer } from '@faker-js/faker';
import {
    isAsyncFunction,
    isFunction,
    isIterator,
    isRecord,
} from '@tool-belt/type-predicates';
import { ConfigurationError } from './errors';
import { CycleGenerator, SampleGenerator } from './generators';
import { merge, Ref, validateBatchSize } from './utils';
import { DEFAULT_MAX_DEPTH } from './constants';

export {
    CircularReferenceError,
    ConfigurationError,
    ValidationError,
} from './errors';
export { Ref } from './utils';

export type AfterBuildHook<T> = (obj: T) => Promise<T> | T;

export type BeforeBuildHook<T> = (
    params: Partial<T>,
) => Partial<T> | Promise<Partial<T>>;

export interface CreateManyOptions<T> {
    adapter?: PersistenceAdapter<T>;
}

export interface CreateOptions<T> {
    adapter?: PersistenceAdapter<T>;
}

export type FactoryComposition<T> = {
    [K in keyof T]?: Factory<T[K]> | T[K];
};

export type FactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => FactorySchema<T> | Promise<FactorySchema<T>>;

export interface FactoryOptions {
    locale?: LocaleDefinition | LocaleDefinition[];
    maxDepth?: number;
    randomizer?: Randomizer;
}

export type FactorySchema<T> = {
    [K in keyof T]:
        | Generator<T[K], T[K], T[K]>
        | Ref<T[K], (...args: unknown[]) => T[K]>
        | T[K];
};

export type PartialFactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => Partial<FactorySchema<T>> | Promise<Partial<FactorySchema<T>>>;

/**
 * Interface for a persistence adapter.
 * Adapters are responsible for interacting with the underlying data store
 * (e.g., database, API) to save generated objects.
 */
export interface PersistenceAdapter<T, R = T> {
    /**
     * Persists a single generated object to the data store.
     *
     * @param data The object to persist.
     * @returns A promise that resolves with the persisted object,
     * including any properties assigned by the database (e.g., auto-generated IDs).
     */
    create(data: T): Promise<R>;

    /**
     * Persists multiple generated objects to the data store in a batch.
     *
     * @param data An array of objects to persist.
     * @returns A promise that resolves with an array of the persisted objects,
     * including any properties assigned by the database.
     */
    createMany(data: T[]): Promise<R[]>;
}

/**
 * A factory class for generating type-safe mock data by extending Faker.js functionality.
 * Provides methods for creating single instances, batches, and complex object compositions
 * with support for circular references through depth control and persistence.
 *
 * @template T - The type of objects this factory generates
 * @template O - The type of factory options
 */
export class Factory<
    T,
    O extends FactoryOptions = FactoryOptions,
    F extends
        | FactoryFunction<T>
        | PartialFactoryFunction<T> = FactoryFunction<T>,
> extends Faker {
    readonly options?: { maxDepth: number } & Omit<
        O,
        'locale' | 'maxDepth' | 'randomizer'
    >;
    protected afterBuildHooks: AfterBuildHook<T>[] = [];
    protected beforeBuildHooks: BeforeBuildHook<T>[] = [];
    protected readonly factory: F;
    private defaultAdapter?: PersistenceAdapter<T>;

    constructor(
        factory: F,
        { locale = en, randomizer, ...rest }: Partial<O> = {},
    ) {
        super({
            locale,
            randomizer,
        });

        this.factory = factory;
        this.options = {
            ...rest,
            maxDepth: rest.maxDepth ?? DEFAULT_MAX_DEPTH,
        } as {
            maxDepth: number;
        } & Omit<O, 'locale' | 'maxDepth' | 'randomizer'>;
    }

    /**
     * Adds a hook that will be executed after building the instance.
     * Hooks are executed in the order they were added and can be either synchronous or asynchronous.
     * This method returns the factory instance for method chaining.
     *
     * @param hook Function that receives the built instance and returns the modified instance
     * @returns The current Factory instance for method chaining
     */
    afterBuild(hook: AfterBuildHook<T>): this {
        if (!isFunction(hook) && !isAsyncFunction(hook)) {
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
     */
    batch = (size: number, kwargs?: Partial<T> | Partial<T>[]): T[] => {
        if (isAsyncFunction(this.factory)) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        let results: T[];
        if (kwargs) {
            const generator = this.iterate<Partial<T>>(
                Array.isArray(kwargs) ? kwargs : ([kwargs] as Partial<T>[]),
            );

            results = new Array(size)
                .fill(null)
                .map((_, i) =>
                    this.#generate(i, generator.next().value, 0),
                ) as T[];
        } else {
            results = new Array(size)
                .fill(null)
                .map((_, i) => this.#generate(i, undefined, 0)) as T[];
        }

        if (results.some((result) => result instanceof Promise)) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        return results;
    };

    /**
     * Creates multiple instances asynchronously, allowing use of async factory functions.
     * This method supports both synchronous and asynchronous factory functions and hooks.
     *
     * @param size Number of instances to generate (must be non-negative integer)
     * @param kwargs Either a single partial object (applied to all) or an array of partials (one per instance)
     * @returns Promise that resolves to an array of generated instances
     * @throws {Error} If size is negative or not an integer
     *
     * @example
     * ```typescript
     * const UserFactory = new Factory<User>(async (factory) => ({
     *   id: factory.string.uuid(),
     *   email: factory.internet.email(),
     *   apiKey: await generateApiKey() // async operation
     * }));
     *
     * const users = await UserFactory.batchAsync(5);
     * ```
     */
    async batchAsync(
        size: number,
        kwargs?: Partial<T> | Partial<T>[],
    ): Promise<F extends FactoryFunction<T> ? T[] : Partial<T>[]> {
        return this.#batchAsync(size, kwargs, 0);
    }

    /**
     * Adds a hook that will be executed before building the instance.
     * Hooks receive the partial parameters (kwargs) and can modify them before the instance is built.
     * Multiple hooks are executed in the order they were added.
     *
     * @param hook Function that receives partial parameters and returns modified parameters
     * @returns The current Factory instance for method chaining
     */
    beforeBuild(hook: BeforeBuildHook<T>): this {
        if (!isFunction(hook) && !isAsyncFunction(hook)) {
            throw new TypeError('Hook must be a function');
        }
        this.beforeBuildHooks.push(hook);
        return this;
    }

    /**
     * Generates a single instance of type T using the factory's schema.
     * Properties can be overridden by passing a partial object.
     * Synchronous hooks are automatically applied if registered.
     * If async hooks are registered, a ConfigurationError is thrown.
     *
     * @param kwargs Properties to override in the generated instance
     * @returns A new instance with factory-generated values merged with any overrides
     * @throws {ConfigurationError} If async hooks are registered
     */
    build = (
        kwargs?: Partial<T>,
    ): F extends FactoryFunction<T> ? T : Partial<T> => {
        if (isAsyncFunction(this.factory)) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        const hasAsyncHooks =
            this.beforeBuildHooks.some((hook) => isAsyncFunction(hook)) ||
            this.afterBuildHooks.some((hook) => isAsyncFunction(hook));

        if (hasAsyncHooks) {
            throw new ConfigurationError(
                'Async hooks detected. Use buildAsync() method to build instances with async hooks.',
            );
        }

        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = hook(params) as Partial<T>;
        }

        let result = this.#generate(0, params, 0);

        if (result instanceof Promise) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        for (const hook of this.afterBuildHooks) {
            result = hook(result) as T;
        }

        return result;
    };

    /**
     * Builds an instance asynchronously with all registered hooks applied in sequence.
     * This method supports both synchronous and asynchronous hooks.
     * Hooks are executed in the order they were registered.
     *
     * @param kwargs Optional properties to override in the generated instance
     * @returns A promise that resolves to the built and processed instance
     * @throws {Error} If any hook throws an error during execution
     */
    async buildAsync(
        kwargs?: Partial<T>,
    ): Promise<F extends FactoryFunction<T> ? T : Partial<T>> {
        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = await hook(params);
        }

        let result = await this.#generateAsync(0, params, 0);

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
     */
    compose<U extends T>(composition: FactoryComposition<U>): Factory<U> {
        return new Factory<U>(
            isAsyncFunction(this.factory)
                ? async (factory, iteration) => {
                      const baseValues = (await this.factory(
                          factory as unknown as Factory<T>,
                          iteration,
                      )) as unknown as FactorySchema<U>;
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
                      return {
                          ...baseValues,
                          ...composedValues,
                      } as FactorySchema<U>;
                  }
                : (factory, iteration) => {
                      const baseValues = this.factory(
                          factory as unknown as Factory<T>,
                          iteration,
                      ) as unknown as FactorySchema<U>;
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
                      return {
                          ...baseValues,
                          ...composedValues,
                      } as FactorySchema<U>;
                  },
            {
                maxDepth: this.options?.maxDepth ?? DEFAULT_MAX_DEPTH,
                ...this.options,
            } as Partial<O>,
        );
    }

    /**
     * Creates and persists a single instance using the factory's schema.
     * Uses the configured persistence adapter if available.
     *
     * @param kwargs Optional properties to override in the generated instance
     * @param options Options including an optional persistence adapter
     * @returns Promise that resolves with the persisted instance
     * @throws {ConfigurationError} If no persistence adapter is configured
     *
     * @example
     * ```typescript
     * // With default adapter
     * const userFactory = new Factory<User>((faker) => ({
     *   email: faker.internet.email(),
     *   name: faker.person.fullName()
     * })).withAdapter(mongooseAdapter);
     *
     * const user = await userFactory.create({ name: 'John' });
     *
     * // With adapter in options
     * const user2 = await userFactory.create(
     *   { name: 'Jane' },
     *   { adapter: prismaAdapter }
     * );
     * ```
     */
    async create(kwargs?: Partial<T>, options?: CreateOptions<T>): Promise<T> {
        const adapter = options?.adapter ?? this.defaultAdapter;
        if (!adapter) {
            throw new ConfigurationError(
                'No persistence adapter configured. Provide an adapter in options or set a default adapter.',
            );
        }

        const instance = await this.buildAsync(kwargs);
        return adapter.create(instance as T);
    }

    /**
     * Creates and persists multiple instances in a batch operation.
     * Uses the configured persistence adapter if available.
     *
     * @param size Number of instances to create and persist
     * @param kwargs Optional overrides for the instances
     * @param options Options including an optional persistence adapter
     * @returns Promise that resolves with the persisted instances
     * @throws {ConfigurationError} If no persistence adapter is configured
     *
     * @example
     * ```typescript
     * // Create 5 users with default adapter
     * const users = await userFactory.createMany(5);
     *
     * // With individual overrides
     * const users2 = await userFactory.createMany(3, [
     *   { role: 'admin' },
     *   { role: 'user' },
     *   { role: 'guest' }
     * ]);
     *
     * // With adapter in options
     * const users3 = await userFactory.createMany(
     *   10,
     *   undefined,
     *   { adapter: typeormAdapter }
     * );
     * ```
     */
    async createMany(
        size: number,
        kwargs?: Partial<T> | Partial<T>[],
        options?: CreateManyOptions<T>,
    ): Promise<T[]> {
        const adapter = options?.adapter ?? this.defaultAdapter;
        if (!adapter) {
            throw new ConfigurationError(
                'No persistence adapter configured. Provide an adapter in options or set a default adapter.',
            );
        }

        const instances = await (isAsyncFunction(this.factory)
            ? this.#batchAsync(size, kwargs, 0)
            : this.#batch(this as unknown as Factory<T>, size, kwargs, 0));
        return adapter.createMany(instances as T[]);
    }

    /**
     * Creates a new factory that inherits from this factory's schema with modifications.
     * Unlike compose(), extend() provides access to the factory instance for dynamic property generation.
     *
     * @template U The extended type (must extend the base type T)
     * @param factoryFn Function that returns properties to merge with the base schema
     * @returns A new factory with inherited and extended properties
     */
    extend<U extends T>(factoryFn: FactoryFunction<U>): Factory<U> {
        return new Factory<U>(
            (factory, iteration) => {
                const baseValues = this.factory(
                    factory as unknown as Factory<T>,
                    iteration,
                ) as unknown as FactorySchema<U>;
                const extendedValues = factoryFn(factory, iteration);
                if (
                    extendedValues instanceof Promise ||
                    baseValues instanceof Promise
                ) {
                    return Promise.resolve(baseValues).then((base) =>
                        Promise.resolve(extendedValues).then((extended) => ({
                            ...base,
                            ...extended,
                        })),
                    ) as Promise<FactorySchema<U>>;
                }
                return { ...baseValues, ...extendedValues };
            },
            {
                maxDepth: this.options?.maxDepth ?? DEFAULT_MAX_DEPTH,
                ...this.options,
            } as Partial<O>,
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
     */
    iterate<T>(iterable: Iterable<T>): Generator<T, T, T> {
        const generator = new CycleGenerator(iterable);
        return generator.generate();
    }

    /**
     * Creates a new factory where all properties are optional (Partial<T>).
     * This is useful for creating test data where only specific fields need to be set.
     *
     * @returns A new factory that produces Partial<T> objects
     */
    partial(): Factory<Partial<T>> {
        return new Factory<Partial<T>>(
            (factory, iteration) => {
                const fullValues = this.factory(
                    factory as unknown as Factory<T>,
                    iteration,
                );
                if (fullValues instanceof Promise) {
                    return fullValues as Promise<FactorySchema<Partial<T>>>;
                }
                return fullValues as FactorySchema<Partial<T>>;
            },
            {
                maxDepth: this.options?.maxDepth ?? DEFAULT_MAX_DEPTH,
                ...this.options,
            } as Partial<O>,
        );
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
     */
    use<R, A extends unknown[]>(handler: (...args: A) => R, ...args: A): R {
        return new Ref({ args, handler }) as R;
    }

    /**
     * Sets the default persistence adapter for this factory instance.
     *
     * @param adapter The persistence adapter to use as default
     * @returns The current Factory instance for method chaining
     *
     * @example
     * ```typescript
     * import { MongooseAdapter } from './adapters/mongoose-adapter';
     *
     * const userFactory = new Factory<User>((faker) => ({
     *   id: faker.string.uuid(),
     *   email: faker.internet.email(),
     *   name: faker.person.fullName()
     * }));
     *
     * // Set default adapter
     * const factoryWithDb = userFactory.withAdapter(
     *   new MongooseAdapter(UserModel)
     * );
     *
     * // Now all create/createMany calls will use this adapter
     * const user = await factoryWithDb.create();
     * const users = await factoryWithDb.createMany(5);
     * ```
     */
    withAdapter(adapter: PersistenceAdapter<T>): this {
        this.defaultAdapter = adapter;
        return this;
    }

    /**
     * @internal
     * @param depth - Current depth in recursive generation
     * @param isAsync - Whether to create async handlers
     * @returns Depth-limited proxy factory for recursive generation
     */
    protected createDepthLimitedProxy(
        depth: number,
        isAsync: boolean,
    ): Factory<T> {
        return new Proxy(this, {
            get: (target: Factory<T, O, F>, prop: string | symbol) => {
                if (prop === 'build') {
                    return isAsync
                        ? (buildKwargs?: Partial<T>) =>
                              target.#generateAsync(0, buildKwargs, depth + 1)
                        : (buildKwargs?: Partial<T>) =>
                              target.#generate(0, buildKwargs, depth + 1);
                }
                if (prop === 'batch') {
                    return isAsync
                        ? (
                              size: number,
                              batchKwargs?: Partial<T> | Partial<T>[],
                          ) => target.#batchAsync(size, batchKwargs, depth)
                        : (
                              size: number,
                              batchKwargs?: Partial<T> | Partial<T>[],
                          ) =>
                              target.#batch(
                                  target as unknown as Factory<T>,
                                  size,
                                  batchKwargs,
                                  depth,
                              );
                }
                return Reflect.get(target, prop) as unknown;
            },
        }) as Factory<T>;
    }

    /**
     * @internal
     * @param depth - Current depth in recursive generation
     * @returns True if depth exceeds maximum allowed depth
     */
    protected isDepthExceeded(depth: number): boolean {
        return depth >= (this.options?.maxDepth ?? DEFAULT_MAX_DEPTH);
    }

    #batch(
        target: Factory<T>,
        size: number,
        batchKwargs: Partial<T> | Partial<T>[] | undefined,
        depth: number,
    ): T[] {
        if (this.isDepthExceeded(depth + 1)) {
            return null as unknown as T[];
        }
        validateBatchSize(size);
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
                    target.#generate(i, generator.next().value, depth + 1),
                ) as T[];
        }
        return new Array(size)
            .fill(null)
            .map((_, i) => target.#generate(i, undefined, depth + 1)) as T[];
    }

    async #batchAsync(
        size: number,
        batchKwargs: Partial<T> | Partial<T>[] | undefined,
        depth: number,
    ): Promise<F extends FactoryFunction<T> ? T[] : Partial<T>[]> {
        if (this.isDepthExceeded(depth + 1)) {
            return null as unknown as T[];
        }
        validateBatchSize(size);

        if (size === 0) {
            return [];
        }
        if (batchKwargs) {
            const generator = this.iterate<Partial<T>>(
                Array.isArray(batchKwargs)
                    ? batchKwargs
                    : ([batchKwargs] as Partial<T>[]),
            );
            const promises = new Array(size)
                .fill(null)
                .map((_, i) =>
                    this.#generateAsync(i, generator.next().value, depth + 1),
                );
            return Promise.all(promises);
        }

        const promises = new Array(size)
            .fill(null)
            .map((_, i) => this.#generateAsync(i, undefined, depth + 1));

        return Promise.all(promises);
    }

    #generate(
        iteration: number,
        kwargs?: Partial<T>,
        depth = 0,
    ): Promise<T> | T {
        if (this.isDepthExceeded(depth)) {
            return null as T;
        }

        const depthLimitedFactory = this.createDepthLimitedProxy(depth, false);
        const defaults = this.factory(depthLimitedFactory, iteration);

        if (kwargs) {
            return merge(
                this.#parseValue(defaults),
                this.#parseValue(kwargs),
            ) as T;
        }

        return this.#parseValue(defaults) as T;
    }

    async #generateAsync(
        iteration: number,
        kwargs?: Partial<T>,
        depth = 0,
    ): Promise<T> {
        if (this.isDepthExceeded(depth)) {
            return null as T;
        }

        const depthLimitedFactory = this.createDepthLimitedProxy(depth, true);
        const defaults = await this.factory(depthLimitedFactory, iteration);

        if (kwargs) {
            return merge(
                await this.#parseValueAsync(defaults),
                await this.#parseValueAsync(kwargs),
            ) as T;
        }

        return (await this.#parseValueAsync(defaults)) as T;
    }

    #parseValue(value: unknown): unknown {
        if (value instanceof Ref) {
            return value.callHandler();
        }

        if (isIterator(value)) {
            return (value as Iterator<unknown>).next().value;
        }

        if (isRecord(value)) {
            const result: Record<string | symbol, unknown> = {};

            for (const [key, val] of Object.entries(
                value as Record<string, unknown>,
            )) {
                result[key] = this.#parseValue(val);
            }

            for (const sym of Object.getOwnPropertySymbols(value)) {
                result[sym] = this.#parseValue(
                    (value as Record<symbol, unknown>)[sym],
                );
            }

            return result;
        }

        return value;
    }

    async #parseValueAsync(value: unknown): Promise<unknown> {
        if (value instanceof Ref) {
            return value.callHandler();
        }

        if (isIterator(value)) {
            return (value as Iterator<unknown>).next().value;
        }

        if (isRecord(value)) {
            const result: Record<string | symbol, unknown> = {};

            for (const [key, val] of Object.entries(
                value as Record<string, unknown>,
            )) {
                result[key] = await this.#parseValueAsync(val);
            }

            for (const sym of Object.getOwnPropertySymbols(value)) {
                result[sym] = await this.#parseValueAsync(
                    (value as Record<symbol, unknown>)[sym],
                );
            }

            return result;
        }

        return value;
    }
}
