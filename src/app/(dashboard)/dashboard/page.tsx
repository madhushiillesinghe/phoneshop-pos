'use client';
import { useEffect, useState } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { useAuth } from '@/src/hooks/useAuth';
import { ShoppingCart, Users, Package, TrendingUp, Calendar, AlertTriangle, PlusCircle, DollarSign, ClipboardList, Boxes, TrendingDown, Wrench } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, isWithinInterval } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const chartTypes = ['Bar', 'Line', 'Pie', 'Doughnut'];
const granularities = ['Weekly', 'Monthly', 'Yearly'];

// Helper to group sales by granularity
const groupSalesByGranularity = (sales: any[], granularity: string, from: Date, to: Date) => {
    const groups: Record<string, number> = {};
    let intervals: Date[] = [];

    if (granularity === 'Weekly') {
        intervals = eachWeekOfInterval({ start: from, end: to });
        intervals.forEach((date) => {
            const weekStart = startOfWeek(date);
            const weekEnd = endOfWeek(date);
            const label = format(weekStart, 'MMM dd');
            groups[label] = 0;
            sales.forEach((s) => {
                if (isWithinInterval(new Date(s.saleDate), { start: weekStart, end: weekEnd })) {
                    groups[label] += s.grandTotal;
                }
            });
        });
    } else if (granularity === 'Monthly') {
        intervals = eachMonthOfInterval({ start: from, end: to });
        intervals.forEach((date) => {
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const label = format(monthStart, 'MMM yyyy');
            groups[label] = 0;
            sales.forEach((s) => {
                if (isWithinInterval(new Date(s.saleDate), { start: monthStart, end: monthEnd })) {
                    groups[label] += s.grandTotal;
                }
            });
        });
    } else { // Yearly
        intervals = eachYearOfInterval({ start: from, end: to });
        intervals.forEach((date) => {
            const yearStart = startOfYear(date);
            const yearEnd = endOfYear(date);
            const label = format(yearStart, 'yyyy');
            groups[label] = 0;
            sales.forEach((s) => {
                if (isWithinInterval(new Date(s.saleDate), { start: yearStart, end: yearEnd })) {
                    groups[label] += s.grandTotal;
                }
            });
        });
    }

    return Object.entries(groups).map(([label, value]) => ({ label, value }));
};

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [salesGranularity, setSalesGranularity] = useState('Weekly');
    const [paymentGranularity, setPaymentGranularity] = useState('Weekly');
    const [categoryGranularity, setCategoryGranularity] = useState('Weekly');

    const [chartType, setChartType] = useState('Bar');

    const fetchStats = async () => {
        setFetching(true);
        const url = `/api/dashboard/stats?from=${dateFrom}&to=${dateTo}`;
        const res = await fetch(url);
        const data = await res.json();
        setStats(data);
        setFetching(false);
    };

    useEffect(() => {
        fetchStats();
    }, [dateFrom, dateTo]);

    if (loading || fetching) return <div className="text-center py-10">Loading dashboard...</div>;

    // Cashier Dashboard (simplified)
    if (user?.role === 'CASHIER' || user?.role === 'TECHNICIAN') {
        return (
            <div>
                <h1 className="text-2xl font-bold mb-6">Cashier Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <StatCard title="Today's Sales" value={`LKR ${stats?.todaySales?.toFixed(2) || 0}`} icon={TrendingUp} color="blue" />
                    <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingCart} color="green" />
                    <StatCard title="Customers" value={stats?.totalCustomers || 0} icon={Users} color="purple" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={() => window.location.href = '/sales'} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md">
                                New Sale
                            </button>
                            <button onClick={() => window.location.href = '/customers'} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-md">
                                Find Customer
                            </button>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                        <p className="text-gray-500 text-sm">Today's orders: {stats?.totalOrders || 0}</p>
                        <p className="text-gray-500 text-sm">Pending installments: {stats?.pendingInstallments || 0}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ---- Admin Dashboard ----
    const rawSales = stats?.rawSales || [];
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    // Process Sales Trend
    const salesData = groupSalesByGranularity(rawSales, salesGranularity, fromDate, toDate);
    const salesLabels = salesData.map((d: any) => d.label);
    const salesValues = salesData.map((d: any) => d.value);

    const salesChartData = {
        labels: salesLabels.length ? salesLabels : ['No Data'],
        datasets: [
            {
                label: 'Sales (LKR)',
                data: salesValues.length ? salesValues : [0],
                backgroundColor: '#3b82f6',
                borderColor: '#3b82f6',
                borderWidth: 1,
            },
        ],
    };

    const renderSalesChart = () => {
        if (!salesLabels.length) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <Package className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 text-center">No sales data</p>
                    <p className="text-gray-400 text-sm">Try adjusting your date range</p>
                </div>
            );
        }
        const ChartComponent = chartType === 'Bar' ? Bar : chartType === 'Line' ? Line : chartType === 'Pie' ? Pie : Doughnut;
        return (
            <ChartComponent
                data={salesChartData}
                options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                    },
                }}
            />
        );
    };

    // ===== TOP SELLING PRODUCTS (≥10 items) =====
    const topSellingProducts = stats?.topSellingProducts || [];
    const topProductLabels = topSellingProducts.length > 0
        ? topSellingProducts.map((p: any) => p.name)
        : ['No Data'];
    const topProductValues = topSellingProducts.length > 0
        ? topSellingProducts.map((p: any) => p.totalSold)
        : [0];

    const topProductChartData = {
        labels: topProductLabels,
        datasets: [
            {
                label: 'Units Sold (≥10)',
                data: topProductValues,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f472b6', '#34d399', '#60a5fa'],
                borderColor: '#10b981',
                borderWidth: 1,
            },
        ],
    };

    // ===== SLOW SELLING PRODUCTS (<3 items) =====
    const slowSellingProducts = stats?.slowSellingProducts || [];
    const slowProductLabels = slowSellingProducts.length > 0
        ? slowSellingProducts.map((p: any) => p.name)
        : ['No Data'];
    const slowProductValues = slowSellingProducts.length > 0
        ? slowSellingProducts.map((p: any) => p.totalSold)
        : [0];

    const slowProductChartData = {
        labels: slowProductLabels,
        datasets: [
            {
                label: 'Units Sold (<3)',
                data: slowProductValues,
                backgroundColor: ['#ef4444', '#f59e0b', '#f97316', '#dc2626', '#b91c1c', '#f43f5e', '#e11d48', '#be123c', '#881337', '#4c0519'],
                borderColor: '#ef4444',
                borderWidth: 1,
            },
        ],
    };

    // ===== PAYMENT METHODS =====
    const getPaymentMethodData = (granularity: string) => {
        const paymentMap: Record<string, number> = {};
        rawSales.forEach((s: any) => {
            const saleDate = new Date(s.saleDate);
            let include = false;
            if (granularity === 'Weekly') {
                const weekStart = startOfWeek(fromDate);
                const weekEnd = endOfWeek(fromDate);
                include = isWithinInterval(saleDate, { start: weekStart, end: weekEnd });
            } else if (granularity === 'Monthly') {
                const monthStart = startOfMonth(fromDate);
                const monthEnd = endOfMonth(fromDate);
                include = isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
            } else {
                const yearStart = startOfYear(fromDate);
                const yearEnd = endOfYear(fromDate);
                include = isWithinInterval(saleDate, { start: yearStart, end: yearEnd });
            }
            if (include) {
                paymentMap[s.paymentMethod] = (paymentMap[s.paymentMethod] || 0) + s.grandTotal;
            }
        });
        const labels = Object.keys(paymentMap).length ? Object.keys(paymentMap) : ['No Data'];
        const values = Object.keys(paymentMap).length ? Object.values(paymentMap) : [1];
        return { labels, values };
    };

    const pmData = getPaymentMethodData(paymentGranularity);
    const pmChartData = {
        labels: pmData.labels,
        datasets: [
            {
                data: pmData.values,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            },
        ],
    };

    // ===== SALES BY CATEGORY =====
    const getCategoryData = (granularity: string) => {
        const categoryMap: Record<string, number> = {};
        rawSales.forEach((s: any) => {
            const saleDate = new Date(s.saleDate);
            let include = false;
            if (granularity === 'Weekly') {
                const weekStart = startOfWeek(fromDate);
                const weekEnd = endOfWeek(fromDate);
                include = isWithinInterval(saleDate, { start: weekStart, end: weekEnd });
            } else if (granularity === 'Monthly') {
                const monthStart = startOfMonth(fromDate);
                const monthEnd = endOfMonth(fromDate);
                include = isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
            } else {
                const yearStart = startOfYear(fromDate);
                const yearEnd = endOfYear(fromDate);
                include = isWithinInterval(saleDate, { start: yearStart, end: yearEnd });
            }
            if (include) {
                const cat = s.category || 'Uncategorized';
                categoryMap[cat] = (categoryMap[cat] || 0) + s.grandTotal;
            }
        });
        const labels = Object.keys(categoryMap).length ? Object.keys(categoryMap) : ['No Data'];
        const values = Object.keys(categoryMap).length ? Object.values(categoryMap) : [1];
        return { labels, values };
    };

    const catData = getCategoryData(categoryGranularity);
    const catChartData = {
        labels: catData.labels,
        datasets: [
            {
                data: catData.values,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
            },
        ],
    };

    // ===== PENDING REPAIRS =====
    const pendingRepairs = stats?.pendingRepairs || [];
    const repairLabels = pendingRepairs.length > 0
        ? pendingRepairs.map((r: any) => r.status || 'Pending')
        : ['No Repairs'];
    const repairValues = pendingRepairs.length > 0
        ? pendingRepairs.map((r: any) => r.count || 0)
        : [0];

    const repairChartData = {
        labels: repairLabels,
        datasets: [
            {
                data: repairValues,
                backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981'],
            },
        ],
    };

    // ===== LOW STOCK ITEMS (stock < 3) =====
    const lowStockItems = stats?.lowStockItems || [];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* Global Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <button
                    onClick={fetchStats}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                    <Calendar className="w-4 h-4" /> Update
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    title="Today's Sales"
                    value={`LKR ${stats?.todaySales?.toFixed(2) || 0}`}
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Today's Profit"
                    value={`LKR ${stats?.todayProfit?.toFixed(2) || 0}`}
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Today's Orders"
                    value={stats?.todayOrders || 0}
                    icon={ClipboardList}
                    color="orange"
                />
                <StatCard
                    title="Monthly Sales"
                    value={`LKR ${stats?.monthlySales?.toFixed(2) || 0}`}
                    icon={ShoppingCart}
                    color="purple"
                    subtitle={`${stats?.percentChange?.toFixed(2) || 0}% from last month`}
                />
                <StatCard
                    title="Total Stock Items"
                    value={stats?.totalStockItems || 0}
                    icon={Boxes}
                    color="indigo"
                />
                <StatCard
                    title="Low Stock Items"
                    value={stats?.lowStockCount || 0}
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            {/* Charts Row 1: Top Selling & Slow Selling */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend Chart */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Sales Trend</h3>
                        <div className="flex items-center gap-2">
                            <select
                                value={salesGranularity}
                                onChange={(e) => setSalesGranularity(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                                {granularities.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <select
                                value={chartType}
                                onChange={(e) => setChartType(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                                {chartTypes.map((ct) => (
                                    <option key={ct} value={ct}>{ct}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="h-64 w-full">{renderSalesChart()}</div>
                </div>

                {/* Top Selling Products (≥10 items) */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" /> Top Selling Products
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">≥10 items</span>
                        </h3>
                        {topSellingProducts.length > 0 && (
                            <span className="text-xs text-gray-500">{topSellingProducts.length} products</span>
                        )}
                    </div>
                    <div className="h-64 w-full">
                        {topSellingProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Package className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-gray-500 text-center">No top selling products</p>
                                <p className="text-gray-400 text-sm">No product has sold ≥10 items</p>
                            </div>
                        ) : (
                            <Bar
                                data={topProductChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                            labels: { font: { size: 12 } }
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: { stepSize: 1 },
                                        },
                                    },
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Slow Selling & Pending Repairs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Slow Selling Products (<3 items) */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-500" /> Slow Selling Products
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">&lt;3 items</span>
                        </h3>
                        {slowSellingProducts.length > 0 && (
                            <span className="text-xs text-gray-500">{slowSellingProducts.length} products</span>
                        )}
                    </div>
                    <div className="h-64 w-full">
                        {slowSellingProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Package className="w-12 h-12 text-green-300 mb-2" />
                                <p className="text-gray-500 text-center">No slow selling products</p>
                                <p className="text-gray-400 text-sm">All products have sold ≥3 items</p>
                            </div>
                        ) : (
                            <Bar
                                data={slowProductChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                            labels: { font: { size: 12 } }
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: { stepSize: 1 },
                                        },
                                    },
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Pending Repairs */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" /> Pending Repairs
                        </h3>
                        {pendingRepairs.length > 0 && pendingRepairs.some((r: any) => r.count > 0) && (
                            <span className="text-xs text-gray-500">
                                {pendingRepairs.reduce((sum: number, r: any) => sum + r.count, 0)} total
                            </span>
                        )}
                    </div>
                    <div className="h-64 w-full">
                        {pendingRepairs.length === 0 || pendingRepairs.every((r: any) => r.count === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Wrench className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-gray-500 text-center">No pending repairs</p>
                                <p className="text-gray-400 text-sm">All repairs are completed</p>
                            </div>
                        ) : (
                            <Doughnut
                                data={repairChartData}
                                options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { font: { size: 12 }, padding: 20 }
                                        },
                                    },
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 3: Payment Methods & Category Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Methods Chart */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Payment Methods</h3>
                        <select
                            value={paymentGranularity}
                            onChange={(e) => setPaymentGranularity(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                            {granularities.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <Doughnut
                            data={pmChartData}
                            options={{
                                maintainAspectRatio: false,
                                responsive: true,
                                plugins: { legend: { position: 'bottom' } },
                            }}
                        />
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Sales by Category</h3>
                        <select
                            value={categoryGranularity}
                            onChange={(e) => setCategoryGranularity(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                            {granularities.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <Doughnut
                            data={catChartData}
                            options={{
                                maintainAspectRatio: false,
                                responsive: true,
                                plugins: { legend: { position: 'bottom' } },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Low Stock Items Table (<3 items) */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <h3 className="text-lg font-semibold p-4 border-b flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> Low Stock Items
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">&lt;3 items</span>
                    {lowStockItems.length > 0 && (
                        <span className="text-sm text-gray-500 ml-2">({lowStockItems.length} items)</span>
                    )}
                </h3>
                {lowStockItems.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package className="w-12 h-12 text-green-300 mx-auto mb-2" />
                        <p className="text-gray-500">All products have sufficient stock</p>
                        <p className="text-gray-400 text-sm">No items with stock less than 3</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {lowStockItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`font-bold ${item.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                            {item.stock}
                                        </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.reorderLevel || 5}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            item.stock === 0
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => window.location.href = `/inventory/${item.id}`}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                                    >
                                        Reorder
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        purple: 'bg-purple-100 text-purple-700',
        orange: 'bg-orange-100 text-orange-700',
        red: 'bg-red-100 text-red-700',
        indigo: 'bg-indigo-100 text-indigo-700',
    };
    return (
        <div className={`p-4 rounded-lg shadow ${colorMap[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xl font-bold">{value}</p>
                    {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
                </div>
                <Icon className="w-8 h-8 opacity-50" />
            </div>
        </div>
    );
}