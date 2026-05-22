
export const generateHealthSummary = async (data: any, language: 'en' | 'vi' = 'vi', systemPrompt?: string) => {
  const response = await fetch('/api/gemini/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, language, systemPrompt })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate summary');
  }
  return response.json();
};

export const chatWithHealthAssistant = async (message: string, recentData: any, language: 'en' | 'vi' = 'vi') => {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, recentData, language })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send message');
  }
  const result = await response.json();
  return result.text;
};
