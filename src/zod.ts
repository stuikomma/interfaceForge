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
export class ZodFactory<T extends z.ZodObject> extends Factory<
    z.output<T>
> {
    private readonly schema: {
        parse: (data: Record<string, unknown>) => z.output<T>;
    } & T;
    private readonly zodConfig: ZodFactoryConfig;
    private readonly customFactoryFn?: FactoryFunction<z.output<T>>;

    constructor(schema: T, configOrFactory?: ZodFactoryConfig | FactoryFunction<z.output<T>>, config?: ZodFactoryConfig) {
        let factoryOptions: ZodFactoryConfig;
        let factoryFunction: FactoryFunction<z.output<T>>;
        let customFactoryFn: FactoryFunction<z.output<T>> | undefined;

        // Handle overloaded parameters
        if (typeof configOrFactory === 'function') {
            // Second parameter is a factory function
            customFactoryFn = configOrFactory;
            factoryOptions = config ?? {};
            factoryFunction = configOrFactory;
        } else {
            // Second parameter is config (or undefined)
            factoryOptions = configOrFactory ?? {};
            factoryFunction = () => {
                return {} as FactorySchema<z.output<T>>;
            };
        }

        super(factoryFunction, factoryOptions);

        this.schema = schema as {
            parse: (data: Record<string, unknown>) => z.output<T>;
        } & T;
        this.zodConfig = factoryOptions;
        this.customFactoryFn = customFactoryFn;
    }

    /**
     * Override the batch method to generate multiple values
     *
     * @param size Number of instances to generate
     * @param kwargs Optional partial values to override (single object or array)
     * @returns Array of generated values
     */
    batch = (
        size: number,
        kwargs?: Partial<z.output<T>> | Partial<z.output<T>>[],
    ): z.output<T>[] => {
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
    async buildAsync(kwargs?: Partial<z.output<T>>): Promise<z.output<T>> {
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

        // Explicit error for z.custom() schemas without customGenerators
        if (schema instanceof z.ZodCustom) {
            throw new Error('ZodFactory cannot generate data for z.custom() schemas');
        }

        if (currentDepth >= maxDepth) {
            if (schema instanceof z.ZodOptional) {
                return undefined;
            }
            if (schema instanceof z.ZodArray) {
                return [];
            }
            if (schema instanceof z.ZodString) {
                const def = (schema as any)._def || schema._zod?.def;
                if (def?.checks) {
                    for (const check of def.checks) {
                        const checkDef = check.def || check;
                        if (checkDef.check === 'string_format') {
                            const {format} = checkDef;
                            if (format === 'uuid') {
                                return this.string.uuid();
                            }
                            if (format === 'email') {
                                return this.internet.email();
                            }
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
                // Return minimal valid object that matches common recursive patterns
                return {};
            }
        }

        const newConfig: ZodFactoryConfig = {
            ...config,
            _currentDepth: currentDepth + 1,
        };

        // In v4, descriptions are stored in meta
        const meta =
            typeof schema.meta === 'function'
                ? (schema as any).meta()
                : undefined;
        const description =
            meta?.description || (schema._zod?.def as any)?.description;

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

        // Handle specific string format types in v4
        const def = (schema as any)._def || schema._zod?.def;
        const schemaType = def?.type;
        if (schemaType === 'string' && def?.checks?.length) {
            // Check if this is a specific string format schema
            const firstCheck = def.checks[0];
            const checkDef = firstCheck?.def || firstCheck;
            if (checkDef && checkDef.check === 'string_format') {
                const {format} = checkDef;
                // These specific formats have their own schema types in v4
                switch (format) {
                    case 'base64': {
                        return Buffer.from(this.string.alpha(16)).toString(
                            'base64',
                        );
                    }
                    case 'base64url': {
                        return Buffer.from(this.string.alpha(16)).toString(
                            'base64url',
                        );
                    }
                    case 'cidrv4': {
                        return `${this.internet.ipv4()}/${this.number.int({ max: 32, min: 0 })}`;
                    }
                    case 'cidrv6': {
                        return `${this.internet.ipv6()}/${this.number.int({ max: 128, min: 0 })}`;
                    }
                    case 'cuid': {
                        return `c${this.string.alphanumeric(24).toLowerCase()}`;
                    }
                    case 'cuid2': {
                        return this.string.alphanumeric(24).toLowerCase();
                    }
                    case 'date': {
                        return new Date().toISOString().split('T')[0];
                    }
                    case 'datetime': {
                        return new Date().toISOString();
                    }
                    case 'duration': {
                        const hours = this.number.int({ max: 23, min: 0 });
                        const minutes = this.number.int({ max: 59, min: 0 });
                        const seconds = this.number.int({ max: 59, min: 0 });
                        return `PT${hours}H${minutes}M${seconds}S`;
                    }
                    case 'e164': {
                        return `+${this.string.numeric({ exclude: ['0'], length: 1 })}${this.string.numeric({ length: this.number.int({ max: 14, min: 10 }) })}`;
                    }
                    case 'email': {
                        return this.internet.email();
                    }
                    case 'emoji': {
                        const emojis = [
                            '😀',
                            '😎',
                            '🚀',
                            '🌟',
                            '❤️',
                            '🔥',
                            '✨',
                            '🎉',
                        ];
                        return this.helpers.arrayElement(emojis);
                    }
                    case 'guid': {
                        return this.string.uuid();
                    }
                    case 'ipv4': {
                        return this.internet.ipv4();
                    }
                    case 'ipv6': {
                        return this.internet.ipv6();
                    }
                    case 'jwt': {
                        const header = Buffer.from(
                            '{"alg":"HS256","typ":"JWT"}',
                        ).toString('base64url');
                        const payload = Buffer.from(
                            `{"sub":"${this.string.uuid()}","iat":${Math.floor(Date.now() / 1000)}}`,
                        ).toString('base64url');
                        const signature = this.string.alphanumeric(43);
                        return `${header}.${payload}.${signature}`;
                    }
                    case 'ksuid': {
                        return this.string.alphanumeric(27);
                    }
                    case 'nanoid': {
                        return this.string.nanoid();
                    }
                    case 'time': {
                        return new Date().toISOString().split('T')[1];
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
                    case 'xid': {
                        return this.string.alphanumeric(20).toLowerCase();
                    }
                }
            }
        }

        // Check if it's a special string format type (ZodEmail, ZodUUID, etc.)
        // In v4, these are separate types that don't inherit from ZodString
        if (
            typeof schema === 'object' &&
            schema !== null &&
            'format' in schema &&
            schema.format &&
            schema._zod?.traits?.has('$ZodString')
        ) {
            return this.generateStringFormat(schema.format as string);
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
            // In v4, literal value is stored in def.values array ~keep
            const {values} = schema._zod.def;
            if (Array.isArray(values) && values.length > 0) {
                return values[0];
            }
            return (schema._zod.def as any).value || null;
        }

        if (schema instanceof z.ZodEnum) {
            const {def} = schema._zod;
            // In v4, entries could be an array or object
            let values: unknown[];
            if (Array.isArray(def.entries)) {
                values = def.entries;
            } else {
                // def.entries contains the enum mapping
                const entries = def.entries || {};
                // For numeric enums, we need to get only the numeric values
                // TypeScript numeric enums have bidirectional mapping
                const allValues = Object.values(entries);
                const numericValues = allValues.filter(
                    (v) => typeof v === 'number',
                );
                const stringValues = allValues.filter(
                    (v) => typeof v === 'string',
                );

                // If we have numeric values, use those (it's a numeric enum)
                if (numericValues.length > 0) {
                    values = numericValues;
                } else {
                    // Otherwise use all string values
                    values = stringValues.length > 0 ? stringValues : allValues;
                }
            }
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

        if (schema._zod?.def && 'brand' in schema._zod.def) {
            return this.generateFactorySchema(schema, newConfig);
        }

        if (schema instanceof z.ZodDefault) {
            return this.generateFactorySchema(
                schema._zod.def.innerType,
                newConfig,
            );
        }

        if (schema instanceof z.ZodCatch) {
            return this.generateFactorySchema(
                schema._zod.def.innerType,
                newConfig,
            );
        }

        if (schema instanceof z.ZodUnion) {
            const randomOption = this.helpers.arrayElement(
                schema._zod.def.options as $ZodType[],
            );
            return this.generateFactorySchema(randomOption, newConfig);
        }

        if (schema instanceof z.ZodDiscriminatedUnion) {
            const {options} = schema._zod.def;
            const optionsArray = Array.isArray(options)
                ? options
                : Object.values(options);
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
            const def = (schema as any)._def || schema._zod?.def;
            const checks = def?.checks as
                | {
                      check?: string;
                      def?: any;
                      maximum?: number;
                      minimum?: number;
                      size?: number;
                  }[]
                | undefined;
            if (checks) {
                for (const check of checks) {
                    const checkDef =
                        (check as any)._zod?.def || check.def || check;
                    const checkType = checkDef.check;

                    if (
                        (checkType === 'min_size' ||
                            checkType === 'min_length') &&
                        typeof checkDef.minimum === 'number'
                    ) {
                        minLength = checkDef.minimum;
                        hasMinConstraint = true;
                    } else if (
                        (checkType === 'max_size' ||
                            checkType === 'max_length') &&
                        typeof checkDef.maximum === 'number'
                    ) {
                        maxLength = checkDef.maximum;
                        hasMaxConstraint = true;
                    } else if (
                        (checkType === 'size_equals' ||
                            checkType === 'length_equals') &&
                        (typeof checkDef.size === 'number' ||
                            typeof checkDef.length === 'number')
                    ) {
                        minLength = maxLength =
                            checkDef.size || checkDef.length;
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
                this.generateFactorySchema(itemSchema, newConfig),
            );
        }

        if (schema instanceof z.ZodObject) {
            const result: Record<string, unknown> = {};

            for (const [key, fieldSchema] of Object.entries(
                schema._zod.def.shape,
            )) {
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
                return this.generateFactorySchema(
                    schema._zod.def.in,
                    newConfig,
                );
            }

            if (schema instanceof z.ZodTransform) {
                // For transform, generate from the input schema if available
                const innerSchema =
                    (schema._zod.def as any).innerType ||
                    (schema._zod.def as any).schema;
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
     * @param iteration Iteration number
     * @param kwargs Optional partial values to override
     * @returns Generated value that conforms to the Zod schema
     */
    protected generate(
        iteration: number,
        kwargs?: Partial<z.output<T>>,
    ): z.output<T> {
        let generated: unknown;

        // Always start with schema-based generation for complete coverage
        generated = this.generateFactorySchema(
            this.schema,
            this.zodConfig,
        );

        // If a custom factory function was provided, merge its results
        if (this.customFactoryFn && isObject(generated)) {
            const factoryResult = this.customFactoryFn(this as unknown as Factory<z.output<T>>, iteration);
            // Convert any generators/refs to actual values
            const resolvedFactoryResult = this.resolveFactorySchema(factoryResult);
            
            if (isObject(resolvedFactoryResult)) {
                // Merge factory result with generated data, giving priority to factory result
                generated = {
                    ...generated,
                    ...resolvedFactoryResult,
                };
            } else {
                // For non-object schemas, use the factory result directly
                generated = resolvedFactoryResult;
            }
        }

        if (isObject(kwargs) && isObject(generated)) {
            return this.schema.parse({
                ...generated,
                ...kwargs,
            });
        }

        // For non-object schemas (like strings, numbers), parse the value directly
        // Some schemas (like function, promise) might not have a parse method
        if ('parse' in this.schema && typeof this.schema.parse === 'function') {
            return this.schema.parse(generated);
        }

        return generated as z.output<T>;
    }

    private resolveFactorySchema(schema: unknown): unknown {
        if (schema && typeof schema === 'object' && schema !== null) {
            // Check if it's a generator
            if ('next' in schema && typeof (schema as Generator<unknown>).next === 'function') {
                return (schema as Generator<unknown>).next().value;
            }
            
            // Check if it's a Ref
            if ('callHandler' in schema && typeof (schema as { callHandler: () => unknown }).callHandler === 'function') {
                return (schema as { callHandler: () => unknown }).callHandler();
            }

            // Handle arrays
            if (Array.isArray(schema)) {
                return schema.map(item => this.resolveFactorySchema(item));
            }

            // Handle plain objects
            if (schema.constructor === Object) {
                const result: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(schema)) {
                    result[key] = this.resolveFactorySchema(value);
                }
                return result;
            }
        }

        return schema;
    }

    private generateNumberGenerator(schema: z.ZodNumber): number {
        // In v4, ZodNumber instances have direct properties
        let isInt = (schema as any).isInt || false;
        let numberFormat = (schema as any).format;

        const def = (schema as any)._def || schema._zod?.def;
        const checks = def?.checks as
            | {
                  [key: string]: unknown;
                  check?: string;
                  def?: any;
                  format?: string;
                  inclusive?: boolean;
                  value?: number;
              }[]
            | undefined;

        let min: number | undefined = (schema as any).minValue;
        let max: number | undefined = (schema as any).maxValue;
        let isPositive = false;
        let isNegative = false;
        let isNonNegative = false;
        let isNonPositive = false;
        const isFinite = (schema as any).isFinite || false;
        let isSafe = false;
        let step: number | undefined;

        if (checks) {
            for (const check of checks) {
                // In v4, the check info might be in check._zod.def
                const checkDef = (check as any)._zod?.def || check.def || check;
                const checkType = checkDef.check;

                switch (checkType) {
                    case 'greater_than': {
                        const {value} = checkDef;
                        const {inclusive} = checkDef;
                        if (inclusive) {
                            min = value;
                        } else {
                            min = value + 0.000_001; // Small increment for exclusive
                        }
                        break;
                    }
                    case 'less_than': {
                        const {value} = checkDef;
                        const {inclusive} = checkDef;
                        if (inclusive) {
                            max = value;
                        } else {
                            max = value - 0.000_001; // Small decrement for exclusive
                        }
                        break;
                    }
                    case 'multiple_of': {
                        step = checkDef.value;
                        break;
                    }
                    case 'number_format': {
                        numberFormat = checkDef.format;
                        if (
                            numberFormat === 'int32' ||
                            numberFormat === 'uint32' ||
                            numberFormat === 'safeint'
                        ) {
                            isInt = true;
                        }
                        if (numberFormat === 'safeint') {
                            isSafe = true;
                        }
                        if (numberFormat === 'uint32') {
                            min = 0;
                            max = 4_294_967_295;
                        } else if (numberFormat === 'int32') {
                            min = -2_147_483_648;
                            max = 2_147_483_647;
                        }
                        break;
                    }
                }
            }

            // Check for positive/negative constraints based on min/max values
            if (min !== undefined && min > 0) {isPositive = true;}
            if (max !== undefined && max < 0) {isNegative = true;}
            if (min !== undefined && min >= 0) {isNonNegative = true;}
            if (max !== undefined && max <= 0) {isNonPositive = true;}
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

        // Ensure we have finite bounds
        if (!isFinite) {
            // If not explicitly finite, use reasonable defaults
            min = min ?? (isInt ? -1000 : -1000);
            max = max ?? (isInt ? 1000 : 1000);
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

        // Ensure integers are actually integers (no decimals)
        if (isInt) {
            result = Math.floor(result);
        }

        // Final safety check - ensure result is finite
        if (!Number.isFinite(result)) {
            result = isInt ? 0 : 0;
        }

        return result;
    }

    private generateStringFormat(format: string): string {
        switch (format) {
            case 'base64': {
                const str = this.string.alphanumeric(16);
                return Buffer.from(str).toString('base64');
            }
            case 'base64url': {
                const str2 = this.string.alphanumeric(16);
                return Buffer.from(str2).toString('base64url');
            }
            case 'cidrv4': {
                return `${this.internet.ipv4()}/${this.number.int({ max: 32, min: 0 })}`;
            }
            case 'cidrv6': {
                return `${this.internet.ipv6()}/${this.number.int({ max: 128, min: 0 })}`;
            }
            case 'cuid': {
                return `c${this.string.alphanumeric(24).toLowerCase()}`;
            }
            case 'cuid2': {
                return this.string.alphanumeric(24).toLowerCase();
            }
            case 'date':
            case 'iso_date': {
                return new Date().toISOString().split('T')[0];
            }
            case 'datetime':
            case 'iso_datetime': {
                return new Date().toISOString();
            }
            case 'duration':
            case 'iso_duration': {
                // Generate ISO 8601 duration like P1Y2M3DT4H5M6S
                const years = this.number.int({ max: 10, min: 0 });
                const months = this.number.int({ max: 11, min: 0 });
                const days = this.number.int({ max: 30, min: 0 });
                const hours = this.number.int({ max: 23, min: 0 });
                const minutes = this.number.int({ max: 59, min: 0 });
                const seconds = this.number.int({ max: 59, min: 0 });

                let duration = 'P';
                if (years) {duration += `${years}Y`;}
                if (months) {duration += `${months}M`;}
                if (days) {duration += `${days}D`;}
                if (hours || minutes || seconds) {
                    duration += 'T';
                    if (hours) {duration += `${hours}H`;}
                    if (minutes) {duration += `${minutes}M`;}
                    if (seconds) {duration += `${seconds}S`;}
                }
                return duration === 'P' ? 'PT0S' : duration;
            }
            case 'e164': {
                // E.164 phone number format
                return `+${this.number.int({ max: 999, min: 1 })}${this.string.numeric({ length: 10 })}`;
            }
            case 'email': {
                return this.internet.email();
            }
            case 'emoji': {
                const emojis = [
                    '😀',
                    '😃',
                    '😄',
                    '😁',
                    '😊',
                    '🎉',
                    '🎈',
                    '🌟',
                    '🚀',
                    '💡',
                ];
                return this.helpers.arrayElement(emojis);
            }
            case 'guid':
            case 'uuid': {
                return this.string.uuid();
            }
            case 'ipv4': {
                return this.internet.ipv4();
            }
            case 'ipv6': {
                return this.internet.ipv6();
            }
            case 'iso_time':
            case 'time': {
                return new Date().toISOString().split('T')[1];
            }
            case 'jwt': {
                // Generate a simple JWT-like string
                const header = Buffer.from(
                    '{"alg":"HS256","typ":"JWT"}',
                ).toString('base64url');
                const payload = Buffer.from(
                    `{"sub":"${this.string.uuid()}","iat":${Math.floor(Date.now() / 1000)}}`,
                ).toString('base64url');
                const signature = this.string.alphanumeric(43); // Typical signature length
                return `${header}.${payload}.${signature}`;
            }
            case 'ksuid': {
                // KSUID is a 27-character base62 encoded string
                return this.string.alphanumeric(27);
            }
            case 'nanoid': {
                // NanoID is typically 21 characters
                return this.string.nanoid();
            }
            case 'ulid': {
                return this.string.alphanumeric(26).toUpperCase();
            }
            case 'url': {
                return this.internet.url();
            }
            case 'xid': {
                // XID is a 20-character base32 encoded string
                return this.string.alphanumeric(20).toLowerCase();
            }
            default: {
                // Fallback to basic string generation
                return this.lorem.word();
            }
        }
    }

    private generateStringGenerator(schema: z.ZodString): string {
        const def = (schema as any)._def || schema._zod?.def;
        const checks = def?.checks as
            | {
                  [key: string]: unknown;
                  check?: string;
                  def?: any;
                  format?: string;
                  pattern?: RegExp;
                  value?: unknown;
              }[]
            | undefined;

        let minLength: number | undefined;
        let maxLength: number | undefined;
        let exactLength: number | undefined;
        const patterns: any[] = [];

        if (checks) {
            for (const check of checks) {
                // In v4, checks might have a format property at top level (e.g., ZodEmail)
                if ((check as any).format) {
                    patterns.push(check);
                    continue;
                }

                // In v4, the check info might be nested in check.def
                // In v4, checks have _zod.def structure
                const checkDef = (check as any)._zod?.def || check.def || check;
                const checkType = checkDef.check;
                switch (checkType) {
                    case 'length_equals': {
                        exactLength = checkDef.length as number;
                        break;
                    }
                    case 'max_length': {
                        maxLength = checkDef.maximum as number;
                        break;
                    }
                    case 'min_length': {
                        minLength = checkDef.minimum as number;
                        break;
                    }
                    default: {
                        patterns.push(checkDef);
                    }
                }
            }
        }

        for (const pattern of patterns) {
            // Check if pattern has format at top level (e.g., ZodEmail instance)
            if (pattern.format) {
                const {format} = pattern;
                switch (format) {
                    case 'cuid': {
                        return `c${this.string.alphanumeric(24).toLowerCase()}`;
                    }
                    case 'cuid2': {
                        return this.string.alphanumeric(24).toLowerCase();
                    }
                    case 'email': {
                        return this.internet.email();
                    }
                    case 'nanoid': {
                        return this.string.nanoid();
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
                continue;
            }

            const checkType = pattern.check;
            switch (checkType) {
                case 'string_format': {
                    const {format} = pattern;
                    switch (format) {
                        case 'base64': {
                            return Buffer.from(this.string.alpha(16)).toString(
                                'base64',
                            );
                        }
                        case 'base64url': {
                            return Buffer.from(this.string.alpha(16)).toString(
                                'base64url',
                            );
                        }
                        case 'cidrv4': {
                            return `${this.internet.ipv4()}/${this.number.int({ max: 32, min: 0 })}`;
                        }
                        case 'cidrv6': {
                            return `${this.internet.ipv6()}/${this.number.int({ max: 128, min: 0 })}`;
                        }
                        case 'cuid': {
                            return `c${this.string.alphanumeric(24).toLowerCase()}`;
                        }
                        case 'cuid2': {
                            return this.string.alphanumeric(24).toLowerCase();
                        }
                        case 'date': {
                            return new Date().toISOString().split('T')[0];
                        }
                        case 'datetime': {
                            return new Date().toISOString();
                        }
                        case 'duration': {
                            // ISO 8601 duration format
                            const hours = this.number.int({ max: 23, min: 0 });
                            const minutes = this.number.int({
                                max: 59,
                                min: 0,
                            });
                            const seconds = this.number.int({
                                max: 59,
                                min: 0,
                            });
                            return `PT${hours}H${minutes}M${seconds}S`;
                        }
                        case 'e164': {
                            // E.164 phone number format
                            return `+${this.string.numeric({ exclude: ['0'], length: 1 })}${this.string.numeric({ length: this.number.int({ max: 14, min: 10 }) })}`;
                        }
                        case 'email': {
                            return this.internet.email();
                        }
                        case 'emoji': {
                            // Simple emoji generation
                            const emojis = [
                                '😀',
                                '😎',
                                '🚀',
                                '🌟',
                                '❤️',
                                '🔥',
                                '✨',
                                '🎉',
                            ];
                            return this.helpers.arrayElement(emojis);
                        }
                        case 'ends_with': {
                            const suffix = (pattern).suffix || '';
                            const remainingLength = exactLength
                                ? exactLength - suffix.length
                                : maxLength
                                  ? Math.max(0, maxLength - suffix.length)
                                  : 5;
                            return this.string.alpha(remainingLength) + suffix;
                        }
                        case 'guid': {
                            return this.string.uuid();
                        }
                        case 'includes': {
                            const includes = (pattern).includes || '';
                            const {position} = (pattern);
                            if (typeof position === 'number') {
                                const before = this.string.alpha(position);
                                const after = this.string.alpha(5);
                                return before + includes + after;
                            }
                            return (
                                this.string.alpha(3) +
                                includes +
                                this.string.alpha(3)
                            );
                        }
                        case 'ipv4': {
                            return this.internet.ipv4();
                        }
                        case 'ipv6': {
                            return this.internet.ipv6();
                        }
                        case 'json_string': {
                            return JSON.stringify({
                                [this.lorem.word()]: this.lorem.word(),
                            });
                        }
                        case 'jwt': {
                            // Simple JWT mock
                            const header = Buffer.from(
                                '{"alg":"HS256","typ":"JWT"}',
                            ).toString('base64url');
                            const payload = Buffer.from(
                                `{"sub":"${this.string.uuid()}","iat":${Math.floor(Date.now() / 1000)}}`,
                            ).toString('base64url');
                            const signature = this.string.alphanumeric(43);
                            return `${header}.${payload}.${signature}`;
                        }
                        case 'ksuid': {
                            // KSUID is a 27 character base62 encoded string
                            return this.string.alphanumeric(27);
                        }
                        case 'lowercase': {
                            const len =
                                exactLength ??
                                (minLength && maxLength
                                    ? this.number.int({
                                          max: maxLength,
                                          min: minLength,
                                      })
                                    : 10);
                            return this.string.alpha({
                                casing: 'lower',
                                length: len,
                            });
                        }
                        case 'nanoid': {
                            return this.string.nanoid();
                        }
                        case 'regex': {
                            const regex = pattern.pattern || pattern.regex;
                            if (!regex) {break;}

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

                            if (regex.source === '^[A-Z]{3}-\\d{3}$'.replace('\\\\', '\\')) {
                                const letters = this.string.alpha({
                                    casing: 'upper',
                                    length: 3,
                                });
                                const numbers = this.string.numeric({
                                    length: 3,
                                });
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
                        case 'starts_with': {
                            const prefix = (pattern).prefix || '';
                            const remainingLength = exactLength
                                ? exactLength - prefix.length
                                : minLength
                                  ? Math.max(0, minLength - prefix.length)
                                  : 5;
                            return prefix + this.string.alpha(remainingLength);
                        }
                        case 'time': {
                            return new Date().toISOString().split('T')[1];
                        }
                        case 'ulid': {
                            return this.string.alphanumeric(26).toUpperCase();
                        }
                        case 'uppercase': {
                            const len =
                                exactLength ??
                                (minLength && maxLength
                                    ? this.number.int({
                                          max: maxLength,
                                          min: minLength,
                                      })
                                    : 10);
                            return this.string.alpha({
                                casing: 'upper',
                                length: len,
                            });
                        }
                        case 'url': {
                            return this.internet.url();
                        }
                        case 'uuid': {
                            return this.string.uuid();
                        }
                        case 'xid': {
                            // XID is a 20 character base32 encoded string
                            return this.string.alphanumeric(20).toLowerCase();
                        }
                    }
                    break;
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
        const innerType = ((schema as any)._def || schema._zod?.def)
            ?.type as $ZodType;
        if (innerType) {
            const innerFactory = new ZodFactory(innerType, config);
            const innerValue: unknown = innerFactory.build();
            return Promise.resolve(innerValue);
        }
        return Promise.resolve(_factory.lorem.word());
    });

    zodTypeRegistry.register('ZodLazy', (schema: $ZodType, factory, config) => {
        const def = (schema as any)._def || schema._zod?.def;
        const getter = def?.getter as (() => $ZodType) | undefined;
        if (getter) {
            const innerSchema = getter();
            return (factory as ZodFactory<$ZodType>).generateFactorySchema(
                innerSchema,
                config,
            );
        }
        // Fallback for lazy schemas
        return { id: factory.string.uuid() };
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
