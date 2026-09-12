import { test, expect, savedState } from './support.js';

const root = 'https://gplan-fixture.invalid/api/v1';
const google = 'https://generativelanguage.googleapis.com/v1beta';
const sentinel = 'RELEASE_FIXTURE_KEY_NEVER_PERSIST_01a09440';
// Independently fixed real IDs; never derive a fixture answer from the adapter payload.
const exerciseIds = ['dumbbell-bench-press', 'bodyweight-squat', 'dumbbell-curl'];
const draft = {
  name: 'Fixture balanced strength',
  days: [{ name: 'Full body', items: exerciseIds.map(exerciseId => ({
    exerciseId, sets: 3, restSeconds: 60, prescription: { kind: 'reps', min: 8, max: 12 },
  })) }],
};

for (const provider of ['gemini', 'openai-compatible']) {
  test(`${provider} real adapter discovery preview errors and secret boundary`, async ({ page, qa }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let generation = 'valid';
    const modelId = provider === 'gemini' ? 'models/release-second-page' : 'release-fixture-model';
    const modelUrls = [];
    const generationRequests = [];
    const generationUrl = provider === 'gemini' ? `${google}/models/release-second-page:generateContent` : `${root}/chat/completions`;
    await page.route(provider === 'gemini' ? `${google}/**` : `${root}/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      expect(request.headers()[provider === 'gemini' ? 'x-goog-api-key' : 'authorization']).toBe(provider === 'gemini' ? sentinel : `Bearer ${sentinel}`);
      if (request.method() === 'GET') {
        expect(url.pathname).toBe(provider === 'gemini' ? '/v1beta/models' : '/api/v1/models');
        modelUrls.push(request.url());
        if (provider === 'gemini') {
          const secondPage = url.searchParams.get('pageToken') === 'release-page-2';
          expect(url.search).toBe(secondPage ? '?pageToken=release-page-2' : '');
          await route.fulfill({ json: secondPage
            ? { models: [{ name: modelId, displayName: 'Release second page', supportedGenerationMethods: ['generateContent'] }] }
            : { models: [{ name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] },
              { name: 'models/release-first-page', supportedGenerationMethods: ['generateContent'] }], nextPageToken: 'release-page-2' } });
        } else await route.fulfill({ json: { data: [{ id: modelId }] } });
        return;
      }
      expect(request.url()).toBe(generationUrl);
      expect(request.method()).toBe('POST');
      const body = request.postDataJSON();
      if (provider !== 'gemini') expect(body.model).toBe(modelId);
      const payload = JSON.parse(provider === 'gemini' ? body.contents[0].parts[0].text : body.messages[1].content);
      expect(payload.request).toMatchObject({ daysPerWeek: 1, exercisesPerDay: 3 });
      expect(payload.catalog.map(item => item.id)).toEqual(expect.arrayContaining(exerciseIds));
      generationRequests.push({ url: request.url(), mode: generation, requestedDays: payload.request.daysPerWeek, requestedItems: payload.request.exercisesPerDay });
      if (generation === '401') { await route.fulfill({ status: 401, json: { error: { message: 'Fixture unauthorized' } } }); return; }
      const text = generation === 'malformed' ? '{invalid-json' : JSON.stringify(draft);
      await route.fulfill({ json: provider === 'gemini'
        ? { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }
        : { choices: [{ finish_reason: 'stop', message: { content: text } }] } });
    });
    await qa.action('open fresh provider fixture context', () => page.goto('/'));
    await qa.click('Add Bodyweight squat to plan');
    await qa.click('View plan');
    await qa.fill('Plan name', 'Existing manual plan');
    await qa.click('Settings');
    await qa.select('Provider', provider);
    if (provider === 'openai-compatible') await qa.fill('Provider root URL', root);
    expect(modelUrls).toEqual([]);
    await qa.fill('API key', sentinel);
    await qa.click('Discover models');
    await expect(page.getByLabel('Discovered models')).toBeVisible();
    if (provider === 'gemini') {
      await expect(page.getByLabel('Discovered models').locator('option')).toHaveCount(3);
      expect(modelUrls).toEqual([`${google}/models`, `${google}/models?pageToken=release-page-2`]);
      await expect(page.getByLabel('Discovered models').locator('option[value="models/embedding-only"]')).toHaveCount(0);
    } else expect(modelUrls).toEqual([`${root}/models`]);
    await qa.select('Discovered models', modelId);
    await qa.click('Save AI preferences');
    const beforePreview = await savedState(page);
    expect(beforePreview.aiPreferences).toEqual({ config: provider === 'gemini' ? { provider } : { provider, baseUrl: root }, modelId });
    expect(JSON.stringify(beforePreview)).not.toContain(sentinel);
    await page.getByLabel('Discovered models').scrollIntoViewIfNeeded();
    await qa.shot('discovered-selected-saved');
    await qa.click('Plan');
    await qa.click('Plan with AI');
    await qa.select('Days per week', '1');
    await qa.select('Exercises per day', '3');
    await qa.click('Generate preview');
    await expect(page.getByRole('button', { name: 'Accept plan', exact: true })).toBeVisible();
    await expect(page.locator('.ai-preview li')).toHaveCount(3);
    expect(await savedState(page)).toEqual(beforePreview);
    await page.getByRole('button', { name: 'Accept plan', exact: true }).scrollIntoViewIfNeeded();
    await qa.shot('valid-preview-not-saved');
    await qa.click('Accept plan');
    await expect(page.getByLabel('Plan name', { exact: true })).toHaveValue(draft.name);
    await expect(page.locator('.plan-item')).toHaveCount(3);
    const accepted = await savedState(page);
    expect(accepted.plans).toHaveLength(2);
    expect(accepted.plans[0]).toEqual(beforePreview.plans[0]);
    const acceptedPlan = accepted.plans.find(plan => plan.id === accepted.activePlanId);
    expect(acceptedPlan.source).toBe('ai');
    expect(acceptedPlan.days).toHaveLength(1);
    expect(acceptedPlan.days[0].items.map(item => item.exerciseId)).toEqual(exerciseIds);
    await qa.click('Dismiss notification');
    await page.locator('.plan-item').first().scrollIntoViewIfNeeded();
    await qa.shot('accepted-real-plan');
    for (const mode of ['malformed', '401']) {
      generation = mode;
      await qa.click('Plan with AI');
      await qa.select('Days per week', '1');
      await qa.select('Exercises per day', '3');
      await qa.click('Generate preview');
      const alert = page.getByRole('dialog').getByRole('alert');
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(mode === '401' ? 'authentication:' : 'invalid-response:');
      await expect(page.getByRole('button', { name: 'Accept plan', exact: true })).toHaveCount(0);
      expect(await savedState(page)).toEqual(accepted);
      await alert.scrollIntoViewIfNeeded();
      await qa.shot(`${mode}-error-existing-plan-preserved`);
      await qa.click('Close dialog');
      await expect(page.getByLabel('Plan name', { exact: true })).toHaveValue(draft.name);
    }
    expect(generationRequests.map(request => request.mode)).toEqual(['valid', 'malformed', '401']);
    qa.receipt.requests = [...modelUrls.map(url => ({ url, method: 'GET' })), ...generationRequests];
    qa.receipt.liveProvider = 'unverified: no live credentials; HTTP fixtures only';
    await qa.click('Settings');
    // Export while the credential is still in memory, not merely after reload clears it.
    await expect(page.getByLabel('API key', { exact: true })).toHaveValue(sentinel);
    const downloaded = page.waitForEvent('download');
    await qa.click('Export JSON backup');
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('gplan-backup.json');
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const exported = Buffer.concat(chunks).toString('utf8');
    expect(exported).toBe(await page.getByLabel('Backup JSON').inputValue());
    expect(JSON.parse(exported)).toEqual(accepted);
    expect(exported).not.toContain(sentinel);
    expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(sentinel);
    await download.delete();
    qa.receipt.downloadDeleted = true;
    await qa.action('reload clears in-memory API key', () => page.reload());
    await qa.click('Settings');
    await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
    expect(await savedState(page)).toEqual(accepted);
    if (provider === 'openai-compatible') {
      await qa.fill('Provider root URL', 'http://provider.example/v1');
      await qa.click('Save AI preferences');
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await savedState(page)).toEqual(accepted);
      await qa.shot('remote-http-rejected');
      await qa.fill('Provider root URL', 'http://localhost:11434/v1');
      await qa.click('Save AI preferences');
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect((await savedState(page)).aiPreferences.config).toEqual({ provider, baseUrl: 'http://localhost:11434/v1' });
      await qa.action('reload saved localhost URL', () => page.reload());
      await qa.click('Settings');
      await expect(page.getByLabel('Provider root URL')).toHaveValue('http://localhost:11434/v1');
    }
    await qa.overflow();
  });
}
