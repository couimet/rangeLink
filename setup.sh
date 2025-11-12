#!/bin/bash
# Quick setup script for RangeLink

set -e

# Helper function to display "run setup.sh again" instructions
print_rerun_instructions() {
    echo "After fixing this, run setup again:"
    echo "  ./setup.sh"
    exit 1
}

echo "🚀 Setting up RangeLink..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    echo "   Install it from: https://nodejs.org/"
    echo ""
    print_rerun_instructions
fi

# Check Node.js version (requires version 22)
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
REQUIRED_VERSION=22

if [[ "$NODE_VERSION" -lt "$REQUIRED_VERSION" ]]; then
    echo "❌ Error: Node.js version 22 or higher is required (currently on v$NODE_VERSION)."
    echo ""
    echo "To fix this, run:"
    echo "  nvm install && nvm use"
    echo ""
    echo "Or install Node.js 22 from: https://nodejs.org/"
    echo ""
    print_rerun_instructions
fi

echo "✓ Node.js version: $(node -v)"

# Enable corepack
echo "📦 Enabling pnpm via corepack..."
npm run enable-pnpm

# Install dependencies
echo "📥 Installing dependencies..."
pnpm install

# Compile
echo "🔨 Compiling TypeScript..."
pnpm compile

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Press F5 in VS Code to launch Extension Development Host"
echo "  2. Test your changes with Ctrl+R Ctrl+L (Windows) or Cmd+R Cmd+L (Mac)"
echo ""
echo "See DEVELOPMENT.md for more details."
