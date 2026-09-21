import { useState } from 'react';
import { Pencil, Check, X, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { ExtractedFields, LineItem } from '@/types';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function ExtractedFieldsTable({
  extracted,
  claimedAmount,
  currency,
}: {
  extracted: ExtractedFields;
  claimedAmount: number;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<ExtractedFields>(extracted);

  const diff = claimedAmount - fields.total;
  const hasDiscrepancy = Math.abs(diff) > 0.01 && fields.total > 0;

  function updateField<K extends keyof ExtractedFields>(key: K, value: ExtractedFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function updateLineItem(id: string, key: keyof LineItem, value: string | number) {
    setFields((f) => ({
      ...f,
      lineItems: f.lineItems.map((li) =>
        li.id === id ? { ...li, [key]: value } : li
      ),
    }));
  }

  function addLineItem() {
    setFields((f) => ({
      ...f,
      lineItems: [
        ...f.lineItems,
        { id: `li-new-${Date.now()}`, description: 'New item', amount: 0 },
      ],
    }));
  }

  function removeLineItem(id: string) {
    setFields((f) => ({
      ...f,
      lineItems: f.lineItems.filter((li) => li.id !== id),
    }));
  }

  const computedTotal = fields.lineItems.reduce((sum, li) => sum + li.amount, 0);

  if (fields.vendor === 'Extracting...' || fields.vendor === '') {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Extracted Fields</h3>
        {editing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setFields((f) => ({ ...f, total: computedTotal }));
                setEditing(false);
              }}
              className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              onClick={() => {
                setFields(extracted);
                setEditing(false);
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Vendor + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Vendor</label>
            {editing ? (
              <input
                value={fields.vendor}
                onChange={(e) => updateField('vendor', e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none"
              />
            ) : (
              <p className="mt-0.5 text-sm font-medium text-slate-900">{fields.vendor}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Date</label>
            {editing ? (
              <input
                type="date"
                value={fields.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none"
              />
            ) : (
              <p className="mt-0.5 text-sm font-medium text-slate-900">{fields.date}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div>
          <label className="text-xs font-medium text-slate-500">Line Items</label>
          <div className="mt-1 space-y-1.5">
            {fields.lineItems.map((li) => (
              <div
                key={li.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                  editing ? 'bg-slate-50' : ''
                }`}
              >
                {editing ? (
                  <>
                    <input
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={li.amount}
                      onChange={(e) =>
                        updateLineItem(li.id, 'amount', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:border-brand-500 focus:ring-1 focus:ring-brand-100 focus:outline-none"
                    />
                    <button
                      onClick={() => removeLineItem(li.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700">{li.description}</span>
                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                      {formatCurrency(li.amount, fields.currency)}
                    </span>
                  </>
                )}
              </div>
            ))}
            {editing && (
              <button
                onClick={addLineItem}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add line item
              </button>
            )}
          </div>
        </div>

        {/* Totals + diff */}
        <div className="border-t border-slate-200 pt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Extracted Total</span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCurrency(editing ? computedTotal : fields.total, fields.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Claimed Amount</span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCurrency(claimedAmount, currency)}
            </span>
          </div>
          {hasDiscrepancy && (
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 mt-2 ${
              diff > 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Discrepancy
              </span>
              <span className="text-sm font-bold text-amber-700 tabular-nums">
                {diff > 0 ? '+' : ''}
                {formatCurrency(diff, currency)}
              </span>
            </div>
          )}
          {!hasDiscrepancy && fields.total > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 mt-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                Amounts match — no discrepancy
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
