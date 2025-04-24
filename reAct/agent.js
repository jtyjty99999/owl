// agent.js
import chalk from 'chalk';
import tools from './tools.js';

/**
 * A simple ReAct (Reasoning + Acting) agent implementation
 */
export class ReActAgent {
  constructor(tools, maxSteps = 10) {
    this.tools = tools;
    this.maxSteps = maxSteps;
    this.memory = [];
  }

  /**
   * Run the agent on a given task
   * @param {string} task - The task description
   * @param {object} [options] - 可选参数，如llm=true时优先用大模型推理
   * @returns {object} - The final result
   */
  async run(task, options = {}) {
    console.log(chalk.blue.bold('\n🤖 ReAct Agent Started'));
    console.log(chalk.yellow(`Task: ${task}`));
    
    let observation = `Initial task: ${task}`;
    let step = 0;
    
    while (step < this.maxSteps) {
      step++;
      console.log(chalk.cyan(`\n--- Step ${step} ---`));
      
      // Think: Determine what to do next based on the observation
      let thought;
      if (options.llm) {
        thought = await this.llmThink(observation, options);
      } else {
        thought = this.think(observation);
      }
      console.log(chalk.green(`🧠 Thought: ${thought.reasoning}`));
      
      // If the agent decides the task is complete
      if (thought.isComplete) {
        console.log(chalk.blue.bold('\n✅ Task Complete'));
        return {
          result: thought.result,
          steps: step,
          memory: this.memory
        };
      }
      
      // Act: Execute the chosen action
      console.log(chalk.magenta(`🛠️ Action: ${thought.action} (${thought.actionInput})`));
      
      try {
        // Execute the tool
        const result = await this.executeAction(thought.action, thought.actionInput);
        observation = `Action ${thought.action} returned: ${result}`;
        console.log(chalk.yellow(`👁️ Observation: ${observation}`));
        
        // Update memory
        this.memory.push({
          step,
          thought: thought.reasoning,
          action: thought.action,
          actionInput: thought.actionInput,
          observation
        });
      } catch (error) {
        observation = `Error: ${error.message}`;
        console.log(chalk.red(`❌ Error: ${observation}`));
        
        // Update memory with the error
        this.memory.push({
          step,
          thought: thought.reasoning,
          action: thought.action,
          actionInput: thought.actionInput,
          error: observation
        });
      }
    }
    
    console.log(chalk.red.bold('\n⚠️ Max steps reached without completing the task'));
    return {
      result: "Task not completed within max steps",
      steps: step,
      memory: this.memory
    };
  }

  /**
   * 使用大模型进行推理，返回thought对象
   */
  async llmThink(observation, options = {}) {
    // 明确列出可用工具及其规范名称
    const availableTools = [
      { name: 'checkWeather', desc: '查询天气，actionInput为地名或地点' },
      { name: 'calculate', desc: '数学计算，actionInput为表达式' },
      { name: 'search', desc: '泛化信息检索，actionInput为检索内容' }
    ];
    const toolList = availableTools.map(t => `- ${t.name}：${t.desc}`).join('\n');
    const prompt = [
      `你是一个ReAct智能体。`,
      `当前观察：${observation}`,
      `你只能调用以下工具之一（必须严格使用下列action名称）：`,
      toolList,
      `请用JSON格式输出你的推理结果，例如：`,
      `{
        "reasoning": "推理过程...",
        "action": "checkWeather",
        "actionInput": "北京",
        "isComplete": false
      }`,
      `如果任务完成，isComplete为true，并给出result字段。`,
      `除非任务完成，否则action字段必须严格为上述三者之一。`
    ].join('\n');
    try {
      const output = await this.tools.llm(prompt, { model: options.model, temperature: 0.2, baseURL: options.baseURL });
      const json = JSON.parse(output.match(/\{[\s\S]*\}/)[0]);
      console.log('LLM output:', json);
      // 容错：action不在工具列表时fallback为search
      if (!['checkWeather', 'calculate', 'search'].includes(json.action)) {
        return {
          reasoning: 'LLM返回未知action，自动fallback为search。原始action: ' + json.action + '。' + (json.reasoning || ''),
          action: 'search',
          actionInput: observation,
          isComplete: false
        };
      }
      return json;
    } catch (e) {
      return {
        reasoning: '大模型推理失败，回退到本地规则。' + (e.message || ''),
        ...this.think(observation)
      };
    }
  }

  /**
   * Think about what to do next based on the current observation
   * @param {string} observation - The current observation
   * @returns {object} - The thought process and next action
   */
  think(observation) {
    // In a real implementation, this could use an LLM or other reasoning system
    // For this simple example, we'll use rule-based reasoning
    
    if (observation.includes("Initial task:")) {
      // Initial task, start by searching
      const task = observation.replace("Initial task: ", "");
      
      if (task.includes("weather")) {
        return {
          reasoning: "This is a weather-related query. I should check the weather.",
          action: "checkWeather",
          actionInput: task.includes("in") ? task.split("in")[1].trim() : "current location",
          isComplete: false
        };
      } else if (task.includes("calculate") || task.includes("math") || 
                task.includes("compute") || /[0-9\+\-\*\/\(\)]/.test(task)) {
        return {
          reasoning: "This appears to be a calculation task. I should use the calculator tool.",
          action: "calculate",
          actionInput: task,
          isComplete: false
        };
      } else if (task.includes("search") || task.includes("find") || task.includes("look up")) {
        return {
          reasoning: "This is a search query. I should search for information.",
          action: "search",
          actionInput: task.replace(/search|find|look up/gi, "").trim(),
          isComplete: false
        };
      } else {
        return {
          reasoning: "I'm not sure how to handle this task directly. Let me search for information.",
          action: "search",
          actionInput: task,
          isComplete: false
        };
      }
    }
    
    // Handle observations from previous actions
    if (observation.includes("Action checkWeather returned:")) {
      return {
        reasoning: "I've retrieved the weather information. The task is complete.",
        isComplete: true,
        result: observation.replace("Action checkWeather returned: ", "")
      };
    }
    
    if (observation.includes("Action calculate returned:")) {
      return {
        reasoning: "I've completed the calculation. The task is complete.",
        isComplete: true,
        result: observation.replace("Action calculate returned: ", "")
      };
    }
    
    if (observation.includes("Action search returned:")) {
      const searchResult = observation.replace("Action search returned: ", "");
      
      if (searchResult.includes("No results found")) {
        return {
          reasoning: "The search didn't yield useful results. Let me try a more general search.",
          action: "search",
          actionInput: this.memory[0].actionInput.split(" ").slice(0, 2).join(" "),
          isComplete: false
        };
      }
      
      return {
        reasoning: "I've found information through search. The task is complete.",
        isComplete: true,
        result: searchResult
      };
    }
    
    // Default fallback
    return {
      reasoning: "I'm not sure how to proceed. Let me end the task with what I know so far.",
      isComplete: true,
      result: "I couldn't complete the task with the available information and tools."
    };
  }
  
  /**
   * Execute an action using the appropriate tool
   * @param {string} action - The action to execute
   * @param {string} input - The input for the action
   * @returns {Promise<string>} - The result of the action
   */
  async executeAction(action, input) {
    if (!this.tools[action]) {
      throw new Error(`Unknown action: ${action}`);
    }
    
    return await this.tools[action](input);
  }
}
