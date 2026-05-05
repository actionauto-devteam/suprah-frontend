"use client"

import * as React from "react"
import { PremiumVehicleCard } from "@/components/customer/PremiumVehicleCard"
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory"
import { ChevronDown, RefreshCw } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { AxiosError } from "axios"
import { InventoryFilters } from "@/components/inventory-filters"
import { InventoryPagination } from "@/components/inventory-pagination"
import { useAuth } from "@/providers/AuthProvider"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useInventoryActions } from "@/hooks/useInventoryActions"
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal"
import { ShippingQuoteModal } from "@/components/shipping-quote-modal"
import { VehicleDetailsModal } from "@/components/vehicle-details-modal"
import { FinanceApplicationModal } from "@/components/finance-application-modal"

type SortOption =
    | "price-asc"
    | "price-desc"
    | "mileage-asc"
    | "mileage-desc"
    | "year-desc"
    | "createdAt-desc"
    | "year-asc"
    | "make-asc"
    | "make-desc"
    | "model-asc"
    | "model-desc"
    | "stockNumber-asc"
    | "stockNumber-desc"
    | "location-asc"
    | "location-desc"
    | "age-asc"
    | "age-desc"
    | "status-asc"
    | "status-desc"
    | "created-asc"
    | "created-desc"
    | "recent-asc"
    | "recent-desc"
    | "cost-asc"
    | "cost-desc"


function ShopVehiclesContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { getToken } = useAuth()

    const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [shippingRates, setShippingRates] = React.useState<Record<string, number>>({})

    const {
        selectedVehicle,
        openModals,
        setDetailsOpen,
        setInquiryOpen,
        setFinanceOpen,
        setShippingOpen,
        handleVehicleClick,
        handleCheckAvailability,
        handleApplyNow,
        handleCallUs,
        handleVideo,
        handleGetQuote
    } = useInventoryActions()

    // Pagination State
    const [page, setPage] = React.useState(Number(searchParams.get("page")) || 1)
    const [limit, setLimit] = React.useState(Number(searchParams.get("limit")) || 12)
    const [total, setTotal] = React.useState(0)
    const [totalPages, setTotalPages] = React.useState(1)

    // Filter State
    const [filters, setFilters] = React.useState<any>({
        search: searchParams.get("search") || "",
        make: searchParams.get("make") || undefined,
        model: searchParams.get("model") || undefined,
        status: searchParams.get("status") || "all",
        year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
        minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
        maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
        minMileage: searchParams.get("minMileage") ? Number(searchParams.get("minMileage")) : undefined,
        maxMileage: searchParams.get("maxMileage") ? Number(searchParams.get("maxMileage")) : undefined,
        bodyStyle: searchParams.get("bodyStyle") || undefined,
        location: searchParams.get("location") || undefined,
        sortBy: searchParams.get("sortBy") || "make",
        sortOrder: searchParams.get("sortOrder") || "asc"
    })

    const [debouncedSearch, setDebouncedSearch] = React.useState(filters.search)

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search)
        }, 500)
        return () => clearTimeout(timer)
    }, [filters.search])

    React.useEffect(() => {
        const params = new URLSearchParams()
        params.set("page", page.toString())
        params.set("limit", limit.toString())

        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== "" && filters[key] !== "all") {
                params.set(key, filters[key])
            }
        })

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        fetchVehicles()
    }, [page, limit, debouncedSearch, filters.make, filters.model, filters.status, filters.year, filters.minPrice, filters.maxPrice, filters.minMileage, filters.maxMileage, filters.sortBy, filters.sortOrder])

    const fetchVehicles = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const token = await getToken()
            const response = await apiClient.get('/api/vehicles/marketplace', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page,
                    limit,
                    ...filters,
                    search: debouncedSearch,
                }
            })

            const responseData = response.data?.data || response.data
            setVehicles(responseData.vehicles || [])
            setTotal(responseData.pagination?.total || 0)
            setTotalPages(responseData.pagination?.totalPages || 1)

        } catch (err) {
            console.error('[Inventory] Error fetching vehicles:', err)
            const axiosError = err as AxiosError
            if (axiosError.code !== "ERR_CANCELED") {
                setError((axiosError.response?.data as any)?.message || axiosError.message || 'Failed to load vehicles')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Auto-modal logic removed as we now use dedicated vehicle pages

    const handleFilterChange = (key: string, value: any) => {
        setFilters((prev: any) => ({ ...prev, [key]: value }))
        setPage(1)
    }

    const handleBulkFilterChange = (newFilters: any) => {
        setFilters((prev: any) => ({ ...prev, ...newFilters }))
        setPage(1)
    }

    const handleClearFilters = () => {
        setFilters({
            search: "",
            make: undefined,
            model: undefined,
            status: "all",
            year: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            minMileage: undefined,
            maxMileage: undefined,
            bodyStyle: undefined,
            location: undefined,
            sortBy: "make",
            sortOrder: "asc"
        })
        setPage(1)
    }

    const handleCalculateQuote = async (formData: ShippingQuoteFormData) => {
        try {
            const token = await getToken()
            const response = await apiClient.post('/api/quotes', {
                ...formData,
                toZip: formData.zipCode,
                toAddress: formData.fullAddress
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const data = response.data?.data || response.data
            if (formData.vehicleId) {
                setShippingRates(prev => ({ ...prev, [formData.vehicleId!]: data.rate }))
            }
            alert(`Quote created! Rate: $${data.rate}`)
            setShippingOpen(false)
        } catch (error) {
            console.error('Error creating quote:', error)
        }
    }

    const handleSortChange = (value: SortOption) => {
        let sortBy = "createdAt"
        let sortOrder = "desc"

        switch (value) {
            case "price-asc": sortBy = "price"; sortOrder = "asc"; break;
            case "price-desc": sortBy = "price"; sortOrder = "desc"; break;
            case "mileage-asc": sortBy = "mileage"; sortOrder = "asc"; break;
            case "mileage-desc": sortBy = "mileage"; sortOrder = "desc"; break;
            case "year-desc": sortBy = "year"; sortOrder = "desc"; break;
            case "make-asc": sortBy = "make"; sortOrder = "asc"; break;
            default: sortBy = "make"; sortOrder = "asc";
        }

        setFilters((prev: any) => ({ ...prev, sortBy, sortOrder }))
    }

    const currentSortValue = React.useMemo(() => {
        if (filters.sortBy === 'price' && filters.sortOrder === 'asc') return 'price-asc';
        if (filters.sortBy === 'price' && filters.sortOrder === 'desc') return 'price-desc';
        if (filters.sortBy === 'mileage' && filters.sortOrder === 'asc') return 'mileage-asc';
        if (filters.sortBy === 'mileage' && filters.sortOrder === 'desc') return 'mileage-desc';
        if (filters.sortBy === 'year' && filters.sortOrder === 'desc') return 'year-desc';
        if (filters.sortBy === 'make' && filters.sortOrder === 'asc') return 'make-asc';
        return 'make-asc';
    }, [filters.sortBy, filters.sortOrder])

    if (error) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Vehicles</h2>
                        <p className="text-red-500/80 mb-4">{error}</p>
                        <button onClick={fetchVehicles} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                            <RefreshCw className="h-4 w-4" /> Retry Loading
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in flex flex-col min-h-full slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase italic">Shop Vehicles</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
                        Browse our premium inventory. Take advantage of Member Exclusive pricing.
                    </p>
                </div>
            </div>

            <div className="space-y-4 shrink-0">
                <InventoryFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onBulkFilterChange={handleBulkFilterChange}
                    onClearFilters={handleClearFilters}
                    apiPath="/api/vehicles/marketplace/filters"
                />

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            <span className="font-bold text-foreground tracking-tight">{total}</span> Vehicles Found
                        </p>
                        <button onClick={fetchVehicles} disabled={isLoading} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Sort by</span>
                        <div className="relative">
                            <select
                                value={currentSortValue}
                                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                                className="border border-border rounded px-3 py-1.5 pr-8 text-sm bg-card text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                            >
                                <option value="make-asc">Make (A-Z)</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="year-desc">Year: Newest</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 pt-2">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-112.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {vehicles.map((vehicle) => (
                                <PremiumVehicleCard
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    shippingPrice={shippingRates[vehicle.id]}
                                    onCheckAvailability={handleCheckAvailability}
                                    onApplyNow={handleApplyNow}
                                    onCallUs={handleCallUs}
                                    onVideo={handleVideo}
                                    onGetQuote={handleGetQuote}
                                    onVehicleClick={handleVehicleClick}
                                />
                            ))}
                        </div>

                        <InventoryPagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            limit={limit}
                            onLimitChange={setLimit}
                            totalCount={total}
                        />
                    </div>
                )}
            </div>

            <ShippingQuoteModal
                open={openModals.shipping}
                onOpenChange={setShippingOpen}
                vehicles={vehicles}
                defaultVehicle={selectedVehicle}
                onCalculate={handleCalculateQuote}
            />


            <VehicleDetailsModal
                isOpen={openModals.details}
                onClose={() => setDetailsOpen(false)}
                vehicle={selectedVehicle}
                onQuoteClick={() => setShippingOpen(true)}
                onInquiryClick={handleCheckAvailability}
                onApplyNow={handleApplyNow}
                shippingQuote={selectedVehicle ? shippingRates[selectedVehicle.id] : null}
            />

            <VehicleInquiryModal
                isOpen={openModals.inquiry}
                onClose={() => setInquiryOpen(false)}
                vehicle={selectedVehicle}
            />

            <FinanceApplicationModal
                isOpen={openModals.finance}
                onClose={() => setFinanceOpen(false)}
                vehicle={selectedVehicle}
            />
        </div>
    )
}

export default function ShopVehiclesPage() {
    return (
        <React.Suspense fallback={<div className="p-8 flex items-center justify-center">Loading...</div>}>
            <ShopVehiclesContent />
        </React.Suspense>
    )
}
