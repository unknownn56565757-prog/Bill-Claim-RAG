import { useState, useRef, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Plane,
  Stethoscope,
  BedDouble,
  Package,
  Upload,
  FileImage,
  FileText,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ScanLine,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/api/client';
import type { ClaimCategory } from '@/types';

const categories: { value: ClaimCategory; icon: React.ElementType; desc: string }[] = [
  { value: 'Food', icon: Utensils, desc: 'Meals, team lunches, client dinners' },
  { value: 'Travel', icon: Plane, desc: 'Flights, taxis, mileage, parking' },
  { value: 'Medical', icon: Stethoscope, desc: 'Doctor visits, prescriptions' },
  { value: 'Accommodation', icon: BedDouble, desc: 'Hotels, extended stays' },
  { value: 'Other', icon: Package, desc: 'Office supplies, misc expenses' },
];

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY'];

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string;
  size: number;
  preview?: string;
}

const placeholderImages = [
  'https://images.pexels.com/photos/8872400/pexels-photo-8872400.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/4959926/pexels-photo-4959926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/7680330/pexels-photo-7680330.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/6816413/pexels-photo-6816413.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

export default function NewClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ClaimCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newFiles: UploadedFile[] = Array.from(fileList).map((file, i) => {
      const isPdf = file.type === 'application/pdf';
      const placeholder = placeholderImages[i % placeholderImages.length];
      return {
        id: `up-${Date.now()}-${i}`,
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        url: placeholder,
        size: file.size,
        preview: isPdf ? undefined : placeholder,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !category || !amount) return;
    setSubmitting(true);
    try {
      const claim = await api.submitClaim(user.employeeId, user.name, {
        category,
        claimedAmount: parseFloat(amount),
        currency,
        files: files.map((f) => ({
          name: f.name,
          type: f.type,
          url: f.url,
          size: f.size,
        })),
      });
      setCreatedClaimId(claim.id);
      setProcessing(true);
      // Simulate OCR processing
      await api.processClaimExtraction(claim.id);
      setProcessing(false);
      setTimeout(() => navigate(`/claims/${claim.id}`), 600);
    } catch {
      setSubmitting(false);
    }
  }

  // Processing screen
  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100">
            <ScanLine className="h-10 w-10 text-brand-600 animate-pulse" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-7 w-7 animate-spin text-brand-600" />
        </div>
        <h2 className="mt-6 text-lg font-bold text-slate-900">Extracting bill details...</h2>
        <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
          Our AI is running OCR on your uploaded bills to extract vendor, date, line items, and
          total amount. This usually takes a few seconds.
        </p>
        <div className="mt-6 w-full max-w-sm space-y-2">
          {['Uploading files', 'Running OCR extraction', 'Matching fields to claim', 'Policy check'].map(
            (task, i) => (
              <div key={task} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2
                  className={`h-4 w-4 ${i < 2 ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={i < 2 ? 'text-slate-700' : 'text-slate-400'}>{task}</span>
                {i === 2 && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Expense Claim</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit a bill for AI-assisted review and approval.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[
          { num: 1, label: 'Category' },
          { num: 2, label: 'Details & Upload' },
          { num: 3, label: 'Review' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors ${
                step >= s.num
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-xs font-medium ${
                step >= s.num ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
            {i < 2 && <div className={`h-0.5 w-6 rounded-full ${step > s.num ? 'bg-brand-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-card p-6">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="animate-fade-in">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Select expense category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const selected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${selected ? 'text-brand-700' : 'text-slate-900'}`}>
                        {cat.value}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!category}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Amount + Upload */}
        {step === 2 && (
          <div className="animate-fade-in space-y-5">
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Claimed Amount
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Upload Bill Images / PDFs
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <Upload className={`mx-auto h-8 w-8 ${dragActive ? 'text-brand-500' : 'text-slate-400'}`} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Supports JPG, PNG, PDF · Max 10MB per file
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                    >
                      {file.type === 'image' ? (
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] flex flex-col items-center justify-center bg-slate-100">
                          <FileText className="h-10 w-10 text-slate-400" />
                          <span className="mt-1 text-xs font-medium text-slate-500">PDF</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        aria-label="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                disabled={!amount || parseFloat(amount) <= 0 || files.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="animate-fade-in space-y-5">
            <h3 className="text-sm font-semibold text-slate-700">Review your claim</h3>
            <div className="space-y-3">
              <ReviewRow label="Category" value={category || ''} />
              <ReviewRow
                label="Amount"
                value={`${new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                }).format(parseFloat(amount || '0'))} ${currency}`}
              />
              <ReviewRow label="Files" value={`${files.length} file(s) attached`} />
              <div className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    {f.type === 'pdf' ? (
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <FileImage className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    {f.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 text-xs text-brand-700">
              After submission, the AI assistant will run OCR on your bills and review the claim
              against company policy. You'll be able to chat with the assistant to resolve any
              discrepancies.
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
