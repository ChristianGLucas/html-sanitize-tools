import { SanitizeQuery } from '../gen/messages_pb';
import { sanitizeHtml } from './sanitize_html';
import { testContext } from './test_helpers';
import { MAX_HTML_BYTES } from './sanitize_shared';

function query(fields: Partial<{
  html: string;
  allowedTags: string[];
  allowedAttributes: string[];
  allowSvg: boolean;
  allowMathMl: boolean;
  allowedUriSchemes: string[];
  allowDataAttributes: boolean;
  forbidTags: string[];
  forbidAttributes: string[];
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
  if (fields.allowDataAttributes !== undefined) q.setAllowDataAttributes(fields.allowDataAttributes);
  if (fields.forbidTags) q.setForbidTagsList(fields.forbidTags);
  if (fields.forbidAttributes) q.setForbidAttributesList(fields.forbidAttributes);
  if (fields.wholeDocument !== undefined) q.setWholeDocument(fields.wholeDocument);
  if (fields.stripContentOfRemovedTags !== undefined) {
    q.setStripContentOfRemovedTags(fields.stripContentOfRemovedTags);
  }
  return q;
}

describe('SanitizeHtml (DOMPurify over jsdom)', () => {
  it('passes already-clean markup through unchanged (golden)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<p>Hello <b>world</b></p>' }));
    expect(result.getError()).toBe('');
    expect(result.getHtml()).toBe('<p>Hello <b>world</b></p>');
    expect(result.getReport()?.getWasModified()).toBe(false);
    expect(result.getReport()?.getRemovedCount()).toBe(0);
  });

  it('strips a <script> tag and its content entirely (golden)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<p>hi</p><script>alert(1)</script>' }));
    expect(result.getHtml()).toBe('<p>hi</p>');
    expect(result.getHtml()).not.toMatch(/script/i);
    expect(result.getHtml()).not.toContain('alert(1)');
    const report = result.getReport()!;
    expect(report.getWasModified()).toBe(true);
    expect(report.getRemovedCount()).toBe(1);
    expect(report.getRemovedList()[0].getKind()).toBe('element');
    expect(report.getRemovedList()[0].getTag()).toBe('script');
  });

  it('strips an event-handler attribute (onerror) but keeps the safe tag (golden)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<img src="x" onerror="alert(1)">' }));
    expect(result.getHtml()).toBe('<img src="x">');
    expect(result.getHtml().toLowerCase()).not.toContain('onerror');
    const report = result.getReport()!;
    expect(report.getRemovedCount()).toBe(1);
    expect(report.getRemovedList()[0].getKind()).toBe('attribute');
    expect(report.getRemovedList()[0].getAttribute()).toBe('onerror');
  });

  it('strips a javascript: URL from href, keeping the anchor text (golden)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<a href="javascript:alert(1)">click</a>' }));
    expect(result.getHtml()).toBe('<a>click</a>');
    expect(result.getHtml().toLowerCase()).not.toContain('javascript:');
  });

  it('blocks a data:text/html URL from href by default', () => {
    const dangerous = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
    const result = sanitizeHtml(testContext, query({ html: `<a href="${dangerous}">x</a>` }));
    expect(result.getHtml()).not.toContain(dangerous);
    expect(result.getHtml().toLowerCase()).not.toContain('data:text/html');
  });

  it('strips SVG content by default (allow_svg=false is the zero value AND actually restrictive)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<svg onload="alert(1)"><circle r="5"/></svg>' }));
    expect(result.getHtml()).not.toContain('<svg');
    expect(result.getHtml().toLowerCase()).not.toContain('onload');
  });

  it('allows SVG through when allow_svg=true, still stripping the onload handler', () => {
    const result = sanitizeHtml(testContext, query({ html: '<svg onload="alert(1)"><circle r="5"/></svg>', allowSvg: true }));
    expect(result.getHtml()).toBe('<svg><circle r="5"></circle></svg>');
    expect(result.getHtml().toLowerCase()).not.toContain('onload');
  });

  it('strips MathML content by default', () => {
    const result = sanitizeHtml(testContext, query({ html: '<math><mtext>x</mtext></math>' }));
    expect(result.getHtml()).not.toContain('<math');
  });

  it('allows MathML through when allow_math_ml=true', () => {
    const result = sanitizeHtml(testContext, query({ html: '<math><mtext>x</mtext></math>', allowMathMl: true }));
    expect(result.getHtml()).toBe('<math><mtext>x</mtext></math>');
  });

  it('restricts to a caller-supplied allowed_tags list, dropping everything else', () => {
    const result = sanitizeHtml(testContext, query({
      html: '<p>keep</p><b>bold</b><script>bad()</script>',
      allowedTags: ['b'],
    }));
    expect(result.getHtml()).toBe('keep<b>bold</b>');
    expect(result.getHtml()).not.toContain('<p>');
    expect(result.getHtml()).not.toContain('<script');
  });

  it('forbid_tags strips a tag that would otherwise be allowed, keeping its text', () => {
    const result = sanitizeHtml(testContext, query({ html: '<p>keep</p><b>bold</b>', forbidTags: ['b'] }));
    expect(result.getHtml()).toBe('<p>keep</p>bold');
  });

  it('strip_content_of_removed_tags=true discards the text of an ordinary removed tag', () => {
    const strippedFoo = sanitizeHtml(testContext, query({
      html: '<p>hi</p><foo>inner text</foo>',
      stripContentOfRemovedTags: true,
    }));
    expect(strippedFoo.getHtml()).toBe('<p>hi</p>');
    expect(strippedFoo.getHtml()).not.toContain('inner text');

    const keptFoo = sanitizeHtml(testContext, query({ html: '<p>hi</p><foo>inner text</foo>' }));
    expect(keptFoo.getHtml()).toBe('<p>hi</p>inner text');
  });

  it('whole_document=true preserves the <html>/<head>/<body> wrapper and body content', () => {
    // Verified directly against DOMPurify: its default "html" profile (which
    // we always set explicitly — see the allow_svg/allow_math_ml default fix
    // above) is curated for BODY content and excludes head-metadata tags, so
    // <title> is stripped even though <html>/<head>/<body> survive. A caller
    // that needs <title>/<meta>/<link> preserved must pass allowed_tags
    // explicitly (which bypasses the profile system — see allow_svg's doc).
    const doc = '<html><head><title>T</title></head><body><p>hi</p></body></html>';
    const result = sanitizeHtml(testContext, query({ html: doc, wholeDocument: true }));
    expect(result.getHtml()).toBe('<html><head></head><body><p>hi</p></body></html>');
    expect(result.getHtml()).not.toContain('<title>');
  });

  it('whole_document=true + explicit allowed_tags can preserve <title>', () => {
    const doc = '<html><head><title>T</title></head><body><p>hi</p></body></html>';
    const result = sanitizeHtml(testContext, query({
      html: doc,
      wholeDocument: true,
      allowedTags: ['html', 'head', 'title', 'body', 'p'],
    }));
    expect(result.getHtml()).toBe(doc);
  });

  it('recovers from malformed markup instead of crashing (error-path)', () => {
    const result = sanitizeHtml(testContext, query({ html: '<p><b>unclosed <div>broken</p>' }));
    expect(result.getError()).toBe('');
    expect(() => result.getHtml()).not.toThrow();
  });

  it('rejects input over the 2 MiB size cap with a structured error, not a crash', () => {
    const big = 'a'.repeat(MAX_HTML_BYTES + 100);
    const result = sanitizeHtml(testContext, query({ html: `<p>${big}</p>` }));
    expect(result.getError()).toMatch(/exceeds the .*-byte cap/);
    expect(result.getHtml()).toBe('');
  });

  it('rejects a malformed allowed_uri_schemes entry with a structured config error', () => {
    const result = sanitizeHtml(testContext, query({ html: '<a href="x">y</a>', allowedUriSchemes: ['http://bad'] }));
    expect(result.getError()).toContain('allowed_uri_schemes');
  });

  it('is deterministic: identical input yields identical output across repeated calls', () => {
    const input = query({ html: '<script>x</script><p>hi</p><img src=x onerror=y>' });
    const first = sanitizeHtml(testContext, input);
    const second = sanitizeHtml(testContext, input);
    expect(second.getHtml()).toBe(first.getHtml());
    expect(second.getReport()?.getRemovedCount()).toBe(first.getReport()?.getRemovedCount());
  });
});
