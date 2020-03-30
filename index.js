const puppeteer = require('puppeteer')
const Push = require( 'pushover-notifications' )

const push = new Push( {
  user: process.env['PUSHOVER_USER'],
  token: process.env['PUSHOVER_TOKEN']
})

const msgPushOver = {
  message: "Il y a un creneau disponible !",
  title: "Creneau disponible sur chronodrive",
  sound: 'magic',
  file: 'chronodrive.png',
  priority: 1
}

const credentials = {
  login: process.env['CHRONODRIVE_EMAIL'],
  password: process.env['CHRONODRIVE_PASSWORD']
}

// Set Brie Comte Robert shop
let shopCookie = {
  name: 'chronoShop',
  value: `"shopId=${process.env['CHRONODRIVE_SHOP_ID']}"`,
  domain: 'www.chronodrive.com',
  path: '/'
}

// Remove the popup
let popupCookie = {
  name: 'popinComm',
  value: '1',
  domain: 'www.chronodrive.com',
  path: '/'
}

async function checkSlots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 2000, height: 2000 })
    await page.setCookie(shopCookie, popupCookie)
    await page.goto('https://www.chronodrive.com/login')
    await page.screenshot({ path: 'chronodrive.png' })


    await page.click('#email_login')
    page.keyboard.type(credentials.login)
    await page.waitFor(1000)
    await page.click('#pwd_login')
    page.keyboard.type(credentials.password)
    await page.waitFor(1000)
    await page.click('#loginForm > button')
    await page.waitFor(3000)
    await page.goto('https://www.chronodrive.com/checkout')
    // Do it again, it seems that chronodrive do something weird with redirection
    await page.goto('https://www.chronodrive.com/checkout')
    await page.waitFor(2000)

    const slots = await page.evaluate(() => {
      return document.querySelector('#slotFieldSetZone > div > div > div.left > div').innerText
    })
    if (!slots.includes('Pas de créneau horaire')) {
      await page.screenshot({ path: 'chronodrive.png' })

      push.send(msgPushOver, function(err, result) {
        if (err) throw err
        console.log(result)
      })
    } else {
      console.log('No slot available :(')
    }

  } catch(e) {
    console.log(e)
    process.exit()
  }
  finally {
    browser.close()
  }
}

checkSlots()
