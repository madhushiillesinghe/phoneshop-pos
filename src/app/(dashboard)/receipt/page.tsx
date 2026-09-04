'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';

export default function ReceiptPage() {
    const router = useRouter();
    const [receipt, setReceipt] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const data = sessionStorage.getItem('receipt');
        if (data) {
            setReceipt(JSON.parse(data));
            // Auto print after a short delay (optional)
            // setTimeout(() => window.print(), 500);
        } else {
            router.push('/dashboard');
        }
        setLoading(false);
    }, [router]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="text-center py-10">Loading receipt...</div>;
    if (!receipt) return <div className="text-center py-10">No receipt found.</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
            {/* Buttons (hidden when printing) */}
            <div className="no-print w-full max-w-md flex gap-2 mb-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-auto"
                >
                    <Printer className="w-4 h-4" /> Print Receipt
                </button>
            </div>

            {/* Receipt Content – only this will be printed */}
            <div id="print-area" className="w-full max-w-md bg-white shadow-lg rounded-lg p-6 font-mono text-sm">
                <h1 className="text-center text-xl font-bold">📱 PhonePOS</h1>
                <p className="text-center text-xs text-gray-500">123 Main St, City</p>
                <p className="text-center text-xs text-gray-500">Tel: 077-1234567</p>
                <hr className="my-4 border-dashed" />

                <p><strong>Invoice:</strong> {receipt.invoiceNo}</p>
                <p><strong>Date:</strong> {receipt.date}</p>
                <p><strong>Customer:</strong> {receipt.customer}</p>

                <hr className="my-4 border-dashed" />

                <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b">
                        <th className="text-left py-1">Item</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Price</th>
                    </tr>
                    </thead>
                    <tbody>
                    {receipt.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="py-1">{item.name}</td>
                            <td className="text-right py-1">{item.quantity}</td>
                            <td className="text-right py-1">LKR {item.price.toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <hr className="my-4 border-dashed" />

                <div className="flex justify-between"><span>Subtotal</span><span>LKR {receipt.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-green-600"><span>Discount</span><span>- LKR {receipt.discountTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax (5%)</span><span>LKR {receipt.tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>LKR {receipt.total.toFixed(2)}</span></div>

                <hr className="my-4 border-dashed" />
                <p className="text-center text-xs text-gray-500">Thank you for your purchase!</p>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 400px;
            background: white;
            padding: 20px;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
        </div>
    );
}