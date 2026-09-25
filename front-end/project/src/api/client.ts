import type {
  AuthResponse,
  Claim,
  ClaimCategory,
  User,
  ChatMessage,
  QuickReply,
} from '@/types';
import {
  MOCK_CLAIMS,
  MOCK_TOKENS,
  MOCK_USERS,
  getClaimsForEmployee,
  getApproverQueue,
  getClaimById,
  policyCitation,
} from './mockData';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const API_DELAY = 600;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Auth ──────────────────────────────────────────────────────────

export async function signIn(
  identifier: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
  if (!response.ok) throw new Error('Invalid credentials. Please check your email/employee ID and password.');
  return response.json();
}

export async function signUp(data: {
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error('Employee ID or email already registered.');
  return response.json();
}

// ─── Claims ───────────────────────────────────────────────────────

export async function fetchEmployeeClaims(employeeId: string): Promise<Claim[]> {
  const response = await fetch(`${API_BASE}/claims?employee_id=${encodeURIComponent(employeeId)}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function fetchApproverQueue(): Promise<Claim[]> {
  const response = await fetch(`${API_BASE}/claims`);
  if (!response.ok) throw new Error(await response.text());
  const claims: Claim[] = await response.json();
  return claims.filter((claim) => ['Pending Approval', 'Discrepancy', 'Escalated', 'Under Review'].includes(claim.status));
}

export async function fetchClaim(id: string): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${id}`);
  if (!response.ok) throw new Error('Claim not found');
  return response.json();
}

export interface NewClaimPayload {
  category: ClaimCategory;
  claimedAmount: number;
  currency: string;
  files: File[];
}

export async function submitClaim(
  employeeId: string,
  employeeName: string,
  payload: NewClaimPayload
): Promise<Claim> {
  const form = new FormData();
  form.append('employee_id', employeeId);
  form.append('employee_name', employeeName);
  form.append('category', payload.category);
  form.append('claimed_amount', String(payload.claimedAmount));
  form.append('currency', payload.currency);
  payload.files.forEach((file) => form.append('files', file));
  const response = await fetch(`${API_BASE}/claims`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// Simulates the backend OCR + AI processing that happens after submission
export async function processClaimExtraction(claimId: string): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${claimId}`);
  if (!response.ok) throw new Error('Claim not found');
  return response.json();
  /*
  const claim = getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');

  claim.extracted = {
    vendor: 'The Olive Garden',
    date: '2026-09-19',
    lineItems: [
      { id: genId('li'), description: 'Team Lunch (3 people)', amount: 45.0 },
      { id: genId('li'), description: 'Beverages', amount: 22.5 },
      { id: genId('li'), description: 'Sales Tax (8%)', amount: 5.4 },
    ],
    total: 72.9,
    currency: claim.currency,
  };
  claim.status = 'Discrepancy';
  claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Escalated'];
  claim.currentStep = 'Policy Check';

  claim.chat.push(
    {
      id: genId('m'),
      role: 'system',
      text: 'OCR extraction complete — fields populated from uploaded bills.',
      timestamp: new Date().toISOString(),
    },
    {
      id: genId('m'),
      role: 'ai',
      text: `I found a discrepancy: your claimed amount is ${formatCurrency(claim.claimedAmount, claim.currency)}, but the OCR-extracted total is ${formatCurrency(claim.extracted.total, claim.currency)} — a difference of ${formatCurrency(Math.abs(claim.claimedAmount - claim.extracted.total), claim.currency)}. Please review and let me know how to proceed.`,
      timestamp: new Date().toISOString(),
      quickReplies: ['It was a typo', "I'll upload another bill", 'Dispute this'],
      citations: [policyCitation],
    }
  );

  return claim; */
}

export async function updateExtractedFields(
  claimId: string,
  extracted: { vendor: string; date: string; total: number; lineItems: { id: string; description: string; amount: number }[] },
  confirmed = false
): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${claimId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...extracted, confirmed }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function proceedClaim(claimId: string, approved: boolean, claimableAmount: number): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${claimId}/proceed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, claimableAmount }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function retryOcr(claimId: string): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${claimId}/retry-ocr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function closeClaim(claimId: string): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${claimId}/close`, { method: 'POST' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ─── Approver actions ─────────────────────────────────────────────

export async function approveClaim(claimId: string, note: string): Promise<Claim> {
  await delay(API_DELAY);
  const claim = getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');
  claim.status = 'Approved';
  claim.currentStep = 'Approved';
  claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Approved'];
  claim.approverNote = note;
  claim.chat.push({
    id: genId('m'),
    role: 'system',
    text: 'Claim approved by Jane Doe.',
    timestamp: new Date().toISOString(),
  });
  return claim;
}

export async function denyClaim(claimId: string, note: string): Promise<Claim> {
  await delay(API_DELAY);
  const claim = getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');
  claim.status = 'Denied';
  claim.currentStep = 'Denied';
  claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Denied'];
  claim.approverNote = note;
  claim.chat.push({
    id: genId('m'),
    role: 'system',
    text: 'Claim denied by Jane Doe.',
    timestamp: new Date().toISOString(),
  });
  return claim;
}

export async function requestMoreInfo(claimId: string, note: string): Promise<Claim> {
  await delay(API_DELAY);
  const claim = getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');
  claim.status = 'Under Review';
  claim.chat.push({
    id: genId('m'),
    role: 'ai',
    text: `The approver has requested more information: "${note}"`,
    timestamp: new Date().toISOString(),
    quickReplies: ['Confirm correct', "I'll upload another bill"],
  });
  return claim;
}

// ─── Mock WebSocket for chat ──────────────────────────────────────

type ChatListener = (message: ChatMessage) => void;

const listeners = new Map<string, Set<ChatListener>>();

export function connectChat(claimId: string, onMessage: ChatListener): () => void {
  if (!listeners.has(claimId)) {
    listeners.set(claimId, new Set());
  }
  listeners.get(claimId)!.add(onMessage);
  return () => {
    listeners.get(claimId)?.delete(onMessage);
  };
}

export async function sendChatMessage(
  claimId: string,
  text: string,
  role: 'employee' | 'approver' = 'employee'
): Promise<Claim> {
  if (role !== 'employee') throw new Error('Only employee chat is connected to the API');
  const response = await fetch(`${API_BASE}/claims/${claimId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
  /*
  const claim = getClaimById(claimId);
  if (!claim) throw new Error('Claim not found');

  const userMsg: ChatMessage = {
    id: genId('m'),
    role,
    text,
    timestamp: new Date().toISOString(),
  };
  claim.chat.push(userMsg);
  broadcast(claimId, userMsg);

  // Simulate AI typing + response
  setTimeout(() => {
    const typingMsg: ChatMessage = {
      id: genId('m'),
      role: 'ai',
      text: '',
      timestamp: new Date().toISOString(),
      isTyping: true,
    };
    broadcast(claimId, typingMsg);
  }, 500);

  setTimeout(() => {
    const aiResponse = generateAiResponse(text, claim);
    claim.chat.push(aiResponse);
    broadcast(claimId, { ...aiResponse, isTyping: false });
  }, 2200); */
}

export async function sendQuickReply(claimId: string, reply: string): Promise<Claim> {
  return sendChatMessage(claimId, reply);
}

function broadcast(claimId: string, message: ChatMessage) {
  listeners.get(claimId)?.forEach((cb) => cb(message));
}

function generateAiResponse(userText: string, claim: Claim): ChatMessage {
  const lower = userText.toLowerCase();
  let text = '';
  let quickReplies: QuickReply[] | undefined;
  let citations = undefined;

  if (lower.includes('typo')) {
    text = `Got it. I've updated your claimed amount to match the extracted total of ${formatCurrency(claim.extracted.total, claim.currency)}. I'll re-run the policy check now.`;
    claim.claimedAmount = claim.extracted.total;
    claim.status = 'Pending Approval';
    claim.currentStep = 'Pending Approval';
    claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Pending Approval'];
  } else if (lower.includes('upload') || lower.includes('another bill')) {
    text = "Please upload the corrected bill and I'll re-extract the details. You can drag and drop the new file in the bill viewer on the left.";
    quickReplies = ['Confirm correct'];
  } else if (lower.includes('dispute')) {
    text = `I understand you'd like to dispute this. I'm escalating this claim to an approver for manual review. They will reach out shortly.`;
    claim.status = 'Pending Approval';
    claim.escalatedTo = 'Jane Doe';
    claim.currentStep = 'Escalated';
    claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Escalated'];
  } else if (lower.includes('confirm')) {
    text = `Thank you for confirming. Your claim details are verified. I'm forwarding this to an approver for final sign-off.`;
    claim.status = 'Pending Approval';
    claim.currentStep = 'Pending Approval';
    claim.timeline = ['Submitted', 'Reconciled', 'Policy Check', 'Pending Approval'];
  } else {
    text = `I've noted your response: "${userText}". Let me check the policy guidelines for this situation. Based on the current expense policy, your claim is being reviewed. If you have additional documentation, please upload it and I'll re-process the claim.`;
    citations = [policyCitation];
  }

  return {
    id: genId('m'),
    role: 'ai',
    text,
    timestamp: new Date().toISOString(),
    quickReplies,
    citations,
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export { API_BASE };
