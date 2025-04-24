// tools.js

import 'dotenv/config';
import OpenAI from 'openai';

/**
 * A collection of tools that the ReAct agent can use
 */

/**
 * Simulates a weather checking tool
 * @param {string} location - The location to check weather for
 * @returns {Promise<string>} - The weather information
 */
export async function checkWeather(location) {
  // In a real implementation, this would call a weather API
  console.log(`[Tool] Checking weather for: ${location}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const conditions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
  const temperatures = Array.from({length: 30}, (_, i) => i + 50); // 50-80°F
  
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temperature = temperatures[Math.floor(Math.random() * temperatures.length)];
  
  return `The weather in ${location} is currently ${condition} with a temperature of ${temperature}°F.`;
}

/**
 * Simulates a calculator tool
 * @param {string} expression - The mathematical expression to evaluate
 * @returns {Promise<string>} - The result of the calculation
 */
export async function calculate(expression) {
  console.log(`[Tool] Calculating: ${expression}`);
  
  // Extract numbers and operations from the expression
  const mathExpression = expression.replace(/[^0-9+\-*/().]/g, "");
  
  try {
    // WARNING: eval is used here for simplicity in this example
    // In a real application, use a proper math expression parser for security
    const result = eval(mathExpression);
    return `The result of ${mathExpression} is ${result}`;
  } catch (error) {
    return `Could not calculate "${mathExpression}": ${error.message}`;
  }
}

/**
 * Simulates a search tool
 * @param {string} query - The search query
 * @returns {Promise<string>} - The search results
 */
export async function search(query) {
  console.log(`[Tool] Searching for: ${query}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simple mock search results based on keywords
  if (query.includes("weather")) {
    return "Found information about weather forecasts and meteorology. Weather refers to the state of the atmosphere, including temperature, humidity, precipitation, wind, and other factors.";
  } else if (query.includes("recipe") || query.includes("food") || query.includes("cook")) {
    return "Found several recipes and cooking guides. Popular recipes include pasta carbonara, chicken curry, and chocolate chip cookies.";
  } else if (query.includes("history") || query.includes("historical")) {
    return "Found historical information. History is the study of past events, particularly human affairs.";
  } else if (query.includes("science") || query.includes("scientific")) {
    return "Found scientific articles and research papers. Science is a systematic enterprise that builds and organizes knowledge in the form of testable explanations and predictions.";
  } else {
    return `Found some general information about "${query}", but no specific details. Try refining your search query.`;
  }
}

/**
 * LLM工具，调用OpenAI大模型
 * @param {string} prompt - 用户输入的提示词
 * @param {object} [options] - 可选参数（可传baseURL）
 * @returns {Promise<string>} - LLM输出内容
 */
export async function llm(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key 未配置，请在 .env 文件中设置 OPENAI_API_KEY');
  }
  // 支持自定义 baseURL
  const baseURL = options.baseURL || process.env.OPENAI_API_BASE_URL;
  const openai = new OpenAI({ apiKey, baseURL });
  const model = options.model || 'gpt-3.5-turbo';
  const messages = [
    { role: 'system', content: options.systemPrompt || 'You are a helpful AI agent.' },
    { role: 'user', content: prompt }
  ];
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 512
  });
  return response.choices[0].message.content.trim();
}

export default {
  checkWeather,
  calculate,
  search,
  llm
};
