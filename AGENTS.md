# AGENTS.md - Business Logic Docs

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run extraction
npm run extract

# Run tests
npm test

# Type check
npm run typecheck

# Start webhook handler
npm run webhook
```

## Project Overview

This repository extracts and documents business logic from Python/PySpark and SQL code using tree-sitter parsing. It:

1. Parses Python files to extract functions with signatures, docstrings, and parameters
2. Parses SQL files and embedded SQL in Python to extract queries and procedures
3. Classifies extracted code as "business_logic" or "pipeline_code"
4. Generates structured Markdown documentation
5. Tracks changes between extraction runs

## Key Components

- `src/extractors/python-extractor.ts` - Tree-sitter Python parser
- `src/extractors/sql-extractor.ts` - SQL parser with embedded SQL support
- `src/classifiers/logic-classifier.ts` - Classification logic + Amp SDK integration
- `src/generators/markdown-generator.ts` - Markdown documentation generator
- `src/generators/diff-tracker.ts` - Change tracking between runs
- `src/webhook/handler.ts` - GitHub webhook handler

## Code Style

- TypeScript with strict mode
- ESM modules (`.js` extensions in imports)
- Vitest for testing
- Functional patterns where appropriate

## Classification Markers

Look for `BUSINESS_RULE` markers in docstrings and comments to identify explicit business logic.
