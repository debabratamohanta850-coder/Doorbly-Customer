import React from 'react';
import { CatalogService, DoorblyBooking } from '../types/supabase';
import { X, Printer, ShieldCheck, Download, CheckCircle2 } from 'lucide-react';
import { DoorblyLogo } from './DoorblyLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking?: DoorblyBooking | null;
  service?: CatalogService | null;
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string;
  city?: string;
  pincode?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  invoiceNumber?: string;
}

export const TaxInvoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  booking,
  service,
  customerName,
  customerPhone,
  address,
  city,
  pincode,
  scheduledDate,
  scheduledTime,
  invoiceNumber
}) => {
  if (!isOpen) return null;

  const serviceName = booking?.service_name_snapshot || service?.service_name || 'Doorbly Doorstep Service';
  const categoryName = booking?.category_name_snapshot || service?.category_name || 'Home Services';
  const rawPrice = Number(booking?.customer_price || service?.price || 0);
  
  // Tax calculations (GST @ 18%: 9% CGST + 9% SGST)
  // For consumer clarity: base taxable amount + CGST + SGST = total customer price
  const taxableValue = Math.round((rawPrice / 1.18) * 100) / 100;
  const cgstAmount = Math.round((taxableValue * 0.09) * 100) / 100;
  const sgstAmount = Math.round((rawPrice - taxableValue - cgstAmount) * 100) / 100;
  const totalAmount = rawPrice;

  const resolvedAddress = booking?.address || address || 'Customer Service Address';
  const resolvedCity = booking?.city || city || 'Bhubaneswar';
  const resolvedPincode = booking?.pincode || pincode || '';
  const resolvedDate = booking?.preferred_date || scheduledDate || new Date().toISOString().split('T')[0];
  const resolvedTime = booking?.preferred_time || scheduledTime || 'As scheduled';
  const resolvedInvNo = invoiceNumber || (booking ? `INV-OD-${booking.id.slice(0, 8).toUpperCase()}` : `INV-OD-${Date.now().toString().slice(-6)}`);
  const resolvedName = customerName || 'Verified Doorbly Customer';
  const resolvedPhone = customerPhone || '+91 9XXXXXXXXX';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:max-w-none">
        {/* Modal Top Actions (Hidden when printing) */}
        <div className="bg-[#0F766E] text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full">
              Tax Invoice
            </span>
            <span className="text-xs text-teal-100 font-mono">#{resolvedInvNo}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Document */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 bg-white">
          {/* Invoice Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <DoorblyLogo size="sm" variant="full" />
                <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded-md border border-teal-200 uppercase">
                  Odisha
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                Doorbly Technologies Private Limited
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Plot No. 102, Infocity Road, Patia<br />
                Bhubaneswar, Odisha - 751024<br />
                State Code: 21 (Odisha) | GSTIN: 21AAACD1234F1Z8
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block text-[11px] font-extrabold uppercase bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                TAX INVOICE
              </span>
              <p className="text-[11px] font-mono font-bold text-slate-800">
                {resolvedInvNo}
              </p>
              <p className="text-[10px] text-slate-500">
                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Billed To / Service Location */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Customer Details (Billed To)
              </span>
              <p className="font-bold text-slate-900">{resolvedName}</p>
              <p className="text-slate-600 font-mono text-[10px]">{resolvedPhone}</p>
              <p className="text-slate-600 mt-1 leading-snug">
                {resolvedAddress}<br />
                {resolvedCity} {resolvedPincode ? `- ${resolvedPincode}` : ''}, Odisha
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Booking Schedule & Terms
              </span>
              <p className="font-semibold text-slate-800">Date: {resolvedDate}</p>
              <p className="text-slate-600">Slot: {resolvedTime}</p>
              <p className="text-slate-600 mt-1">Place of Supply: Odisha (21)</p>
              <span className="inline-block mt-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                Pay After Service
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Service Description</th>
                  <th className="py-2.5 px-2 text-center">SAC Code</th>
                  <th className="py-2.5 px-3 text-right">Taxable Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{serviceName}</span>
                    <span className="text-[10px] text-slate-500">{categoryName} • Verified Specialist</span>
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-600">9987</td>
                  <td className="py-3 px-3 text-right font-medium">₹{taxableValue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50/70 border-t border-slate-200 p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Service Value</span>
                <span>₹{taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (9.0%)</span>
                <span>₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (9.0%)</span>
                <span>₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Doorstep Convenience & Safety Fee</span>
                <span className="text-emerald-700 font-semibold">FREE (Waived)</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Total Invoice Amount (Inclusive of GST)</span>
                <span className="text-teal-800 font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Statutory Declaration & Guarantee */}
          <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200/70 flex items-start space-x-2 text-[10px] text-teal-900">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Statutory Tax & Service Assurance</p>
              <p className="text-teal-800 leading-relaxed mt-0.5">
                This is a computer-generated tax invoice pursuant to Section 31 of CGST/OGST Act, 2017. All Doorbly services include complete satisfaction guarantee with post-service payment.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Thank you for choosing Doorbly • For support: support@doorbly.com • +91 8000 123 456
          </div>
        </div>

        {/* Modal Bottom Close (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#0F766E] hover:bg-teal-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center"
          >
            Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
