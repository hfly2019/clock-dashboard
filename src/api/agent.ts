/**
 * Mock API for Hermes AI Agent
 * Replace this with actual fetch calls to your Hermes API backend.
 */
export async function fetchChatCompletion(messages: { role: string; content: string }[]): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lastMessage = messages[messages.length - 1]?.content || ''
      
      let response = '我收到你的消息了。'
      
      if (lastMessage.includes('天气')) {
        response = '今天的天气看起来不错，适合出门！'
      } else if (lastMessage.includes('灯')) {
        response = '已经为你执行了开灯的指令。'
      } else if (lastMessage.includes('你好')) {
        response = '你好！我是 Hermes AI，有什么我可以帮你的吗？'
      } else {
        response = `作为 Hermes AI，我听懂了你说：“${lastMessage}”，这只是一个模拟的回复！`
      }
      
      resolve(response)
    }, 1500) // Simulate network delay
  })
}
