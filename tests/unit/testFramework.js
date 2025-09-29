"use strict";
/**
 * Simple test framework for R indent extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
class TestRunner {
    constructor() {
        this.results = [];
    }
    async runTest(testCase) {
        try {
            // This would integrate with VSCode testing API in a real test
            // For now, we'll create a simplified test structure
            const result = {
                name: testCase.name,
                passed: false,
                expected: testCase.expected,
                actual: null,
            };
            // TODO: Implement actual testing logic with VSCode API
            // This would involve:
            // 1. Creating a test document with the input code
            // 2. Setting cursor position
            // 3. Triggering indentation engine
            // 4. Comparing result with expected
            this.results.push(result);
            return result;
        }
        catch (error) {
            const result = {
                name: testCase.name,
                passed: false,
                expected: testCase.expected,
                actual: null,
                error: String(error),
            };
            this.results.push(result);
            return result;
        }
    }
    async runTests(testCases) {
        const results = [];
        for (const testCase of testCases) {
            const result = await this.runTest(testCase);
            results.push(result);
        }
        return results;
    }
    getResults() {
        return [...this.results];
    }
    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        return { total, passed, failed };
    }
    printResults() {
        console.log('\n=== R Indent Test Results ===');
        for (const result of this.results) {
            const status = result.passed ? '✓' : '✗';
            console.log(`${status} ${result.name}`);
            if (!result.passed) {
                console.log(`  Expected: ${JSON.stringify(result.expected)}`);
                console.log(`  Actual: ${JSON.stringify(result.actual)}`);
                if (result.error) {
                    console.log(`  Error: ${result.error}`);
                }
            }
        }
        const summary = this.getSummary();
        console.log(`\nTotal: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`);
    }
}
exports.TestRunner = TestRunner;
