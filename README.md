# R Indent - VSCode Extension

Intelligent auto-indentation for R that emulates RStudio's indentation behavior in Visual Studio Code.

## Features

### **Smart Bracket Alignment**
- Aligns function arguments to opening parentheses
- Handles nested brackets intelligently
- Supports all bracket types: `()`, `[]`, `{}`

### **Pipe Operator Support**
- Native R pipe (`|>`) and magrittr pipe (`%>%`) alignment
- Intelligent pipe chain continuation
- Mixed pipe and function argument handling

### **Configurable Behavior**
- RStudio compatibility mode
- Customizable indentation sizes
- Flexible bracket alignment options

### **Context-Aware Rules**
- Priority-based rule system
- Handles complex nested scenarios
- Smart fallback to default behavior

## How It Works

The extension analyzes your R code context when you press Enter or type closing brackets, applying intelligent indentation rules:

```r
# Function argument alignment
result <- my_function(arg1 = value1,
                      arg2 = value2,    # ← Aligns to opening parenthesis
                      arg3 = value3)

# Pipe operator chains
mtcars %>%
  filter(mpg > 20) %>%                  # ← Consistent pipe indentation
  select(mpg, cyl, hp) %>%
  arrange(desc(mpg))

# Mixed pipes with function arguments
data %>%
  group_by(category) %>%
  summarise(mean_value = mean(value,
                              na.rm = TRUE),  # ← Aligns within pipe context
            count = n())
```

## Configuration

Access settings via `Preferences > Settings > Extensions > R Indent`:

| Setting | Default | Description |
|---------|---------|-------------|
| `enablePipeAlignment` | `true` | Enable pipe operator alignment |
| `pipeIndentSize` | `2` | Spaces to indent after pipes |
| `alignFunctionArguments` | `true` | Align function args to opening paren |
| `bracketAlignment` | `"afterBracket"` | `"afterBracket"` or `"standardIndent"` |
| `rstudioCompatibility` | `true` | Enable RStudio-compatible behavior |

### Example Configuration

```json
{
  "rIndent.enablePipeAlignment": true,
  "rIndent.pipeIndentSize": 2,
  "rIndent.alignFunctionArguments": true,
  "rIndent.bracketAlignment": "afterBracket"
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

# Run tests (when available)
npm test
```

### Project Structure
```
src/
├── config/             # Configuration management
├── indentation/        # Core indentation engine
├── rules/             # Indentation rules
└── extension.ts       # Main extension entry point

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── comprehensive_test.R  # Test scenarios
```

## Architecture

The extension uses a modular, rule-based architecture:

1. **Parser**: Analyzes R syntax and context
2. **Rule Engine**: Applies priority-based indentation rules
3. **Configuration**: User-customizable settings
4. **Integration**: VSCode API integration

### Rule Priority
1. Pipe alignment rules (highest)
2. Bracket alignment rules
3. Function argument rules
4. Hanging indent rules
5. Default behavior (fallback)

## Comparison with RStudio

| Feature | RStudio | This Extension |
|---------|---------|----------------|
| Function argument alignment | ✅ | ✅ |
| Pipe operator support | ✅ | ✅ |
| Nested bracket handling | ✅ | ✅ |
| Configurable behavior | Limited | ✅ Extensive |
| Performance | Native | Fast (TypeScript) |

## Contributing

We welcome contributions! Please see [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for development guidelines.

### Reporting Issues
- Use the [GitHub Issues](https://github.com/ColinConwell/VSC-R-Indent/issues) page
- Include R code examples that demonstrate the issue
- Specify your VSCode version and extension settings

## License

MIT License - see [LICENSE](./LICENSE) for details.
