# R Indent - VSCode Extension

Intelligent auto-indentation for R that emulates RStudio's indentation behavior in VSCode and CodeOSS IDEs (e.g. Cursor, Positron).

## Features

### **RStudio-Style Bracket Alignment**
- Newlines wrap to the indentation of the opening bracket

### **RStudio-Style Chain Indentation**
- Pipe operators (`%>%`, `|>`) with 2-space continuation indentation
- Arithmetic operators (`+`, `-`, `*`, `/`) for ggplot and calculations
- Assignment operators (`<-`, `=`, `->`) with proper alignment
- Comparison and logical operators with consistent indentation
- Context-aware: chains take precedence outside parentheses

### **Function Argument Alignment**
- Aligns arguments to opening parentheses inside function calls
- Parameter assignments with additive indentation (bracket alignment + 2 spaces)
- Handles nested function calls and complex expressions
- Supports all bracket types: `()`, `[]`, `{}`
- Immediate newlines after opening brackets get default indentation

### **Context-Sensitive Logic**
- Proximity-based additive rule system for cooperative indentation
- Bracket alignment takes precedence inside parentheses over outer operators
- Operator chains apply outside parentheses
- Parameter assignments combine with bracket alignment inside parentheses
- Intelligent closing bracket context detection
- No indentation after completed chains

## How It Works

The extension analyzes your R code context when you press Enter or type closing brackets, applying intelligent indentation rules:

```r
# Operator chain indentation (2 spaces)
ggplot(mtcars, aes(x = disp, y = mpg)) +
  geom_point() +                        # ← 2-space indentation
  geom_smooth() +
  labs(title = "My Plot")

# Pipe chains with 2-space indentation
mtcars %>%
  filter(mpg > 20) %>%                  # ← 2-space indentation
  select(mpg, cyl, hp) %>%
  arrange(desc(mpg))

# Function argument alignment
result <- my_function(arg1 = value1,
                      arg2 = value2,    # ← Aligns to opening parenthesis
                      arg3 = value3)

# Parameter assignments: bracket alignment + 2 spaces
strtoi("5",
       base = 
         10L)                          # ← 7 (bracket) + 2 (param) = 9 spaces

# Arithmetic chains
result <- 5 +
  10 +                                  # ← 2-space indentation
  15 *
  20

# Context-aware: bracket alignment inside parentheses
ggplot(data) +
  coord_radial(start = -0.4 * pi,
               end = 0.4 * pi,          # ← Bracket alignment wins inside ()
               inner.radius = 0.3)
```

## Configuration

Access settings via `Preferences > Settings > Extensions > R Indent`:

| Setting | Default | Description |
|---------|---------|-------------|
| `indentSize` | `2` | Base indentation size for all operations (operator chains, brackets, etc.) |
| `alignFunctionArguments` | `true` | Align function args to opening parentheses |
| `enableDebugLogging` | `false` | Enable structured debug logging (Auto-Indent Check and Applied logs) |
| `engine` | `rules` | Indentation engine: `rules` (default), `ast`, or `air` (experimental) |
| `airExecutablePath` | `` | Optional absolute path to `air` binary for `engine = "air"` |
| `showStatusBar` | `false` | Show current engine in status bar (click to toggle). Off by default |

### Example Configuration

```json
{
  "rIndent.indentSize": 2,
  "rIndent.alignFunctionArguments": true,
  "rIndent.enableDebugLogging": false,
  "rIndent.engine": "rules"
}
```

## Engines

### Rules (default mode)
- Priority-based, cooperative rules implemented in TypeScript
- Fast and robust; emulates RStudio behavior across common scenarios

### AST (experimental)
- Lightweight AST-like parsing to improve context decisions
- Adds cases for commas, parameter alignment, line-start operators, mixed bracket/pipe chains
- Comparable performance to Rules, helpful on complex nesting

### [Air](https://github.com/posit-dev/air) (experimental)
- Uses `posit-dev/air` formatter on a small slice for on-type indentation
- Configure with `"rIndent.engine": "air"` and (optionally) `"rIndent.airExecutablePath"`
- Best parity with Air/RStudio formatting but slower for on-type; recommended to try and switch back if performance is a concern

## Commands

- R Indent: Toggle Engine (`rIndent.toggleEngine`)
- R Indent: Show Recent Logs (`rIndent.showRecentLogs`)
- R Indent: Toggle Debug Logging (`rIndent.toggleDebugLogging`)

## Installation

### From Local Development
- **VS Code**: `npm run install:local`
- **Cursor**: `npm run install:cursor`

