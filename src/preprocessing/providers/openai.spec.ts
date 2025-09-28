import { describe, it, expect, beforeEach } from 'vitest'
import { OpenAIProvider } from './openai'
import type { PreprocessingConfig } from '../config'

const WORKER_URL = 'https://kinde-gated-openai-responses-api.path2dream.workers.dev'

describe('OpenAIProvider Real API Integration', () => {
  let provider: OpenAIProvider
  let mockConfig: PreprocessingConfig

  beforeEach(() => {
    provider = new OpenAIProvider()
    mockConfig = {
      enabled: true,
      targetLanguage: 'ru',
      summarizationLevel: 'aggressive'
    }
  })

  describe('Real Kinde-gated API communication', () => {
    it('successfully communicates with real API using VITE_DEV_PRO_TOKEN', async () => {
      const devToken = process.env.VITE_DEV_PRO_TOKEN

      if (!devToken) {
        throw new Error('VITE_DEV_PRO_TOKEN environment variable is not set. Please set it to run this test.')
      }

      const testText = 'Hello world'

      // Make a real API call to test the integration
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${devToken}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Translate "${testText}" to Russian with aggressive summarization`
          }]
        })
      })

      // Verify the API call succeeds
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const data = await response.json()

      console.log('Full API Response:', JSON.stringify(data, null, 2))

      // Verify we get a valid OpenAI response structure
      expect(data).toBeDefined()
      expect(data.choices).toBeDefined()
      expect(Array.isArray(data.choices)).toBe(true)
      expect(data.choices.length).toBeGreaterThan(0)

      const choice = data.choices[0]
      expect(choice.message).toBeDefined()
      expect(choice.message.content).toBeDefined()
      expect(typeof choice.message.content).toBe('string')
      expect(choice.message.content.length).toBeGreaterThan(0)

      console.log('Real API Response:', choice.message.content)
    }, 30000) // 30 second timeout for real API call

    it('successfully streams from real API using VITE_DEV_PRO_TOKEN', async () => {
      const devToken = process.env.VITE_DEV_PRO_TOKEN

      if (!devToken) {
        throw new Error('VITE_DEV_PRO_TOKEN environment variable is not set. Please set it to run this test.')
      }

      const testText = 'Hello world'

      // Make a real streaming API call
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${devToken}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Translate "${testText}" to Russian with aggressive summarization`
          }],
          stream: true
        })
      })

      // Verify the streaming API call succeeds
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.body).toBeDefined()

      // Read the stream
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let collectedText = ''
      let receivedTokens = 0

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          console.log('Received chunk:', chunk)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6)
              console.log('Data line:', dataStr)
              if (dataStr.trim() === '[DONE]') {
                break
              }
              try {
                const data = JSON.parse(dataStr)
                console.log('Parsed data:', data)
                if (data.type === 'response.output_text.delta') {
                  collectedText += data.delta
                  receivedTokens++
                } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                  // Handle OpenAI chat completion format
                  collectedText += data.choices[0].delta.content
                  receivedTokens++
                }
              } catch (e) {
                console.log('Failed to parse JSON:', dataStr, e)
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // Verify we received streaming data
      expect(receivedTokens).toBeGreaterThan(0)
      expect(collectedText.length).toBeGreaterThan(0)

      console.log('Real Streaming Response:', collectedText)
      console.log('Received tokens:', receivedTokens)
    }, 30000) // 30 second timeout for real API call

    it('handles authentication errors properly', async () => {
      const testText = 'Hello world'

      // Make a real API call with invalid token
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Translate "${testText}" to Russian`
          }]
        })
      })

      // Verify the API call fails
      console.log('Error response status:', response.status)
      const errorText = await response.text()
      console.log('Error response body:', errorText)
      expect(response.ok).toBe(false)
      // Accept either 400 or 401 as valid error codes
      expect([400, 401]).toContain(response.status)
    })
  })
})