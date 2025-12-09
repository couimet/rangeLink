import { createMockLogger } from 'barebone-logger-testing';

import { ComposablePasteDestination } from '../../destinations/ComposablePasteDestination';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import { PasteContentType } from '../../types/PasteContentType';
import {
  createMockComposablePasteDestination,
  createMockEligibilityChecker,
  createMockFocusManager,
  createMockTextInserter,
} from '../helpers/createMockComposablePasteDestination';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';

describe('ComposablePasteDestination', () => {
  const mockLogger = createMockLogger();

  describe('performPaste() (white-box)', () => {
    it('should check availability first', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ isAvailable, logger: mockLogger });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste']('text', context, eligibilityCheck, PasteContentType.Link);

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return false when unavailable without checking eligibility', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const eligibilityCheck = jest.fn().mockResolvedValue(true);
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
      );

      expect(result).toBe(false);
      expect(eligibilityCheck).not.toHaveBeenCalled();
      expect(textInserter.insert).not.toHaveBeenCalled();
    });

    it('should call eligibility check after availability', async () => {
      const eligibilityCheck = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ logger: mockLogger });
      const context = { fn: 'test', mock: true };

      await destination['performPaste']('text', context, eligibilityCheck, PasteContentType.Link);

      expect(eligibilityCheck).toHaveBeenCalledTimes(1);
    });

    it('should return false when not eligible without inserting', async () => {
      const eligibilityCheck = jest.fn().mockResolvedValue(false);
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Text,
      );

      expect(result).toBe(false);
      expect(textInserter.insert).not.toHaveBeenCalled();
    });

    it('should apply smart padding to text', async () => {
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste'](
        'unpadded',
        context,
        eligibilityCheck,
        PasteContentType.Link,
      );

      expect(textInserter.insert).toHaveBeenCalledWith(' unpadded ', context);
    });

    it('should not double-pad already padded text', async () => {
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste'](
        ' already-padded ',
        context,
        eligibilityCheck,
        PasteContentType.Link,
      );

      expect(textInserter.insert).toHaveBeenCalledWith(' already-padded ', context);
    });

    it('should focus before inserting text', async () => {
      const focusManager = createMockFocusManager();
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        focusManager,
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste']('text', context, eligibilityCheck, PasteContentType.Link);

      expect(focusManager.focus).toHaveBeenCalledTimes(1);
      expect(focusManager.focus).toHaveBeenCalledWith(context);

      const focusOrder = focusManager.focus.mock.invocationCallOrder[0];
      const insertOrder = textInserter.insert.mock.invocationCallOrder[0];
      expect(focusOrder).toBeLessThan(insertOrder);
    });

    it('should return true when insertion succeeds', async () => {
      const textInserter = createMockTextInserter();
      textInserter.insert.mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
      );

      expect(result).toBe(true);
    });

    it('should return false when insertion fails', async () => {
      const textInserter = createMockTextInserter();
      textInserter.insert.mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
      );

      expect(result).toBe(false);
    });

    it('should use "link" label for PasteContentType.Link in log messages', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste']('text', context, eligibilityCheck, PasteContentType.Link);

      expect(mockLogger.info).toHaveBeenCalledWith(
        context,
        'Cannot paste link: Mock Destination not available',
      );
    });

    it('should use "content" label for PasteContentType.Text in log messages', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste']('text', context, eligibilityCheck, PasteContentType.Text);

      expect(mockLogger.info).toHaveBeenCalledWith(
        context,
        'Cannot paste content: Mock Destination not available',
      );
    });
  });

  describe('pasteLink() delegation', () => {
    it('should build context with formattedLink and linkLength', async () => {
      const focusManager = createMockFocusManager();
      const destination = createMockComposablePasteDestination({
        focusManager,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink);

      expect(focusManager.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteLink',
        formattedLink,
        linkLength: 9,
        mock: true,
      });
    });

    it('should use isEligibleForPasteLink for eligibility check', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink);

      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test-link', {
        fn: 'ComposablePasteDestination.isEligibleForPasteLink',
        mock: true,
      });
    });

    it('should pass link text to performPaste', async () => {
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('my-link');

      await destination.pasteLink(formattedLink);

      expect(textInserter.insert).toHaveBeenCalledWith(
        ' my-link ',
        expect.objectContaining({ fn: 'ComposablePasteDestination.pasteLink' }),
      );
    });
  });

  describe('pasteContent() delegation', () => {
    it('should build context with contentLength', async () => {
      const focusManager = createMockFocusManager();
      const destination = createMockComposablePasteDestination({
        focusManager,
        logger: mockLogger,
      });

      await destination.pasteContent('test content');

      expect(focusManager.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteContent',
        contentLength: 12,
        mock: true,
      });
    });

    it('should use isEligibleForPasteContent for eligibility check', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      await destination.pasteContent('test content');

      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test content', {
        fn: 'ComposablePasteDestination.isEligibleForPasteContent',
        mock: true,
      });
    });

    it('should pass content text to performPaste', async () => {
      const textInserter = createMockTextInserter();
      const destination = createMockComposablePasteDestination({
        textInserter,
        logger: mockLogger,
      });

      await destination.pasteContent('my content');

      expect(textInserter.insert).toHaveBeenCalledWith(
        ' my content ',
        expect.objectContaining({ fn: 'ComposablePasteDestination.pasteContent' }),
      );
    });
  });

  describe('focus() behavior', () => {
    it('should check availability before focusing', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ isAvailable, logger: mockLogger });

      await destination.focus();

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return false when destination unavailable', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const focusManager = createMockFocusManager();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        focusManager,
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(focusManager.focus).not.toHaveBeenCalled();
    });

    it('should delegate to focusManager when available', async () => {
      const focusManager = createMockFocusManager();
      const destination = createMockComposablePasteDestination({
        focusManager,
        logger: mockLogger,
      });

      await destination.focus();

      expect(focusManager.focus).toHaveBeenCalledTimes(1);
      expect(focusManager.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.focus',
        mock: true,
      });
    });

    it('should return true on successful focus', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.focus();

      expect(result).toBe(true);
    });
  });

  describe('equality comparison', () => {
    it('should return false for undefined other', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should use singleton comparison when compareWith not provided', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const resultSame = await destination.equals(destination);
      expect(resultSame).toBe(true);

      const other = createMockComposablePasteDestination({ logger: mockLogger });
      const resultDifferent = await destination.equals(other);
      expect(resultDifferent).toBe(false);
    });

    it('should use compareWith when provided', async () => {
      const compareWith = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({
        compareWith,
        logger: mockLogger,
      });
      const other = createMockComposablePasteDestination({ logger: mockLogger });

      await destination.equals(other);

      expect(compareWith).toHaveBeenCalledTimes(1);
      expect(compareWith).toHaveBeenCalledWith(other);
    });

    it('should return result from compareWith', async () => {
      const compareWith = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        compareWith,
        logger: mockLogger,
      });
      const other = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.equals(other);

      expect(result).toBe(false);
    });
  });

  describe('user instructions', () => {
    it('should return undefined when getUserInstruction not provided', () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = destination.getUserInstruction(AutoPasteResult.Success);

      expect(result).toBeUndefined();
    });

    it('should delegate to getUserInstruction when provided', () => {
      const getUserInstruction = jest.fn().mockReturnValue('Manual paste instruction');
      const destination = createMockComposablePasteDestination({
        getUserInstruction,
        logger: mockLogger,
      });

      const result = destination.getUserInstruction(AutoPasteResult.Failure);

      expect(getUserInstruction).toHaveBeenCalledTimes(1);
      expect(getUserInstruction).toHaveBeenCalledWith(AutoPasteResult.Failure);
      expect(result).toBe('Manual paste instruction');
    });
  });

  describe('configuration properties', () => {
    it('should expose id from config', () => {
      const destination = new ComposablePasteDestination({
        id: 'terminal',
        displayName: 'Test',
        textInserter: createMockTextInserter(),
        eligibilityChecker: createMockEligibilityChecker(),
        focusManager: createMockFocusManager(),
        isAvailable: jest.fn().mockResolvedValue(true),
        jumpSuccessMessage: 'Jump success',
        loggingDetails: {},
        logger: mockLogger,
      });

      expect(destination.id).toBe('terminal');
    });

    it('should expose displayName from config', () => {
      const destination = new ComposablePasteDestination({
        id: 'text-editor',
        displayName: 'Custom Display Name',
        textInserter: createMockTextInserter(),
        eligibilityChecker: createMockEligibilityChecker(),
        focusManager: createMockFocusManager(),
        isAvailable: jest.fn().mockResolvedValue(true),
        jumpSuccessMessage: 'Jump success',
        loggingDetails: {},
        logger: mockLogger,
      });

      expect(destination.displayName).toBe('Custom Display Name');
    });

    it('should return jumpSuccessMessage from getJumpSuccessMessage', () => {
      const destination = new ComposablePasteDestination({
        id: 'text-editor',
        displayName: 'Test',
        textInserter: createMockTextInserter(),
        eligibilityChecker: createMockEligibilityChecker(),
        focusManager: createMockFocusManager(),
        isAvailable: jest.fn().mockResolvedValue(true),
        jumpSuccessMessage: 'Custom jump message',
        loggingDetails: {},
        logger: mockLogger,
      });

      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('Custom jump message');
    });

    it('should return loggingDetails from getLoggingDetails', () => {
      const loggingDetails = { terminal: 'bash', pid: 12345 };
      const destination = new ComposablePasteDestination({
        id: 'terminal',
        displayName: 'Test',
        textInserter: createMockTextInserter(),
        eligibilityChecker: createMockEligibilityChecker(),
        focusManager: createMockFocusManager(),
        isAvailable: jest.fn().mockResolvedValue(true),
        jumpSuccessMessage: 'Jump success',
        loggingDetails,
        logger: mockLogger,
      });

      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual(loggingDetails);
    });
  });

  describe('isEligibleForPasteLink() delegation', () => {
    it('should delegate to eligibilityChecker with correct context', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.isEligibleForPasteLink(formattedLink);

      expect(eligibilityChecker.isEligible).toHaveBeenCalledTimes(1);
      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test-link', {
        fn: 'ComposablePasteDestination.isEligibleForPasteLink',
        mock: true,
      });
    });

    it('should return result from eligibilityChecker', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      eligibilityChecker.isEligible.mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      const result = await destination.isEligibleForPasteLink(formattedLink);

      expect(result).toBe(false);
    });
  });

  describe('isEligibleForPasteContent() delegation', () => {
    it('should delegate to eligibilityChecker with correct context', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      await destination.isEligibleForPasteContent('test content');

      expect(eligibilityChecker.isEligible).toHaveBeenCalledTimes(1);
      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test content', {
        fn: 'ComposablePasteDestination.isEligibleForPasteContent',
        mock: true,
      });
    });

    it('should return result from eligibilityChecker', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      eligibilityChecker.isEligible.mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      const result = await destination.isEligibleForPasteContent('test content');

      expect(result).toBe(false);
    });
  });

  describe('isAvailable() delegation', () => {
    it('should delegate to isAvailable function', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });

      await destination.isAvailable();

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return result from isAvailable function', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });

      const result = await destination.isAvailable();

      expect(result).toBe(false);
    });
  });
});
