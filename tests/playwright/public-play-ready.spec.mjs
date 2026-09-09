import {test,expect} from "@playwright/test";

test("home e modo app carregam sem erro cru de permissão",async({page})=>{
  const response=await page.goto("/?app=1",{waitUntil:"domcontentloaded"});
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).not.toContainText("Missing or insufficient permissions");
  await expect(page.locator("body")).not.toContainText("FirebaseError: [code=permission-denied]");
});

test("cadastro exige maioridade e expõe Termos e Privacidade",async({page})=>{
  const response=await page.goto("/conta.html?tab=register&app=1",{waitUntil:"domcontentloaded"});
  expect(response?.ok()).toBeTruthy();
  await page.locator('[data-account-tab="register"]').click();
  await expect(page.locator("#registerForm")).toBeVisible();
  await expect(page.locator("#registerBirth")).toHaveAttribute("required","");
  const max=await page.locator("#registerBirth").getAttribute("max");
  expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(page.locator("#confirmAdult")).toBeVisible();
  await expect(page.locator("#acceptTerms")).toBeVisible();
  await expect(page.locator('a[href*="termos-de-uso"]')).toHaveCount(2);
  await expect(page.locator('a[href*="politica-privacidade"]')).toHaveCount(2);
});

test("recursos legais públicos estão acessíveis",async({page})=>{
  for(const path of ["/termos-de-uso.html","/politica-privacidade.html","/exclusao-conta.html"]){
    const response=await page.goto(path,{waitUntil:"domcontentloaded"});
    expect(response?.ok(),path).toBeTruthy();
  }
  await expect(page.getByRole("heading",{name:/Excluir minha conta/i})).toBeVisible();
});

test("manifesto PWA está pronto para experiência standalone",async({request})=>{
  const response=await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest=await response.json();
  expect(manifest.start_url).toBe("/?app=1");
  expect(manifest.display).toBe("standalone");
  expect(manifest.scope).toBe("/");
  expect(manifest.icons.some(icon=>icon.sizes==="512x512")).toBeTruthy();
});
