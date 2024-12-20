import { LangChainAdapter, Message } from "ai";
import { AzureChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { vectorStoreRetriever } from "./pinecone_chat.mjs";
import { BufferWindowMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

// Type definitions
interface WeatherResponse {
  weather: Array<{ description: string }>;
  main: { temp: number };
  name: string;
  message?: string;
}

interface MessageContent {
  text: string;
}

interface ToolCallArguments {
  location?: string;
  prompt?: string;
  symbol?: string;
}

export const maxDuration = 30;

// Weather Tool Definition
const GetWeather = new DynamicStructuredTool({
  name: "GetWeather",
  description: "Fetches the current weather for a given location using OpenWeatherMap API.",
  schema: z.object({
    location: z.string().describe("The city and country code, e.g., Los Angeles, US or Tokyo, JP"),
  }),
  func: async ({ location }: ToolCallArguments): Promise<string> => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location || '')}&appid=${apiKey}&units=metric`;

      const response = await fetch(weatherApiUrl);
      const weatherData = await response.json() as WeatherResponse;

      if (!response.ok || !weatherData.weather || !weatherData.main) {
        throw new Error(`Failed to fetch weather for "${location}": ${weatherData.message || "Unknown error"}`);
      }

      const { main, weather, name } = weatherData;
      return `The current weather in ${name} is ${weather[0]?.description} with a temperature of ${main.temp}°C.`;
    } catch (error) {
      console.error('Weather API Error:', error);
      return `Sorry, I couldn't fetch the weather for "${location}". Please try again later.`;
    }
  },
});

// Stock Market Tool Definition
const GetStockPrice = new DynamicStructuredTool({
  name: "GetStockPrice",
  description: "Fetches current stock price and basic information for a given stock symbol",
  schema: z.object({
    symbol: z.string().describe("The stock ticker symbol (e.g., AAPL, GOOGL, MSFT)"),
  }),
  func: async ({ symbol }: { symbol: string }): Promise<string> => {
    try {
      const apiKey = process.env.FINNHUB_API_KEY;
      const stockApiUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol || '')}&token=${apiKey}`;
      const companyProfileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol || '')}&token=${apiKey}`;

      const [quoteResponse, profileResponse] = await Promise.all([
        fetch(stockApiUrl),
        fetch(companyProfileUrl)
      ]);

      const quoteData = await quoteResponse.json();
      const profileData = await profileResponse.json();

      if (!quoteResponse.ok || !profileData) {
        throw new Error(`Failed to fetch stock data for "${symbol}"`);
      }

      const companyName = profileData.name || 'Unknown Company';
      const currentPrice = quoteData.c || 'N/A';
      const previousClose = quoteData.pc || 'N/A';
      const changePercent = quoteData.dp ? quoteData.dp.toFixed(2) : 'N/A';

      return `Stock Information for ${symbol} (${companyName}):
      - Current Price: $${currentPrice}
      - Previous Close: $${previousClose}
      - Change: ${changePercent}%`;
    } catch (error) {
      console.error('Stock API Error:', error);
      return `Sorry, I couldn't fetch stock information for "${symbol}". Please check the symbol and try again.`;
    }
  },
});

// General News Tool Definition
const GeneralNewsTool = new DynamicStructuredTool({
  name: "GeneralNewsTool",
  description: "Fetches the latest general news based on a given keyword or topic.",
  schema: z.object({
    keyword: z.string().describe("The topic or keyword to search for in the news, e.g., 'technology', 'sports', or 'economy'."),
  }),
  func: async ({ keyword }: { keyword?: string }): Promise<string> => {
    try {
      const apiKey = process.env.NEWS_API_KEY; 
      const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        keyword || ""
      )}&apiKey=${apiKey}&language=en&pageSize=5`;

      const response = await fetch(newsApiUrl);
      const newsData = await response.json();

      if (!response.ok || !newsData.articles || newsData.articles.length === 0) {
        throw new Error(`Failed to fetch news for keyword "${keyword}": ${newsData.message || "Unknown error"}`);
      }

      // Format the news into a readable summary
      const newsSummary = newsData.articles
        .map(
          (article: { title: string; source: { name: string; }; description: string; url: string; }, index: number) =>
            `${index + 1}. ${article.title} - ${article.source.name}\n${article.description || ""}\nRead more: ${article.url}`
        )
        .join("\n\n");

      return `Here are the top news articles for "${keyword}":\n\n${newsSummary}`;
    } catch (error) {
      console.error("News API Error:", error);
      return `Sorry, I couldn't fetch news for "${keyword}". Please try again later.`;
    }
  },
});


