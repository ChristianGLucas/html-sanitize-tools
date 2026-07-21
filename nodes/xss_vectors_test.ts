// Independent-oracle test: known XSS payload fixtures (drawn from the
// well-known class of vectors catalogued by the OWASP XSS Filter Evasion
// Cheat Sheet) checked against a HAND-WRITTEN safety property — never
// against each other. This is deliberately NOT sanitizer-vs-sanitizer: each
// case asserts, independently of DOMPurify's or sanitize-html's internal
// logic, that the payload's actual trigger string (a scheme, an event
// handler name, a tag) is absent from the cleaned output. Both wrapped
// engines (SanitizeHtml / SanitizeHtmlLite) are run against the same table
// so a regression in either shows up here.

import { SanitizeQuery } from '../gen/messages_pb';
import { sanitizeHtml } from './sanitize_html';
import { sanitizeHtmlLite } from './sanitize_html_lite';
import { testContext } from './test_helpers';

interface Vector {
  name: string;
  html: string;
  /** Case-insensitive substrings that must be ABSENT from safe output. */
  mustNotContain: string[];
  /** Set when the vector only makes sense with allow_svg on (still checked
   * for the trigger leaking through even though SVG itself is permitted). */
  allowSvg?: boolean;
  /** SanitizeHtmlLite can't run SVG cases (structured error instead) — skip it there. */
  skipLite?: boolean;
}

const VECTORS: Vector[] = [
  {
    name: 'classic external script tag',
    html: "<SCRIPT SRC=http://evil.example/xss.js></SCRIPT>",
    mustNotContain: ['<script', 'evil.example'],
  },
  {
    name: 'javascript: URL in img src',
    html: `<IMG SRC="javascript:alert(1)">`,
    mustNotContain: ['javascript:'],
  },
  {
    name: 'javascript: URL, mixed case scheme (filter-evasion classic)',
    html: '<IMG SRC=JaVaScRiPt:alert(1)>',
    mustNotContain: ['javascript:', 'JaVaScRiPt:'],
  },
  {
    name: 'javascript: URL on anchor href',
    html: '<a href="javascript:alert(1)">click</a>',
    mustNotContain: ['javascript:'],
  },
  {
    name: 'onmouseover event handler',
    html: `<IMG SRC=# onmouseover="alert(1)">`,
    mustNotContain: ['onmouseover'],
  },
  {
    name: 'onerror event handler',
    html: `<IMG SRC=x onerror="alert(1)">`,
    mustNotContain: ['onerror'],
  },
  {
    name: 'BODY onload event handler',
    html: "<BODY ONLOAD=alert(1)>hi</BODY>",
    mustNotContain: ['onload'],
  },
  {
    name: 'iframe with javascript: src',
    html: `<iframe src="javascript:alert(1)"></iframe>`,
    mustNotContain: ['javascript:'],
  },
  {
    name: 'base64 data:text/html URL (smuggled script)',
    html: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>',
    mustNotContain: ['data:text/html', 'base64'],
  },
  {
    name: 'onclick event handler on a div',
    html: `<div onclick="alert(1)">x</div>`,
    mustNotContain: ['onclick'],
  },
  {
    name: 'SVG script element (even when SVG itself is allowed)',
    html: '<svg><script>alert(1)</script></svg>',
    mustNotContain: ['<script', 'alert(1)'],
    allowSvg: true,
    skipLite: true,
  },
  {
    name: 'SVG animate onbegin event handler (SMIL-based XSS)',
    html: '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"/></svg>',
    mustNotContain: ['onbegin'],
    allowSvg: true,
    skipLite: true,
  },
];

function query(html: string, allowSvg?: boolean): SanitizeQuery {
  const q = new SanitizeQuery();
  q.setHtml(html);
  if (allowSvg) q.setAllowSvg(true);
  return q;
}

describe('Independent-oracle: OWASP-style XSS vectors neutralized (SanitizeHtml)', () => {
  for (const v of VECTORS) {
    it(v.name, () => {
      const result = sanitizeHtml(testContext, query(v.html, v.allowSvg));
      expect(result.getError()).toBe('');
      const out = result.getHtml().toLowerCase();
      for (const marker of v.mustNotContain) {
        expect(out).not.toContain(marker.toLowerCase());
      }
    });
  }
});

describe('Independent-oracle: OWASP-style XSS vectors neutralized (SanitizeHtmlLite)', () => {
  for (const v of VECTORS.filter((v) => !v.skipLite)) {
    it(v.name, () => {
      const result = sanitizeHtmlLite(testContext, query(v.html));
      expect(result.getError()).toBe('');
      const out = result.getHtml().toLowerCase();
      for (const marker of v.mustNotContain) {
        expect(out).not.toContain(marker.toLowerCase());
      }
    });
  }
});

describe('Documented (not a bug): style-attribute CSS is not sanitized', () => {
  // Flagged by independent review. DOMPurify keeps a kept tag's `style`
  // attribute verbatim (no CSS parsing), so a javascript: URL inside
  // `url(...)` survives SanitizeHtml unmodified. This is NOT a live XSS
  // vector in any current browser (javascript: inside CSS url() was an old
  // IE-only bug, dead for well over a decade) — pinned here as a real,
  // intentional behavior difference from SanitizeHtmlLite (which strips the
  // whole `style` attribute by default), not silently left unspecified.
  // See README.md's "Security notes" for the caller-facing version.
  const html = '<div style="background:url(javascript:alert(1))">x</div>';

  it('SanitizeHtml (DOMPurify) passes style content through unmodified', () => {
    const result = sanitizeHtml(testContext, query(html));
    expect(result.getHtml()).toBe(html);
    expect(result.getReport()?.getWasModified()).toBe(false);
  });

  it('SanitizeHtml with forbid_attributes:["style"] removes it entirely', () => {
    const q = query(html);
    q.setForbidAttributesList(['style']);
    const result = sanitizeHtml(testContext, q);
    expect(result.getHtml().toLowerCase()).not.toContain('style');
    expect(result.getHtml().toLowerCase()).not.toContain('javascript:');
  });

  it('SanitizeHtmlLite (sanitize-html) strips the style attribute by default', () => {
    const result = sanitizeHtmlLite(testContext, query(html));
    expect(result.getHtml().toLowerCase()).not.toContain('style');
    expect(result.getHtml().toLowerCase()).not.toContain('javascript:');
  });
});
