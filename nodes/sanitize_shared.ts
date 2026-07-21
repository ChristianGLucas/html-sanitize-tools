// Shared helpers for christiangeorgelucas/html-sanitize-tools.
//
// Two independent sanitizer engines are wrapped here:
//   - DOMPurify (over a fresh, throwaway jsdom window per call) — used by
//     SanitizeHtml, AuditHtml, and ValidateAttribute. DOM-based, understands
//     SVG/MathML namespaces, and carries DOMPurify's DOM-clobbering defenses.
//   - sanitize-html — used by SanitizeHtmlLite. A pure string/htmlparser2
//     sanitizer with no DOM dependency at all.
// Both are stateless per call: every function here constructs fresh state
// and never reuses a JSDOM window, a DOMPurify instance, or any other
// object across invocations.

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import sanitizeHtmlLib from 'sanitize-html';
import { Parser as HtmlParser } from 'htmlparser2';
import { RemovedItem, Report } from '../gen/messages_pb';

/** Hard cap on input size, enforced on the RAW string before any parsing. */
export const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MiB

/** Cap on how many individual removal entries the report lists (removed_count
 * still reflects the true total even when the list itself is capped). */
const MAX_REPORT_ITEMS = 200;

/** Cap on how long a single reported snippet/value may be. */
const MAX_VALUE_SNIPPET = 300;

/**
 * Reject oversized input before it is ever handed to a parser. Returns a
 * human-readable error string, or null when the input is within bounds.
 */
export function checkSize(html: string): string | null {
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > MAX_HTML_BYTES) {
    return `input html is ${bytes} bytes, which exceeds the ${MAX_HTML_BYTES}-byte cap`;
  }
  return null;
}

function truncate(s: string): string {
  if (s.length <= MAX_VALUE_SNIPPET) return s;
  return s.slice(0, MAX_VALUE_SNIPPET) + '…';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The subset of SanitizeQuery/AuditQuery fields the config builders need —
 * both generated message classes share this exact shape, so one function
 * serves both without duplicating the mapping logic. */
export interface QueryLike {
  getHtml(): string;
  getAllowedTagsList(): string[];
  getAllowedAttributesList(): string[];
  getAllowSvg(): boolean;
  getAllowMathMl(): boolean;
  getAllowedUriSchemesList(): string[];
  getAllowDataAttributes(): boolean;
  getForbidTagsList(): string[];
  getForbidAttributesList(): string[];
  getWholeDocument(): boolean;
}

/**
 * Validate the shared allow-list config fields. Returns an error string on
 * a malformed config (e.g. a URI scheme that isn't a bare scheme token), or
 * null when the config is acceptable.
 */
export function checkConfig(q: QueryLike): string | null {
  for (const scheme of q.getAllowedUriSchemesList()) {
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(scheme)) {
      return `invalid allowed_uri_schemes entry ${JSON.stringify(scheme)}: must be a bare URI scheme token (e.g. "https", "mailto")`;
    }
  }
  return null;
}

