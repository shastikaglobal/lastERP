const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages, system } = req.body
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: system || 'You are a helpful ERP assistant.',
        messages: messages
      })
    })

    const data = await response.json()
    console.log('Claude response:', JSON.stringify(data))
    res.json({ content: data.content[0].text })

  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => console.log('✅ Server running on port 3001'))