### Manual Installation
```bash
# Build the extension
npm run compile

# Install in VS Code
bash ./scripts/install-local.sh

# Install in Cursor
bash ./scripts/install-local.sh --cursor
```

## Development

### Setup
```bash
npm install             # Install dependencies
npm run compile         # Build once
npm run watch           # Watch for changes
```

### Testing

1. Launch Extension Development Host (Press `F5` in VS Code)
2. Test with sample R code (see tests/indent_test.R for examples)

### Project Structure
```
src/
├── config/                       # Configuration management
│   ├── defaults.ts               # Default configuration values
│   ├── settings.ts               # VSCode settings integration
│   └── types.ts                  # Type definitions
├── indentation/                  # Engines and parsers
│   ├── indentationEngine.ts      # Main engine (rules/ast/air) + cooperative logic
│   ├── rParser.ts                # Lightweight R scanning (brackets, comments)
│   ├── rASTParser.ts             # AST-like window parser for AST mode
│   └── airRunner.ts              # Slice-based AIR CLI integration
├── rules/                        # Indentation rules (priority-based)
│   ├── BaseRule.ts               # Abstract base
│   ├── OperatorChainRules.ts     # Operator chains
│   ├── ParameterRules.ts         # Parameter assignment
│   ├── BracketRules.ts           # Bracket alignment & closing
│   └── AirASTRules.ts            # AST mode rules (AIR stylization inspired)
├── utils/
│   └── debugUtils.ts             # Structured debug logging (toggleable)
└── extension.ts                  # Entry point (commands, status bar, providers)

tests/
├── unit/                         # TypeScript unit tests
│   ├── testFramework.ts
│   ├── bracketTests.ts
│   └── pipeTests.ts
├── headless-js/                  # Headless engine tests (mocked vscode)
│   └── engineAstMode.spec.js     # AST coverage, plus others
├── performance/                  # Perf benchmarks (rules vs ast vs air)
│   └── bench.air.spec.js
├── integration/                  # VS Code host integration tests (CI-focused)
│   ├── runTest.ts
│   └── suite/
│       └── indentation.test.ts
├── manual_indent_tests.R         # Manual scenarios
└── comprehensive_test.R          # Extended scenarios
```

## Architecture

The extension uses a modular, proximity-based rule architecture:

1. **Context Parser**: Analyzes R syntax and cursor context
2. **Proximity-Based Engine**: Applies cooperative indentation rules
3. **Structured Logging**: Detailed debug output with rule explanations
4. **Configuration**: User-customizable settings
5. **VSCode Integration**: Seamless editor integration

### Rule Priority & Cooperation
1. **OperatorChain** (120) - Highest priority for operator chains outside parentheses
2. **ParameterAssignment** (110) - Parameter value indentation (additive with brackets)
3. **BracketAlignment** (100) - Function argument alignment
4. **HangingIndent** (90) - Fallback indentation
5. **ClosingBracketContext** (85) - Context-aware closing bracket alignment
6. **ClosingBracket** (80) - Basic closing bracket handling

### Proximity-Based Additive System
- **Immediate Layer**: Parameter assignments, operator chains at cursor
- **Surrounding Layer**: Bracket alignment, hanging indents
- **Terminating Rules**: Closing bracket contexts override all others
- **Cooperative Logic**: Rules combine additively (bracket position + parameter indent)

### Key Design Principles
- **Context-first**: Parse complete context before applying rules
- **Additive cooperation**: Rules combine rather than compete
- **RStudio compatibility**: Matches RStudio's indentation behavior exactly
- **Intelligent overrides**: Bracket alignment takes precedence over outer operators
- **Structured debugging**: Comprehensive rule application logging

## Comparison with RStudio

| Feature | RStudio | This Extension |
|---------|---------|----------------|
| Operator chain indentation | ✅ | ✅ |
| Function argument alignment | ✅ | ✅ |
| Parameter assignment alignment | ✅ | ✅ |
| Context-aware rules | ✅ | ✅ |
| Chain completion detection | ✅ | ✅ |
| Pipe operator support | ✅ | ✅ |
| Arithmetic operator chains | ✅ | ✅ |
| Configurable behavior | Limited | ~ In Progress |
| Works in Cursor IDE | ❌ | ✅ |
| Works in Positron IDE | ❌ | ✅ |
| Performance | Native | Fast (TypeScript) |


### Reporting Issues
- Use the [GitHub Issues](https://github.com/ColinConwell/VSC-R-Indent/issues) page
- Include R code examples that demonstrate the issue
- Specify your VSCode version and extension settings