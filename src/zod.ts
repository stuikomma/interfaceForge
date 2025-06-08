import { z } from 'zod/v4';
import type { $ZodType } from 'zod/v4/core';
import {
    Factory,
    type FactoryFunction,
    type FactoryOptions,
    type FactorySchema,
} from './index';
import { isObject } from '@tool-belt/type-predicates';

export interface ZodFactoryConfig extends FactoryOptions {
    /**
     * Current depth (internal use)
     */
    _currentDepth?: number;
    /**
     * Custom generators for specific schema descriptions
     */
    customGenerators?: Record<string, () => unknown>;
    /**
     * Maximum depth for recursive schemas
     */
    maxDepth?: number;
}

/**
 * Type for custom Zod type handlers
 */
export type ZodTypeHandler = (
    schema: $ZodType,
    factory: Factory<unknown>,
    config: ZodFactoryConfig,
) => unknown;

/**
 * Registry for custom Zod type handlers
 */
class ZodTypeRegistry {
    private handlers = new Map<string, ZodTypeHandler>();

    clear(): void {
        this.handlers.clear();
    }

    /**
     * Get a handler for a Zod type
     *
     * @param typeName The name/identifier of the Zod type
     * @returns The handler function or undefined if not found
     */
    get(typeName: string): undefined | ZodTypeHandler {
        return this.handlers.get(typeName);
    }

    /**
     * Get all registered type names
     *
     * @returns Array of registered type names
     */
    getRegisteredTypes(): string[] {
        return [...this.handlers.keys()];
    }

    /**
     * Check if a handler exists for a Zod type
     *
     * @param typeName The name/identifier of the Zod type
     * @returns True if handler exists
     */
    has(typeName: string): boolean {
        return this.handlers.has(typeName);
    }

    /**
     * Register a custom handler for a Zod type
     *
     * @param typeName The name/identifier of the Zod type (e.g., 'ZodBigInt', 'ZodNaN')
     * @param handler Function that generates mock data for this type
     */
    register(typeName: string, handler: ZodTypeHandler): void {
        this.handlers.set(typeName, handler);
    }

    /**
     * Remove a handler for a Zod type
     *
     * @param typeName The name/identifier of the Zod type
     * @returns True if the handler was removed, false otherwise
     */
    unregister(typeName: string): boolean {
        return this.handlers.delete(typeName);
    }
}

/**
 * Global registry instance
 */
const zodTypeRegistry = new ZodTypeRegistry();

