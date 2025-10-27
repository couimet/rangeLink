import * as vscode from "vscode";

export interface Anchor {
  path: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  isAbsolute: boolean;
}

export class CodeAnchorService {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.tooltip = "CodeAnchor";
  }

  /**
   * Create an anchor for the current selection
   */
  async createAnchor(useAbsolutePath: boolean = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    const selection = editor.selection;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    // Determine the path
    let referencePath: string;
    if (workspaceFolder && !useAbsolutePath) {
      // Relative path from workspace root
      referencePath = vscode.workspace.asRelativePath(document.uri);
    } else {
      // Absolute path or no workspace
      referencePath = document.uri.fsPath;
    }

    // Normalize path separators
    referencePath = referencePath.replace(/\\/g, "/");

    // Format the anchor
    const anchorString = this.formatAnchor(referencePath, selection);

    // Copy to clipboard
    await vscode.env.clipboard.writeText(anchorString);

    // Show feedback
    this.showFeedback(anchorString);
  }

  /**
   * Format an anchor string based on the selection
   */
  private formatAnchor(path: string, selection: vscode.Selection): string {
    // Convert to 1-based indexing
    const startLine = selection.start.line + 1;
    const startColumn = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endColumn = selection.end.character + 1;

    // Handle empty selection (cursor position)
    if (selection.isEmpty) {
      return `${path}:${startLine}`;
    }

    // Handle single line selection
    if (startLine === endLine) {
      const lineNum = `L${startLine}`;

      // Check if it's a full line selection
      if (startColumn === 1 && endColumn > 1) {
        // Use a line hint: check if selection goes to end of line
        const line = vscode.window.activeTextEditor!.document.lineAt(
          startLine - 1
        );
        if (selection.end.character >= line.text.length) {
          return `${path}:${startLine}`;
        }
      }

      // Specific columns
      return `${path}#${lineNum}C${startColumn}-${lineNum}C${endColumn}`;
    }

    // Handle multi-line selection
    // If it's a full multi-line block (columns at start and end of lines)
    const isFullBlock =
      selection.start.character === 0 && selection.end.character === 0;

    if (isFullBlock) {
      return `${path}#L${startLine}-L${endLine}`;
    }

    // Multi-line with specific columns
    return `${path}#L${startLine}C${startColumn}-L${endLine}C${endColumn}`;
  }

  /**
   * Show feedback to the user
   */
  private showFeedback(anchorString: string): void {
    // Show in status bar
    this.statusBarItem.text = `$(check) Anchored: ${anchorString}`;
    this.statusBarItem.show();

    // Use global setTimeout (provided by Node.js environment)
    global.setTimeout(() => {
      this.statusBarItem.hide();
    }, 3000);

    // Optionally show an information message (commented out to be less intrusive)
    // vscode.window.showInformationMessage(`Created anchor: ${anchorString}`);
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

let service: CodeAnchorService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const currentService = new CodeAnchorService();
  service = currentService;

  // Register commands
  const createAnchor = vscode.commands.registerCommand(
    "codeanchor.createAnchor",
    async () => {
      await currentService.createAnchor(false);
    }
  );

  const createAbsoluteAnchor = vscode.commands.registerCommand(
    "codeanchor.createAbsoluteAnchor",
    async () => {
      await currentService.createAnchor(true);
    }
  );

  context.subscriptions.push(createAnchor, createAbsoluteAnchor);
}

export function deactivate(): void {
  if (service) {
    service.dispose();
  }
}
