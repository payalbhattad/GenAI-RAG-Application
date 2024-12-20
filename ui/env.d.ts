// env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        AZURE_API_KEY?: string;
        AZURE_RESOURCE_NAME?: string;
        AZURE_DEPLOYMENT?: string;
    }
  }