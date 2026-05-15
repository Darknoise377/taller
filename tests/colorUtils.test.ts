import test from 'node:test';
import assert from 'node:assert/strict';

import { colorNameToHex } from '../src/utils/colorUtils';

// ── colorNameToHex ────────────────────────────────────────────────────────────

test('colorNameToHex maps Spanish color names', () => {
  assert.equal(colorNameToHex('rojo'), '#FF0000');
  assert.equal(colorNameToHex('azul'), '#0000FF');
  assert.equal(colorNameToHex('verde'), '#008000');
  assert.equal(colorNameToHex('negro'), '#000000');
  assert.equal(colorNameToHex('blanco'), '#FFFFFF');
  assert.equal(colorNameToHex('amarillo'), '#FFFF00');
  assert.equal(colorNameToHex('naranja'), '#FFA500');
  assert.equal(colorNameToHex('morado'), '#800080');
  assert.equal(colorNameToHex('gris'), '#808080');
});

test('colorNameToHex is case-insensitive', () => {
  assert.equal(colorNameToHex('ROJO'), '#FF0000');
  assert.equal(colorNameToHex('Azul'), '#0000FF');
  assert.equal(colorNameToHex('VERDE'), '#008000');
});

test('colorNameToHex maps English color aliases', () => {
  assert.equal(colorNameToHex('red'), '#FF0000');
  assert.equal(colorNameToHex('blue'), '#0000FF');
  assert.equal(colorNameToHex('green'), '#008000');
  assert.equal(colorNameToHex('black'), '#000000');
  assert.equal(colorNameToHex('white'), '#FFFFFF');
});

test('colorNameToHex returns lowercased input for unknown colors', () => {
  // The function applies .toLowerCase() before lookup, so it returns the
  // lowercased variant when no mapping is found — valid for CSS hex values.
  assert.equal(colorNameToHex('turquesa'), 'turquesa');
  assert.equal(colorNameToHex('#FF0000'), '#ff0000');
  assert.equal(colorNameToHex('rgb(0,0,0)'), 'rgb(0,0,0)');
});

test('colorNameToHex handles empty string', () => {
  assert.equal(colorNameToHex(''), '');
});

test('colorNameToHex maps cafe as marrón equivalent', () => {
  assert.equal(colorNameToHex('cafe'), '#A52A2A');
  assert.equal(colorNameToHex('marrón'), '#A52A2A');
});