// Image Generation Tool
const ImageGenerationTool = new DynamicStructuredTool({
  name: "ImageGenerationTool",
  description: "Generates an image based on a user's prompt",
  schema: z.object({
    prompt: z.string().describe("The detailed description for image generation"),
  }),
  func: async ({ prompt }: ToolCallArguments): Promise<string> => {
    try {
      const imageUrl = await generateImage(prompt || '');
      return imageUrl || "";
    } catch (error) {
      console.error('Image Generation Error:', error);
      return "";
    }
  },
});

// Image Generation Function
async function generateImage(prompt: string): Promise<string> {
  try {
  
    const endpoint = "https://llm-course-openai-pp.openai.azure.com";
    const deploymentName = "dall-e-3-deployment";
    const apiKey = process.env.AZURE_API_KEY;
    const apiVersion = "2024-02-01";
  
    const url = `${endpoint}/openai/deployments/${deploymentName}/images/generations?api-version=${apiVersion}`;
  
    const headers = {
      "Content-Type": "application/json",
      "api-key": apiKey || "",
    };
  
    const data = {
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    };
  
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  
    
    const rawText = await response.text();
    
    if (!response.ok) {
      console.error("Image generation request failed:", rawText);
      throw new Error(`Image generation request failed: ${rawText}`);
    }
  
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      throw new Error("Invalid JSON response");
    }
  
    if (result.data && result.data[0] && result.data[0].url) {
      const imageUrl = result.data[0].url;
      return imageUrl;
    } else {
      console.error("No image URL in the response:", result);
      throw new Error("No image URL in the response");
    }
  } catch (error) {
    console.error("DALL·E 3 API Error:", error);
    return "";
  }
}

