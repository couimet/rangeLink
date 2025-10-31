# Multi-Language Architecture: Specification-Driven Development

## The Challenge

When RangeLink grows to support multiple languages (TypeScript, Java, C/C++, Rust, etc.) and multiple IDEs (VSCode, Xcode, InDesign, Neovim), how do we:

1. **Ensure feature parity** across all language implementations?
2. **Enforce consistency** when adding new features?
3. **Scale development** without duplicating effort?
4. **Maintain quality** across all implementations?

## Solution: Specification-First + Contract Testing

### Core Principles

1. **Single Source of Truth**: The specification defines behavior, not any implementation
2. **Contract-Driven**: All implementations must pass the same contract tests
3. **Language-Agnostic Contracts**: Test cases are defined in JSON/YAML, executable in any language
4. **CI Enforcement**: Parity is not optional—CI will fail if implementations diverge

## Architecture

### Directory Structure

```
rangeLink/
  spec/                             # The specification hub
    schema/
      range-link.schema.json        # JSON Schema for all data structures
      selection.schema.json         # Selection types
      config.schema.json            # Configuration structure
    contracts/                      # Behavioral contracts (language-agnostic)
      build-link/
        single-line.json            # Test cases for single-line links
        multi-line.json
        rectangular mode.json
        portable.json
      parse-link/
        all-formats.json            # Test cases for parsing
        error-handling.json
        edge-cases.json
      validation/
        delimiter-validation.json   # Configuration validation tests
        reserved-chars.json
    docs/
      specification.md              # Human-readable spec
      examples.md
  packages/
    rangelink-core-ts/              # TypeScript implementation
      src/
        RangeLinkBuilder.ts         # Implements build-link contracts
        RangeLinkParser.ts          # Implements parse-link contracts
        ConfigValidator.ts          # Implements validation contracts
      tests/
        unit/                       # Language-specific unit tests
        contracts/                  # Contract test runner
          test-build-link.ts        # Runs spec/contracts/build-link/*.json
          test-parse-link.ts
          test-validation.ts
      package.json
    rangelink-core-java/
      src/
        RangeLinkBuilder.java      # Same contracts, Java implementation
        RangeLinkParser.java
        ConfigValidator.java
      tests/
        unit/
        contracts/
          ContractTestRunner.java   # Runs spec/contracts/**/*.json
      pom.xml
    rangelink-core-c/
      src/
        rangelink_builder.c         # C implementation
        rangelink_parser.c
        config_validator.c
      tests/
        unit/
        contracts/
          contract_runner.c         # Runs spec/contracts/**/*.json
      CMakeLists.txt
    # ... more core implementations
    rangelink-vscode-extension/
      package.json                  # Depends on rangelink-core-ts
    rangelink-xcode-extension/     # Depends on rangelink-core-c or Swift wrapper
      # ...
  tools/
    contract-runner/               # Language-agnostic contract test runner
      runner.js                     # Can execute contracts in any language
      validate-parity.sh            # Checks all implementations pass all contracts
```

## Specification Format

### JSON Schema (Data Structures)

```json
// spec/schema/range-link.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "RangeLink": {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "ranges": {
          "type": "array",
          "items": { "$ref": "#/definitions/Range" }
        },
        "isPortable": { "type": "boolean" },
        "metadata": { "$ref": "#/definitions/DelimiterMetadata" }
      },
      "required": ["path"]
    },
    "Range": {
      "type": "object",
      "properties": {
        "startLine": { "type": "integer", "minimum": 1 },
        "startColumn": { "type": "integer", "minimum": 1 },
        "endLine": { "type": "integer", "minimum": 1 },
        "endColumn": { "type": "integer", "minimum": 1 },
        "isRectangularMode": { "type": "boolean" }
      },
      "required": ["startLine", "endLine"]
    }
  }
}
```

### Contract Tests (Behavioral)

