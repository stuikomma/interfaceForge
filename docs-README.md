# Interface Forge Documentation

This repository provides documentation in multiple formats for AI accessibility:

## Documentation Formats

1. **Markdown Documentation** (`/docs-markdown/`)

    - Plain markdown files ideal for AI consumption
    - Structured with clear headings and code blocks
    - Easy to parse and understand

2. **HTML Documentation** (`/docs/`)
    - Traditional TypeDoc HTML output
    - Interactive and browsable
    - Good for human readers

## For AI Assistants

The markdown documentation in `/docs-markdown/` is specifically optimized for AI consumption:

- Clear, structured markdown format
- All type information preserved
- Examples included inline
- No JavaScript required to view content

## Generating Documentation

```bash
# Generate both HTML and Markdown
pnpm docs:all

# Generate only Markdown (AI-friendly)
pnpm docs:markdown

# Generate only HTML
pnpm docs
```

## API Overview

Interface Forge provides a `Factory` class for creating type-safe mock data:

- **Factory** - Main class for generating mock objects
- **Generators** - Helper classes for cyclic and random value generation
- **Utilities** - Deep merge and reference handling

See the full documentation in `/docs-markdown/index.md` for detailed API reference.
