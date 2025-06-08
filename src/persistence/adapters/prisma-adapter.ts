import { PersistenceAdapter } from '../persistence-adapter';

/**
 * A persistence adapter for Prisma, allowing `Factory` to save generated
 * objects to a database via a Prisma client model.
 *
 * @template T The type of the Prisma model.
 */
export class PrismaAdapter<T> implements PersistenceAdapter<T> {
    /**
     * @param model The Prisma client model (e.g., `prisma.user`).
     * Using `any` here as Prisma model types are generated dynamically
     * and can be complex. For stricter typing, you might define
     * a generic `PrismaModel<T>` type based on Prisma's generated types.
     */
    constructor(private readonly model: any) {} // eslint-disable-line @typescript-eslint/no-explicit-any

    /**
     * Persists a single Prisma record.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the created Prisma record.
     */
    async create(data: T): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await this.model.create({ data });
    }

    /**
     * Persists multiple Prisma records in a batch.
     * Note: Prisma's `createMany` typically returns a count of records created,
     * not the actual created records. If you need the full records, you'd
     * need to fetch them after `createMany` or use individual `create` calls.
     * This implementation attempts to return the input data for now.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with the count of created records for Prisma's `createMany`,
     * or the input data if returning actual records is needed (and not supported by `createMany`).
     */
    async createMany(data: T[]): Promise<T[]> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.model.createMany({ data });
        return data;
    }
}
