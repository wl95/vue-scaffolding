const path = require('path')
const fs = require('fs')
const filePath = path.resolve('./src')
const writeFilePath = path.join(__dirname, 'config', 'router', 'router.js')
const replaceStr = path.join(__dirname, 'src')
const noMePath = path.join(__dirname, 'src', 'router')
const routers = []

/**
 * 休眠
 * @param time
 * @returns {Promise<any>}
 */
function sleep(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time)
  })
}

/**
 * 写文件内容
 * @param url
 * @param str
 * @returns {Promise<any>}
 */
function writeFile(url, str) {
  return new Promise(function(resolve) {
    fs.writeFile(url, str, (err) => {
      resolve(err)
    })
  })
}

/**
 * 便利目标文件夹以及子文件
 * @param currentDirPath
 * @param callback
 */
function walk(currentDirPath, callback) {
  fs.readdir(currentDirPath, function(err, files) {
    if (err) {
      throw new Error(err)
    }
    files.forEach(function(name) {
      var filePath = path.join(currentDirPath, name)
      var stat = fs.statSync(filePath)
      // 如果是业务router.js
      if (stat.isFile() && currentDirPath !== noMePath && name === 'router.js') {
        routers.push(filePath.split(path.sep).join('/'))
      } if (stat.isFile() && name === 'router-no-ie.js') {
        routers.push(filePath.split(path.sep).join('/'))
      } else if (stat.isDirectory()) {
        walk(filePath, callback)
      }
    })
  })
}
async function start() {
  await writeFile(writeFilePath, '')
  walk(filePath)
  sleep(3000).then(async() => {
    let newStr = ''
    routers.forEach((str, i) => {
      str = str.replace(replaceStr, '../../src')
      newStr += `import router${i} from '${str}'\n`
    })
    newStr += `\nexport default [\n`
    routers.forEach((str, i) => {
      if (i === routers.length - 1) {
        newStr += `  ...router${i}\n`
      } else {
        newStr += `  ...router${i},\n`
      }
    })
    newStr += `]\n`
    console.log(newStr)
    const wrErr = await writeFile(writeFilePath, newStr)
    if (wrErr) {
      console.log(`2 error! ${writeFilePath}`, wrErr)
    } else {
      console.log('write router.js success! ')
    }
  })
}
start()
