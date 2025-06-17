import type { Factory, FactorySchema } from './index';

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
