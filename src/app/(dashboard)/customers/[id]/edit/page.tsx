'use client';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';

const productSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    categoryId: z.coerce.number().min(1, 'Category is required'),
    brandId: z.coerce.number().optional().nullable(),
    purchasePrice: z.coerce.number().positive('Cost price must be positive'),
    sellingPrice: z.coerce.number().positive('Selling price must be positive'),
    discountPrice: z.coerce.number().optional().nullable(),
    tax: z.coerce.number().default(0),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
    reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative'),
    warrantyMonths: z.coerce.number().int().min(0, 'Warranty months cannot be negative'),
    description: z.string().optional().nullable(),

    // Phone specific fields
    productCode: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    serialNumber: z.string().optional().nullable(),
    imei: z.string().optional().nullable(),
    storage: z.string().optional().nullable(),
    ram: z.string().optional().nullable(),

    // Accessory specific fields
    quantity: z.coerce.number().optional().nullable(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = parseInt(params.id as string);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [brands, setBrands] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryName, setCategoryName] = useState('');

    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            categoryId: undefined,
            brandId: null,
            purchasePrice: 0,
            sellingPrice: 0,
            discountPrice: null,
            tax: 0,
            stock: 0,
            reorderLevel: 5,
            warrantyMonths: 12,
            description: '',
            productCode: '',
            barcode: '',
            model: '',
            color: '',
            serialNumber: '',
            imei: '',
            storage: '',
            ram: '',
            quantity: null,
        },
    });

    // Watch category field
    const watchCategoryId = useWatch({
        control,
        name: 'categoryId',
    });

    // Update category name when selection changes
    useEffect(() => {
        if (watchCategoryId) {
            const category = categories.find(c => c.id === Number(watchCategoryId));
            setCategoryName(category?.name?.toLowerCase() || '');
        } else {
            setCategoryName('');
        }
    }, [watchCategoryId, categories]);

    // Load product and dropdown data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [productRes, brandRes, categoryRes] = await Promise.all([
                    fetch(`/api/products/${id}`),
                    fetch('/api/brands'),
                    fetch('/api/categories'),
                ]);

                if (!productRes.ok) throw new Error('Product not found');

                const productData = await productRes.json();
                const brandData = await brandRes.json();
                const categoryData = await categoryRes.json();

                setBrands(brandData);
                setCategories(categoryData);

                // Reset form with product data
                reset({
                    name: productData.name || '',
                    categoryId: productData.categoryId || undefined,
                    brandId: productData.brandId || null,
                    purchasePrice: productData.purchasePrice || 0,
                    sellingPrice: productData.sellingPrice || 0,
                    discountPrice: productData.discountPrice || null,
                    tax: productData.tax || 0,
                    stock: productData.stock || 0,
                    reorderLevel: productData.reorderLevel || 5,
                    warrantyMonths: productData.warrantyMonths || 12,
                    description: productData.description || '',
                    productCode: productData.productCode || '',
                    barcode: productData.barcode || '',
                    model: productData.model || '',
                    color: productData.color || '',
                    serialNumber: productData.serialNumber || '',
                    imei: productData.imei || '',
                    storage: productData.storage || '',
                    ram: productData.ram || '',
                    quantity: productData.quantity || null,
                });

                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Failed to load data');
                setLoading(false);
            }
        };
        loadData();
    }, [id, reset]);

    const onSubmit = async (data: ProductForm) => {
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to update product');
            }

            setSuccess('Product updated successfully!');

            setTimeout(() => {
                router.push(`/products/${id}/view`);
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handlePrintSticker = () => {
        router.push(`/products/sticker/${id}`);
    };

    // Check category types
    const isPhoneCategory = categoryName === 'phone' || categoryName === 'mobile' || categoryName === 'smartphone';
    const isAccessoryCategory = categoryName === 'accessory' || categoryName === 'accessories' || categoryName === 'parts';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading product data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Edit Product</h1>
                </div>
                <div className="flex gap-2">
                    <Link href={`/products/${id}/view`} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
                        <Eye className="w-4 h-4" /> View
                    </Link>
                    <button onClick={handlePrintSticker} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
                        Print Sticker
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Category * <span className="text-xs text-gray-500">(Select to show relevant fields)</span>
                        </label>
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
                </div>

                {watchCategoryId && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-md font-semibold mb-4 text-gray-700">
                            {isPhoneCategory ? '📱 Phone Details' :
                                isAccessoryCategory ? '🔧 Accessory Details' :
                                    '📦 Product Details'}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="Product Code" register={register('productCode')} error={errors.productCode} />
                            <FormInput label="Barcode" register={register('barcode')} error={errors.barcode} />
                            <FormInput label="Name *" register={register('name')} error={errors.name} required />

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

                            {/* PHONE SPECIFIC FIELDS */}
                            {isPhoneCategory && (
                                <>
                                    <FormInput label="Model" register={register('model')} error={errors.model} />
                                    <FormInput label="Color" register={register('color')} error={errors.color} />
                                    <FormInput label="Serial Number" register={register('serialNumber')} error={errors.serialNumber} />
                                    <FormInput label="IMEI" register={register('imei')} error={errors.imei} />
                                    <FormInput label="Storage" register={register('storage')} error={errors.storage} />
                                    <FormInput label="RAM" register={register('ram')} error={errors.ram} />
                                </>
                            )}

                            {/* ACCESSORY SPECIFIC FIELDS */}
                            {isAccessoryCategory && (
                                <FormInput
                                    label="Quantity *"
                                    register={register('quantity')}
                                    error={errors.quantity}
                                    type="number"
                                    required
                                />
                            )}

                            <FormInput label="Warranty (months)" register={register('warrantyMonths')} error={errors.warrantyMonths} type="number" required />
                            <FormInput label="Reorder Quantity *" register={register('reorderLevel')} error={errors.reorderLevel} type="number" required />
                            <FormInput label="Cost Price (LKR) *" register={register('purchasePrice')} error={errors.purchasePrice} type="number" required />
                            <FormInput label="Low Price (LKR) *" register={register('sellingPrice')} error={errors.sellingPrice} type="number" required />
                            <FormInput label="High Price (LKR)" register={register('discountPrice')} error={errors.discountPrice} type="number" />
                            <FormInput label="Stock" register={register('stock')} error={errors.stock} type="number" />
                            <FormInput label="Tax (%)" register={register('tax')} error={errors.tax} type="number" />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea {...register('description')} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md" rows={3} />
                </div>

                <div className="flex justify-end gap-4 flex-wrap pt-4 border-t">
                    <Link href={`/products/${id}/view`} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
                        Cancel
                    </Link>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : 'Update Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function FormInput({ label, register, error, type = 'text', required = false, placeholder = '' }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                {...register}
                type={type}
                placeholder={placeholder}
                className={`mt-1 w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    error ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
        </div>
    );
}