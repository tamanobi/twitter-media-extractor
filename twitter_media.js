const puppeteer = require('puppeteer')
const fs = require('fs')

const sleep = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    });
}

const getRandomInt = max => Math.floor(Math.random() * Math.floor(max))

const scroll = async (page, length) => {
  let count = 0
  let owari = false
  let num = 0
  let images
  //const selector = 'span.AdaptiveStreamGridImage'
  const selector = '.stream-item[data-item-type=\"tweet\"]'
  while (true) {
    if (getRandomInt(100) <= 5) {
      await page.evaluate(() => window.scrollBy(0, -10))
    } else {
      // await page.evaluate(() => window.scrollBy(0, 10))
      await page.evaluate(() => window.scrollBy(0, 10000), {'waitUntil': 'networkidle0'})
    }

    images = await page.evaluate(selector => {
      const list = Array.from(document.querySelectorAll(selector))
      return list.map(e => e.dataset.itemId)
    }, selector)
    count += 1

    if (images.length > length) {
      break
    }

    if (count >= 10) {
      owari = true
      break
    }
  }

  return {'owari': owari, 'images': images}
}

const extractMediaUrls = async (page, name) => {
  await page.goto('https://twitter.com')

  // const url = `https://twitter.com/search?f=images&vertical=default&q=from%3A%40${name}&src=typd`
  const url = `https://twitter.com/${name}/media`
  await page.goto(url);
  await page.waitForNavigation({waitUntil: 'networkidle0'})

  // selector = 'span.AdaptiveStreamGridImage'
  selector = '.stream-item[data-item-type=\"tweet\"]'
  await page.waitFor(selector)
  const length = await page.evaluate(selector => document.querySelectorAll(selector).length, selector)

  let {owari, images} = await scroll(page, length)
  while (!owari) {
    let ret = await scroll(page, length)
    owari = ret.owari
    images = ret.images

    if (images.length > 10) {break}
  }
  return new Promise(resolve => resolve(images))
}


(async () => {
const names = fs.readFileSync('users.txt', 'utf-8').toString().split("\n").filter((text) => text != '')
  console.log(names)

  const browser = await puppeteer.launch({
      headless: false
  })

  let page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768})
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.32 Safari/537.36')

  let user_image = []
  for (let j = 0; j < names.length; j++) {
    const name = names[j]
    let status_ids = await extractMediaUrls(page, name)
    status_ids = status_ids.splice(0, 1)
    let image_urls = []
    for (let i = 0; i < status_ids.length; i++) {
      await page.goto(`https://twitter.com/${name}/status/${status_ids[i]}`, {'waitUntil': 'domcontentloaded'})
      await page.waitForNavigation({waitUntil: 'networkidle0'})
      const urls = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-image-url]'), e => e.dataset.imageUrl)
      )
      image_urls = image_urls.concat(urls)
    }
    user_image.push({user: name, image_urls: image_urls})
  }
  await browser.close()

  let content = user_image.reduce((text, current) => {
    return text + "\n" + JSON.stringify(current)
  })

  for (let k = 0; k < user_image.length; k++) {
    fs.appendFile('output.txt', JSON.stringify(user_image[k]) + "\n", (err) => {})
  }
})()
