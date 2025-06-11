const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')
const fetch = require('node-fetch')

async function main (params) {
  console.log('=== REACHED VEEVA ACTION MAIN ===')
  console.log('Received params:', JSON.stringify(params, null, 2))
  console.log('Received headers:', JSON.stringify(params.__ow_headers, null, 2))
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    const operation = params.operation || 'auth'
    const requiredParams = operation === 'auth' 
      ? ['username', 'password', 'vaultUrl', 'apiVersion']
      : ['sessionId', 'query', 'vaultUrl', 'apiVersion']
    
    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      console.log('Missing inputs:', errorMessage)
      return errorResponse(400, errorMessage, logger)
    }

    const { vaultUrl, apiVersion } = params
    let url, headers, body

    if (operation === 'auth') {
      // Basic Veeva auth call
      console.log('Calling Veeva auth')
      url = `${vaultUrl}/api/${apiVersion}/auth`
      headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
      body = new URLSearchParams({
        username: params.username,
        password: params.password
      })

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log('Veeva auth failed with status:', response.status)
        console.log('Error response:', errorText)
        throw new Error(`Veeva auth failed with status ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('Veeva auth successful')
      console.log('Response body:', data)
      
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      }
    } else {
      // Query operation
      url = `${vaultUrl}/api/${apiVersion}/query?q=${encodeURIComponent(params.query)}`
      headers = {
        'Authorization': params.sessionId,
        'Content-Type': 'application/x-www-form-urlencoded'
      }

      console.log('Making Veeva query request to:', url);
      console.log('With headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Veeva query failed with status ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      }
    }
  } catch (error) {
    return errorResponse(500, error.message, logger)
  }
}

exports.main = main 