/**
 * A Factory class that extends the base Factory to work with Zod schemas
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ZodFactory<T extends $ZodType<any, any, any>> extends Factory<
    z.output<T>
> {
    private readonly schema: T & {
        parse: (data: Record<string, unknown>) => z.output<T>;
    };
    private readonly zodConfig: ZodFactoryConfig;

    constructor(schema: T, config?: ZodFactoryConfig) {
        const { ...factoryOptions } = config ?? {};

        const factoryFunction: FactoryFunction<z.output<T>> = () => {
            return {} as FactorySchema<z.output<T>>;
        };

        super(factoryFunction, factoryOptions);

        this.schema = schema as T & {
            parse: (data: Record<string, unknown>) => z.output<T>;
        };
        this.zodConfig = config ?? {};
    }

    /**
     * Override the batch method to generate multiple values
     *
     * @param size Number of instances to generate
     * @param kwargs Optional partial values to override (single object or array)
     * @returns Array of generated values
     */
    batch = (size: number, kwargs?: Partial<z.output<T>> | Partial<z.output<T>>[]) => {
        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        if (kwargs) {
            const overrides = Array.isArray(kwargs) ? kwargs : [kwargs];

            return Array.from({ length: size }, (_, i) =>
                this.generate(i, overrides[i % overrides.length]),
            );
        }

        return Array.from({ length: size }, (_, i) => this.generate(i));
    };

    /**
     * Override the build method to generate values directly from Zod schema
     *
     * @param kwargs Optional partial values to override
     * @returns Generated value that conforms to the Zod schema
     */
    build = (kwargs?: Partial<z.output<T>>): z.output<T> => {
        return this.generate(0, kwargs);
    };

    /**
     * Builds an instance asynchronously with all registered hooks applied in sequence.
     * Validates the result against the Zod schema.
     *
     * @param kwargs Optional properties to override in the generated instance
     * @returns A promise that resolves to the built and validated instance
     */
    async buildAsync(kwargs?: Partial<z.output<T>>) {
        const result = await super.buildAsync(kwargs);

        return this.schema.parse(result);
    }

    /**
     * Generates a factory schema (with generators) that conforms to a Zod schema
     *
     * @param schema The Zod schema to generate data for
     * @param config Configuration for the factory
     * @returns Generated value conforming to the schema
     */
    public generateFactorySchema(
        schema: $ZodType,
        config: ZodFactoryConfig,
    ): unknown {
        const currentDepth = config._currentDepth ?? 0;
        const maxDepth = config.maxDepth ?? 5;

        if (currentDepth >= maxDepth) {
            if (schema instanceof z.ZodOptional) {
                return undefined;
            }
            if (schema instanceof z.ZodArray) {
                return [];
            }
            if (schema instanceof z.ZodString) {
                const stringSchema = schema;
                if (stringSchema._zod.def.checks) {
                    for (const check of stringSchema._zod.def.checks) {
                        if ((check as any).check === 'uuid') {
                            return this.string.uuid();
                        }
                        if ((check as any).check === 'email') {
                            return this.internet.email();
                        }
                    }
                }

                return '';
            }
            if (schema instanceof z.ZodNumber) {
                return 0;
            }
            if (schema instanceof z.ZodObject) {
                return {};
            }

            if (schema.constructor.name === 'ZodLazy') {
                return { id: this.string.uuid() };
            }
        }

        const newConfig: ZodFactoryConfig = {
            ...config,
            _currentDepth: currentDepth + 1,
        };

        const description = (schema._zod as any).description as string | undefined;

        if (description && config.customGenerators?.[description]) {
            return config.customGenerators[description]();
        }

        const typeName = schema.constructor.name;
        if (zodTypeRegistry.has(typeName)) {
            const handler = zodTypeRegistry.get(typeName)!;
            return handler(
                schema,
                this as unknown as Factory<unknown>,
                newConfig,
            );
        }

        if (schema instanceof z.ZodString) {
            return this.generateStringGenerator(schema);
        }

        if (schema instanceof z.ZodNumber) {
            return this.generateNumberGenerator(schema);
        }

        if (schema instanceof z.ZodBoolean) {
            return this.datatype.boolean();
        }

        if (schema instanceof z.ZodDate) {
            return this.date.recent();
        }

        if (schema instanceof z.ZodNull) {
            return null;
        }

        if (schema instanceof z.ZodUndefined) {
            return undefined;
        }

        if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
            return this.lorem.word();
        }

        if (schema instanceof z.ZodLiteral) {
            return schema._zod.def.values[0];
        }

        if (schema instanceof z.ZodEnum) {
            const entries = schema._zod.def.entries;
            const values = Object.values(entries);
            return this.helpers.arrayElement(values);
        }

        if (schema instanceof z.ZodTuple) {
            const { items, rest } = schema._zod.def;

            const result = items.map((itemSchema: $ZodType) =>
                this.generateFactorySchema(itemSchema, newConfig),
            );

            if (rest) {
                const restCount = this.number.int({ max: 3, min: 0 });
                for (let i = 0; i < restCount; i++) {
                    result.push(this.generateFactorySchema(rest, newConfig));
                }
            }

            return result;
        }

        if (schema instanceof z.ZodMap) {
            const { keyType, valueType } = schema._zod.def;

            const map = new Map();
            const size = this.number.int({ max: 5, min: 1 });

            for (let i = 0; i < size; i++) {
                const key = this.generateFactorySchema(keyType, newConfig);
                const value = this.generateFactorySchema(valueType, newConfig);
                map.set(key, value);
            }

            return map;
        }

        if (schema instanceof z.ZodSet) {
            const { valueType } = schema._zod.def;

            const set = new Set();
            const size = this.number.int({ max: 5, min: 1 });

            for (let i = 0; i < size; i++) {
                const value = this.generateFactorySchema(valueType, newConfig);
                set.add(value);
            }

            return set;
        }

        if ('brand' in schema._zod.def) {
            return this.generateFactorySchema(schema, newConfig);
        }

        if (schema instanceof z.ZodDefault) {
            return this.generateFactorySchema(schema._zod.def.innerType, newConfig);
        }

        if (schema instanceof z.ZodCatch) {
            return this.generateFactorySchema(schema._zod.def.innerType, newConfig);
        }

        if (schema instanceof z.ZodUnion) {
            const randomOption = this.helpers.arrayElement(
                schema._zod.def.options as $ZodType[],
            );
            return this.generateFactorySchema(randomOption, newConfig);
        }

        if (schema instanceof z.ZodDiscriminatedUnion) {
            const options = schema._zod.def.options;
            const optionsArray = Array.isArray(options) ? options : Object.values(options);
            const randomOption = this.helpers.arrayElement(optionsArray);
            return this.generateFactorySchema(randomOption, newConfig);
        }

        if (schema instanceof z.ZodIntersection) {
            const leftResult = this.generateFactorySchema(
                schema._zod.def.left,
                newConfig,
            );
            const rightResult = this.generateFactorySchema(
                schema._zod.def.right,
                newConfig,
            );

            if (
                typeof leftResult === 'object' &&
                leftResult !== null &&
                typeof rightResult === 'object' &&
                rightResult !== null
            ) {
                return { ...leftResult, ...rightResult };
            }
            return leftResult;
        }

        if (schema instanceof z.ZodOptional) {
            if (this.datatype.boolean({ probability: 0.7 })) {
                return this.generateFactorySchema(
                    schema._zod.def.innerType,
                    newConfig,
                );
            }
            return undefined;
        }

        if (schema instanceof z.ZodNullable) {
            if (this.datatype.boolean({ probability: 0.8 })) {
                return this.generateFactorySchema(
                    schema._zod.def.innerType,
                    newConfig,
                );
            }
            return null;
        }

        if (schema instanceof z.ZodArray) {
            const itemSchema = schema._zod.def.element || schema._zod.def.type;

            let minLength = 0;
            let maxLength = 10;
            let hasMinConstraint = false;
            let hasMaxConstraint = false;

            // Array length constraints are in checks in Zod v4

            const checks = schema._zod.def.checks as
                | { kind: string; value?: number }[]
                | undefined;
            if (checks) {
                for (const check of checks) {
                    const checkKind = check.kind;
                    const checkValue = check.value;

                    if (checkKind === 'min' && typeof checkValue === 'number') {
                        minLength = checkValue;
                        hasMinConstraint = true;
                    } else if (
                        checkKind === 'max' &&
                        typeof checkValue === 'number'
                    ) {
                        maxLength = checkValue;
                        hasMaxConstraint = true;
                    } else if (
                        checkKind === 'length' &&
                        typeof checkValue === 'number'
                    ) {
                        minLength = maxLength = checkValue;
                        hasMinConstraint = hasMaxConstraint = true;
                    }
                }
            }

            if (hasMinConstraint && !hasMaxConstraint) {
                maxLength = Math.max(maxLength, minLength + 5);
            }
            if (hasMaxConstraint && !hasMinConstraint) {
                minLength = 0;
            }

            if (minLength > maxLength) {
                maxLength = minLength;
            }

            const length = this.number.int({
                max: maxLength,
                min: minLength,
            });

            return Array.from({ length }, () =>
                this.generateFactorySchema(itemSchema as $ZodType, newConfig),
            );
        }

        if (schema instanceof z.ZodObject) {
            const result: Record<string, unknown> = {};

            for (const [key, fieldSchema] of Object.entries(schema._zod.def.shape)) {
                result[key] = this.generateFactorySchema(
                    fieldSchema as $ZodType,
                    newConfig,
                );
            }

            return result;
        }

        if (schema instanceof z.ZodRecord) {
            const valueSchema = schema._zod.def.valueType;
            const keySchema = schema._zod.def.keyType as $ZodType | undefined;

            const numKeys = this.number.int({ max: 3, min: 1 });
            const result: Record<string, unknown> = {};

            for (let i = 0; i < numKeys; i++) {
                const key = keySchema
                    ? String(this.generateFactorySchema(keySchema, newConfig))
                    : this.lorem.word();
                result[key] = this.generateFactorySchema(
                    valueSchema,
                    newConfig,
                );
            }

            return result;
        }

        if (schema instanceof z.ZodTransform || schema instanceof z.ZodPipe) {
            if (schema instanceof z.ZodPipe && schema._zod.def.in) {
                return this.generateFactorySchema(schema._zod.def.in, newConfig);
            }
            
            if (schema instanceof z.ZodTransform) {
                // For transform, generate from the input schema if available
                const innerSchema = (schema._zod.def as any).innerType || (schema._zod.def as any).schema;
                if (innerSchema) {
                    return this.generateFactorySchema(innerSchema, newConfig);
                }
            }
        }

        if (typeName.includes('Object')) {
            return {};
        }
        if (typeName.includes('Array')) {
            return [];
        }
        if (typeName.includes('Number')) {
            return 0;
        }
        if (typeName.includes('Boolean')) {
            return false;
        }

        return this.lorem.word();
    }

    /**
     * Override the generate method to work with Zod schemas
     *
     * @param _iteration Iteration number (unused)
     * @param kwargs Optional partial values to override
     * @returns Generated value that conforms to the Zod schema
     */
    protected generate(_iteration: number, kwargs?: Partial<z.output<T>>): z.output<T> {
        const generated = this.generateFactorySchema(
            this.schema,
            this.zodConfig,
        );

        if (isObject(kwargs) && isObject(generated)) {
            return this.schema.parse({
                ...generated,
                ...kwargs,
            });
        }

        return this.schema.parse(generated as Record<string, unknown>);
    }

    private generateNumberGenerator(schema: z.ZodNumber): number {
        const checks = schema._zod.def.checks as
            | { inclusive?: boolean; kind: string; value?: number }[]
            | undefined;

        let min: number | undefined;
        let max: number | undefined;
        let isInt = false;
        let isPositive = false;
        let isNegative = false;
        let isNonNegative = false;
        let isNonPositive = false;
        let isFinite = false;
        let isSafe = false;
        let step: number | undefined;

        if (checks) {
            for (const check of checks) {
                const checkKind = check.kind;
                const checkValue = check.value;

                switch (checkKind) {
                    case 'finite': {
                        isFinite = true;
                        break;
                    }
                    case 'int': {
                        isInt = true;
                        break;
                    }
                    case 'max': {
                        max = checkValue;
                        break;
                    }
                    case 'min': {
                        min = checkValue;
                        break;
                    }
                    case 'multipleOf': {
                        step = checkValue;
                        break;
                    }
                    case 'safe': {
                        isSafe = true;
                        break;
                    }
                }
            }

            const checkKinds = new Set(checks.map((c) => c.kind));
            isPositive =
                checkKinds.has('min') &&
                checks.some((c) => c.kind === 'min' && (c.value ?? 0) > 0);
            isNegative =
                checkKinds.has('max') &&
                checks.some((c) => c.kind === 'max' && (c.value ?? 0) < 0);
            isNonNegative =
                checkKinds.has('min') &&
                checks.some((c) => c.kind === 'min' && (c.value ?? 0) >= 0);
            isNonPositive =
                checkKinds.has('max') &&
                checks.some((c) => c.kind === 'max' && (c.value ?? 0) <= 0);
        }

        if (isPositive && (!min || min <= 0)) {
            min = 0.1;
        }
        if (isNegative && (!max || max >= 0)) {
            max = -0.1;
        }
        if (isNonNegative && (!min || min < 0)) {
            min = 0;
        }
        if (isNonPositive && (!max || max > 0)) {
            max = 0;
            if (!min || min > 0) {
                min = -100;
            }
        }

        if (max !== undefined && max < 0 && (min === undefined || min >= max)) {
            min = Math.min(min ?? max - 100, max - 1);
        }

        if (isSafe) {
            min = Math.max(
                min ?? -Number.MAX_SAFE_INTEGER,
                -Number.MAX_SAFE_INTEGER,
            );
            max = Math.min(
                max ?? Number.MAX_SAFE_INTEGER,
                Number.MAX_SAFE_INTEGER,
            );
        }

        if (isFinite) {
            min = Math.max(min ?? -Number.MAX_VALUE, -Number.MAX_VALUE);
            max = Math.min(max ?? Number.MAX_VALUE, Number.MAX_VALUE);
        }

        const options = {
            max: max ?? (isInt ? 100 : 100.9),
            min: min ?? 0,
        };

        let result = isInt
            ? this.number.int(options)
            : this.number.float(options);

        if (step && step > 0) {
            result = Math.round(result / step) * step;
        }

        return result;
    }

    private generateStringGenerator(schema: z.ZodString): string {
        const checks = schema._zod.def.checks as
            | { kind: string; regex?: RegExp; value?: unknown }[]
            | undefined;

        let minLength: number | undefined;
        let maxLength: number | undefined;
        let exactLength: number | undefined;
        const patterns: { kind: string; regex?: RegExp; value?: unknown }[] =
            [];

        if (checks) {
            for (const check of checks) {
                switch (check.kind) {
                    case 'length': {
                        exactLength = check.value as number;
                        break;
                    }
                    case 'max': {
                        maxLength = check.value as number;
                        break;
                    }
                    case 'min': {
                        minLength = check.value as number;
                        break;
                    }
                    default: {
                        patterns.push(check);
                    }
                }
            }
        }

        for (const pattern of patterns) {
            switch (pattern.kind) {
                case 'cuid': {
                    return `c${this.string.alphanumeric(24).toLowerCase()}`;
                }
                case 'cuid2': {
                    return this.string.alphanumeric(24).toLowerCase();
                }
                case 'datetime': {
                    return new Date().toISOString();
                }
                case 'email': {
                    return this.internet.email();
                }
                case 'ip': {
                    return this.internet.ip();
                }
                case 'regex': {
                    const regex = pattern.regex!;

                    if (regex.source.includes('@')) {
                        return this.internet.email();
                    }
                    if (regex.source === '^[a-zA-Z0-9_]+$') {
                        const len =
                            exactLength ??
                            (minLength && maxLength
                                ? this.number.int({
                                      max: maxLength,
                                      min: minLength,
                                  })
                                : 10);
                        return this.string.alphanumeric(len);
                    }

                    if (regex.source === '^[A-Z]{3}-\\d{3}$') {
                        const letters = this.string.alpha({
                            casing: 'upper',
                            length: 3,
                        });
                        const numbers = this.string.numeric({ length: 3 });
                        return `${letters}-${numbers}`;
                    }

                    const len =
                        exactLength ??
                        (minLength && maxLength
                            ? this.number.int({
                                  max: maxLength,
                                  min: minLength,
                              })
                            : (minLength ?? 10));
                    return this.string.alphanumeric(len);
                }
                case 'ulid': {
                    return this.string.alphanumeric(26).toUpperCase();
                }
                case 'url': {
                    return this.internet.url();
                }
                case 'uuid': {
                    return this.string.uuid();
                }
            }
        }

        if (exactLength !== undefined) {
            return this.string.alphanumeric(exactLength);
        }

        const targetLength =
            minLength && maxLength
                ? this.number.int({ max: maxLength, min: minLength })
                : minLength
                  ? minLength + this.number.int({ max: 10, min: 0 })
                  : maxLength
                    ? this.number.int({ max: maxLength, min: 1 })
                    : this.number.int({ max: 20, min: 5 });

        let result = '';
        while (result.length < targetLength) {
            const remaining = targetLength - result.length;
            result +=
                remaining > 10
                    ? `${this.lorem.word()} `
                    : this.string.alpha(remaining);
        }

        return result.trim().slice(0, targetLength);
    }
}

