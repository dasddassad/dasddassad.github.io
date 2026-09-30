const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve('_site');
const output = path.resolve('_preview_checks');
fs.mkdirSync(output, { recursive: true });

const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(404).end(); return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target) && fs.existsSync(target + '.html')) target += '.html';
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404).end(); return;
    }
    const types = {'.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.gif':'image/gif'};
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    fs.createReadStream(target).pipe(response);
  } catch {
    response.writeHead(400).end();
  }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const checks = [];
  try {
    browser = await chromium.launch({headless:true});
    for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
      const context = await browser.newContext({viewport});
      const page = await context.newPage();
      for (const name of ['index','research','publications','teaching','cv']) {
        const response = await page.goto(`${origin}/${name === 'index' ? '' : name}`, {waitUntil:'networkidle'});
        if (response.status() !== 200) throw new Error(`${name}: HTTP ${response.status()}`);
        const state = await page.evaluate(() => ({
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          text: document.querySelector('main').innerText,
          navigation: [...document.querySelectorAll('.navbar .nav-link')].map(link => ({label:link.innerText,href:link.getAttribute('href')}))
        }));
        if (state.documentWidth > state.width + 1) throw new Error(`${name}: horizontal overflow at ${viewport.width}px`);
        if (name !== 'publications' && !state.text.includes('Ph.D. Student in Computer Science')) throw new Error(`${name}: student designation missing`);
        for (const item of state.navigation) {
          const destination = await context.request.get(origin + item.href);
          if (destination.status() !== 200) throw new Error(`Broken navigation: ${item.href}`);
        }
        if (name === 'research' && await page.locator('.research-project').count() !== 3) throw new Error('Missing research project');
        if (name === 'teaching' && (!state.text.includes('CS 262') || !state.text.includes('CS 692'))) throw new Error('Missing teaching course');
        const expectedCvDownloads = fs.existsSync(path.join(root,'assets/files/Yuang_Zhang_CV.pdf')) ? 1 : 0;
        if (name === 'cv' && await page.locator('a[download]').count() !== expectedCvDownloads) throw new Error('CV download link does not match the available PDF');
        if (viewport.width < 500) {
          const toggle = page.getByRole('button', {name:'Toggle navigation'});
          await toggle.click();
          await page.locator('#navbarResponsive.show').waitFor({state:'visible'});
          await toggle.click();
          await page.locator('#navbarResponsive').waitFor({state:'hidden'});
        }
        if (name === 'index') {
          const links = await page.locator('a[href^="/research#"]').evaluateAll(items => items.map(item => item.getAttribute('href')));
          for (const href of links) {
            const doc = await context.request.get(origin + href.split('#')[0]);
            if (!(await doc.text()).includes(`id="${href.split('#')[1]}"`)) throw new Error(`Missing research anchor: ${href}`);
          }
        }
        await page.screenshot({path:path.join(output,`${name}-${viewport.width}.png`),fullPage:true});
        checks.push({page:name,width:viewport.width,navigation:state.navigation,overflow:false});
      }
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(checks,null,2));
    console.log(`Checked ${checks.length} page/viewport combinations, navigation destinations, research anchors, and the mobile menu.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
