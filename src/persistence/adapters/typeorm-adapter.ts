import { PersistenceAdapter } from '../persistence-adapter';

/**
 * A persistence adapter for TypeORM, allowing `Factory` to save generated
 * objects to a database via a TypeORM Repository.
 *
 * @template T The type of the TypeORM entity.
 */
export class TypeORMAdapter<T extends object> implements PersistenceAdapter<T> {
    /**
     * @param repository The TypeORM Repository (e.g., `AppDataSource.getRepository(User)`).
     * Using `any` here for flexibility, but you could define
     * a more specific TypeORM `Repository<T>` type if needed.
     */
    constructor(private readonly repository: any) {} // eslint-disable-line @typescript-eslint/no-explicit-any

    /**
     * Persists a single TypeORM entity.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the saved TypeORM entity.
     */
    async create(data: T): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await this.repository.save(data);
    }

    /**
     * Persists multiple TypeORM entities in a batch.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with an array of the saved TypeORM entities.
     */
    async createMany(data: T[]): Promise<T[]> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await this.repository.save(data);
    }
}