```json
// spec/contracts/build-link/rectangular mode.json
{
  "name": "rectangular_mode_selection",
  "description": "Multiple selections with same column range should produce double hash",
  "testCases": [
    {
      "name": "simple_column_selection",
      "input": {
        "path": "src/file.ts",
        "selections": [
          { "line": 10, "startChar": 5, "endChar": 10 },
          { "line": 11, "startChar": 5, "endChar": 10 },
          { "line": 12, "startChar": 5, "endChar": 10 }
        ],
        "config": {
          "delimiterLine": "L",
          "delimiterPosition": "C",
          "delimiterHash": "#",
          "delimiterRange": "-"
        }
      },
      "expected": {
        "link": "src/file.ts##L10C6-L12C11",
        "isRectangularMode": true
      }
    },
    {
      "name": "rectangular_mode_with_custom_delimiters",
      "input": {
        "path": "src/file.ts",
        "selections": [
          { "line": 5, "startChar": 3, "endChar": 8 },
          { "line": 6, "startChar": 3, "endChar": 8 }
        ],
        "config": {
          "delimiterLine": "LINE",
          "delimiterPosition": "COL",
          "delimiterHash": "##",
          "delimiterRange": "TO"
        }
      },
      "expected": {
        "link": "src/file.ts####LINE5COL3-TOCOL8LINE6",
        "isRectangularMode": true
      }
    }
  ]
}
```

```json
// spec/contracts/parse-link/all-formats.json
{
  "name": "parse_all_link_formats",
  "testCases": [
    {
      "name": "parse_single_line",
      "input": { "link": "src/file.ts#L42" },
      "expected": {
        "path": "src/file.ts",
        "ranges": [{ "startLine": 42, "endLine": 42 }]
      }
    },
    {
      "name": "parse_rectangular_mode",
      "input": { "link": "src/file.ts##L10C5-L20C10" },
      "expected": {
        "path": "src/file.ts",
        "ranges": [
          {
            "startLine": 10,
            "startColumn": 5,
            "endLine": 20,
            "endColumn": 10,
            "isRectangularMode": true
          }
        ]
      }
    },
    {
      "name": "parse_portable_link",
      "input": { "link": "src/file.ts#L10C5-L20C10~#~L~-~C~" },
      "expected": {
        "path": "src/file.ts",
        "isPortable": true,
        "metadata": {
          "hash": "#",
          "line": "L",
          "range": "-",
          "column": "C"
        },
        "ranges": [
          {
            "startLine": 10,
            "startColumn": 5,
            "endLine": 20,
            "endColumn": 10
          }
        ]
      }
    }
  ]
}
```

## Contract Test Execution

### TypeScript Example

```typescript
// packages/rangelink-core-ts/tests/contracts/test-build-link.ts
import * as fs from 'fs';
import * as path from 'path';
import { RangeLinkBuilder } from '../../src/RangeLinkBuilder';

describe('Contract Tests: Build Link', () => {
  const contractDir = path.join(__dirname, '../../../spec/contracts/build-link');
  const contractFiles = fs
    .readdirSync(contractDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(contractDir, f));

  contractFiles.forEach((contractFile) => {
    const contract = JSON.parse(fs.readFileSync(contractFile, 'utf-8'));

    describe(contract.name, () => {
      contract.testCases.forEach((testCase: any) => {
        it(testCase.name, () => {
          const builder = new RangeLinkBuilder(testCase.input.config);
          const result = builder.build(testCase.input.path, testCase.input.selections);

          expect(result.link).toBe(testCase.expected.link);
          expect(result.isRectangularMode).toBe(testCase.expected.isRectangularMode);
        });
      });
    });
  });
});
```

### Java Example

```java
// packages/rangelink-core-java/src/test/java/contracts/ContractTestRunner.java
public class BuildLinkContractTests {
    @ParameterizedTest
    @JsonSource("../../../../spec/contracts/build-link/*.json")
    public void testContracts(Contract contract) {
        for (TestCase testCase : contract.getTestCases()) {
            RangeLinkBuilder builder = new RangeLinkBuilder(testCase.getInput().getConfig());
            Result result = builder.build(
                testCase.getInput().getPath(),
                testCase.getInput().getSelections()
            );

            assertEquals(testCase.getExpected().getLink(), result.getLink());
            assertEquals(testCase.getExpected().isRectangularMode(), result.isRectangularMode());
        }
    }
}
```

