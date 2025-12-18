# Business Logic Documentation Generator

Automated extraction and documentation of business logic from Python/PySpark and SQL source code using tree-sitter parsing.

## Features

- **Tree-sitter Parsing**: Accurately extracts functions, methods, and SQL blocks
- **Automatic Classification**: Distinguishes business logic from pipeline/infrastructure code
- **BUSINESS_RULE Markers**: Explicit marking support for important business rules
- **Diff Tracking**: Tracks changes between extraction runs
- **Webhook Integration**: Triggers extraction on source code changes
- **Amp SDK Integration**: AI-assisted classification for ambiguous functions

## Quick Start

```bash
# Install dependencies
npm install

# Run extraction (uses SOURCE_CODE_PATH env var or ../source-code)
npm run extract

# Run tests
npm test

# Start webhook handler for local development
npm run webhook
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SOURCE_CODE_PATH` | Path to source code repository | `../source-code` |
| `OUTPUT_DIR` | Where to write documentation | `./docs` |
| `SNAPSHOT_DIR` | Where to store extraction snapshots | `./.snapshots` |
| `SOURCE_REPO_URL` | GitHub URL for source links | - |
| `AMP_ACCESS_TOKEN` | Amp SDK token for AI classification | - |
| `WEBHOOK_SECRET` | GitHub webhook secret | - |
| `WEBHOOK_PORT` | Webhook server port | `3000` |

## Classification Logic

### Business Logic
Functions are classified as business logic if they:
- Have explicit `BUSINESS_RULE` markers in docstrings/comments
- Contain threshold or limit calculations
- Implement validation rules
- Calculate status indicators (RAG, scores, ratings)
- Match patterns like: `threshold`, `validate`, `rule`, `limit`, `calculate_*_status`

### Pipeline Code
Functions are classified as pipeline code if they:
- Handle data loading/saving (`spark.read`, `.write.parquet`)
- Setup infrastructure (`create_session`, `get_connection`)
- Perform pure data transformations
- Match patterns like: `load_*`, `save_*`, `extract_*`, `setup_*`

## Marking Business Rules

Use `BUSINESS_RULE` markers in your code for explicit classification:

```python
def calculate_order_threshold(amount: float) -> str:
    """
    Determine if order requires approval.
    
    BUSINESS_RULE: Orders over $10,000 require manager approval
    BUSINESS_RULE: Orders over $50,000 require director approval
    """
    if amount > 50000:
        return "DIRECTOR_APPROVAL"
    elif amount > 10000:
        return "MANAGER_APPROVAL"
    return "AUTO_APPROVED"
```

## GitHub Workflow Integration

### Webhook Setup
1. In source-code repository, go to Settings → Webhooks
2. Add webhook:
   - URL: Your deployed webhook handler
   - Content type: `application/json`
   - Secret: Match `WEBHOOK_SECRET` env var
   - Events: Push events

### Repository Dispatch
Alternatively, use repository_dispatch from source-code CI:

```yaml
# In source-code/.github/workflows/notify.yml
- name: Trigger documentation update
  uses: peter-evans/repository-dispatch@v2
  with:
    token: ${{ secrets.DOCS_REPO_PAT }}
    repository: your-org/business-logic-docs
    event-type: source-code-updated
    client-payload: |
      {
        "ref": "${{ github.ref }}",
        "commit_sha": "${{ github.sha }}",
        "commit_message": "${{ github.event.head_commit.message }}"
      }
```

## Project Structure

```
business-logic-docs/
├── src/
│   ├── extractors/       # Tree-sitter parsing
│   ├── classifiers/      # Logic classification
│   ├── generators/       # Markdown generation
│   └── webhook/          # GitHub webhook handler
├── docs/                 # Generated documentation
├── tests/                # Test suites
└── .github/workflows/    # CI/CD workflows
```

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Run tests in watch mode
npm run test:watch
```

## License

MIT