/** Build a DOMPurify Config object from the shared query shape. */
export function buildDompurifyConfig(q: QueryLike, keepContent: boolean): Record<string, unknown> {
  const cfg: Record<string, unknown> = {
    ALLOW_DATA_ATTR: q.getAllowDataAttributes(),
    WHOLE_DOCUMENT: q.getWholeDocument(),
    KEEP_CONTENT: keepContent,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
  };

  const allowedTags = q.getAllowedTagsList();
  if (allowedTags.length > 0) {
    // USE_PROFILES overrides ALLOWED_TAGS in DOMPurify itself, so we
    // deliberately never set both — an explicit allow-list means the caller
    // is opting out of the profile system entirely.
    cfg.ALLOWED_TAGS = allowedTags;
  } else {
    // DOMPurify's OWN default (no USE_PROFILES key at all) already permits
    // html + svg + mathMl. We must set USE_PROFILES explicitly and always
    // (not only when allow_svg/allow_math_ml are true) so that leaving them
    // at their false zero-value actually restricts SVG/MathML, instead of
    // silently falling through to the library's more permissive default.
    cfg.USE_PROFILES = {
      html: true,
      svg: q.getAllowSvg(),
      svgFilters: q.getAllowSvg(),
      mathMl: q.getAllowMathMl(),
    };
  }

  const allowedAttrs = q.getAllowedAttributesList();
  if (allowedAttrs.length > 0) {
    cfg.ALLOWED_ATTR = allowedAttrs;
  }

  const schemes = q.getAllowedUriSchemesList();
  if (schemes.length > 0) {
    const alternation = schemes.map(escapeRegExp).join('|');
    // Same shape as DOMPurify's own documented default regex, with only the
    // scheme alternation swapped for the caller's list — still allows
    // relative URLs, fragments, etc. exactly as the built-in default does.
    cfg.ALLOWED_URI_REGEXP = new RegExp(
      `^(?:(?:${alternation}):|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
      'i',
    );
  }

  if (q.getForbidTagsList().length > 0) cfg.FORBID_TAGS = q.getForbidTagsList();
  if (q.getForbidAttributesList().length > 0) cfg.FORBID_ATTR = q.getForbidAttributesList();

  return cfg;
}

interface DomPurifyRemovedElement {
  element?: { tagName?: string; nodeName?: string; outerHTML?: string; textContent?: string | null };
}
interface DomPurifyRemovedAttribute {
  attribute?: { name?: string; value?: string } | null;
  from?: { tagName?: string; nodeName?: string };
}

function buildReportFromDompurifyRemoved(
  removed: Array<DomPurifyRemovedElement | DomPurifyRemovedAttribute>,
): Report {
  const report = new Report();
  let count = 0;
  for (const entry of removed) {
    count++;
    if (report.getRemovedList().length >= MAX_REPORT_ITEMS) continue;

    const asAttr = entry as DomPurifyRemovedAttribute;
    const asElem = entry as DomPurifyRemovedElement;

    const item = new RemovedItem();
    if (asAttr.attribute !== undefined) {
      const fromTag = asAttr.from?.tagName ?? asAttr.from?.nodeName ?? '';
      item.setKind('attribute');
      item.setTag(fromTag.toLowerCase());
      item.setAttribute(asAttr.attribute?.name ?? '');
      item.setValue(truncate(asAttr.attribute?.value ?? ''));
    } else if (asElem.element !== undefined) {
      const el = asElem.element;
      const tag = el?.tagName ?? el?.nodeName ?? '';
      item.setKind('element');
      item.setTag(tag.toLowerCase());
      item.setAttribute('');
      const snippet = el?.outerHTML ?? el?.textContent ?? '';
      item.setValue(truncate(snippet ?? ''));
    } else {
      count--;
      continue;
    }
    report.addRemoved(item);
  }
  report.setRemovedCount(count);
  return report;
}

/**
 * Run DOMPurify, over a fresh throwaway jsdom window, on the given query.
 * jsdom is constructed with no external resource loading and no script
 * execution — deterministic and fully offline. The window is closed before
 * returning so nothing is retained across calls.
 */
export function runDompurify(q: QueryLike, keepContent: boolean): { html: string; report: Report } {
  const dom = new JSDOM('', { url: 'https://sanitize.invalid/' });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purify = createDOMPurify(dom.window as any);
    const cfg = buildDompurifyConfig(q, keepContent);
    const clean = String(purify.sanitize(q.getHtml(), cfg as never));
    const report = buildReportFromDompurifyRemoved(purify.removed as never);
    report.setWasModified(clean !== q.getHtml());
    return { html: clean, report };
  } finally {
    dom.window.close();
  }
}

/**
 * Check whether DOMPurify's own rules would keep a single tag/attribute/value
 * triple, using a fresh purify instance so no prior call's config leaks in.
 */
export function isValidAttribute(tag: string, attr: string, value: string): boolean {
  const dom = new JSDOM('', { url: 'https://sanitize.invalid/' });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purify = createDOMPurify(dom.window as any);
    return purify.isValidAttribute(tag, attr, value);
  } finally {
    dom.window.close();
  }
}

/** Build a sanitize-html Config object from the shared query shape. */
export function buildSanitizeHtmlLiteConfig(
  q: QueryLike,
  keepContent: boolean,
): sanitizeHtmlLib.IOptions {
  const opts: sanitizeHtmlLib.IOptions = {
    disallowedTagsMode: keepContent ? 'discard' : 'completelyDiscard',
    allowVulnerableTags: false,
  };

  const allowedTags = q.getAllowedTagsList();
  if (allowedTags.length > 0) opts.allowedTags = allowedTags;

  const allowedAttrs = q.getAllowedAttributesList();
  if (allowedAttrs.length > 0) {
    // sanitize-html's allowedAttributes is keyed per-tag; "*" applies to
    // every kept tag, which matches SanitizeQuery's single flat list.
    opts.allowedAttributes = { '*': allowedAttrs };
  }

  const schemes = q.getAllowedUriSchemesList();
  if (schemes.length > 0) opts.allowedSchemes = schemes;

  if (q.getAllowDataAttributes()) {
    opts.allowedAttributes = opts.allowedAttributes ?? {};
    // sanitize-html has no single "allow all data-*" switch; approximate it
    // with a wildcard attribute-name pattern on every kept tag.
    (opts.allowedAttributes as Record<string, unknown[]>)['*'] = [
      ...(((opts.allowedAttributes as Record<string, unknown[]>)['*'] as unknown[]) ?? []),
      /^data-/,
    ];
  }

  return opts;
}

/** Multiset-count every (tag) and (tag, attribute) occurrence in an HTML
 * string via a real parser — used to diff sanitize-html's before/after
 * output into a Report, since sanitize-html exposes no removal hooks. */
function countOccurrences(html: string): { tags: Map<string, number>; attrs: Map<string, number> } {
  const tags = new Map<string, number>();
  const attrs = new Map<string, number>();
  const parser = new HtmlParser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
        for (const attr of Object.keys(attribs)) {
          const key = `${tag} ${attr.toLowerCase()}`;
          attrs.set(key, (attrs.get(key) ?? 0) + 1);
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );
  parser.write(html);
  parser.end();
  return { tags, attrs };
}

/**
 * Run sanitize-html and derive a Report by diffing tag/attribute occurrence
 * counts before and after. Coarser than DOMPurify's node-precise report (no
 * exact snippet per occurrence — sanitize-html gives us no hook for that)
 * but deterministic and accurate on counts.
 */
export function runSanitizeHtmlLite(q: QueryLike, keepContent: boolean): { html: string; report: Report } {
  const opts = buildSanitizeHtmlLiteConfig(q, keepContent);
  const clean = sanitizeHtmlLib(q.getHtml(), opts);

  const before = countOccurrences(q.getHtml());
  const after = countOccurrences(clean);

  const report = new Report();
  let count = 0;
  for (const [tag, origCount] of before.tags) {
    const delta = origCount - (after.tags.get(tag) ?? 0);
    for (let i = 0; i < Math.max(0, delta); i++) {
      count++;
      if (report.getRemovedList().length < MAX_REPORT_ITEMS) {
        const item = new RemovedItem();
        item.setKind('element');
        item.setTag(tag);
        report.addRemoved(item);
      }
    }
  }
  for (const [key, origCount] of before.attrs) {
    const delta = origCount - (after.attrs.get(key) ?? 0);
    if (delta <= 0) continue;
    const [tag, attr] = key.split(' ');
    for (let i = 0; i < delta; i++) {
      count++;
      if (report.getRemovedList().length < MAX_REPORT_ITEMS) {
        const item = new RemovedItem();
        item.setKind('attribute');
        item.setTag(tag);
        item.setAttribute(attr);
        report.addRemoved(item);
      }
    }
  }

  report.setRemovedCount(count);
  report.setWasModified(clean !== q.getHtml());
  return { html: clean, report };
}
