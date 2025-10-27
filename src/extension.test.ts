import * as vscode from "vscode";

// Mock vscode module
const mockStatusBarItem = {
  text: "",
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};

const mockClipboard = {
  writeText: jest.fn(),
};

const mockWindow = {
  activeTextEditor: null,
  createStatusBarItem: jest.fn(() => mockStatusBarItem),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
};

const mockWorkspace = {
  getWorkspaceFolder: jest.fn(),
  asRelativePath: jest.fn(),
};

const mockCommands = {
  registerCommand: jest.fn(),
};

jest.mock("vscode", () => ({
  window: mockWindow,
  workspace: mockWorkspace,
  env: { clipboard: mockClipboard },
  commands: mockCommands,
  StatusBarAlignment: { Right: 1 },
  Uri: {
    parse: jest.fn((path: string) => ({ fsPath: path, path })),
  },
  Range: class {
    constructor(public start: any, public end: any) {}
  },
  Selection: class {
    constructor(public start: any, public end: any) {}
    isEmpty = false;
  },
  ExtensionMode: { Production: 1 },
  ExtensionKind: { Workspace: 1 },
}));

describe("CodeAnchorService", () => {
  let service: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);

    // Import after mocks are set up
    const { CodeAnchorService } = require("./extension");
    service = new CodeAnchorService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe("createAnchor - Cursor position (empty selection)", () => {
    it("should create anchor for empty selection", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith("src/file.ts:6");
    });
  });

  describe("createAnchor - Single line selections", () => {
    it("should create anchor for full line selection", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 10, character: 5 },
          isEmpty: false,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
          lineAt: jest.fn().mockReturnValue({
            text: "const x",
            range: { start: { character: 0 }, end: { character: 5 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith("src/file.ts:11");
    });

    it("should copy column range for partial line selection", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 20, character: 5 },
          end: { line: 20, character: 15 },
          isEmpty: false,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
          lineAt: jest.fn().mockReturnValue({
            text: "const x = 5; some long text",
            range: { start: { character: 0 }, end: { character: 30 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        "src/file.ts#L21C6-L21C15"
      );
    });
  });

  describe("createAnchor - Multi-line selections", () => {
    it("should copy range when selection spans multiple full lines", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 25, character: 0 },
          isEmpty: false,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        "src/file.ts#L11-L26"
      );
    });

    it("should copy column range when selection has specific columns", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 5 },
          end: { line: 25, character: 10 },
          isEmpty: false,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        "src/file.ts#L11C6-L26C11"
      );
    });
  });

  describe("createAnchor - Path handling", () => {
    it("should use relative path by default", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockWorkspace.asRelativePath).toHaveBeenCalled();
    });

    it("should use absolute path when requested", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "C:\\workspace\\src\\file.ts" },
        },
      };

      await service.createAnchor(true);

      expect(mockWorkspace.asRelativePath).not.toHaveBeenCalled();
      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).toContain("workspace");
    });

    it("should normalize Windows path separators", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "C:\\workspace\\src\\file.ts" },
        },
      };

      await service.createAnchor(true);

      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).not.toContain("\\");
    });
  });

  describe("createAnchor - Error handling", () => {
    it("should show error when no active editor", async () => {
      mockWindow.activeTextEditor = null;

      await service.createAnchor(false);

      expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
        "No active editor"
      );
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it("should handle missing workspace folder", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "/some/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue(undefined);

      await service.createAnchor(false);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  describe("createAnchor - Status bar feedback", () => {
    it("should show status bar message after copying", async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 42, character: 0 },
          end: { line: 42, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: "/workspace/src/file.ts" },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: "/workspace" },
      });
      mockWorkspace.asRelativePath.mockReturnValue("src/file.ts");

      await service.createAnchor(false);

      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(mockStatusBarItem.text).toBe("$(check) Copied: src/file.ts:43");
    });
  });

  describe("dispose", () => {
    it("should dispose status bar item", () => {
      service.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});

describe("Extension lifecycle", () => {
  it("should register commands on activate", () => {
    const mockContext = {
      subscriptions: [] as any[],
    };

    const extension = require("./extension");
    extension.activate(mockContext as any);

    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(2);
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });

  it("should clean up on deactivate", () => {
    const extension = require("./extension");
    extension.activate({ subscriptions: [] } as any);

    extension.deactivate();

    expect(mockStatusBarItem.dispose).toHaveBeenCalled();
  });
});
