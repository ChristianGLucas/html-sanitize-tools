import { AttributeQuery } from '../gen/messages_pb';
import { validateAttribute } from './validate_attribute';
import { testContext } from './test_helpers';
import { MAX_ATTRIBUTE_FIELD_BYTES } from './sanitize_shared';

function query(tag: string, attribute: string, value: string): AttributeQuery {
  const q = new AttributeQuery();
  q.setTag(tag);
  q.setAttribute(attribute);
  q.setValue(value);
  return q;
}

describe('ValidateAttribute (DOMPurify.isValidAttribute)', () => {
  it('accepts a safe https href on an anchor (golden)', () => {
    const result = validateAttribute(testContext, query('a', 'href', 'https://example.com'));
    expect(result.getError()).toBe('');
    expect(result.getValid()).toBe(true);
  });

  it('rejects a javascript: href on an anchor', () => {
    const result = validateAttribute(testContext, query('a', 'href', 'javascript:alert(1)'));
    expect(result.getValid()).toBe(false);
  });

  it('rejects an event-handler attribute regardless of tag', () => {
    const result = validateAttribute(testContext, query('div', 'onclick', 'alert(1)'));
    expect(result.getValid()).toBe(false);
  });

  it('accepts an ordinary safe attribute (class)', () => {
    const result = validateAttribute(testContext, query('div', 'class', 'card highlighted'));
    expect(result.getValid()).toBe(true);
  });

  it('returns a structured error when tag is empty (error-path)', () => {
    const result = validateAttribute(testContext, query('', 'href', 'https://example.com'));
    expect(result.getError()).not.toBe('');
  });

  it('returns a structured error when attribute is empty (error-path)', () => {
    const result = validateAttribute(testContext, query('a', '', 'https://example.com'));
    expect(result.getError()).not.toBe('');
  });

  it('rejects an oversized value field with a structured error, not a crash (error-path)', () => {
    const big = 'a'.repeat(MAX_ATTRIBUTE_FIELD_BYTES + 100);
    const result = validateAttribute(testContext, query('a', 'href', big));
    expect(result.getError()).toMatch(/exceeds the .*-byte cap/);
  });

  it('is deterministic: identical input yields identical validity across repeated calls', () => {
    const input = query('a', 'href', 'javascript:alert(1)');
    const first = validateAttribute(testContext, input);
    const second = validateAttribute(testContext, input);
    expect(second.getValid()).toBe(first.getValid());
  });
});
