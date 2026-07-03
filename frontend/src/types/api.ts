export interface Paper {
  id: string
  title: string
  authors: string[]
  publication_year?: number
  journal_venue?: string
  doi?: string
  uploaded_at: string
  user_id?: string
}

export interface ChatSession {
  id: string
  title: string
  paper_id: string
  user_id?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  sender: string
  content: string
  agent_thoughts?: string
  created_at: string
}

export interface QueryRequest {
  user_query: string
}

export interface QueryResponse {
  final_answer: string
  selected_agent: string
  agent_thoughts: string
  citation_sources: string[]
}

export interface Note {
  id: string
  paper_id: string
  user_id?: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface NoteSaveRequest {
  title: string
  content: string
}
