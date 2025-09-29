"use strict";
/**
 * Test cases for pipe operator indentation rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeConfigTestCases = exports.pipeTestCases = void 0;
exports.pipeTestCases = [
    {
        name: 'Basic magrittr pipe continuation',
        input: {
            code: 'data %>%',
            cursorLine: 0,
            cursorColumn: 8,
            isEnterKey: true,
        },
        expected: '  ', // Standard pipe indent
    },
    {
        name: 'Basic native pipe continuation',
        input: {
            code: 'data |>',
            cursorLine: 0,
            cursorColumn: 7,
            isEnterKey: true,
        },
        expected: '  ', // Standard pipe indent
    },
    {
        name: 'Multi-line pipe chain',
        input: {
            code: `mtcars %>%
  filter(mpg > 20) %>%`,
            cursorLine: 1,
            cursorColumn: 22,
            isEnterKey: true,
        },
        expected: '  ', // Continue with same pipe indent
    },
    {
        name: 'Pipe with function arguments',
        input: {
            code: `data %>%
  group_by(category) %>%
  summarise(mean_value = mean(value,`,
            cursorLine: 2,
            cursorColumn: 33,
            isEnterKey: true,
        },
        expected: '                              ', // Align to opening paren within pipe
    },
    {
        name: 'Nested function in pipe chain',
        input: {
            code: `data %>%
  mutate(new_col = some_function(param1,`,
            cursorLine: 1,
            cursorColumn: 38,
            isEnterKey: true,
        },
        expected: '                             ', // Align to function's opening paren
    },
    {
        name: 'Assignment with pipe start',
        input: {
            code: 'result <- data %>%',
            cursorLine: 0,
            cursorColumn: 18,
            isEnterKey: true,
        },
        expected: '  ', // Pipe indent from base level
    },
    {
        name: 'Indented assignment with pipe',
        input: {
            code: '  result <- data %>%',
            cursorLine: 0,
            cursorColumn: 20,
            isEnterKey: true,
        },
        expected: '    ', // Base indent (2) + pipe indent (2) = 4
    },
    {
        name: 'Complex pipe chain with ggplot',
        input: {
            code: `plot <- ggplot(data, aes(x, y)) +
  geom_point() %>%`,
            cursorLine: 1,
            cursorColumn: 16,
            isEnterKey: true,
        },
        expected: '  ', // Continue pipe chain
    },
];
exports.pipeConfigTestCases = [
    {
        name: 'Custom pipe indent size',
        input: {
            code: 'data %>%',
            cursorLine: 0,
            cursorColumn: 8,
            isEnterKey: true,
        },
        expected: '    ', // 4 spaces instead of default 2
        config: {
            pipeIndentSize: 4, // kept for backward-compat; mapped to indentSize internally
        },
    },
    {
        name: 'Disabled pipe alignment',
        input: {
            code: 'data %>%',
            cursorLine: 0,
            cursorColumn: 8,
            isEnterKey: true,
        },
        expected: null, // No special handling when disabled
        config: {
            enablePipeAlignment: false,
        },
    },
    {
        name: 'Pipe with bracket standard indent mode',
        input: {
            code: `data %>%
  group_by(category) %>%
  summarise(mean_value = mean(value,`,
            cursorLine: 2,
            cursorColumn: 33,
            isEnterKey: true,
        },
        expected: '      ', // Pipe indent (2) + standard indent (2) + function indent (2) = 6
        config: {
            bracketAlignment: 'standardIndent',
        },
    },
];
