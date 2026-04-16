const CONTENT_PLACEHOLDER = '${content}';

/**
 * Recursively interpolate `${content}` placeholders in a command argument template.
 *
 * Deep-walks the template structure, replacing every `${content}` occurrence
 * in string values with the provided content. Non-string leaves (numbers,
 * booleans, null/undefined) pass through unchanged.
 *
 * @param template - Argument template from insertCommands config (string, array, or object)
 * @param content - The link text to substitute for `${content}` placeholders
 * @returns The interpolated argument structure, ready to spread into executeCommand
 */
export const interpolateArgs = (template: unknown, content: string): unknown => {
  if (typeof template === 'string') {
    if (template === CONTENT_PLACEHOLDER) {
      return content;
    }
    return template.split(CONTENT_PLACEHOLDER).join(content);
  }

  if (Array.isArray(template)) {
    return template.map((item) => interpolateArgs(item, content));
  }

  if (template !== null && template !== undefined && typeof template === 'object') {
    return Object.fromEntries(
      Object.entries(template as Record<string, unknown>).map(([key, value]) => [
        key,
        interpolateArgs(value, content),
      ]),
    );
  }

  return template;
};
