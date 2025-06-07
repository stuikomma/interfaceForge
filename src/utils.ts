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
    const output: Partial<T> = { ...target };
    for (const source of sources.filter(Boolean) as Partial<T>[]) {
        for (const [key, value] of Object.entries(source)) {
            const existingValue: unknown = Reflect.get(output, key);
            if (isRecord(value) && isRecord(existingValue)) {
                Reflect.set(output, key, merge(existingValue, value));
            } else {
                Reflect.set(output, key, value);
            }
        }
    }
    return output as T;
}
