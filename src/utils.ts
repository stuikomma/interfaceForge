import { isRecord } from '@tool-belt/type-predicates';

/**
 * A reference to a function that returns a value of type `T`.
 */
export class Ref<T, C extends (...args: unknown[]) => T> {
    private readonly args: Parameters<C>;
    private readonly handler: C;

    constructor({ args, handler }: { args: Parameters<C>; handler: C }) {
        this.handler = handler;
        this.args = args;
    }

    callHandler(): T {
        return this.handler(...this.args);
    }
}

/**
 * Converts an iterable to an array.
 * @param iterable The iterable to be converted to an array.
 * @returns An array containing the values of the iterable.
 */
export function iterableToArray<T>(iterable: Iterable<T>): T[] {
    const values: T[] = [];
    for (const value of iterable) {
        values.push(value);
    }
    return values;
}

/**
 * Deep merges objects together.
 * @param target The target object to merge into
 * @param sources The source objects to merge
 * @returns The merged object
 */
export function merge<T>(target: T, ...sources: unknown[]): T {
    const output = { ...target } as Record<string, unknown>;

    for (const source of sources) {
        if (!source || typeof source !== 'object') {continue;}

        for (const key in source as Record<string, unknown>) {
            const sourceValue = (source as Record<string, unknown>)[key];
            const targetValue = output[key];

            output[key] = isRecord(sourceValue) && isRecord(targetValue) ? merge(targetValue, sourceValue) : sourceValue;
        }
    }

    return output as T;
}
