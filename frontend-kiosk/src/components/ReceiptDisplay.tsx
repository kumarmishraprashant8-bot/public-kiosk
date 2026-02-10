import { QRCodeSVG } from "qrcode.react";
import { ReceiptResponse } from "../types";
import { t } from "../utils/translations";
import { Language } from "../types";

interface ReceiptDisplayProps {
  receipt: ReceiptResponse;
  lang: Language;
}

export default function ReceiptDisplay({ receipt, lang }: ReceiptDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-receipt max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">{t("receipt", lang)}</h1>
        <p className="text-gray-600">CivicPulse Complaint Receipt</p>
      </div>

      <div className="border-2 border-gray-300 p-6 rounded-lg mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-600">Receipt ID</p>
            <p className="text-lg font-mono">{receipt.receipt_id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-lg">
              {new Date(receipt.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex justify-center my-6">
          <QRCodeSVG value={receipt.qr_data} size={200} />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Verification Hash</p>
          <p className="text-xs font-mono break-all">{receipt.receipt_hash}</p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handlePrint}
          className="px-8 py-4 bg-blue-600 text-white text-xl rounded-lg hover:bg-blue-700 transition-colors"
          style={{ minHeight: "60px", minWidth: "200px" }}
        >
          Print Receipt
        </button>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-receipt, .print-receipt * {
            visibility: visible;
          }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
