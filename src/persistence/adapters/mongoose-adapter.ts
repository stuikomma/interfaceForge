import { PersistenceAdapter } from '../persistence-adapter';

/**
 * A persistence adapter for Mongoose, allowing `Factory` to save generated
 * objects to a MongoDB database via a Mongoose Model.
 *
 * @template T The type of the Mongoose document.
 */
export class MongooseAdapter<T> implements PersistenceAdapter<T> {
    /**
     * @param model The Mongoose Model (e.g., `UserModel`).
     * Using `any` here as Mongoose Model types can be complex and
     * depend on your schema definition. For stricter typing, you
     * might define a `MongooseModel<T>` interface.
     */
    constructor(private readonly model: any) {} // eslint-disable-line @typescript-eslint/no-explicit-any

    /**
     * Persists a single Mongoose document.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the saved Mongoose document.
     */
    async create(data: T): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await this.model.create(data);
    }

    /**
     * Persists multiple Mongoose documents in a batch.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with an array of the saved Mongoose documents.
     */
    async createMany(data: T[]): Promise<T[]> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await this.model.insertMany(data);
    }
}