// Main route handler
export const POST = async (request: Request): Promise<Response> => {
  try {
    const requestData = (await request.json()) as { messages: Message[] };
    const userMessage = requestData.messages.pop();

    if (!userMessage || !userMessage.content) {
      throw new Error("Invalid message format");
    }

    // Handle different message content types
    const userQuery = typeof userMessage.content === 'string'
      ? userMessage.content
      : (userMessage.content as Array<MessageContent>)[0]?.text || '';

    if (!userQuery) {
      throw new Error("Empty user query");
    }

    // Initialize memory and chat model
    const memory = new BufferWindowMemory({ k: 4, memoryKey: "history" });
    const chatModel = new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_API_KEY,
      azureOpenAIApiInstanceName: process.env.AZURE_RESOURCE_NAME,
      azureOpenAIApiDeploymentName: process.env.AZURE_DEPLOYMENT,
      azureOpenAIApiVersion: "2024-02-15-preview",
      temperature: 0.7,
      maxTokens: 300,
      maxRetries: 5,
    });

    // Bind tools to the model
    const modelWithTools = chatModel.bindTools([GetWeather, GetStockPrice,GeneralNewsTool, ImageGenerationTool]);

    // Classification prompt template
    const classificationPrompt = ChatPromptTemplate.fromTemplate(`
      Consider the recent conversation to help classify the question accurately.
      Use the conversation context to distinguish between 'BOOK', 'PERSONAL', 'WEATHER', 'STOCK', 'IMAGE', and 'NEWS' questions.
    
      Conversation history:
      {history}
    
      Based on the conversation above:
      - Respond 'BOOK' if the question is specifically about the content, events, or characters in the book "Adam and Eve."
      - Respond 'PERSONAL' if the question is about the developer, system information, or the chatbot itself.
      - Respond 'WEATHER' if the question is about weather conditions for any location.
      - Respond 'STOCK' if the question is about weather conditions for any company.
      - Respond 'IMAGE' if the question requests generating or visualizing an image.
      - Respond 'NEWS' if the question requests news or information about a specific topic or keyword.
    
      Examples:
      - "Who is Adam?" -> BOOK
      - "Tell me about the developer." -> PERSONAL
      - "What's the weather in New York?" -> WEATHER
      - "What's the stock price for Apple?" -> IMAGE
      - "Show me an image of a castle." -> IMAGE
      - "What's the latest news on technology?" -> NEWS
      - "Tell me about the latest sports updates." -> NEWS
    
      Question: {question}
      Respond with only one word - either BOOK, PERSONAL, WEATHER, STOCK, IMAGE, or NEWS.
    `);
    

    // Classification chain
    const classificationChain = new ConversationChain({
      prompt: classificationPrompt,
      llm: chatModel,
      memory: memory,
      outputKey: 'topic',
    });

    const classificationResult = await classificationChain.call({ question: userQuery });
    const topic = classificationResult.topic.trim().toLowerCase();

    // Handle different topics
    switch (topic) {
      case 'weather': {
        const messages = [
          new SystemMessage("You are a helpful assistant that provides weather information."),
          new HumanMessage(userQuery)
        ];

        const aiMsg = await modelWithTools.invoke(messages);
        
        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          for (const toolCall of aiMsg.tool_calls) {
            if (toolCall.args && typeof toolCall.args.location === 'string') {
              const result = await GetWeather.func({ location: toolCall.args.location });
              
              messages.push(new AIMessage({ 
                content: "",
                tool_calls: [toolCall]
              }));
              
              messages.push(new ToolMessage({
                content: result,
                tool_call_id: toolCall.id || '',
                name: toolCall.name
              }));
            }
          }

          const finalResponse = await chatModel.invoke(messages);
          
          const weatherStream = new ReadableStream({
            async start(controller) {
              controller.enqueue(finalResponse.content);
              controller.close();
            },
          });

          return LangChainAdapter.toDataStreamResponse(weatherStream);
        }
        break;
      }
      case 'stock': {
        try {
      
          const messages = [
            new SystemMessage("You are a helpful assistant that provides stock market information."),
            new HumanMessage(userQuery)
          ];
      
          const aiMsg = await modelWithTools.invoke(messages);
          
          
          if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
            for (const toolCall of aiMsg.tool_calls) {
              
              // Robust extraction of symbol
              const symbol = toolCall.args?.symbol || 
                             (typeof toolCall.args === 'string' ? toolCall.args : null);
              
              if (symbol) {
                const result = await GetStockPrice.func({ symbol });
                
                messages.push(new AIMessage({ 
                  content: "",
                  tool_calls: [toolCall]
                }));
                
                messages.push(new ToolMessage({
                  content: result,
                  tool_call_id: toolCall.id || '',
                  name: toolCall.name
                }));
              } else {
                console.error("No symbol found in tool call");
              }
            }
      
            const finalResponse = await chatModel.invoke(messages);
            
            const stockStream = new ReadableStream({
              async start(controller) {
                controller.enqueue(finalResponse.content);
                controller.close();
              },
            });
      
            return LangChainAdapter.toDataStreamResponse(stockStream);
          }
        } catch (error) {
          console.error('Stock Retrieval Error:', error);
          return new Response(
            `Stock retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 500 }
          );
        }
        break;
      }
      case 'news': {
        console.log('News requested.');
        console.log('User query (keyword):', userQuery);
      
        // Invoke the GeneralNewsTool with the user query as a keyword
        const newsResult = await GeneralNewsTool.func({ keyword: userQuery });
      
        // Stream the news summary directly
        const newsStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(newsResult); // Only enqueue the news summary
            controller.close();
          },
        });
      
        return LangChainAdapter.toDataStreamResponse(newsStream);
      }
      

      case 'book': {
        const retrievedDocs = await vectorStoreRetriever.getRelevantDocuments(userQuery);
        const bookPromptTemplate = ChatPromptTemplate.fromTemplate(`
          The following is a friendly conversation between a human and an AI knowledgeable about 
          the book "Adam and Eve". The AI provides detailed, accurate answers based on its 
          understanding of the book. If the AI does not know the answer to a question, it 
          truthfully states that it does not know.

          Current conversation:
          {history}
          Human: {input}
          AI:
        `);
        
        const bookChain = new ConversationChain({
          llm: chatModel,
          prompt: bookPromptTemplate,
          memory: memory,
        });

        const input = `User query: ${userQuery}\nDocuments:\n${retrievedDocs.map(doc => doc.pageContent).join("\n")}`;
        const response = await bookChain.call({ input });
        
        const textStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(response.response || "I'm sorry, I couldn't retrieve information on that.");
            controller.close();
          },
        });

        return LangChainAdapter.toDataStreamResponse(textStream);
      }

      case 'personal': {
        const personalPromptTemplate = ChatPromptTemplate.fromTemplate(`
          The following is a friendly conversation between a human and an AI assistant that can 
          provide information about the developer and the system. The AI provides polite and 
          concise responses about the developer's identity and background, as well as information 
          about the chatbot's purpose.
          
          Current conversation:
          {history}
          Human: {input}
          AI:
          
          - If the question is about the developer's identity:
            "The developer of this chatbot is Payal Bhattad."
          
          - If the question is about details or background of the developer:
            "Payal Bhattad is a dedicated graduate student in computer science with a strong 
            background in software engineering, having two years of industry experience. She's 
            passionate about AI and ML and balances her academic pursuits with a love for badminton."
          
          - If the question is about the chatbot itself:
            "This chatbot is designed to answer questions about the book Adam and Eve, provide weather updates, deliver stock market information, share the latest news, and generate images."
          
          - If asked for additional personal information not specified here:
            "Information not available."
          
          - If greeted with "Hello" or "Hi":
            "Hello! How can I help you?"
          
          Question: {input}
        `);
        
        const personalChain = new ConversationChain({
          prompt: personalPromptTemplate,
          llm: chatModel,
          memory: memory,
        });

        const input = `User query: ${userQuery}`;
        const personalResponse = await personalChain.call({ input });
        
        const personalTextStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(personalResponse.response || "I'm sorry, I couldn't retrieve information on that.");
            controller.close();
          },
        });

        return LangChainAdapter.toDataStreamResponse(personalTextStream);
      }

      case 'image': {

        const messages = [
          new SystemMessage("You are a helpful image generation assistant."),
          new HumanMessage(userQuery)
        ];

        const aiMsg = await modelWithTools.invoke(messages);
        
        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          for (const toolCall of aiMsg.tool_calls) {
            if (toolCall.args && typeof toolCall.args.prompt === 'string') {
              const imageUrl = await generateImage(toolCall.args.prompt);
              
              messages.push(new AIMessage({ 
                content: "",
                tool_calls: [toolCall]
              }));
              
              messages.push(new ToolMessage({
                content: JSON.stringify({ imageUrl }),
                tool_call_id: toolCall.id || '',
                name: toolCall.name
              }));
            }
          }

          const finalResponse = await chatModel.invoke(messages);
          
          const imageStream = new ReadableStream({
            async start(controller) {
              controller.enqueue(JSON.stringify({ 
                type: 'image', 
                content: finalResponse.content 
              }));
              controller.close();
            },
          });

          return LangChainAdapter.toDataStreamResponse(imageStream);
        }
        break;
      }

      default: {
        return new Response(
          "I'm sorry, I couldn't understand your question. Please try asking about the book, weather, or image generation.",
          { status: 400 }
        );
      }
    }

    // Fallback response if no specific handling was triggered
    return new Response(
      "I'm sorry, I couldn't process your request. Please try again.",
      { status: 500 }
    );

  } catch (error) {
    console.error('Route Handler Error:', error);
    return new Response(
      "An error occurred while processing your request. Please try again later.",
      { status: 500 }
    );
  }
};