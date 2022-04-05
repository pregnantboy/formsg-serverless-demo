const formsg = require('@opengovsg/formsg-sdk')({
  mode: 'production',
})
const fetch = require('node-fetch')

const WEBHOOK_URL = process.env.WEBHOOK_URL
const FORM_SECRET = process.env.FORM_SECRET

module.exports.handler = async (event) => {
  const { headers, body } = event

  try {
    formsg.webhooks.authenticate(headers['x-formsg-signature'], WEBHOOK_URL)
  } catch (e) {
    console.error(e)
    return {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }
  }

  let submission
  try {
    const { data } = JSON.parse(body)
    submission = formsg.crypto.decrypt(FORM_SECRET, data)

    if (!submission) {
      throw new Error('decryption failed')
    }
    console.log(submission.responses)
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      body: { message: 'Could not decrypt response' },
    }
  }

  const responsesObj = parseResponses(submission.responses)
  console.log(responsesObj)

  try {
    // This endpoint returns whatever you send in the body
    const res = await fetch('https://post200-o8l9p38acizz.runkit.sh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsesObj),
    })
    const json = await res.json()
    console.log(json)
  } catch (e) {
    console.error(e)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Successfully received form submission',
    }),
  }
}

const parseResponses = (responses) => {
  const result = {}
  responses.forEach(({ question, answer }) => {
    if (/email/i.test(question)) {
      result.email = answer
    }
    if (/website/i.test(question)) {
      result.website = answer
    }
  })
  return result
}
