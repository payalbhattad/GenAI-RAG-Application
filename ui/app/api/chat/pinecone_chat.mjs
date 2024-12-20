import { TextLoader } from "langchain/document_loaders/fs/text";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

//console.log('AZURE_API_KEY:', process.env.NEXT_AZURE_API_KEY);
/*const AZURE_INSTANCE_NAME = process.env.AZURE_RESOURCE_NAME
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME;
const AZURE_API_KEY = process.env.AZURE_API_KEY;*/

const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_RESOURCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: "2024-02-15-preview",
});

const pinecone = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY,
  });


const index = pinecone.Index("adam-eve-book-index");


// Read and split the book text

const loader = new TextLoader("./data/adam-and-eve.txt");
const docs = await loader.load();


const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1100,
    chunkOverlap: 20,
});

const splittedDocs = await splitter.splitDocuments(docs);


// Embed and store the book text only if it's not already stored
const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    maxConcurrency: 5, 
});

const existingDocs = await vectorStore.similaritySearch("who is adam?", 1);

if (existingDocs.length === 0) {
    
    const vectorStore = await PineconeStore.fromDocuments(splittedDocs, embeddings, {
        pineconeIndex: index,
        maxConcurrency: 5,
    });
    
} else {
    console.log("Embeddings already exist in the vector store.");
}

// Prepare retriever for queries

export const vectorStoreRetriever = vectorStore.asRetriever();

