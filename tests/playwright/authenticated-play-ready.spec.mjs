import {test,expect} from "@playwright/test";

const email=process.env.PLAY_TEST_EMAIL||"";
const password=process.env.PLAY_TEST_PASSWORD||"";

test.describe("smoke autenticado",()=>{
  test.skip(!email||!password,"Defina PLAY_TEST_EMAIL e PLAY_TEST_PASSWORD para executar o smoke autenticado.");

  test("login, perfil e camada de consentimento funcionam",async({page})=>{
    await page.goto("/conta.html?tab=login&app=1",{waitUntil:"domcontentloaded"});
    await page.locator("#loginEmail").fill(email);
    await page.locator("#loginPassword").fill(password);
    await page.locator("#loginForm button[type=submit]").click();
    await page.waitForURL(url=>!url.pathname.endsWith("/conta.html"),{timeout:30_000});

    const legal=page.locator("#legalConsentV47");
    if(await legal.isVisible().catch(()=>false)){
      await page.locator("#legalAcceptV47").check();
      await page.locator("#legalAdultV47").check();
      await page.locator("#legalConfirmV47").click();
      await expect(legal).toBeHidden({timeout:20_000});
    }

    await page.goto("/meu-perfil.html?app=1",{waitUntil:"domcontentloaded"});
    await expect(page.locator("body")).not.toContainText("Missing or insufficient permissions");
    await expect(page.locator("body")).not.toContainText("FirebaseError: [code=permission-denied]");
  });
});
