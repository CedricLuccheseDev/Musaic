#!/bin/bash

# Generate types from JSON Schema for both TypeScript and Python
# Usage: ./generate-types.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$(dirname "$SCRIPT_DIR")"
SCHEMAS_DIR="$SHARED_DIR/schemas"
TYPES_DIR="$SHARED_DIR/types"
PYTHON_DIR="$SHARED_DIR/../Analyzer/app"

echo "📦 Generating types from JSON Schema..."

# =============================================================================
# TypeScript (using json-schema-to-typescript)
# =============================================================================
echo ""
echo "🟦 TypeScript..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Install Node.js first."
    exit 1
fi

# Install if needed
cd "$SHARED_DIR/.."
if ! npx json-schema-to-typescript --help &> /dev/null 2>&1; then
    echo "Installing json-schema-to-typescript..."
    npm install -D json-schema-to-typescript
fi

# Generate TypeScript types
npx json-schema-to-typescript \
    "$SCHEMAS_DIR/analysis.schema.json" \
    -o "$TYPES_DIR/generated/analysis.generated.ts" \
    --bannerComment "/* Auto-generated from analysis.schema.json - DO NOT EDIT */"

npx json-schema-to-typescript \
    "$SCHEMAS_DIR/track.schema.json" \
    -o "$TYPES_DIR/generated/track.generated.ts" \
    --bannerComment "/* Auto-generated from track.schema.json - DO NOT EDIT */"

echo "✅ TypeScript types generated in $TYPES_DIR/generated/"

# =============================================================================
# Python (using datamodel-code-generator)
# =============================================================================
echo ""
echo "🐍 Python..."

if ! command -v datamodel-codegen &> /dev/null; then
    echo "Installing datamodel-code-generator..."
    pip install datamodel-code-generator
fi

# Generate Python models
datamodel-codegen \
    --input "$SCHEMAS_DIR/analysis.schema.json" \
    --output "$PYTHON_DIR/generated/analysis_generated.py" \
    --input-file-type jsonschema \
    --output-model-type pydantic_v2.BaseModel \
    --target-python-version 3.10

datamodel-codegen \
    --input "$SCHEMAS_DIR/track.schema.json" \
    --output "$PYTHON_DIR/generated/track_generated.py" \
    --input-file-type jsonschema \
    --output-model-type pydantic_v2.BaseModel \
    --target-python-version 3.10

echo "✅ Python models generated in $PYTHON_DIR/generated/"

echo ""
echo "🎉 Done! Types are now in sync."
