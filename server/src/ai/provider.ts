export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/** The only thing the rest of the app knows about LLMs. */
export interface AIProvider {
  readonly name: "gemini" | "groq" | "mock";
  complete(turns: ChatTurn[], opts?: CompleteOptions): Promise<string>;
}
