// The custom Jest matchers reach the compiler program through the test setup
// module, and the build configuration excludes that module. This declaration
// file keeps the matcher types in the program and emits no file of its own.
import '@couimet/detailed-error-testing/setup-before-jest-30';
import '@couimet/detailed-result-testing/setup-before-jest-30';
