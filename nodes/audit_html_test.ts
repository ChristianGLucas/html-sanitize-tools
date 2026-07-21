import { AuditQuery } from '../gen/messages_pb';
import { auditHtml } from './audit_html';
import { testContext } from './test_helpers';
import { MAX_HTML_BYTES } from './sanitize_shared';

function query(fields: Partial<{
  html: string;
  allowedTags: string[];
  allowSvg: boolean;
  allowMathMl: boolean;
}>): AuditQuery {
  const q = new AuditQuery();
  if (fields.html !== undefined) q.setHtml(fields.html);
  if (fields.allowedTags) q.setAllowedTagsList(fields.allowedTags);
  if (fields.allowSvg !== undefined) q.setAllowSvg(fields.allowSvg);
  if (fields.allowMathMl !== undefined) q.setAllowMathMl(fields.allowMathMl);
  return q;
}

describe('AuditHtml', () => {
  it('reports safe=true and an empty report for already-clean markup (golden)', () => {
    const result = auditHtml(testContext, query({ html: '<p>Hello <b>world</b></p>' }));
    expect(result.getError()).toBe('');
    expect(result.getSafe()).toBe(true);
    expect(result.getReport()?.getRemovedCount()).toBe(0);
    expect(result.getReport()?.getWasModified()).toBe(false);
  });

  it('reports safe=false with the offending element for a script payload (golden)', () => {
    // Note: when the ENTIRE input is a single forbidden tag with nothing
    // else, DOMPurify short-circuits to an empty result without populating
    // its `removed` list (verified directly against the library) — so this
    // fixture pairs the payload with other content, matching the case
    // DOMPurify itself does track, to test the report's element-level detail.
    const result = auditHtml(testContext, query({ html: '<p>hi</p><script>alert(1)</script>' }));
    expect(result.getSafe()).toBe(false);
    const report = result.getReport()!;
    expect(report.getWasModified()).toBe(true);
    expect(report.getRemovedCount()).toBe(1);
    expect(report.getRemovedList()[0].getTag()).toBe('script');
  });

  it('still reports safe=false (via wasModified) even when the entire input is one forbidden tag', () => {
    const result = auditHtml(testContext, query({ html: '<script>alert(1)</script>' }));
    expect(result.getSafe()).toBe(false);
    expect(result.getReport()?.getWasModified()).toBe(true);
  });

  it('reports safe=false for a bare event-handler attribute', () => {
    const result = auditHtml(testContext, query({ html: '<img src="x" onerror="alert(1)">' }));
    expect(result.getSafe()).toBe(false);
    expect(result.getReport()!.getRemovedList().some((r) => r.getAttribute() === 'onerror')).toBe(true);
  });

  it('never returns cleaned markup as part of its contract (audit-only, not sanitize)', () => {
    // AuditResult has no html field at all — this is a structural assertion
    // that the audit contract stays report-only, not a behavior test.
    const result = auditHtml(testContext, query({ html: '<script>alert(1)</script>' }));
    expect((result as unknown as { getHtml?: unknown }).getHtml).toBeUndefined();
  });

  it('honors the same allow-list config as SanitizeHtml (SVG/MathML gates)', () => {
    const blocked = auditHtml(testContext, query({ html: '<svg onload="alert(1)"></svg>' }));
    expect(blocked.getSafe()).toBe(false);

    const allowed = auditHtml(testContext, query({ html: '<svg></svg>', allowSvg: true }));
    expect(allowed.getSafe()).toBe(true);
  });

  it('rejects input over the 2 MiB size cap with a structured error, not a crash', () => {
    const big = 'a'.repeat(MAX_HTML_BYTES + 100);
    const result = auditHtml(testContext, query({ html: `<p>${big}</p>` }));
    expect(result.getError()).toMatch(/exceeds the .*-byte cap/);
  });

  it('is deterministic: identical input yields identical safe/report across repeated calls', () => {
    const input = query({ html: '<script>x</script><p>hi</p>' });
    const first = auditHtml(testContext, input);
    const second = auditHtml(testContext, input);
    expect(second.getSafe()).toBe(first.getSafe());
    expect(second.getReport()?.getRemovedCount()).toBe(first.getReport()?.getRemovedCount());
  });
});
