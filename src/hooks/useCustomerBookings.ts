import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from "@/providers/AuthProvider"

interface CustomerBooking {
  _id: string
  title: string
  description?: string
  startTime: Date | string
  endTime: Date | string
  status: string
  customerBooking: {
    firstName: string
    lastName: string
    email: string
    phone: string
    isCustomerBooking: boolean
    bookingHistory?: {
      previousBookings: string[]
      totalBookings: number
      lastBookedAt: Date | string
    }
  }
  createdBy: {
    _id: string
    name: string
    email: string
  }
  location?: string
}

interface CustomerHistory {
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  bookings: CustomerBooking[]
  statistics: {
    total: number
    upcoming: number
    completed: number
    cancelled: number
  }
  bookedBy: Array<{
    organizerId: string
    organizerName: string
    count: number
  }>
}

export const useCustomerBookings = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null)
  const [dateStatistics, setDateStatistics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)
  const pendingRequestsRef = useRef(0)
  const requestIdRef = useRef(0)
  const activeRequestControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // React Strict Mode intentionally runs effect setup/cleanup twice in
    // development. Restore the mounted flag on every setup so a simulated
    // cleanup cannot leave this hook permanently "unmounted".
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      activeRequestControllerRef.current?.abort()
      activeRequestControllerRef.current = null
      pendingRequestsRef.current = 0
    }
  }, [])

  const getTokenWithTimeout = useCallback(async (timeoutMs: number): Promise<string | null> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    try {
      return await Promise.race([
        getToken(),
        new Promise<string | null>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error('Customer bookings authentication timed out'))
          }, timeoutMs)
        }),
      ])
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }, [getToken])

  const normalizeHistory = useCallback((data: any) => {
    const bookings = Array.isArray(data?.bookings) ? data.bookings : []
    const customer = data?.customer || bookings[0]?.customerBooking || null

    const statistics = data?.statistics || {}
    const total = statistics.total ?? statistics.totalBookings ?? bookings.length
    const upcoming = statistics.upcoming ?? statistics.upcomingBookings ?? 0
    const completed = statistics.completed ?? statistics.completedBookings ?? 0
    const cancelled = statistics.cancelled ?? statistics.cancelledBookings ?? 0

    const bookedBy = Array.isArray(data?.bookedBy)
      ? data.bookedBy
      : bookings.reduce((acc: Array<{ organizerId: string; organizerName: string; count: number }>, booking: any) => {
          const organizerId = booking.createdBy?._id?.toString?.() || booking.createdBy?.email || booking.createdBy?.name || 'unknown'
          const organizerName = booking.createdBy?.name || booking.createdBy?.email || 'Unknown'
          const existing = acc.find((item) => item.organizerId === organizerId)
          if (existing) {
            existing.count += 1
          } else {
            acc.push({ organizerId, organizerName, count: 1 })
          }
          return acc
        }, [])

    return {
      customer,
      bookings,
      statistics: {
        total,
        totalBookings: statistics.totalBookings ?? total,
        upcoming,
        upcomingBookings: statistics.upcomingBookings ?? upcoming,
        completed,
        completedBookings: statistics.completedBookings ?? completed,
        cancelled,
        cancelledBookings: statistics.cancelledBookings ?? cancelled,
        firstBooking: statistics.firstBooking,
        lastBooking: statistics.lastBooking,
      },
      bookedBy,
    }
  }, [])

  const fetchCustomerBookings = useCallback(async (filters: any = {}) => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setBookings([])
      setError(null)
      setIsLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    pendingRequestsRef.current += 1
    if (isMountedRef.current) setIsLoading(true)
    setError(null)

    const params = new URLSearchParams()

    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status)
    }
    if (filters.startDate) {
      params.append('startDate', new Date(filters.startDate).toISOString())
    }
    if (filters.endDate) {
      params.append('endDate', new Date(filters.endDate).toISOString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/appointments/customer-bookings/list?${queryString}`
      : '/api/appointments/customer-bookings/list'

    // Only the newest bookings request should remain active. This prevents a
    // slower previous filter request from racing a newer one and also gives
    // Strict Mode cleanup something concrete to cancel.
    activeRequestControllerRef.current?.abort()
    const controller = new AbortController()
    activeRequestControllerRef.current = controller
    let requestTimeoutMs: ReturnType<typeof setTimeout> | null = null

    try {
      const token = await getTokenWithTimeout(15000)
      if (!token) {
        throw new Error('No authentication token')
      }

      if (!isMountedRef.current || requestId !== requestIdRef.current) return

      requestTimeoutMs = setTimeout(() => {
        controller.abort()
      }, 20000)

      console.log('Fetching customer bookings from:', url)

      const response = await apiClient.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      if (!isMountedRef.current || requestId !== requestIdRef.current) return

      console.log('Customer bookings response:', response.data)

      const data = response.data?.data || response.data
      const appointments = Array.isArray(data?.appointments)
        ? data.appointments
        : Array.isArray(data)
          ? data
          : []

      console.log(`Loaded ${appointments.length} customer bookings`)
      setBookings(appointments)
    } catch (error: any) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return

      console.error('Failed to fetch customer bookings:', error)

      const isTimeout =
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        error?.message?.toLowerCase?.().includes('timeout') ||
        controller.signal.aborted

      const errorMessage = isTimeout
        ? 'Customer bookings are taking too long to load. Please try again.'
        : error.response?.data?.message || error.message || 'Failed to load customer bookings'

      setError(errorMessage)
      setBookings([])
    } finally {
      if (requestTimeoutMs) clearTimeout(requestTimeoutMs)
      if (activeRequestControllerRef.current === controller) {
        activeRequestControllerRef.current = null
      }

      pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1)
      if (isMountedRef.current) {
        setIsLoading(pendingRequestsRef.current > 0)
      }
    }
  }, [getTokenWithTimeout, isLoaded, isSignedIn])

  const fetchCustomerHistory = useCallback(async (
    email?: string,
    phone?: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      setIsLoadingHistory(true)
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token')
      }

      const params = new URLSearchParams()
      if (email) params.append('email', email)
      if (phone) params.append('phone', phone)
      if (firstName) params.append('firstName', firstName)
      if (lastName) params.append('lastName', lastName)
      
      console.log('Fetching customer history with params:', params.toString())
      
      const response = await apiClient.get(
        `/api/appointments/customer-bookings/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      console.log('Customer history response:', response.data)
      
      const data = response.data?.data || response.data
      setCustomerHistory(normalizeHistory(data))
      
    } catch (error: any) {
      console.error('Failed to fetch customer history:', error)
      setCustomerHistory(null)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [getToken, normalizeHistory])

  const fetchDateStatistics = useCallback(async (date: Date) => {
    try {
      setIsLoadingStats(true)
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await apiClient.get(
        `/api/appointments/customer-bookings/date-stats?date=${date.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      const data = response.data?.data || response.data
      setDateStatistics(data)
      
    } catch (error) {
      console.error('Failed to fetch date statistics:', error)
      setDateStatistics(null)
    } finally {
      setIsLoadingStats(false)
    }
  }, [getToken])

  return {
    bookings,
    customerHistory,
    dateStatistics,
    isLoading,
    isLoadingHistory,
    isLoadingStats,
    error,
    fetchCustomerBookings,
    fetchCustomerHistory,
    fetchDateStatistics
  }
}