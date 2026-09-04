'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';

const productSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    barcode: z.string().optional(),
    imei: z.string().optional(),
    serialNumber: z.string().optional(),
    brandId: z.coerce.number().optional(),
    categoryId: z.coerce.number().optional(),
    storage: z.string().optional(),
    ram: z.string().optional(),
    color: z.string().optional(),
    purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
    sellingPrice: z.coerce.number().positive('Selling price must be positive'),
    discountPrice: z.coerce.number().optional(),
    tax: z.coerce.number().default(0),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
    reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative'),
    warrantyMonths: z.coerce.number().int().min(0, 'Warranty months cannot be negative'),
    description: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = parseInt(params.id as string);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [brands, setBrands] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
    });

    // Load product and dropdown data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [productRes, brandRes, categoryRes] = await Promise.all([
                    fetch(`/api/products/${id}`),
                    fetch('/api/brands'),
                    fetch('/api/categories'),
                ]);
                const productData = await productRes.json();
                const brandData = await brandRes.json();
                const categoryData = await categoryRes.json();

                setBrands(brandData);
                setCategories(categoryData);
                reset(productData);
                setLoading(false);
            } catch (err) {
                setError('Failed to load data');
                setLoading(false);
            }
        };
        loadData();
    }, [id, reset]);

    const onSubmit = async (data: ProductForm) => {
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to update');
            }
            router.push('/products');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handlePrintSticker = () => {
        router.push(`/products/sticker/${id}`);
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-4">
                {error && <p className="text-red-600">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Name" register={register('name')} error={errors.name} required />

                    {/* Brand Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                        <select
                            {...register('brandId')}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Brand</option>
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>
                        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
                    </div>

                    {/* Category Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            {...register('categoryId')}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
                    </div>

                    <FormInput label="Barcode" register={register('barcode')} error={errors.barcode} />
                    <FormInput label="IMEI" register={register('imei')} error={errors.imei} />
                    <FormInput label="Serial Number" register={register('serialNumber')} error={errors.serialNumber} />
                    <FormInput label="Storage" register={register('storage')} error={errors.storage} />
                    <FormInput label="RAM" register={register('ram')} error={errors.ram} />
                    <FormInput label="Color" register={register('color')} error={errors.color} />
                    <FormInput label="Purchase Price (LKR)" register={register('purchasePrice')} error={errors.purchasePrice} type="number" required />
                    <FormInput label="Selling Price (LKR)" register={register('sellingPrice')} error={errors.sellingPrice} type="number" required />
                    <FormInput label="Discount Price" register={register('discountPrice')} error={errors.discountPrice} type="number" />
                    <FormInput label="Tax (%)" register={register('tax')} error={errors.tax} type="number" />
                    <FormInput label="Stock" register={register('stock')} error={errors.stock} type="number" required />
                    <FormInput label="Reorder Level" register={register('reorderLevel')} error={errors.reorderLevel} type="number" required />
                    <FormInput label="Warranty (months)" register={register('warrantyMonths')} error={errors.warrantyMonths} type="number" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea {...register('description')} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md" rows={3} />
                </div>

                <div className="flex justify-end gap-4 flex-wrap">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : 'Update Product'}
                    </button>
                    <button
                        type="button"
                        onClick={handlePrintSticker}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center gap-2"
                    >
                        Print Sticker
                    </button>
                </div>
            </form>
        </div>
    );
}

function FormInput({ label, register, error, type = 'text', required = false }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                {...register}
                type={type}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
        </div>
    );
}