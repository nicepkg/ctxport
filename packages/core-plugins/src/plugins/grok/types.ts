/** Response node from the response-node endpoint */
export interface GrokResponseNode {
  responseId: string;
  sender: "human" | "assistant";
  parentResponseId?: string;
}

/** Response node list from GET /response-node */
export interface GrokResponseNodeResponse {
  responseNodes: GrokResponseNode[];
  inflightResponses: unknown[];
}

/** Full response from POST /load-responses */
export interface GrokLoadedResponse {
  responseId: string;
  message: string;
  sender: "human" | "assistant";
  createTime: string;
  parentResponseId?: string;
  model?: string;
  webSearchResults?: unknown[];
  steps?: unknown[];
}

/** Response from POST /load-responses */
export interface GrokLoadResponsesResponse {
  responses: GrokLoadedResponse[];
}
