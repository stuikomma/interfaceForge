import { iterableToArray } from './utils';

/**
 * Base generator that handles converting iterables to arrays
 */
export abstract class BaseGenerator<T> {
    protected values: T[];

    constructor(iterable: Iterable<T>) {
        this.values = iterableToArray(iterable);
        if (this.values.length === 0) {
            throw new Error('Cannot create generator from empty iterable');
        }
    }

    abstract generate(): Generator<T, T, T>;
}

/**
 * Generator that cycles through values indefinitely
 */
export class CycleGenerator<T> extends BaseGenerator<T> {
    generate(): Generator<T, T, T> {
        const {values} = this;
        return (function* () {
            let counter = 0;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while (true) {
                yield values[counter];
                counter = (counter + 1) % values.length;
            }
        })();
    }
}

/**
 * Generator that samples values randomly without immediate repetition
 */
export class SampleGenerator<T> extends BaseGenerator<T> {
    generate(): Generator<T, T, T> {
        const {values} = this;
        return (function* () {
            if (values.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                while (true) {
                    yield values[0];
                }
            }

            let lastValue: null | T = null;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while (true) {
                let newValue: T;
                do {
                    newValue =
                        values[Math.floor(Math.random() * values.length)];
                } while (newValue === lastValue);

                lastValue = newValue;
                yield newValue;
            }
        })();
    }
}
