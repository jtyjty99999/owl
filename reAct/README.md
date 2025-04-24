# ReAct Agent Example

This is a simple implementation of a ReAct (Reasoning + Acting) agent in Node.js. The ReAct paradigm combines reasoning and acting in a loop to solve tasks.

## What is ReAct?

ReAct is a framework that combines:
- **Reasoning**: The ability to think through a problem step by step
- **Acting**: The ability to take actions based on reasoning

The agent follows this cycle:
1. **Observe** the current state or task
2. **Think** about what to do next (reasoning)
3. **Act** by calling appropriate tools
4. Repeat until the task is complete

## 支持大模型调用

本项目支持通过 OpenAI 大模型（如 gpt-3.5-turbo）进行智能推理。

### 配置 API Key 和 Base URL

1. 在 reAct 目录下新建 `.env` 文件，内容如下：

```
OPENAI_API_KEY=sk-xxx（你的 OpenAI API Key）
OPENAI_API_BASE_URL=http://你的代理地址/v1  # 可选，若需自定义API地址
```

2. 安装依赖（已自动完成）：

```
npm install openai dotenv
```

2. 你也可以在调用 agent.run 时通过 options.baseURL 传入：

```js
agent.run('任务', { llm: true, baseURL: 'http://你的代理地址/v1' });
```

> 优先级：options.baseURL > .env中的OPENAI_API_BASE_URL > 默认官方API。

### 如何使用大模型推理

调用 agent.run(task, { llm: true }) 即可优先用大模型推理。

```js
import { ReActAgent } from './agent.js';
import tools from './tools.js';

const agent = new ReActAgent(tools);
agent.run('请查一下北京天气', { llm: true });
```

> 如未配置 OPENAI_API_KEY，会自动报错提示。

## Running the Example

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## Project Structure

- `index.js` - Entry point that runs the agent on an example task
- `agent.js` - The ReAct agent implementation
- `tools.js` - Tools that the agent can use to interact with the environment
