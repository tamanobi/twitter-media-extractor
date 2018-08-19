const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

const getRandomInt = max => Math.floor(Math.random() * Math.floor(max))

const scroll = async (page, length) => {
  let count = 0
  let owari = false
  let num = 0
  let images
  while (true) {
    if (getRandomInt(100) <= 5) {
      await page.evaluate(() => window.scrollBy(0,-10))
    } else {
      await page.evaluate(() => window.scrollBy(0,10))
    }

    images = await page.evaluate(() => {
      const list = Array.from(document.querySelectorAll('span.AdaptiveStreamGridImage'))
      return list.map(e => e.dataset.itemId)
    })
    count += 1

    if (images.length > length) {
      break
    }

    if (count >= 10000) {
      owari = true
      break
    }
  }

  return {'owari': owari, 'images': images}
}

const extractMediaUrls = async (name) => {
  const browser = await puppeteer.launch({
      headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768})
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.32 Safari/537.36')

  await page.goto('https://twitter.com')

  const url = `https://twitter.com/search?f=images&vertical=default&q=from%3A%40${name}&src=typd`
  await page.goto(url);
  await page.waitForNavigation({waitUntil: 'networkidle0'})

  selector = 'span.AdaptiveStreamGridImage'
  await page.waitFor(selector)
  const length = await page.evaluate(selector => document.querySelectorAll(selector).length, selector)

  let {owari, images} = await scroll(page, length)
  while (!owari) {
    let ret = await scroll(page, length)
    owari = ret.owari
    images = ret.images

    if (images.length > 40) {break}
  }
  await browser.close();

  return new Promise(resolve => resolve(images))
}


(async () => {
  const users = fs.readFile('users.txt', 'utf-8', async (err, name) => {
    if (err) throw err

    const list = await extractMediaUrls(name)
    console.log(list)
  })
})();
