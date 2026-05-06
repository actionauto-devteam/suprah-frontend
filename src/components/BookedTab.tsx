"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Calendar, User, Mail, Phone, Clock, Filter, Loader2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { useCustomerBookings } from "@/hooks/useCustomerBookings"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function BookedTab() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false)

  const {
    bookings,
    isLoading,
    error,
    fetchCustomerBookings,
    fetchCustomerHistory,
    customerHistory,
    isLoadingHistory
  } = useCustomerBookings()

  // Fetch bookings on mount and when filters change
  React.useEffect(() => {
    const filters: any = {}

    if (statusFilter !== 'all') {
      filters.status = statusFilter
    }

    if (selectedDate) {
      filters.startDate = selectedDate.toISOString()
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)
      filters.endDate = endDate.toISOString()
    }

    fetchCustomerBookings(filters)
  }, [statusFilter, selectedDate])

  // Filter bookings based on search query
  const filteredBookings = React.useMemo(() => {
    if (!bookings) return []

    let filtered = bookings

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((booking: any) => {
        const customerBooking = booking.customerBooking
        if (!customerBooking) return false

        return (
          customerBooking.firstName?.toLowerCase().includes(query) ||
          customerBooking.lastName?.toLowerCase().includes(query) ||
          customerBooking.email?.toLowerCase().includes(query) ||
          customerBooking.phone?.includes(query)
        )
      })
    }

    return filtered
  }, [bookings, searchQuery])

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!bookings) return { total: 0, todays: 0, confirmed: 0, cancelled: 0 }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return {
      total: bookings.length,
      todays: bookings.filter((b: any) => {
        const start = new Date(b.startTime)
        return start >= today && start < tomorrow
      }).length,
      confirmed: bookings.filter((b: any) => b.status === 'confirmed').length,
      cancelled: bookings.filter((b: any) => b.status === 'cancelled').length
    }
  }, [bookings])

  const handleViewHistory = async (booking: any) => {
    setSelectedCustomer(booking.customerBooking)
    setHistoryModalOpen(true)

    await fetchCustomerHistory(
      booking.customerBooking.email,
      booking.customerBooking.phone,
      booking.customerBooking.firstName,
      booking.customerBooking.lastName
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load customer bookings. Please try again.
          <br />
          <span className="text-xs">{error}</span>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Badge variant="default" className="bg-green-500">
              {stats.confirmed}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Badge variant="destructive">
              {stats.cancelled}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full md:w-50"
            />

            {(searchQuery || statusFilter !== 'all' || selectedDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setSelectedDate(null)
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Bookings List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading customer bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Customer Bookings Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || selectedDate
                  ? "Try adjusting your filters"
                  : "Customer bookings will appear here when created"}
              </p>
              {bookings && bookings.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing 0 of {bookings.length} total bookings
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking: any) => {
                const customer = booking.customerBooking
                const totalBookings = customer?.bookingHistory?.totalBookings || 1

                return (
                  <Card key={booking._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {customer.firstName} {customer.lastName}
                                {totalBookings > 1 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {totalBookings} bookings
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground">{booking.title}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.startTime), 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.startTime), 'p')}</span>
                            </div>
                          </div>

                          {booking.location && (
                            <p className="text-sm text-muted-foreground">
                              Location: {booking.location}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge
                            variant={
                              booking.status === 'confirmed' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                            }
                            className={
                              booking.status === 'confirmed' ? 'bg-green-500' : ''
                            }
                          >
                            {booking.status}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(booking)}
                          >
                            View History
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Customer History - {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </DialogTitle>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : customerHistory ? (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{customerHistory.statistics.total}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{customerHistory.statistics.upcoming}</div>
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{customerHistory.statistics.completed}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{customerHistory.statistics.cancelled}</div>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                  </CardContent>
                </Card>
              </div>

              {/* Booking Timeline */}
              <div>
                <h4 className="font-semibold mb-4">Booking History</h4>
                <div className="space-y-3">
                  {customerHistory.bookings.map((booking: any) => (
                    <div key={booking._id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{booking.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.startTime), 'PPP p')}
                        </p>
                        {booking.createdBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Booked by: {booking.createdBy.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booked By */}
              {customerHistory.bookedBy && customerHistory.bookedBy.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-4">Booked By</h4>
                  <div className="space-y-2">
                    {customerHistory.bookedBy.map((organizer: any) => (
                      <div key={organizer.organizerId} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>{organizer.organizerName}</span>
                        <Badge>{organizer.count} bookings</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No history found for this customer
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
