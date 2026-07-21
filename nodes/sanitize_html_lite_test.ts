import { SanitizeQuery } from '../gen/messages_pb';
import { sanitizeHtmlLite } from './sanitize_html_lite';
import { testContext } from './test_helpers';
import { MAX_HTML_BYTES } from './sanitize_shared';

function query(fields: Partial<{
  html: string;
  allowedTags: string[];
  allowedAttributes: string[];
  allowSvg: boolean;
  allowMathMl: boolean;
  allowedUriSchemes: string[];
  wholeDocument: boolean;
  stripContentOfRemovedTags: boolean;
}>): SanitizeQuery {
  const q = new SanitizeQuery();
  if (fields.html !== undefined) q.setHtml(fields.html);
  if (fields.allowedTags) q.setAllowedTagsList(fields.allowedTags);
  if (fields.allowedAttributes) q.setAllowedAttributesList(fields.allowedAttributes);
  if (fields.allowSvg !== undefined) q.setAllowSvg(fields.allowSvg);
  if (fields.allowMathMl !== undefined) q.setAllowMathMl(fields.allowMathMl);
  if (fields.allowedUriSchemes) q.setAllowedUriSchemesList(fields.allowedUriSchemes);
  if (fields.wholeDocument !== undefined) q.setWholeDocument(fields.wholeDocument);
  if (fields.stripContentOfRemovedTags !== undefined) {
    q.setStripContentOfRemovedTags(fields.stripContentOfRemovedTags);
  }
  return q;
}

describe('SanitizeHtmlLite (sanitize-html, pure Node, no jsdom)', () => {
  it('passes already-clean markup through unchanged (golden)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<p>Hello <b>world</b></p>' }));
    expect(result.getError()).toBe('');
    expect(result.getHtml()).toBe('<p>Hello <b>world</b></p>');
    expect(result.getReport()?.getWasModified()).toBe(false);
  });

  it('strips a <script> tag and its content entirely (golden)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<p>hi</p><script>alert(1)</script>' }));
    expect(result.getHtml()).toBe('<p>hi</p>');
    expect(result.getHtml()).not.toMatch(/script/i);
    const report = result.getReport()!;
    expect(report.getWasModified()).toBe(true);
    expect(report.getRemovedCount()).toBeGreaterThanOrEqual(1);
    expect(report.getRemovedList().some((r) => r.getTag() === 'script')).toBe(true);
  });

  it('strips an event-handler attribute (onerror), reported independently of the tag itself', () => {
    // sanitize-html's own default allowedTags does not include <img> at all
    // (unlike DOMPurify) — a real, documented difference between the two
    // engines' defaults, not a bug. Use allowed_tags to isolate the
    // onerror-stripping behavior from that difference.
    const result = sanitizeHtmlLite(testContext, query({
      html: '<img src="x" onerror="alert(1)">',
      allowedTags: ['img'],
      allowedAttributes: ['src'],
    }));
    expect(result.getHtml()).toBe('<img src="x" />');
    expect(result.getHtml().toLowerCase()).not.toContain('onerror');
  });

  it('strips a javascript: URL from href, keeping the anchor text (golden)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<a href="javascript:alert(1)">click</a>' }));
    expect(result.getHtml()).toBe('<a>click</a>');
    expect(result.getHtml().toLowerCase()).not.toContain('javascript:');
  });

  it('rejects allow_svg with a structured error (sanitize-html has no SVG mode)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<svg></svg>', allowSvg: true }));
    expect(result.getError()).toMatch(/svg/i);
    expect(result.getHtml()).toBe('');
  });

  it('rejects allow_math_ml with a structured error', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<math></math>', allowMathMl: true }));
    expect(result.getError()).toMatch(/mathml/i);
  });

  it('rejects whole_document with a structured error (sanitize-html has no document mode)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<html></html>', wholeDocument: true }));
    expect(result.getError()).toMatch(/whole-document/i);
  });

  it('restricts to a caller-supplied allowed_tags list, dropping everything else', () => {
    const result = sanitizeHtmlLite(testContext, query({
      html: '<p>keep</p><b>bold</b><script>bad()</script>',
      allowedTags: ['b'],
    }));
    expect(result.getHtml()).toBe('keep<b>bold</b>');
  });

  it('strip_content_of_removed_tags=true discards the text of a removed tag', () => {
    const stripped = sanitizeHtmlLite(testContext, query({
      html: '<p>hi</p><script>alert(1)</script>tail',
      stripContentOfRemovedTags: true,
    }));
    expect(stripped.getHtml()).toBe('<p>hi</p>');

    const kept = sanitizeHtmlLite(testContext, query({ html: '<p>hi</p><script>alert(1)</script>tail' }));
    expect(kept.getHtml()).toBe('<p>hi</p>tail');
  });

  it('recovers from malformed markup instead of crashing (error-path)', () => {
    const result = sanitizeHtmlLite(testContext, query({ html: '<p><b>unclosed <div>broken</p>' }));
    expect(result.getError()).toBe('');
    expect(() => result.getHtml()).not.toThrow();
  });

  it('rejects input over the 2 MiB size cap with a structured error, not a crash', () => {
    const big = 'a'.repeat(MAX_HTML_BYTES + 100);
    const result = sanitizeHtmlLite(testContext, query({ html: `<p>${big}</p>` }));
    expect(result.getError()).toMatch(/exceeds the .*-byte cap/);
    expect(result.getHtml()).toBe('');
  });

  it('is deterministic: identical input yields identical output across repeated calls', () => {
    const input = query({ html: '<script>x</script><p>hi</p>' });
    const first = sanitizeHtmlLite(testContext, input);
    const second = sanitizeHtmlLite(testContext, input);
    expect(second.getHtml()).toBe(first.getHtml());
  });
});
