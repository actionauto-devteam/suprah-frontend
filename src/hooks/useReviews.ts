import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/AuthProvider'

export type ReviewSource = 'google' | 'yelp' | 'facebook' | 'other'

export interface DealershipReview {
  _id: string
  organizationId: string
  source: ReviewSource
  reviewerName: string
  rating: number
  reviewText: string
  reviewUrl?: string
  reviewDate?: string
  response?: string
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewsSummary {
  averageRating: number
  totalVisible: number
}

interface UseReviewsOptions {
  page?: number
  limit?: number
  source?: ReviewSource | 'all'
}

export const useReviews = (options: UseReviewsOptions = {}) => {
  const { page = 1, limit = 24, source = 'all' } = options
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const getAuthHeaders = async () => {
    const token = await getToken()
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dealership-reviews', page, limit, source],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (source !== 'all') params.append('source', source)

      const response = await apiClient.get(`/api/crm/reviews?${params.toString()}`, headers)
      return response.data?.data as {
        reviews: DealershipReview[]
        total: number
        page: number
        pages: number
        summary: ReviewsSummary
      }
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dealership-reviews'] })

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<DealershipReview>) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.post('/api/crm/reviews', payload, headers)
      return response.data?.data as DealershipReview
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<DealershipReview> & { id: string }) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.patch(`/api/crm/reviews/${id}`, payload, headers)
      return response.data?.data as DealershipReview
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders()
      await apiClient.delete(`/api/crm/reviews/${id}`, headers)
    },
    onSuccess: invalidate,
  })

  return {
    reviews: data?.reviews || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    summary: data?.summary || { averageRating: 0, totalVisible: 0 },
    isLoading,
    refetch,
    createReview: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateReview: updateMutation.mutateAsync,
    deleteReview: deleteMutation.mutateAsync,
  }
}
