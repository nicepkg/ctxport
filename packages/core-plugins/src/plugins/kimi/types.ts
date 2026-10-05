export interface KimiMessageBlock {
  text?: {
    content?: string;
  };
}

export interface KimiMessage {
  id?: string;
  parentId?: string;
  role?: string;
  childrenMessageIds?: string[] | null;
  blocks?: KimiMessageBlock[];
  createTime?: string;
}

export interface KimiMessagesResponse {
  messages?: KimiMessage[];
  data?: {
    messages?: KimiMessage[];
  };
}
