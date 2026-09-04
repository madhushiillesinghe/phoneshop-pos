'use client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Product Schema with conditional fields
const productSchema = z.object({
    // Common fields
    name: z.string().min(1, 'Name is required'),
    categoryId: z.coerce.number().min(1, 'Category is required'),
    brandId: z.coerce.number().optional().nullable(),
    purchasePrice: z.coerce.number().positive('Cost price must be positive'),
    sellingPrice: z.coerce.number().positive('Selling price must be positive'),
    discountPrice: z.coerce.number().optional().nullable(),
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

export default function CreateProductPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [brands, setBrands] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryName, setCategoryName] = useState('');

    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            stock: 0,
            reorderLevel: 5,
            warrantyMonths: 12,
            categoryId: undefined,
            brandId: null,
            discountPrice: null,
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

    // Watch category field to dynamically show/hide fields
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

    // Load brands and categories
    useEffect(() => {
        const loadData = async () => {
            try {
                const [brandRes, categoryRes] = await Promise.all([
                    fetch('/api/brands'),
                    fetch('/api/categories'),
                ]);
                const brandData = await brandRes.json();
                const categoryData = await categoryRes.json();
                setBrands(brandData);
                setCategories(categoryData);
            } catch (err) {
                console.error('Failed to load brands/categories:', err);
            }
        };
        loadData();
    }, []);

    const onSubmit = async (data: ProductForm) => {
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create');
            }
            router.push('/products');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const onSubmitAndPrint = async (data: ProductForm) => {
        setIsPrinting(true);
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create');
            }
            const product = await res.json();
            if (!product || !product.id) {
                throw new Error('Product created but no ID returned');
            }
            router.push(`/products/sticker/${product.id}`);
        } catch (err: any) {
            setError(err.message);
            setIsPrinting(false);
        }
    };

    // Check if selected category is PHONE
    const isPhoneCategory = categoryName === 'phone' ||
        categoryName === 'mobile' ||
        categoryName === 'smartphone' ||
        categoryName === 'phones';

    // Check if selected category is ACCESSORY
    const isAccessoryCategory = categoryName === 'accessory' ||
        categoryName === 'accessories' ||
        categoryName === 'parts' ||
        categoryName === 'accessory parts';

    // Check if selected category is TABLET
    const isTabletCategory = categoryName === 'tablet' ||
        categoryName === 'tablets' ||
        categoryName === 'ipad';

    // Check if selected category is LAPTOP
    const isLaptopCategory = categoryName === 'laptop' ||
        categoryName === 'laptops' ||
        categoryName === 'notebook';

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Category Selection - Required */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Common Fields - Always Visible */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-md font-semibold mb-4 text-gray-700">📋 Product Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Product Code"
                            register={register('productCode')}
                            error={errors.productCode}
                            placeholder="e.g., AG-001"
                        />
                        <FormInput
                            label="Barcode"
                            register={register('barcode')}
                            error={errors.barcode}
                            placeholder="Scan or enter barcode"
                        />
                        <FormInput
                            label="Name *"
                            register={register('name')}
                            error={errors.name}
                            required
                            placeholder="Product name"
                        />

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
                    </div>
                </div>

                {/* Category Specific Fields */}
                {watchCategoryId && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-md font-semibold mb-4 text-gray-700">
                            {isPhoneCategory ? '📱 Phone Details' :
                                isTabletCategory ? '📱 Tablet Details' :
                                    isLaptopCategory ? '💻 Laptop Details' :
                                        isAccessoryCategory ? '🔧 Accessory Details' :
                                            '📦 Product Details'}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* PHONE, TABLET, LAPTOP SPECIFIC FIELDS */}
                            {(isPhoneCategory || isTabletCategory || isLaptopCategory) && (
                                <>
                                    <FormInput
                                        label="Model"
                                        register={register('model')}
                                        error={errors.model}
                                        placeholder="e.g., 14 Pro Max"
                                    />
                                    <FormInput
                                        label="Color"
                                        register={register('color')}
                                        error={errors.color}
                                        placeholder="e.g., Space Gray"
                                    />
                                    <FormInput
                                        label="Serial Number"
                                        register={register('serialNumber')}
                                        error={errors.serialNumber}
                                        placeholder="Enter serial number"
                                    />
                                    {isPhoneCategory && (
                                        <>
                                            <FormInput
                                                label="IMEI"
                                                register={register('imei')}
                                                error={errors.imei}
                                                placeholder="Enter IMEI number"
                                            />
                                        </>
                                    )}
                                    <FormInput
                                        label="Storage"
                                        register={register('storage')}
                                        error={errors.storage}
                                        placeholder="e.g., 128GB, 256GB"
                                    />
                                    <FormInput
                                        label="RAM"
                                        register={register('ram')}
                                        error={errors.ram}
                                        placeholder="e.g., 8GB, 16GB"
                                    />
                                </>
                            )}

                            {/* ACCESSORY SPECIFIC FIELDS */}
                            {isAccessoryCategory && (
                                <>
                                    <FormInput
                                        label="Quantity *"
                                        register={register('quantity')}
                                        error={errors.quantity}
                                        type="number"
                                        required
                                        placeholder="Enter quantity"
                                    />
                                </>
                            )}

                            {/* Warranty - Always show for all categories */}
                            <FormInput
                                label="Warranty (months)"
                                register={register('warrantyMonths')}
                                error={errors.warrantyMonths}
                                type="number"
                                required
                                placeholder="12"
                            />
                        </div>
                    </div>
                )}

                {/* Pricing & Stock Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-md font-semibold mb-4 text-gray-700">💰 Pricing & Stock</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Cost Price (LKR) *"
                            register={register('purchasePrice')}
                            error={errors.purchasePrice}
                            type="number"
                            required
                            placeholder="0.00"
                        />
                        <FormInput
                            label="Low Price (LKR) *"
                            register={register('sellingPrice')}
                            error={errors.sellingPrice}
                            type="number"
                            required
                            placeholder="0.00"
                        />
                        <FormInput
                            label="High Price (LKR)"
                            register={register('discountPrice')}
                            error={errors.discountPrice}
                            type="number"
                            placeholder="0.00"
                        />
                        <FormInput
                            label="Stock"
                            register={register('stock')}
                            error={errors.stock}
                            type="number"
                            placeholder="0"
                        />
                        <FormInput
                            label="Reorder Quantity *"
                            register={register('reorderLevel')}
                            error={errors.reorderLevel}
                            type="number"
                            required
                            placeholder="5"
                        />

                    </div>
                </div>

                {/* Description - Always show */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        {...register('description')}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Product description..."
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 flex-wrap pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || isPrinting || !watchCategoryId}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Product'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit(onSubmitAndPrint)}
                        disabled={isSubmitting || isPrinting || !watchCategoryId}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {isPrinting ? 'Saving...' : 'Save & Print Sticker'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Reusable Form Input Component
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
                className={`mt-1 w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    error ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
        </div>
    );
}