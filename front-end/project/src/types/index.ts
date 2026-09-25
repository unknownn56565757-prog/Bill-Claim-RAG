export type UserRole = 'employee' | 'approver';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  phone: string;
  role: UserRole;
}

export type ClaimCategory =
  | 'Food'
  | 'Travel'
  | 'Medical'
  | 'Accommodation'
  | 'Other';

export type ClaimStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Discrepancy'
  | 'Pending Approval'
  | 'Approved'
  | 'Denied'
  | 'Escalated'
  | 'Closed';

export type TimelineStep =
  | 'Submitted'
  | 'Reconciled'
  | 'Policy Check'
  | 'Pending Approval'
  | 'Approved'
  | 'Denied'
  | 'Escalated'
  | 'Closed';

export interface LineItem {
  id: string;
  description: string;
  amount: number;
}

export interface ExtractedFields {
  vendor: string;
  date: string;
  lineItems: LineItem[];
  total: number;
  currency: string;
}

export interface BillFile {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string;
  size: number;
}

export interface Citation {
  id: string;
  docName: string;
  section: string;
  clauseText: string;
}

export type ChatMessageRole = 'ai' | 'employee' | 'approver' | 'system';

export type QuickReply =
  | 'It was a typo'
  | "I'll upload another bill"
  | 'Dispute this'
  | 'Confirm correct'
  | 'Continue with accommodation'
  | 'Keep reviewing Food'
  | (string & {});

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: string;
  quickReplies?: string[];
  citations?: Citation[];
  isTyping?: boolean;
}

export interface Claim {
  id: string;
  employeeId: string;
  employeeName: string;
  category: ClaimCategory;
  claimedAmount: number;
  currency: string;
  status: ClaimStatus;
  submittedAt: string;
  files: BillFile[];
  extracted: ExtractedFields;
  timeline: TimelineStep[];
  currentStep: TimelineStep;
  chat: ChatMessage[];
  approverNote?: string;
  escalatedTo?: string;
  policy?: {
    claimableAmount: number;
    status: string;
    reason: string;
    policyContext?: string;
    humanConfirmed: boolean;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
