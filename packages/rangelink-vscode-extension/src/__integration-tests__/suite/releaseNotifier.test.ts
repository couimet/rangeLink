import assert from 'node:assert';

import * as vscode from 'vscode';

import type { RangeLinkExtensionApi } from '../../types/RangeLinkExtensionApi';
import { getExtensionVersion, getLogCapture, standardSuite, waitForHuman } from '../helpers';
import { parseLogContext } from '../helpers/logBasedUiAssertions';

const EXTENSION_ID = 'couimet.rangelink-vscode-extension';

const getReleaseNotifier = () => {
  const ext = vscode.extensions.getExtension<RangeLinkExtensionApi>(EXTENSION_ID);
  if (!ext?.isActive) throw new Error('Extension not active');
  return ext.exports.releaseNotifier;
};

standardSuite('Release Notifier', (ss) => {
  test('release-notifier-001: first install stores version silently without notification', async () => {
    const notifier = getReleaseNotifier();
    await notifier.setLastNotifiedVersion(undefined);
    const logCapture = getLogCapture();
    logCapture.mark('before-001');

    await notifier.maybeNotify();

    const lines = logCapture.getLinesSince('before-001');
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "First install — stored version" log',
    );
    assert.ok(
      !lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected no upgrade log on first install',
    );
    assert.notStrictEqual(
      notifier.getLastNotifiedVersion(),
      undefined,
      'Expected version to be stored in globalState after first install',
    );
    ss.log('✓ First install: version stored silently, no notification shown');
  });

  test('release-notifier-002: same version stored — skips silently', async () => {
    const notifier = getReleaseNotifier();
    await notifier.setLastNotifiedVersion(undefined);
    await notifier.maybeNotify(); // stores current version
    const versionAfterFirstInstall = notifier.getLastNotifiedVersion();

    const logCapture = getLogCapture();
    logCapture.mark('before-002');

    await notifier.maybeNotify(); // same version — should skip

    const lines = logCapture.getLinesSince('before-002');
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "Same version — skipping" log',
    );
    assert.ok(
      !lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected no upgrade log when version unchanged',
    );
    assert.strictEqual(
      notifier.getLastNotifiedVersion(),
      versionAfterFirstInstall,
      'Expected stored version to remain unchanged after same-version skip',
    );
    ss.log('✓ Same version: notification skipped, globalState unchanged');
  });

  test('[assisted] release-notifier-003: upgrade detected — dismiss is temporary, version not stored', async () => {
    const notifier = getReleaseNotifier();
    await notifier.setLastNotifiedVersion('0.0.0');

    ss.expectModalDialogs([
      {
        level: 'info',
        message: `RangeLink updated to v${getExtensionVersion()}. See what changed!`,
        items: ["What's New", 'Skip for this version'],
      },
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-003');

    await waitForHuman(
      'release-notifier-003',
      'Click Cancel here. A "RangeLink updated" notification will appear immediately — dismiss it with the X button (do NOT click either button).',
      [
        '1. Click Cancel on THIS notification',
        '2. When "RangeLink updated to vX.Y.Z. See what changed!" appears, close it with X',
        '3. Do NOT click "What\'s New" or "Skip for this version"',
      ],
    );

    await notifier.maybeNotify();

    const lines = logCapture.getLinesSince('before-003');
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected "Version upgrade detected" log',
    );
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected dismissed log confirming version was not stored',
    );
    assert.strictEqual(
      lines.filter((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }).length,
      1,
      'Expected exactly 1 non-upgrade maybeNotify log — no "opened release notes"',
    );
    assert.strictEqual(
      notifier.getLastNotifiedVersion(),
      '0.0.0',
      'Expected globalState to remain at "0.0.0" — dismiss must not store the new version',
    );
    ss.log(
      '✓ Upgrade notification dismissed; version not stored (still "0.0.0"), will reappear on next activation',
    );
  });

  test("[assisted] release-notifier-004: clicking What's New stores version and opens GitHub releases in browser", async () => {
    const notifier = getReleaseNotifier();
    await notifier.setLastNotifiedVersion('0.0.0');

    ss.expectModalDialogs([
      {
        level: 'info',
        message: `RangeLink updated to v${getExtensionVersion()}. See what changed!`,
        items: ["What's New", 'Skip for this version'],
      },
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-004');

    await waitForHuman(
      'release-notifier-004',
      'Click Cancel here. A "RangeLink updated" notification will appear immediately — click "What\'s New".',
      [
        '1. Click Cancel on THIS notification',
        '2. When "RangeLink updated to vX.Y.Z. See what changed!" appears, click "What\'s New"',
        '3. Confirm your browser opens to the GitHub releases page for that version',
      ],
    );

    await notifier.maybeNotify();

    const lines = logCapture.getLinesSince('before-004');
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected "Version upgrade detected" log',
    );
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "Opened release notes in browser" log after clicking What\'s New',
    );
    assert.strictEqual(
      notifier.getLastNotifiedVersion(),
      getExtensionVersion(),
      "Expected globalState to be updated to the current extension version after What's New click",
    );

    // Confirm storage by re-running: no popup should appear (fully automated)
    logCapture.mark('after-004-rerun');
    await notifier.maybeNotify();
    const rerunLines = logCapture.getLinesSince('after-004-rerun');
    assert.ok(
      rerunLines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "Same version — skipping" on re-run, proving version was stored',
    );
    assert.ok(
      !rerunLines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected no second upgrade notification — version must have been stored',
    );
    ss.log(
      '✓ Upgrade notification: "What\'s New" stored version and opened browser; re-run confirmed no second popup',
    );
  });

  test('[assisted] release-notifier-005: clicking Skip for this version stores version without opening browser', async () => {
    const notifier = getReleaseNotifier();
    await notifier.setLastNotifiedVersion('0.0.0');

    ss.expectModalDialogs([
      {
        level: 'info',
        message: `RangeLink updated to v${getExtensionVersion()}. See what changed!`,
        items: ["What's New", 'Skip for this version'],
      },
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-005');

    await waitForHuman(
      'release-notifier-005',
      'Click Cancel here. A "RangeLink updated" notification will appear immediately — click "Skip for this version".',
      [
        '1. Click Cancel on THIS notification',
        '2. When "RangeLink updated to vX.Y.Z. See what changed!" appears, click "Skip for this version"',
        '3. Confirm no browser window opens',
      ],
    );

    await notifier.maybeNotify();

    const lines = logCapture.getLinesSince('before-005');
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected "Version upgrade detected" log',
    );
    assert.ok(
      lines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "Release notification skipped for this version" log',
    );
    assert.strictEqual(
      lines.filter((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }).length,
      1,
      'Expected exactly 1 non-upgrade maybeNotify log — no "opened release notes"',
    );
    assert.strictEqual(
      notifier.getLastNotifiedVersion(),
      getExtensionVersion(),
      'Expected globalState to be updated to the current extension version after Skip click',
    );

    // Confirm storage by re-running: no popup should appear (fully automated)
    logCapture.mark('after-005-rerun');
    await notifier.maybeNotify();
    const rerunLines = logCapture.getLinesSince('after-005-rerun');
    assert.ok(
      rerunLines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.version !== undefined;
      }),
      'Expected "Same version — skipping" on re-run, proving version was stored',
    );
    assert.ok(
      !rerunLines.some((l) => {
        const ctx = parseLogContext(l);
        return ctx?.fn === 'ReleaseNotifier.maybeNotify' && ctx?.previousVersion !== undefined;
      }),
      'Expected no second upgrade notification — version must have been stored',
    );
    ss.log(
      '✓ Upgrade notification: "Skip for this version" stored version without opening browser; re-run confirmed no second popup',
    );
  });
});
