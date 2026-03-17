import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_PATH = join('src', 'config.json');
const VERSION = '1.0.0';

interface HelperOptions {
  verbose: boolean;
  timeout: number;
}

const processInput = (input: string, options: HelperOptions): string => {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();
  const result = normalized.replace(/\s+/g, '-');
  return options.verbose ? `[${VERSION}] ${result}` : result;
};

const loadConfig = (): Record<string, unknown> => {
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
};

class DataProcessor {
  private readonly name: string;
  private readonly options: HelperOptions;

  constructor(name: string, options: HelperOptions) {
    this.name = name;
    this.options = options;
  }

  process(data: string[]): string[] {
    return data.map((item) => processInput(item, this.options));
  }

  getName(): string {
    return this.name;
  }
}

export { processInput, loadConfig, DataProcessor, HelperOptions, CONFIG_PATH, VERSION };
