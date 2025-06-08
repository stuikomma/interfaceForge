export class CircularReferenceError extends Error {
    constructor(
        message = 'Circular reference detected in factory composition',
    ) {
        super(message);
        this.name = 'CircularReferenceError';
    }
}

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
