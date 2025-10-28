import * as vscode from "vscode";

export interface Link {
  path: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  isAbsolute: boolean;
}

export class RangeLinkService {
  async createLink(useAbsolutePath: boolean = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    const selection = editor.selection;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    let referencePath: string;
    if (workspaceFolder && !useAbsolutePath) {
      referencePath = vscode.workspace.asRelativePath(document.uri);
    } else {
      referencePath = document.uri.fsPath;
    }

    referencePath = referencePath.replace(/\\/g, "/");

    const linkString = this.formatLink(referencePath, selection);

    await vscode.env.clipboard.writeText(linkString);

    this.showFeedback(linkString);
  }

  /**
   * Format a link string based on the selection
   */
  private formatLink(path: string, selection: vscode.Selection): string {
    // Convert to 1-based indexing
    const startLine = selection.start.line + 1;
    const startColumn = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endColumn = selection.end.character + 1;

    if (selection.isEmpty) {
      return `${path}:${startLine}`;
    }

    if (startLine === endLine) {
      const lineNum = `L${startLine}`;

      if (startColumn === 1 && endColumn > 1) {
        const line = vscode.window.activeTextEditor!.document.lineAt(
          startLine - 1
        );
        if (selection.end.character >= line.text.length) {
          return `${path}:${startLine}`;
        }
      }

      return `${path}#${lineNum}C${startColumn}-${lineNum}C${endColumn}`;
    }

    const isFullBlock =
      selection.start.character === 0 && selection.end.character === 0;

    if (isFullBlock) {
      return `${path}#L${startLine}-L${endLine}`;
    }

    return `${path}#L${startLine}C${startColumn}-L${endLine}C${endColumn}`;
  }

  private showFeedback(linkString: string): void {
    vscode.window.setStatusBarMessage(
      `$(check) Copied Range Link: ${linkString}`,
      3000
    );
  }
}

let service: RangeLinkService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const currentService = new RangeLinkService();
  service = currentService;

  const copyLinkToSelectionWithRelativePath = vscode.commands.registerCommand(
    "rangelink.copyLinkToSelectionWithRelativePath",
    async () => {
      await currentService.createLink(false);
    }
  );

  const copyLinkToSelectionWithAbsolutePath = vscode.commands.registerCommand(
    "rangelink.copyLinkToSelectionWithAbsolutePath",
    async () => {
      await currentService.createLink(true);
    }
  );

  context.subscriptions.push(
    copyLinkToSelectionWithRelativePath,
    copyLinkToSelectionWithAbsolutePath
  );
}
