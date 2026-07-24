import { AuditQuery, AuditResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { checkConfig, runDompurify } from './sanitize_shared';

/**
 * Report what sanitizing this HTML WOULD remove (via DOMPurify), without
 * returning modified markup. For pipelines that need to gate or flag on
 * safety and either keep the original bytes completely untouched or
 * explicitly reject unsafe input — rather than SanitizeHtml's contract of
 * silently receiving cleaned-but-altered content.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function auditHtml(ax: AxiomContext, input: AuditQuery): AuditResult {
  const result = new AuditResult();

  const configError = checkConfig(input);
  if (configError) {
    result.setError(configError);
    return result;
  }

  try {
    // keep_content doesn't change WHETHER a tag counts as removed, only
    // whether its text survives in the (here-unused) cleaned output — so a
    // fixed true is correct for an audit-only report.
    const { report } = runDompurify(input, true);
    result.setReport(report);
    result.setSafe(!report.getWasModified());
  } catch (err) {
    ax.log.error('AuditHtml failed', { error: String(err) });
    result.setError(`audit failed: ${String(err)}`);
  }
  return result;
}
