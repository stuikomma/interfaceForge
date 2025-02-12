import { isRecord } from '@tool-belt/type-predicates';

import { ERROR_MESSAGES } from '../constants';
import { BuildArgProxy, DerivedValueProxy } from '../type-factory';
import { FactorySchema } from '../types';

function recursiveValidate(
    obj: Record<string, any>,
    cls: any,
    parent = '',
): string[] {
    const mappedKeys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof cls) {
            mappedKeys.push(parent ? `${parent}.${key}` : key);
        } else if (isRecord(value)) {
            mappedKeys.push(...recursiveValidate(value, cls, key));
        }
    }
    return mappedKeys;
}

export function validateFactorySchema<T extends FactorySchema<any>>(
    schema: T,
): T {
    const missingValues = recursiveValidate(schema, BuildArgProxy);
    if (missingValues.length) {
        throw new Error(
            ERROR_MESSAGES.MISSING_BUILD_ARGS.replace(
                ':missingArgs',
                missingValues.join(', '),
            ),
        );
    }
    return schema;
}

export function validateFactoryResult<T>(factoryResult: T): T {
    const missingValues = recursiveValidate(factoryResult, DerivedValueProxy);
    if (missingValues.length) {
        throw new Error(
            ERROR_MESSAGES.MISSING_DERIVED_PARAMETERS.replace(
                ':missingValues',
                missingValues.join(', '),
            ),
        );
    }
    return factoryResult;
}
