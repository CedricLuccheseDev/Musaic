#!/bin/bash
# =============================================================================
# Generate TypeScript types from Supabase schema
# Usage: ./shared/scripts/generate-types.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
OUTPUT_FILE="$ROOT_DIR/shared/types/generated/database.ts"

echo "📦 Generating types from Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check for project ID in environment or .env
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    # Try to extract from App/.env
    if [ -f "$ROOT_DIR/App/.env" ]; then
        SUPABASE_URL=$(grep "SUPABASE_URL" "$ROOT_DIR/App/.env" | cut -d '=' -f2 | tr -d '"' | tr -d ' ')
        if [ -n "$SUPABASE_URL" ]; then
            # Extract project ID from URL (https://xxxxx.supabase.co)
            SUPABASE_PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|.supabase.co||')
        fi
    fi
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ SUPABASE_PROJECT_ID not found."
    echo "Set it in environment or ensure App/.env has SUPABASE_URL"
    exit 1
fi

echo "📡 Project: $SUPABASE_PROJECT_ID"

# Generate types
mkdir -p "$(dirname "$OUTPUT_FILE")"
supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > "$OUTPUT_FILE"

echo "✅ Types generated: $OUTPUT_FILE"
echo ""
echo "🎉 Done! Don't forget to commit the generated types."
