import { SanitizeQuery, SanitizeResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { checkSize, checkConfig, runSanitizeHtmlLite } from './sanitize_shared';

/**
 * Sanitize untrusted HTML to a safe subset using sanitize-html — a pure
 * Node/htmlparser2-based sanitizer with no DOM or jsdom dependency at all.
 * A lighter-weight, independently-implemented second engine sharing
 * SanitizeHtml's exact config and output contract: useful when jsdom's
 * footprint isn't wanted, or to cross-check SanitizeHtml's result on the
 * same input. Does not support SVG or MathML (allow_svg / allow_math_ml /
 * whole_document return a structured error — use SanitizeHtml for those).
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function sanitizeHtmlLite(ax: AxiomContext, input: SanitizeQuery): SanitizeResult {
  const result = new SanitizeResult();

  const sizeError = checkSize(input.getHtml());
  if (sizeError) {
    result.setError(sizeError);
    return result;
  }
  const configError = checkConfig(input);
  if (configError) {
    result.setError(configError);
    return result;
  }
  if (input.getAllowSvg() || input.getAllowMathMl()) {
    result.setError(
      'SanitizeHtmlLite (sanitize-html) does not support SVG or MathML; use SanitizeHtml instead',
    );
    return result;
  }
  if (input.getWholeDocument()) {
    result.setError(
      'SanitizeHtmlLite (sanitize-html) has no whole-document mode; use SanitizeHtml instead',
    );
    return result;
  }

  try {
    const keepContent = !input.getStripContentOfRemovedTags();
    const { html, report } = runSanitizeHtmlLite(input, keepContent);
    result.setHtml(html);
    result.setReport(report);
  } catch (err) {
    ax.log.error('SanitizeHtmlLite failed', { error: String(err) });
    result.setError(`sanitization failed: ${String(err)}`);
  }
  return result;
}
