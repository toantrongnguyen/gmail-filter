const logger = require('log4js').getLogger()
logger.level = 'debug'
const find = require('lodash/find')
const inputCmd = require('./utils/inputCmd')
const { google } = require('googleapis')
const { queryBox } = require('./utils/date')
const { sendMessageToChatwork } = require('./chatwork')
const chatworkAccounts = require('./accounts')

async function app(auth) {
  const gmail = google.gmail({ version: 'v1', auth })
  const list = await getListMessages(gmail)
  const array = list.map(async item => getMessage(gmail, item))
  const users = await Promise.all(array)
  logger.debug('Would you like to send message to chatwork? (y/n)')
  const type = await inputCmd()
  if (type.toUpperCase() !== 'Y') return
  const chatworkUsers = mapChatworkId(users)
  const result = sendMessageToChatwork(chatworkUsers)
}

function getListMessages(gmail) {
  return new Promise((resolve, reject) => {
    const day = 1
    logger.debug('Get message from pattern', queryBox())
    gmail.users.messages.list(
      {
        userId: 'me',
        q: queryBox(),
        maxResults: 999,
      },
      (err, res) => {
        if (err) {
          logger.debug('The API returned an error: ', err)
          reject(err)
          return
        }
        const length = res.data.resultSizeEstimate
        logger.debug({ length })
        logger.debug('Finding %s messages in %s day', res.data.messages.length, day)
        resolve(res.data.messages)
      }
    )
  })
}

function getMessage(gmail, item) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.get(
      {
        userId: 'me',
        id: item.id,
        format: 'full',
      },
      (err, res) => {
        if (err) {
          logger.debug('The API returned an error: ', err)
          reject(err)
          return
        }
        const subject = find(res.data.payload.headers, { name: 'Subject' })
        logger.debug('Got from ', formatName(subject.value))
        resolve(formatName(subject.value))
      }
    )
  })
}

function formatName(subject) {
  return /.+\s+(\S+)$/.exec(subject)[1]
}

function mapChatworkId(users) {
  const chatworkUser = users.map(user => {
    const username = user.replace(/\./g, ' ')
    return find(chatworkAccounts, account => account.name.toUpperCase() === username.toUpperCase())
  })
  return chatworkUser
}

module.exports = app
