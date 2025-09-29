"use strict";
/**
 * Test cases for bracket indentation rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bracketConfigTestCases = exports.bracketTestCases = void 0;
exports.bracketTestCases = [
    {
        name: 'Simple function call - align after parenthesis',
        input: {
            code: 'result <- my_function(arg1,',
            cursorLine: 0,
            cursorColumn: 26,
            isEnterKey: true,
        },
        expected: '                      ', // Align to position after opening paren
    },
    {
        name: 'Nested function calls',
        input: {
            code: 'data <- data.frame(x = c(1, 2, 3),',
            cursorLine: 0,
            cursorColumn: 34,
            isEnterKey: true,
        },
        expected: '                   ', // Align to position after opening paren
    },
    {
        name: 'List creation with multiple elements',
        input: {
            code: 'my_list <- list(first = c(1, 2, 3),',
            cursorLine: 0,
            cursorColumn: 35,
            isEnterKey: true,
        },
        expected: '                ', // Align to position after opening paren
    },
    {
        name: 'Closing parenthesis dedent',
        input: {
            code: `result <- my_function(arg1,
                      arg2)`,
            cursorLine: 1,
            cursorColumn: 26,
            triggerChar: ')',
        },
        expected: '', // Should dedent to match opening line
    },
    {
        name: 'Square bracket alignment',
        input: {
            code: 'data[condition,',
            cursorLine: 0,
            cursorColumn: 15,
            isEnterKey: true,
        },
        expected: '     ', // Align to position after opening bracket
    },
    {
        name: 'Curly brace hanging indent',
        input: {
            code: 'if (condition) {',
            cursorLine: 0,
            cursorColumn: 16,
            isEnterKey: true,
        },
        expected: '  ', // Standard hanging indent
    },
    {
        name: 'Nested brackets - recent takes priority',
        input: {
            code: 'outer_func(inner_func(param,',
            cursorLine: 0,
            cursorColumn: 29,
            isEnterKey: true,
        },
        expected: '                      ', // Align to inner function's opening paren
    },
    {
        name: 'Function with no arguments - hanging indent',
        input: {
            code: 'result <- some_function(',
            cursorLine: 0,
            cursorColumn: 24,
            isEnterKey: true,
        },
        expected: '  ', // Standard hanging indent when no content after bracket
    },
];
exports.bracketConfigTestCases = [
    {
        name: 'Standard indent mode instead of bracket alignment',
        input: {
            code: 'result <- my_function(arg1,',
            cursorLine: 0,
            cursorColumn: 26,
            isEnterKey: true,
        },
        expected: '  ', // Standard 2-space indent instead of alignment
        config: {
            bracketAlignment: 'standardIndent',
            alignFunctionArguments: false,
        },
    },
    {
        name: 'Disabled function argument alignment',
        input: {
            code: 'result <- my_function(arg1,',
            cursorLine: 0,
            cursorColumn: 26,
            isEnterKey: true,
        },
        expected: null, // No special indentation when disabled
        config: {
            alignFunctionArguments: false,
        },
    },
];
