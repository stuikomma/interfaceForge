import { Factory, FactorySchema } from './index';

export type PartialFactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => Partial<FactorySchema<T>> | Promise<Partial<FactorySchema<T>>>;
