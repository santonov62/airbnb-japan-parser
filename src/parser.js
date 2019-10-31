const puppeteer = require('puppeteer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const {isSilentMode, url, users, accessToken, apiVersion} = require('../config.json');
let houserooms = require('../houserooms.json');

const log = (text, params = '') => {
  console.log(`${new Date().toISOString()} -> ${text}`, params);
};

const start = async () => {
  
  if (!url)
    throw new Error(`Url required.`);
  
  const launchParams = { args: [ `--no-sandbox` ], headless: isSilentMode };
  const browser = await puppeteer.launch(launchParams);
  
  try {
    const page = await browser.newPage();
  
    log(`[goto] `, url);
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    log('done');
  
    // log(`[waitFor]: #FMP-target>div>div>div>div>div`);
    // await page.waitFor('#FMP-target>div>div>div>div>div', {visible: true});
    // let parsedHouserooms = await page.$$eval('#FMP-target>div>div>div>div>div', divs => {
    //   return divs.map(div => {
    //     return {
    //       innerText: div.innerText,
    //       url: 'https://airbnb.com' + div.querySelector('a').getAttribute('href')
    //     }
    //   });
    // });
    log(`[waitFor]: [itemprop="itemListElement"]`);
    await page.waitFor('[itemprop="itemListElement"]', {visible: true});
    let parsedHouserooms = await page.$$eval('[itemprop="itemListElement"]', divs => {
      return divs.map(div => {
        return {
          innerText: div.innerText,
          url: 'https://airbnb.com' + div.querySelector('a').getAttribute('href')
        }
      });
    });
    const newHouserooms = parsedHouserooms.filter(parsedHouseroom => {
      return !houserooms.some(houseroom => houseroom.innerText === parsedHouseroom.innerText);
    });
    log('newHouserooms ', newHouserooms.length);
    
    houserooms = houserooms.concat(newHouserooms);
    log('Houserooms ', houserooms.length);

    fs.writeFile('houserooms.json', JSON.stringify(houserooms), 'utf8', () => { });
  
    while (newHouserooms.length > 0) {
      const houseroom = newHouserooms.shift();
      await sendVk(`
      ============================
        ${houseroom.innerText}

        ${houseroom.url}
      `);
    }
    
  } catch (e) {
    log(`[start][error]`, e.message);
  } finally {
    // browser.close();
  }
};

const sendVk = async (message) => {
  log('[sendVk]');
  const formData = new FormData();
  formData.append('message', message);
  formData.append('user_ids', users);
  formData.append('access_token', accessToken);
  formData.append('v', apiVersion);
  
  return fetch(`https://api.vk.com/method/messages.send`, {
    method: 'POST',
    body: formData,
  })
      .then(res => res.json())
      .then((json) => {
        const {error} = json;
        if (!!error)
          throw new Error(error.error_msg);
        log(`[sendVk] done`, json);
        return json;
      })
};

const restart = (browser) => {
  log(`[restart]`);
  browser.close().then(() => start());
};

module.exports = {
  start,
};