/**
 * Clear all registered custom Zod type handlers
 */
export function clearZodTypeRegistry(): void {
    zodTypeRegistry.clear();
}

/**
 * Get all registered custom Zod type names
 *
 * @returns Array of registered type names
 */
export function getRegisteredZodTypes(): string[] {
    return zodTypeRegistry.getRegisteredTypes();
}

export function initializeBuiltinZodTypes(): void {
    zodTypeRegistry.register('ZodBigInt', (_schema, factory) => {
        return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
    });

    zodTypeRegistry.register('ZodNaN', () => {
        return Number.NaN;
    });

    zodTypeRegistry.register('ZodVoid', () => {
        return undefined;
    });

    zodTypeRegistry.register('ZodNever', () => {
        throw new Error(
            'ZodNever should never be reached in factory generation',
        );
    });

    zodTypeRegistry.register('ZodFunction', (_schema, factory) => {
        return () => factory.lorem.word();
    });

    zodTypeRegistry.register('ZodPromise', (schema, _factory, config) => {
        const innerType = (schema._zod.def as any).type as $ZodType;
        const innerFactory = new ZodFactory(innerType, config);
        const innerValue: unknown = innerFactory.build();
        return Promise.resolve(innerValue);
    });

    zodTypeRegistry.register('ZodLazy', (schema: $ZodType, factory, config) => {
        const getter = (schema._zod.def as any).getter as () => $ZodType;
        const innerSchema = getter();

        return (factory as ZodFactory<$ZodType>).generateFactorySchema(
            innerSchema,
            config,
        );
    });
}

/**
 * Register a custom handler for a Zod type
 *
 * @param typeName The name/identifier of the Zod type (e.g., 'ZodBigInt', 'ZodNaN')
 * @param handler Function that generates mock data for this type
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { registerZodType } from 'interface-forge/zod';
 *
 * // Register handler for BigInt
 * registerZodType('ZodBigInt', (schema, factory) => {
 *   return BigInt(factory.number.int({ min: 0, max: 1_000_000 }));
 * });
 *
 * // Register handler for custom validation
 * registerZodType('ZodNaN', (schema, factory) => {
 *   return NaN;
 * });
 *
 * // Now you can use it
 * const schema = z.object({
 *   bigNumber: z.bigint(),
 *   notANumber: z.nan(),
 * });
 * ```
 */
export function registerZodType(
    typeName: string,
    handler: ZodTypeHandler,
): void {
    zodTypeRegistry.register(typeName, handler);
}

/**
 * Unregister a custom handler for a Zod type
 *
 * @param typeName The name/identifier of the Zod type
 * @returns True if the handler was found and removed
 */
export function unregisterZodType(typeName: string): boolean {
    return zodTypeRegistry.unregister(typeName);
}
