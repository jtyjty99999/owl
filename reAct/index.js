// index.js
import { ReActAgent } from './agent.js';
import tools from './tools.js';

async function main() {
  // Create a ReAct agent with the available tools
  const agent = new ReActAgent(tools);
  
  // Example tasks to run the agent on
  // const tasks = [
  //   "What's the weather in New York?",
  //   "Calculate 125 * 37 - 42",
  //   "Find information about cooking pasta"
  // ];

  const tasks = [
    "请查一下北京的天气?"
  ];
  
  // Run the agent on each task
  for (const task of tasks) {
    console.log("\n==================================================");
    console.log(`Running agent on task: "${task}"`);
    console.log("==================================================");
    
    const result = await agent.run(task, { llm: true });
    console.log("\nFinal result:", result.result);
    console.log(`Completed in ${result.steps} steps`);
  }
}

// Run the main function
main().catch(error => {
  console.error("Error running the agent:", error);
});