### CI Enforcement

```yaml
# .github/workflows/validate-parity.yml
name: Validate Feature Parity

on: [push, pull_request]

jobs:
  validate-parity:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        implementation:
          - rangelink-core-ts
          - rangelink-core-java
          - rangelink-core-c
    steps:
      - uses: actions/checkout@v3
      - name: Run contract tests
        run: |
          cd packages/${{ matrix.implementation }}
          npm run test:contracts  # or mvn test, cmake test, etc.
      - name: Verify all contracts passed
        run: |
          ./tools/contract-runner/validate-parity.sh
          # Fails if ANY implementation fails ANY contract
```

## Development Workflow

### Adding a New Feature (e.g., Multi-Range Selection)

1. **Define in Specification:**

   ```json
   // spec/contracts/build-link/multi-range.json
   {
     "name": "multi_range_selection",
     "testCases": [
       {
         "name": "two_ranges",
         "input": {
           "path": "src/file.ts",
           "ranges": [
             { "startLine": 10, "endLine": 20 },
             { "startLine": 30, "endLine": 40 }
           ]
         },
         "expected": {
           "link": "src/file.ts#L10-L20,L30-L40"
         }
       }
     ]
   }
   ```

2. **All Implementations Must Pass:**
   - Update `rangelink-core-ts` → run `npm run test:contracts`
   - Update `rangelink-core-java` → run `mvn test:contracts`
   - Update `rangelink-core-c` → run `cmake test:contracts`
   - CI fails if any implementation doesn't pass new contracts

3. **Extension Selectively Exposes:**
   ```typescript
   // packages/rangelink-vscode-extension/src/extension.ts
   if (vscode.window.activeTextEditor.selections.length > 1) {
     // VSCode supports multiple selections, so expose multi-range
     const link = builder.buildMultiRange(path, selections);
   } else {
     // Single selection
     const link = builder.build(path, selection);
   }
   ```

## Tooling Recommendations

### For TypeScript/JavaScript:

- **Jest** with custom JSON loader for contract tests
- **Swagger/OpenAPI** for API documentation generation
- **ajv** for JSON Schema validation

### For Java:

- **JUnit 5** with `@ParameterizedTest` and custom JSON source
- **Jackson** for JSON parsing
- **jsonschema2pojo** to generate POJOs from schemas

### For C/C++:

- **Catch2** or **Google Test** with custom JSON loader
- **nlohmann/json** for JSON parsing
- **valijson** for JSON Schema validation

### Universal Tools:

- **Docker** containers for consistent test environments
- **Makefile** for cross-language build/test commands
- **GitHub Actions** for CI/CD across all languages

## Benefits

1. **Feature Parity Guaranteed**: CI enforces it; can't ship without it
2. **Faster Development**: Write spec once, implement in multiple languages
3. **Better Testing**: Shared contracts = comprehensive coverage
4. **Clear Documentation**: Spec serves as living documentation
5. **Platform Flexibility**: Extensions expose what their platform supports
6. **Scalability**: Easy to add new languages/IDEs

## Challenges & Solutions

### Challenge: Different languages, different capabilities

**Solution**: Contracts define WHAT, implementations define HOW. Use language-specific unit tests for implementation details.

### Challenge: Keeping schemas in sync

**Solution**: JSON Schema validation in CI; schema changes require all implementations to update.

### Challenge: Test execution across languages

**Solution**: Docker containers for consistent environments; Makefile for unified commands.

### Challenge: Debugging contract failures

**Solution**: Detailed error messages; implementation-specific unit tests for debugging.

## Conclusion

This specification-first, contract-driven approach ensures that RangeLink can scale to any language and any IDE while maintaining quality, feature parity, and development velocity. The specification is the single source of truth, and contracts enforce it automatically.
