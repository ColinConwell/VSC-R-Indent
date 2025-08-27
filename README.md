# R Indent - VSCode Extension

Intelligent auto-indentation for R that emulates RStudio's indentation behavior in Visual Studio Code and Cursor.

## Features

### **RStudio-Style Operator Chain Indentation**
- Pipe operators (`%>%`, `|>`) with 2-space continuation indentation
- Arithmetic operators (`+`, `-`, `*`, `/`) for ggplot and calculations
- Assignment operators (`<-`, `=`, `->`) with proper alignment
- Comparison and logical operators with consistent indentation
- Context-aware: chains take precedence outside parentheses

### **Function Argument Alignment**
- Aligns arguments to opening parentheses inside function calls
- Parameter assignments align values with parameter names
- Handles nested function calls and complex expressions
- Supports all bracket types: `()`, `[]`, `{}`

### **Context-Sensitive Logic**
- Bracket alignment takes precedence inside parentheses
- Operator chains take precedence outside parentheses
- Intelligent chain completion detection
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

# Parameter assignments align values
strtoi("5",
       base = 10L)                      # ← Value aligns with parameter name

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
| `enableDebugLogging` | `false` | Enable debug logging for development |

### Example Configuration

```json
{
  "rIndent.indentSize": 2,
  "rIndent.alignFunctionArguments": true,
  "rIndent.enableDebugLogging": false
}
```

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
npm install              # Install dependencies
npm run compile          # Build once
npm run watch           # Watch for changes
```

### Testing
```bash
# Launch Extension Development Host
# Press F5 in VS Code

# Test with sample R code
# See tests/indent_test.R for examples
```

### Project Structure
```
src/
├── config/             # Configuration management
├── indentation/        # Core indentation engine
├── rules/             # Indentation rules
│   ├── OperatorChainRules.ts  # Handles all operator chains
│   └── BracketRules.ts        # Handles bracket alignment
├── utils/             # Debug utilities
└── extension.ts       # Main extension entry point

tests/
├── unit/              # Unit test framework
├── indent_test.R      # Main test file
└── comprehensive_test.R  # Extended test scenarios
```

## Architecture

The extension uses a modular, rule-based architecture:

1. **Parser**: Analyzes R syntax and context
2. **Rule Engine**: Applies priority-based indentation rules
3. **Configuration**: User-customizable settings
4. **Integration**: VSCode API integration

### Rule Priority
1. **Operator Chain Rules** (pipes, arithmetic, assignment) - outside parentheses
2. **Bracket Alignment Rules** - inside parentheses and function calls
3. **VSCode Default** - fallback when no rules apply

### Key Design Principles
- **Context-aware**: Different rules apply inside vs outside parentheses
- **RStudio compatibility**: Matches RStudio's indentation behavior
- **Chain completion**: No indentation after completed chains
- **Parameter alignment**: Values align with parameter names

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
| Configurable behavior | Limited | ✅ Extensive |
| Works in Cursor | ❌ | ✅ |
| Performance | Native | Fast (TypeScript) |

## Contributing

We welcome contributions! Please check the GitHub repository for development guidelines.

### Reporting Issues
- Use the [GitHub Issues](https://github.com/ColinConwell/VSC-R-Indent/issues) page
- Include R code examples that demonstrate the issue
- Specify your VSCode version and extension settings

## License

MIT License - see [LICENSE](./LICENSE) for details.
