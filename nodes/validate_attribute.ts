import { AttributeQuery, AttributeResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { isValidAttribute as domPurifyIsValidAttribute } from './sanitize_shared';

/**
 * Check whether a single tag/attribute/value triple would survive DOMPurify's
 * default sanitization rules, without sanitizing a whole document — e.g. to
 * validate one proposed attribute (an `a` `href`, an `img` `src`) before
 * inserting it into markup you build yourself.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function validateAttribute(ax: AxiomContext, input: AttributeQuery): AttributeResult {
  const result = new AttributeResult();

  const tag = input.getTag();
  const attribute = input.getAttribute();
  if (!tag || !attribute) {
    result.setError('tag and attribute are required');
    return result;
  }

  try {
    result.setValid(domPurifyIsValidAttribute(tag, attribute, input.getValue()));
  } catch (err) {
    ax.log.error('ValidateAttribute failed', { error: String(err) });
    result.setError(`validation failed: ${String(err)}`);
  }
  return result;
}
