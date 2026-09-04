'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product } from '@/types';
import { Printer, ArrowLeft } from 'lucide-react';

export default function StickerPage() {
    const params = useParams();
    const router = useRouter();
    const id = parseInt(params.id as string);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/products/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error('Product not found');
                return res.json();
            })
            .then((data) => {
                setProduct(data);
                setLoading(false);
                setTimeout(() => window.print(), 500);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center py-10">Loading sticker...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!product) return <div className="text-center py-10">Product not found</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
            <div className="no-print w-full max-w-md flex gap-2 mb-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-auto">
                    <Printer className="w-4 h-4" /> Print Sticker
                </button>
            </div>

            <div id="sticker" className="w-64 bg-white shadow-lg rounded-lg p-4 border-2 border-gray-300">
                <div className="text-center">
                    {product.barcode && (
                        <div className="mb-2">
                            <div className="font-mono text-2xl tracking-widest">{product.barcode}</div>
                            <div className="text-xs text-gray-500">Barcode</div>
                        </div>
                    )}
                    <h2 className="text-lg font-bold">{product.name}</h2>
                    {product.storage && <p className="text-sm">{product.storage} / {product.ram}</p>}
                    {product.color && <p className="text-sm text-gray-600">{product.color}</p>}
                    <div className="mt-2">
                        <span className="text-lg font-semibold">LKR {product.sellingPrice}</span>
                        {product.discountPrice && (
                            <span className="text-sm text-gray-400 line-through ml-2">LKR {product.discountPrice}</span>
                        )}
                    </div>
                    {product.imei && <div className="mt-2 text-xs text-gray-500">IMEI: {product.imei}</div>}
                    {product.serialNumber && <div className="text-xs text-gray-500">S/N: {product.serialNumber}</div>}
                    <div className="mt-3 border-t pt-2 text-xs text-gray-400">
                        Stock: {product.stock} | Warranty: {product.warrantyMonths} months
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #sticker, #sticker * { visibility: visible; }
                    #sticker {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 256px;
                        padding: 16px;
                        border: 1px solid #ccc;
                        box-shadow: none;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}