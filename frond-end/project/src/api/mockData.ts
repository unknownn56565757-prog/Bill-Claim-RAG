import type {
  Claim,
  User,
  ChatMessage,
  Citation,
  ExtractedFields,
  TimelineStep,
} from '@/types';

export const MOCK_USERS: Record<string, User & { password: string }> = {
  'emp-001': {
    id: 'u-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    employeeId: 'EMP-001',
    phone: '+1 555-0101',
    role: 'employee',
    password: 'password123',
  },
  'approver-01': {
    id: 'u-002',
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    employeeId: 'APR-01',
    phone: '+1 555-0201',
    role: 'approver',
    password: 'approver123',
  },
};

export const MOCK_TOKENS: Record<string, string> = {
  'u-001': 'mock-jwt-token-sarah-chen',
  'u-002': 'mock-jwt-token-jane-doe',
};

const receiptImages = [
  'https://images.pexels.com/photos/8872400/pexels-photo-8872400.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/4959926/pexels-photo-4959926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/7680330/pexels-photo-7680330.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/6816413/pexels-photo-6816413.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

const policyCitation: Citation = {
  id: 'cit-001',
  docName: 'Expense Policy Handbook v3.2',
  section: '§4.2 — Meal Reimbursement',
  clauseText:
    'Meal expenses are reimbursable up to $50 per person per meal. For group meals, the itemized receipt must list all attendees. Alcoholic beverages are not reimbursable. Claims exceeding the per-person limit require pre-approval from a direct manager.',
};

const travelCitation: Citation = {
  id: 'cit-002',
  docName: 'Travel & Expense Policy v2.0',
  section: '§6.1 — Domestic Travel',
  clauseText:
    'Domestic airfare is reimbursed at economy class rates. Baggage fees for the first checked bag are covered. Flight changes require a business justification. Claims must include the boarding pass and e-ticket receipt.',
};

const medicalCitation: Citation = {
  id: 'cit-003',
  docName: 'Employee Wellness Policy v1.5',
  section: '§3.3 — Medical Reimbursement',
  clauseText:
    'Medical expenses incurred during business travel are reimbursable with an itemized receipt from a licensed medical provider. Prescription costs require the pharmacy receipt. Over-the-counter medication is reimbursable up to $25 per claim.',
};

function makeChat(seed: string): ChatMessage[] {
  return [
    {
      id: 'm-1',
      role: 'ai',
      text: `I've received your claim for ${seed}. I extracted the bill details using OCR. Let me review them against your claimed amount.`,
      timestamp: '2026-09-20T09:00:00Z',
    },
    {
      id: 'm-2',
      role: 'system',
      text: 'OCR extraction complete — fields populated from 2 bill images.',
      timestamp: '2026-09-20T09:00:05Z',
    },
  ];
}

export const MOCK_CLAIMS: Claim[] = [
  {
    id: 'clm-1001',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Chen',
    category: 'Food',
    claimedAmount: 78.5,
    currency: 'USD',
    status: 'Discrepancy',
    submittedAt: '2026-09-18T14:30:00Z',
    files: [
      { id: 'f-1', name: 'lunch_receipt.jpg', type: 'image', url: receiptImages[0], size: 240000 },
      { id: 'f-2', name: 'drink_receipt.jpg', type: 'image', url: receiptImages[1], size: 180000 },
    ],
    extracted: {
      vendor: 'The Olive Garden',
      date: '2026-09-17',
      lineItems: [
        { id: 'li-1', description: 'Pasta Primavera', amount: 24.99 },
        { id: 'li-2', description: 'Grilled Salmon', amount: 28.5 },
        { id: 'li-3', description: 'House Wine (2 glasses)', amount: 18.0 },
        { id: 'li-4', description: 'Sales Tax (8%)', amount: 5.71 },
      ],
      total: 77.2,
      currency: 'USD',
    },
    timeline: ['Submitted', 'Reconciled', 'Policy Check', 'Escalated'],
    currentStep: 'Policy Check',
    chat: [
      ...makeChat('a team lunch at The Olive Garden'),
      {
        id: 'm-3',
        role: 'ai',
        text: 'I found a discrepancy: your claimed amount is $78.50, but the OCR-extracted total from the bill is $77.20 — a difference of $1.30. Also, I detected 2 glasses of house wine. Per policy, alcoholic beverages are not reimbursable.',
        timestamp: '2026-09-18T14:32:00Z',
        quickReplies: ['It was a typo', "I'll upload another bill", 'Dispute this'],
        citations: [policyCitation],
      },
    ],
    escalatedTo: 'Jane Doe',
  },
  {
    id: 'clm-1002',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Chen',
    category: 'Travel',
    claimedAmount: 642.0,
    currency: 'USD',
    status: 'Pending Approval',
    submittedAt: '2026-09-15T10:00:00Z',
    files: [
      { id: 'f-3', name: 'flight_ticket.pdf', type: 'pdf', url: receiptImages[2], size: 520000 },
    ],
    extracted: {
      vendor: 'Delta Airlines',
      date: '2026-09-14',
      lineItems: [
        { id: 'li-5', description: 'Economy Round Trip — JFK/SFO', amount: 580.0 },
        { id: 'li-6', description: 'First Checked Bag', amount: 35.0 },
        { id: 'li-7', description: 'Travel Insurance', amount: 27.0 },
      ],
      total: 642.0,
      currency: 'USD',
    },
    timeline: ['Submitted', 'Reconciled', 'Policy Check', 'Pending Approval'],
    currentStep: 'Pending Approval',
    chat: [
      ...makeChat('a business trip flight to San Francisco'),
      {
        id: 'm-3b',
        role: 'ai',
        text: 'Your claimed amount of $642.00 matches the extracted bill total exactly. The flight is economy class and includes one checked bag — both are within policy limits. Policy check passed.',
        timestamp: '2026-09-15T10:02:00Z',
        citations: [travelCitation],
      },
      {
        id: 'm-4b',
        role: 'system',
        text: 'Policy check passed — claim forwarded to approver Jane Doe.',
        timestamp: '2026-09-15T10:02:05Z',
      },
    ],
  },
  {
    id: 'clm-1003',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Chen',
    category: 'Medical',
    claimedAmount: 145.0,
    currency: 'USD',
    status: 'Approved',
    submittedAt: '2026-09-10T16:45:00Z',
    files: [
      { id: 'f-4', name: 'clinic_receipt.jpg', type: 'image', url: receiptImages[3], size: 310000 },
    ],
    extracted: {
      vendor: 'City Urgent Care',
      date: '2026-09-09',
      lineItems: [
        { id: 'li-8', description: 'Office Visit', amount: 95.0 },
        { id: 'li-9', description: 'Lab Tests', amount: 50.0 },
      ],
      total: 145.0,
      currency: 'USD',
    },
    timeline: ['Submitted', 'Reconciled', 'Policy Check', 'Approved'],
    currentStep: 'Approved',
    chat: [
      ...makeChat('an urgent care visit during the San Francisco trip'),
      {
        id: 'm-3c',
        role: 'ai',
        text: 'Your claimed amount of $145.00 matches the extracted bill total. The receipt is from a licensed medical provider and includes itemized charges. Policy check passed.',
        timestamp: '2026-09-10T16:47:00Z',
        citations: [medicalCitation],
      },
      {
        id: 'm-4c',
        role: 'system',
        text: 'Policy check passed — claim forwarded to approver Jane Doe.',
        timestamp: '2026-09-10T16:47:05Z',
      },
      {
        id: 'm-5c',
        role: 'system',
        text: 'Claim approved by Jane Doe.',
        timestamp: '2026-09-11T09:15:00Z',
      },
    ],
    approverNote: 'Receipt is itemized and within policy. Approved.',
  },
  {
    id: 'clm-1004',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Chen',
    category: 'Accommodation',
    claimedAmount: 320.0,
    currency: 'USD',
    status: 'Submitted',
    submittedAt: '2026-09-19T11:20:00Z',
    files: [
      { id: 'f-5', name: 'hotel_invoice.pdf', type: 'pdf', url: receiptImages[0], size: 410000 },
    ],
    extracted: {
      vendor: 'Marriott Downtown SF',
      date: '2026-09-14',
      lineItems: [
        { id: 'li-10', description: 'Standard Room (2 nights)', amount: 280.0 },
        { id: 'li-11', description: 'Room Tax (14%)', amount: 39.2 },
      ],
      total: 319.2,
      currency: 'USD',
    },
    timeline: ['Submitted'],
    currentStep: 'Submitted',
    chat: [
      {
        id: 'm-1d',
        role: 'ai',
        text: "I've received your accommodation claim. I'm extracting the bill details now — this will take a moment.",
        timestamp: '2026-09-19T11:20:05Z',
      },
    ],
  },
  {
    id: 'clm-1005',
    employeeId: 'EMP-001',
    employeeName: 'Sarah Chen',
    category: 'Other',
    claimedAmount: 55.0,
    currency: 'USD',
    status: 'Denied',
    submittedAt: '2026-09-05T13:00:00Z',
    files: [
      { id: 'f-6', name: 'misc_receipt.jpg', type: 'image', url: receiptImages[1], size: 150000 },
    ],
    extracted: {
      vendor: 'OfficeMax',
      date: '2026-09-04',
      lineItems: [
        { id: 'li-12', description: 'Printer Ink Cartridge', amount: 55.0 },
      ],
      total: 55.0,
      currency: 'USD',
    },
    timeline: ['Submitted', 'Reconciled', 'Policy Check', 'Denied'],
    currentStep: 'Denied',
    chat: [
      ...makeChat('office supplies'),
      {
        id: 'm-3e',
        role: 'ai',
        text: 'Your claimed amount matches the bill total. However, office supplies should be purchased through the procurement portal, not reimbursed as personal expense. This claim does not qualify under current policy.',
        timestamp: '2026-09-05T13:02:00Z',
      },
      {
        id: 'm-4e',
        role: 'system',
        text: 'Claim denied by Jane Doe.',
        timestamp: '2026-09-06T10:00:00Z',
      },
    ],
    approverNote: 'Office supplies must go through procurement, not expense reimbursement.',
  },
];

export function getClaimsForEmployee(employeeId: string): Claim[] {
  return MOCK_CLAIMS.filter((c) => c.employeeId === employeeId);
}

export function getApproverQueue(): Claim[] {
  return MOCK_CLAIMS.filter(
    (c) => c.status === 'Pending Approval' || c.status === 'Discrepancy' || c.status === 'Escalated' || c.status === 'Under Review'
  );
}

export function getClaimById(id: string): Claim | undefined {
  return MOCK_CLAIMS.find((c) => c.id === id);
}

export { policyCitation, travelCitation, medicalCitation };
