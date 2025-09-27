/**
 * Utilities for lightweight R syntax checks used by indentation rules
 */

/**
 * Determine if the text before the cursor represents a parameter assignment
 * in a function call, e.g. "name =" (not comparison operators like ==, !=, <=, >=).
 */
export function isParameterAssignmentBeforeCursor(textBeforeCursor: string): boolean {
  const trimmed = textBeforeCursor.trimEnd();
  // Exclude comparison-like endings
  if (/(==|!=|<=|>=)\s*$/.test(trimmed)) return false;
  // Match identifier (allow dot) followed by single '=' possibly with spaces
  return /\b[\w.]+\s*=\s*$/.test(trimmed);
}


