# RAG Application: *Adam and Eve*

## Overview
This project is a **Retrieval-Augmented Generation (RAG)** application developed using **Azure OpenAI**, **Next.js**, **React**, **Tailwind CSS**, and **Assistant-UI**. The application is trained on the book *Adam and Eve* and leverages **LangChain** and the **Azure OpenAI GPT-3.5 model** for providing accurate and context-rich responses. 

## Features
- **Retrieval-Augmented Generation**: Retrieves relevant information from the book *Adam and Eve* using prompt engineering and few-shot learning for high-quality and precise responses.
- **Function Calling**: Implements LangChain's tool-calling capabilities to integrate real-time APIs for:
  - Weather updates
  - Stock market data
  - Latest news
- **Multimodal Capabilities**: Utilizes the **DALL-E model** from Azure OpenAI to generate images based on user prompts.
- **Frontend**: Built with **Next.js**, **React**, and styled with **Tailwind CSS** for a modern, responsive, and seamless user experience.

## Technologies Used
- **Azure OpenAI**:
  - GPT-3.5 for natural language understanding and generation.
  - DALL-E for multimodal image generation.
- **LangChain**:
  - Enables efficient RAG implementation.
  - Supports function calling for real-time data interaction.
- **Frontend Stack**:
  - Next.js and React for dynamic, server-rendered web pages.
  - Tailwind CSS for a clean and responsive UI.
- **Assistant-UI**:
  - Provides components for building the interactive assistant experience.

## Key Highlights
- **Few-Shot Learning**: Optimized prompt engineering ensures high-quality data retrieval from the book *Adam and Eve*.
- **Real-Time Data Integration**: Through function calling, the application dynamically fetches real-time information like weather, stock prices, and news.
- **Image Generation**: Adds a creative edge with DALL-E's ability to generate images based on user queries.
- **User-Friendly Interface**: Intuitive design ensures a seamless experience across devices.

## How It Works
1. **Data Retrieval**: Queries are processed through LangChain, retrieving relevant passages from the book *Adam and Eve*.
2. **Enhanced Context Understanding**: Few-shot learning enables the model to deliver accurate responses by fine-tuning the context for each query.
3. **Real-Time Interaction**: API integrations provide up-to-date weather, stock, and news data for enhanced interactivity.
4. **Multimodal Interaction**: DALL-E generates images based on user prompts, enriching the user experience.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/adam-and-eve-rag.git
   cd adam-and-eve-rag
