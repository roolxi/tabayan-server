import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

function harness(fetch) {
  const elements = new Map();
  const make = () => ({
    value: '', hidden: false, children: [], textContent: '',
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, focus() {}, scrollIntoView() {},
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
  });
  const element = id => { if (!elements.has(id)) elements.set(id, make()); return elements.get(id); };
  const context = vm.createContext({
    document: { querySelector: element, querySelectorAll: () => [], createElement: make },
    fetch, URL, AbortController, DOMException, setTimeout, clearTimeout,
    matchMedia: () => ({ matches: true }), navigator: {}, console,
  });
  vm.runInContext(readFileSync(new URL('../web/studio.js', import.meta.url), 'utf8'), context);
  return { context, element };
}
test('URL extraction accepts supported links and rejects lookalike hosts', () => {
  const { context } = harness(() => {});
  assert.equal(vm.runInContext('extractVideoUrl("رابط https://vt.tiktok.com/test/")', context), 'https://vt.tiktok.com/test/');
  assert.equal(vm.runInContext('extractVideoUrl("https://youtube.com.evil.example/watch")', context), null);
  assert.equal(vm.runInContext('extractVideoUrl("https://user:pass@youtube.com/watch")', context), null);
});
test('URL job submission and polling render source-derived results', async () => {
  const calls = [];
  const { context, element } = harness(async (url, options) => {
    calls.push([url, options]);
    return { ok: true, json: async () => calls.length === 1 ? { jobId: 'job-1' } :
      { status: 'completed', progress: 100, result: { results: [
        { verified: true, type: 'quran', displayText: 'النص من المصدر', source: { surahName: 'الشرح', ayah: 5, verseKey: '94:5' } },
        { verified: false, displayText: 'unverified text' }
      ] } } };
  });
  element('#video-url').value = 'https://youtube.com/shorts/test';
  await vm.runInContext('executeUrlSearch()', context);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], '/api/media/url/jobs');
  assert.equal(JSON.parse(calls[0][1].body).url, 'https://youtube.com/shorts/test');
  assert.equal(calls[1][0], '/api/media/url/jobs/job-1');
  assert.equal(element('#results').children.length, 1);
  assert.equal(element('#submit').disabled, false);
});
test('Failed URL jobs display error with retry', async () => {
  let count = 0;
  const { context, element } = harness(async () => ({
    ok: true, json: async () => ++count === 1 ? { jobId: 'job-2' } :
      { status: 'failed', error: { message: 'المقطع غير متاح' } },
  }));
  element('#video-url').value = 'https://instagram.com/reel/test/';
  await vm.runInContext('executeUrlSearch()', context);
  assert.equal(element('#status').textContent, 'المقطع غير متاح');
  assert.equal(element('#status').children.at(-1).textContent, 'إعادة المحاولة');
  assert.equal(element('#submit').disabled, false);
});
