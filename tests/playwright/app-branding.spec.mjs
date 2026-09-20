import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';

test.beforeEach(async ({page}) => {
  await page.route('http://branding.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') {
      return route.fulfill({contentType:'text/html', body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/site-theme.css"><header class="header"><button>☰</button><a class="header-brand" href="/"><div><strong>CADASTRO DE ATLETAS</strong></div></a></header><script defer src="/app-branding-v58.js"></script>`});
    }
    const types = {'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'};
    return route.fulfill({contentType:types[path.extname(pathname)] || 'text/plain',body:readFileSync(path.resolve('.'+pathname))});
  });
});

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:1080,height:2400},{width:844,height:390}]) {
  test(`logo completa na abertura ${viewport.width}x${viewport.height}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('http://branding.test/?beta=1');
    const splash = page.locator('#appLaunch58');
    await expect(splash).toBeVisible();
    const box = await splash.boundingBox();
    expect(box.width).toBe(viewport.width);
    expect(box.height).toBe(viewport.height);
    await expect(splash.locator('img')).toHaveAttribute('src','/assets/app-splash-portrait-v61.webp');
    await expect(splash.locator('img')).toHaveCSS('object-fit','contain');
    await expect(splash.locator('img')).toHaveJSProperty('complete',true);
    await page.screenshot({path:testInfo.outputPath('abertura.png')});
    await splash.getByRole('button',{name:'Continuar'}).click();
    await expect(splash).toHaveCount(0);
    await page.evaluate(() => window.__athleteLaunchReady);
    await expect(page.locator('.app-site-logo')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('cabecalho.png')});
    await page.reload();
    await expect(page.locator('.app-site-logo')).toBeVisible();
    await expect(splash).toHaveCount(0);
  });
}

test('site exibe logo sem abertura de aplicativo', async ({page}) => {
  await page.goto('http://branding.test/');
  await expect(page.locator('.app-site-logo')).toBeVisible();
  await expect(page.locator('#appLaunch58')).toHaveCount(0);
  await page.evaluate(() => window.__athleteLaunchReady);
});
