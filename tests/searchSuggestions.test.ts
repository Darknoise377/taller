import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPopularSearchTerms } from '../src/lib/seo/searchSuggestions';

describe('buildPopularSearchTerms', () => {
  it('ranks frequent tokens higher', () => {
    const terms = buildPopularSearchTerms([
      { name: 'Freno disco Honda CB125', description: 'freno delantero' },
      { name: 'Pastilla freno CB125', description: 'freno' },
      { name: 'Aceite 20W50', description: 'lubricante motor' },
    ]);
    assert.ok(terms.includes('freno'));
    assert.ok(terms.includes('cb125'));
    assert.equal(terms[0], 'freno');
  });

  it('filters stopwords', () => {
    const terms = buildPopularSearchTerms([
      { name: 'Kit para moto', description: 'repuesto original' },
    ]);
    assert.ok(!terms.includes('para'));
    assert.ok(!terms.includes('repuesto'));
  });
});
