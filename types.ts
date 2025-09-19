export interface Event {
  id: string;
  accessCode: string;
  name: string;
  createdAt: Date;
  questions: Question[];
  // Only provided immediately after creation
  adminKey?: string;
  adminPin?: string;
}

export interface Question {
  id: string;
  text: string;
  createdAt: Date;
  isActive: boolean;
  responses: Response[];
}

export interface Response {
  id: string;
  text: string;
  isModerated: boolean;
  createdAt: Date;
  isFromAdmin?: boolean;
  participantId?: string | null;
}

export interface Word {
  text: string;
  value: number;
}