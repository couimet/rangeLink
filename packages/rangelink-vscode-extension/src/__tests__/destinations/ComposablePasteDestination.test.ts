import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';

import { FocusErrorReason } from '../../destinations/capabilities/PasteExecutor';
import { AutoPasteResult, PasteContentType } from '../../types';
import type { PaddingMode } from '../../utils/applySmartPadding';
import {
  createMockComposablePasteDestination,
  createMockEligibilityChecker,
  createMockFormattedLink,
  createMockPasteExecutor,
} from '../helpers';

const UNUSED_PADDING_MODE = 'parameter not used' as unknown as PaddingMode;
const ARBITRARY_PADDING_MODE: PaddingMode = 'none';

describe('ComposablePasteDestination', () => {
  const mockLogger = createMockLogger();

  describe('performPaste() (white-box)', () => {
    it('should check availability first', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ isAvailable, logger: mockLogger });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
      );

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return false when unavailable without checking eligibility', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const eligibilityCheck = jest.fn().mockResolvedValue(true);
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        UNUSED_PADDING_MODE,
      );

      expect(result).toBe(false);
      expect(eligibilityCheck).not.toHaveBeenCalled();
      expect(pasteExecutor.focus).not.toHaveBeenCalled();
    });

    it('should call eligibility check after availability', async () => {
      const eligibilityCheck = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ logger: mockLogger });
      const context = { fn: 'test', mock: true };

      await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
      );

      expect(eligibilityCheck).toHaveBeenCalledTimes(1);
    });

    it('should return false when not eligible without focusing', async () => {
      const eligibilityCheck = jest.fn().mockResolvedValue(false);
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Text,
        UNUSED_PADDING_MODE,
      );

      expect(result).toBe(false);
      expect(pasteExecutor.focus).not.toHaveBeenCalled();
    });

    it('should not double-pad already padded text', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const pasteExecutor = createMockPasteExecutor();
      (pasteExecutor as unknown as { _mockInsert: jest.Mock })._mockInsert = mockInsert;
      pasteExecutor.focus.mockResolvedValue(Result.ok({ insert: mockInsert }));

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste'](
        ' already-padded ',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        'both',
      );

      expect(mockInsert).toHaveBeenCalledWith(' already-padded ', context);
    });

    it('should focus before inserting text', async () => {
      const callOrder: string[] = [];
      const mockInsert = jest.fn().mockImplementation(async () => {
        callOrder.push('insert');
        return true;
      });

      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockImplementation(async () => {
        callOrder.push('focus');
        return Result.ok({ insert: mockInsert });
      });

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
      );

      expect(pasteExecutor.focus).toHaveBeenCalledTimes(1);
      expect(pasteExecutor.focus).toHaveBeenCalledWith(context);
      expect(callOrder).toStrictEqual(['focus', 'insert']);
    });

    it('should return true when insertion succeeds', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(Result.ok({ insert: mockInsert }));

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
      );

      expect(result).toBe(true);
    });

    it('should return false when insertion fails', async () => {
      const mockInsert = jest.fn().mockResolvedValue(false);
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(Result.ok({ insert: mockInsert }));

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
      );

      expect(result).toBe(false);
    });

    it('should return false when focus fails', async () => {
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(
        Result.err({ reason: FocusErrorReason.SHOW_DOCUMENT_FAILED }),
      );

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };
      const eligibilityCheck = jest.fn().mockResolvedValue(true);

      const result = await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        ARBITRARY_PADDING_MODE,
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

      await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Link,
        UNUSED_PADDING_MODE,
      );

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

      await destination['performPaste'](
        'text',
        context,
        eligibilityCheck,
        PasteContentType.Text,
        UNUSED_PADDING_MODE,
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        context,
        'Cannot paste content: Mock Destination not available',
      );
    });
  });

  describe('pasteLink() delegation', () => {
    it('should build context with formattedLink, linkLength, and paddingMode', async () => {
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink, 'both');

      expect(pasteExecutor.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteLink',
        formattedLink,
        linkLength: 9,
        paddingMode: 'both',
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

      await destination.pasteLink(formattedLink, 'both');

      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test-link', {
        fn: 'ComposablePasteDestination.isEligibleForPasteLink',
        mock: true,
      });
    });

    it('should pass link text to insert function with paddingMode applied', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(Result.ok({ insert: mockInsert }));

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('my-link');

      await destination.pasteLink(formattedLink, 'both');

      expect(mockInsert).toHaveBeenCalledWith(' my-link ', {
        fn: 'ComposablePasteDestination.pasteLink',
        formattedLink,
        linkLength: 7,
        paddingMode: 'both',
        mock: true,
      });
    });
  });

  describe('pasteContent() delegation', () => {
    it('should build context with contentLength and paddingMode', async () => {
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });

      await destination.pasteContent('test content', 'none');

      expect(pasteExecutor.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteContent',
        contentLength: 12,
        paddingMode: 'none',
        mock: true,
      });
    });

    it('should use isEligibleForPasteContent for eligibility check', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      await destination.pasteContent('test content', 'none');

      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test content', {
        fn: 'ComposablePasteDestination.isEligibleForPasteContent',
        mock: true,
      });
    });

    it('should pass content text to insert function with paddingMode applied', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(Result.ok({ insert: mockInsert }));

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });

      await destination.pasteContent('my content', 'both');

      expect(mockInsert).toHaveBeenCalledWith(' my content ', {
        fn: 'ComposablePasteDestination.pasteContent',
        contentLength: 10,
        paddingMode: 'both',
        mock: true,
      });
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
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        pasteExecutor,
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(pasteExecutor.focus).not.toHaveBeenCalled();
    });

    it('should delegate to pasteExecutor when available', async () => {
      const pasteExecutor = createMockPasteExecutor();
      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });

      await destination.focus();

      expect(pasteExecutor.focus).toHaveBeenCalledTimes(1);
      expect(pasteExecutor.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.focus',
        mock: true,
      });
    });

    it('should return true on successful focus', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should return false when focus fails', async () => {
      const pasteExecutor = createMockPasteExecutor();
      pasteExecutor.focus.mockResolvedValue(
        Result.err({ reason: FocusErrorReason.TERMINAL_FOCUS_FAILED }),
      );

      const destination = createMockComposablePasteDestination({
        pasteExecutor,
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(false);
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
      const destination = createMockComposablePasteDestination({ id: 'terminal' });

      expect(destination.id).toBe('terminal');
    });

    it('should expose displayName from config', () => {
      const destination = createMockComposablePasteDestination({
        displayName: 'Custom Display Name',
      });

      expect(destination.displayName).toBe('Custom Display Name');
    });

    it('should return jumpSuccessMessage from getJumpSuccessMessage', () => {
      const destination = createMockComposablePasteDestination({
        jumpSuccessMessage: 'Custom jump message',
      });

      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('Custom jump message');
    });

    it('should return loggingDetails from getLoggingDetails', () => {
      const loggingDetails = { terminal: 'bash', pid: 12345 };
      const destination = createMockComposablePasteDestination({ loggingDetails });

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
