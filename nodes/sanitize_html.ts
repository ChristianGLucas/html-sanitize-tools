import { SanitizeQuery, SanitizeResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { checkConfig, runDompurify } from './sanitize_shared';

/**
 * Sanitize untrusted HTML to a safe subset using DOMPurify, run headless over
 * a fresh throwaway jsdom window (no real browser, no network access, no
 * script execution). Strips <script>/<style>, event-handler attributes
 * (onclick, onerror, ...), javascript:/vbscript: URLs, and any tag/attribute
 * outside the allow-list; optionally allows SVG and/or MathML elements
 * through the same allow-list. Returns the cleaned markup plus a report of
 * every element/attribute that was removed.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function sanitizeHtml(ax: AxiomContext, input: SanitizeQuery): SanitizeResult {
  const result = new SanitizeResult();

  const configError = checkConfig(input);
  if (configError) {
    result.setError(configError);
    return result;
  }

  try {
    const keepContent = !input.getStripContentOfRemovedTags();
    const { html, report } = runDompurify(input, keepContent);
    result.setHtml(html);
    result.setReport(report);
  } catch (err) {
    ax.log.error('SanitizeHtml failed', { error: String(err) });
    result.setError(`sanitization failed: ${String(err)}`);
  }
  return result;
}
