"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar, Clock, Users, Plus, RefreshCw, Mail, ArrowLeft, Contact,
} from "lucide-react"
import { AppointmentCalendar } from "@/components/AppointmentCalendar"
import { BookedTab } from "@/components/BookedTab"
import { LeadsTab } from "@/components/LeadsTab"
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal"
import { AppointmentDetailsModal } from "@/components/AppointmentDetailsModal"
import { CrmCalendarConnect } from "@/components/CrmCalendarConnect"
import { CrmCalendarSyncButton } from "@/components/CrmCalendarSyncButton"
// ↓↓↓ NEW IMPORT ↓↓↓
import { CustomerCredentialsTab } from "@/components/CustomerCredentialsTab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import {
  FullscreenProvider,
  useFullscreen,
  TabOption,
} from "@/components/FullscreenProvider";
import {
  PaneToolbar,
  MultiPaneContainer,
  FullscreenWrapper,
} from "@/components/MultiPaneLayout";
import { TooltipProvider } from "@/components/ui/tooltip";

// ─── Available tabs ───────────────────────────────────────────────────────────

const TAB_OPTIONS: TabOption[] = [
  { id: "leads", label: "Leads", icon: <Mail className="h-3.5 w-3.5" /> },
  {
    id: "calendar",
    label: "Calendar View",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  {
    id: "upcoming",
    label: "Upcoming",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  { id: "booked", label: "Booked", icon: <Users className="h-3.5 w-3.5" /> },
  // ↓↓↓ NEW TAB ↓↓↓
  {
    id: "customers",
    label: "Customer Credentials",
    icon: <Contact className="h-3.5 w-3.5" />,
  },
];

// ─── Inner Page ───────────────────────────────────────────────────────────────

function AppointmentsPageInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { isFullscreen } = useFullscreen();

  const [activeTab, setActiveTab] = React.useState("leads")
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)
  const [selectedAppointment, setSelectedAppointment] = React.useState<any>(null)
  const [preselectedDate, setPreselectedDate] = React.useState<Date | undefined>()
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      window.history.replaceState({}, "", "/crm/appointments")
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["appointments"] })
      }, 1000)
    }
    if (params.get("calendar") === "connected") {
      window.history.replaceState({}, "", "/crm/appointments")
    }
    if (params.get("calendar_error")) {
      window.history.replaceState({}, "", "/crm/appointments")
    }
  }, [queryClient]);

  const getAuthHeaders = async () => {
    const token = await getToken()
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  // 1. Global Query: Fetches a larger batch for stats and upcoming list
  const {
    data: globalAppointments = [],
    isLoading: isGlobalLoading,
    refetch: refetchGlobal,
  } = useQuery({
    queryKey: ["appointments", "global"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders()
        // We request a higher limit for global stats (e.g., 500)
        const response = await apiClient.get("/api/crm/calendar/appointments", {
          ...headers,
          params: { limit: 500 }
        })
        const data = response.data?.data || response.data
        if (Array.isArray(data)) return data;
        return data.appointments || []
      } catch (error: any) {
        console.error("[AppointmentsPage] ❌ Error fetching global appointments:", error)
        return []
      }
    },
    staleTime: 30_000,
  })

  // 2. Calendar Query: Fetches specifically for the visible month
  const {
    data: calendarAppointments = [],
    isLoading: isCalendarLoading,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: ["appointments", "calendar", currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders()
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const response = await apiClient.get("/api/crm/calendar/appointments", {
          ...headers,
          params: { 
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            limit: 200 // Plenty for a single month
          }
        })
        const data = response.data?.data || response.data
        if (Array.isArray(data)) return data;
        return data.appointments || []
      } catch (error: any) {
        console.error("[AppointmentsPage] ❌ Error fetching calendar appointments:", error)
        return []
      }
    },
    staleTime: 60_000,
  })

  const { data: customerBookingsCount = 0 } = useQuery({
    queryKey: ["customer-bookings-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await apiClient.get(
          "/api/appointments/customer-bookings/list",
          headers,
        );
        const data = response.data?.data || response.data;
        return data.appointments?.length || 0;
      } catch {
        return 0;
      }
    },
  });

  // ── NEW: customer count badge ─────────────────────────────────────────────
  const { data: customerCount = 0 } = useQuery({
    queryKey: ["customers-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await apiClient.get("/api/customers/stats", headers);
        return res.data?.data?.total ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60_000,
  });

  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      total: globalAppointments.length,
      upcoming: globalAppointments.filter((apt: any) => {
        const start = new Date(apt.startTime)
        return start >= today && !['cancelled', 'completed', 'no-show'].includes(apt.status)
      }).length,
      today: globalAppointments.filter((apt: any) => {
        const start = new Date(apt.startTime)
        return start >= today && start < tomorrow && !['cancelled', 'completed', 'no-show'].includes(apt.status)
      }).length,
      cancelled: globalAppointments.filter((apt: any) => apt.status === 'cancelled').length,
    }
  }, [globalAppointments])

  const handleCreateAppointment = React.useCallback(() => {
    setPreselectedDate(undefined);
    setCreateModalOpen(true);
  }, []);

  const handleDateClick = React.useCallback((date?: Date) => {
    setPreselectedDate(date)
    setCreateModalOpen(true)
  }, [])

  const handleSyncComplete = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ])
  }, [refetchGlobal, refetchCalendar, queryClient])

  const handleAppointmentClick = React.useCallback((appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsModalOpen(true);
  }, []);

  const handleUpdateAppointment = React.useCallback(async (id: string, data: any) => {
    const headers = await getAuthHeaders()
    await apiClient.put(`/api/crm/calendar/appointments/${id}`, data, headers)

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ])
  }, [refetchGlobal, refetchCalendar, queryClient])

  const handleCancelAppointment = React.useCallback(async (id: string) => {
    const headers = await getAuthHeaders()
    await apiClient.post(`/api/crm/calendar/appointments/${id}/cancel`, {}, headers)

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ])
  }, [refetchGlobal, refetchCalendar, queryClient])

  const handleDeleteAppointment = React.useCallback(async (id: string) => {
    const headers = await getAuthHeaders()
    await apiClient.delete(`/api/crm/calendar/appointments/${id}`, headers)

    setDetailsModalOpen(false)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ])
  }, [refetchGlobal, refetchCalendar, queryClient])

  // Removed duplicate handleAppointmentClick

  const handleCreateAppointmentSubmit = React.useCallback(async (data: any) => {
    const headers = await getAuthHeaders()
    await apiClient.post("/api/crm/calendar/appointments", data, headers)
    await Promise.all([
      refetchGlobal(),
      refetchCalendar(),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
    ])
  }, [refetchGlobal, refetchCalendar, queryClient])

  const renderTabContent = React.useCallback(
    (tabId: string) => {
      switch (tabId) {
        case "leads":
          return (
            <div className="p-4">
              <LeadsTab />
            </div>
          );
        case "calendar":
          return (
            <div className="p-4">
              {!isCalendarLoading ? (
                <AppointmentCalendar
                  appointments={calendarAppointments}
                  viewDate={currentMonth}
                  onViewDateChange={setCurrentMonth}
                  onCreateAppointment={handleDateClick}
                  onSelectAppointment={handleAppointmentClick}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          );
        case "upcoming":
          return (
            <div className="p-4">
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {isGlobalLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : stats.upcoming === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No upcoming appointments</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={handleCreateAppointment}
                      >
                        Create Appointment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {globalAppointments
                        .filter((apt: any) => {
                          const start = new Date(apt.startTime);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return start >= today && !['cancelled', 'completed', 'no-show'].includes(apt.status);
                        })
                        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .slice(0, 20)
                        .map((appointment: any) => (
                          <Card
                            key={appointment._id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleAppointmentClick(appointment)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">
                                      {appointment.title}
                                    </h4>
                                    <Badge
                                      variant={
                                        appointment.status === "confirmed"
                                          ? "default"
                                          : appointment.status === "cancelled"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                      className={
                                        appointment.status === "confirmed"
                                          ? "bg-green-500"
                                          : ""
                                      }
                                    >
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(
                                      appointment.startTime,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                    {" at "}
                                    {new Date(
                                      appointment.startTime,
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {appointment.location && (
                                    <p className="text-sm text-muted-foreground">
                                      Location: {appointment.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        case "booked":
          return (
            <div className="p-4">
              <BookedTab />
            </div>
          )
        case "customers":
          return (
            <div className="p-4 h-full">
              <CustomerCredentialsTab />
            </div>
          );
        default:
          return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground/30 py-16">
              Unknown tab: {tabId}
            </div>
          );
      }
    },
    [calendarAppointments, isCalendarLoading, globalAppointments, isGlobalLoading, stats.upcoming, handleCreateAppointment, handleDateClick, handleAppointmentClick, currentMonth]
  )

  return (
    <>
      <FullscreenWrapper>
        <div
          className={`${isFullscreen
            ? "flex flex-col h-full overflow-hidden"
            : "container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
            }`}
        >
          {isFullscreen ? (
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/crm/dashboard")}
                  className="h-8 w-8 rounded-lg border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 p-0 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold">Appointments</h1>
              </div>
              <div className="flex items-center gap-2">
                <PaneToolbar tabOptions={TAB_OPTIONS} />
                <CrmCalendarSyncButton onSyncComplete={handleSyncComplete} />
                <Button
                  type="button"
                  onClick={handleCreateAppointment}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" /> New Appointment
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-hidden md:flex md:items-start md:justify-between md:gap-6">
              <div className="min-w-0 space-y-3">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/crm/dashboard")}
                    className="h-8 w-8 shrink-0 rounded-lg border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 p-0 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="min-w-0 text-2xl font-bold leading-tight sm:text-3xl">
                    Appointments
                  </h1>
                </div>

                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Manage your leads, appointments, events, and customer records
                </p>
              </div>

              <div className="mt-3 flex w-full flex-wrap items-center gap-2 md:mt-0 md:w-auto md:justify-end md:self-start">
                <PaneToolbar tabOptions={TAB_OPTIONS} />
                <CrmCalendarSyncButton
                  onSyncComplete={handleSyncComplete}
                  compactOnMobile
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateAppointment}
                  aria-label="Create appointment"
                  className="px-2.5 sm:px-3"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Appointment</span>
                </Button>
              </div>
            </div>
          )}

          {isFullscreen ? (
            <div className="flex-1 overflow-hidden">
              <MultiPaneContainer
                tabOptions={TAB_OPTIONS}
                renderTab={renderTabContent}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <CrmCalendarConnect />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                    <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
                      Total Appointments
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold sm:text-2xl">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                    <CardTitle className="text-xs font-medium leading-tight sm:text-sm">Today</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold sm:text-2xl">{stats.today}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                    <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
                      Upcoming
                    </CardTitle>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold sm:text-2xl">{stats.upcoming}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                    <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
                      Customer Bookings
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold sm:text-2xl">
                      {customerBookingsCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                    <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
                      Customers
                    </CardTitle>
                    <Contact className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold sm:text-2xl">{customerCount}</div>
                  </CardContent>
                </Card>
              </div>

              {(isGlobalLoading || isCalendarLoading) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Refreshing data...</span>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="overflow-x-auto touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsList className="min-w-max">
                    <TabsTrigger value="leads" className="!flex-none shrink-0">
                    <Mail className="mr-2 h-4 w-4" /> Leads
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="!flex-none shrink-0">
                    <Calendar className="mr-2 h-4 w-4" /> Calendar View
                    </TabsTrigger>
                    <TabsTrigger value="upcoming" className="!flex-none shrink-0">
                    <Clock className="mr-2 h-4 w-4" /> Upcoming
                    {stats.upcoming > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {stats.upcoming}
                      </Badge>
                    )}
                    </TabsTrigger>
                    <TabsTrigger value="booked" className="!flex-none shrink-0">
                    <Users className="mr-2 h-4 w-4" /> Booked
                    {customerBookingsCount > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {customerBookingsCount}
                      </Badge>
                    )}
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="!flex-none shrink-0">
                    <Contact className="mr-2 h-4 w-4" /> Customer Credentials
                    {customerCount > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {customerCount}
                      </Badge>
                    )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="leads" className="space-y-4">
                  <LeadsTab />
                </TabsContent>

                <TabsContent value="calendar" className="space-y-4">
                  {!isCalendarLoading ? (
                    <AppointmentCalendar
                      appointments={calendarAppointments}
                      viewDate={currentMonth}
                      onViewDateChange={setCurrentMonth}
                      onCreateAppointment={handleDateClick}
                      onSelectAppointment={handleAppointmentClick}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* same upcoming list as before — omitted for brevity, copy from original */}
                      {stats.upcoming === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>No upcoming appointments</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            onClick={handleCreateAppointment}
                          >
                            Create Appointment
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {globalAppointments
                            .filter((apt: any) => {
                              const start = new Date(apt.startTime);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return (
                                start >= today && !['cancelled', 'completed', 'no-show'].includes(apt.status)
                              );
                            })
                            .sort(
                              (a: any, b: any) =>
                                new Date(a.startTime).getTime() -
                                new Date(b.startTime).getTime(),
                            )
                            .slice(0, 10)
                            .map((appointment: any) => (
                              <Card
                                key={appointment._id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() =>
                                  handleAppointmentClick(appointment)
                                }
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">
                                      {appointment.title}
                                    </h4>
                                    <Badge
                                      variant={
                                        appointment.status === "confirmed"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(
                                      appointment.startTime,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                    {" at "}
                                    {new Date(
                                      appointment.startTime,
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="booked" className="space-y-4">
                  <BookedTab />
                </TabsContent>

                {/* ↓↓↓ NEW TAB CONTENT ↓↓↓ */}
                <TabsContent value="customers" className="space-y-4">
                  <CustomerCredentialsTab />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </FullscreenWrapper>

      {/* Modals */}
      <CreateAppointmentModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setPreselectedDate(undefined);
        }}
        onCreateAppointment={handleCreateAppointmentSubmit}
        conversations={[]}
        preselectedDate={preselectedDate}
      />
      {selectedAppointment && (
        <AppointmentDetailsModal
          open={detailsModalOpen}
          onOpenChange={(open) => {
            setDetailsModalOpen(open);
            if (!open) setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onUpdate={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
          onCancel={handleCancelAppointment}
        />
      )}
    </>
  );
}

// ─── Exported Page ────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  return (
    <TooltipProvider>
      <FullscreenProvider defaultTab="leads">
        <AppointmentsPageInner />
      </FullscreenProvider>
    </TooltipProvider>
  );
}
