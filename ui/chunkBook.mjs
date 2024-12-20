import { Pinecone } from '@pinecone-database/pinecone';
import { AzureOpenAIEmbeddings } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


// Get the current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Step 1: Initialize Pinecone 
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const indexName = 'adam-eve-book-index';

// Step 2: Read the book text from the file
const readBookText = () => {
  const filePath = path.join(__dirname, 'data', 'adam-and-eve.txt');
  console.log('Reading from path:', filePath);
  try {
    const bookText = fs.readFileSync(filePath, 'utf8');
    return bookText;
  } catch (error) {
    throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
  }
};

// Step 3: Chunk the text into paragraphs
const chunkText = (bookText) => {
  const chunks = bookText.split('\n\n');
  return chunks.filter(chunk => chunk.trim() !== '');
};

// Step 4: Initialize Azure OpenAI Embeddings
const embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIApiKey: process.env.AZURE_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_RESOURCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: "2024-02-15-preview",
  maxRetries: 3,
});

// Step 5: Upload to Pinecone with error handling and batching
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const uploadToPinecone = async (chunks) => {
  const MAX_RETRIES = 5;
  const BATCH_SIZE = 100; // Adjust based on your needs
  let retryCount = 0;

  // Get embeddings for all chunks
  const vectors = await embeddings.embedDocuments(chunks);
  const index = pc.Index(indexName);

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const batchVectors = vectors.slice(i, i + BATCH_SIZE);

    // Prepare vectors in the correct format
    const records = batchVectors.map((vector, idx) => ({
      id: `chunk-${i + idx}`,
      values: vector,
      metadata: { text: batchChunks[idx] }
    }));

    try {
      await index.upsert(records);
      console.log(`Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    } catch (error) {
      if (error.code === '429' && retryCount < MAX_RETRIES) {
        const delayTime = Math.pow(2, retryCount) * 1000;
        console.log(`Rate limit reached. Retrying after ${delayTime / 1000} seconds...`);
        await delay(delayTime);
        retryCount++;
        i -= BATCH_SIZE; // Retry the same batch
        continue;
      }
      throw error;
    }

    // Add a small delay between batches to avoid rate limiting
    await delay(100);
  }
};

// Main function with error handling
const processBookAndUpload = async () => {
  try {
    console.log('Reading book text...');
    const bookText = readBookText();
    console.log('Chunking text...');
    const chunks = chunkText(bookText);
    console.log(`Created ${chunks.length} chunks`);
    await uploadToPinecone(chunks);
    console.log('Upload complete!');
  } catch (error) {
    console.error('Error in processBookAndUpload:', error);
    throw error;
  }
};

// Run the process
processBookAndUpload().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});