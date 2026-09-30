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
    const types = {'.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.gif':'image/gif', '.pdf':'application/pdf'};
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
      if (viewport.width === 1280) {
        for (const route of ['research','teaching','cv']) {
          for (const suffix of ['', '.html']) {
            const removed = await context.request.get(`${origin}/${route}${suffix}`);
            if (removed.status() !== 404) throw new Error(`Removed page remains available: /${route}${suffix}`);
          }
        }
      }
      for (const name of ['index','publications']) {
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
        if (JSON.stringify(state.navigation.map(item => item.label)) !== JSON.stringify(['Home','Publications'])) throw new Error(`${name}: unexpected navigation items`);
        for (const item of state.navigation) {
          const destination = await context.request.get(origin + item.href);
          if (destination.status() !== 200) throw new Error(`Broken navigation: ${item.href}`);
        }
        if (viewport.width < 500) {
          const toggle = page.getByRole('button', {name:'Toggle navigation'});
          await toggle.click();
          await page.locator('#navbarResponsive.show').waitFor({state:'visible'});
          await toggle.click();
          await page.locator('#navbarResponsive').waitFor({state:'hidden'});
        }
        if (name === 'index' && await page.locator('#research-overview-title').count() !== 0) throw new Error('Research section remains on the homepage');
        if (name === 'index') {
          const cvLink = page.getByRole('link', {name:'Curriculum Vitae (PDF)', exact:true});
          if (!await cvLink.isVisible()) throw new Error('CV link is missing or hidden');
          const cvHref = await cvLink.getAttribute('href');
          const cvResponse = await context.request.get(new URL(cvHref, origin).href);
          if (cvResponse.status() !== 200 || cvResponse.headers()['content-type'] !== 'application/pdf') throw new Error('CV download is not served as a PDF');
          const cvBytes = await cvResponse.body();
          if (cvBytes.subarray(0,5).toString() !== '%PDF-') throw new Error('CV download is not a valid PDF file');
        }
        await page.screenshot({path:path.join(output,`${name}-${viewport.width}.png`),fullPage:true});
        checks.push({page:name,width:viewport.width,navigation:state.navigation,overflow:false});
      }
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(checks,null,2));
    console.log(`Checked ${checks.length} page/viewport combinations, navigation destinations, CV PDF, removed pages, and the mobile menu.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
