/** DeepSeek chat session history API response */
export interface DeepSeekHistoryResponse {
  code: number;
  data?: {
    biz_data?: {
      chat_session?: {
        id?: string;
        title?: string;
        title_status?: string;
      };
      chat_messages?: DeepSeekMessage[];
    };
  };
  msg?: string;
}

export interface DeepSeekMessage {
  /** Unique message identifier (numeric string or number) */
  message_id?: number;
  /** Parent message id for threading */
  parent_id?: number;
  /** "USER" or "ASSISTANT" */
  role: string;
  /** Final answer text content */
  content?: string;
  /** Text fragments used by another DeepSeek history API response variant. */
  fragments?: DeepSeekMessageFragment[];
  /** Thinking/reasoning content (DeepThink R1) */
  thinking_content?: string;
  /** Message accumulated token count */
  accumulated_token_count?: number;
  /** Message creation timestamp */
  inserted_at?: string;
  /** Files attached to message */
  files?: unknown[];
}

export interface DeepSeekMessageFragment {
  type?: string;
  content?: string;
}
