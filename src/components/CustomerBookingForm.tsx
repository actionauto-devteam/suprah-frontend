"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Phone } from "lucide-react"

interface CustomerBookingFormProps {
  isCustomerBooking: boolean
  onToggle: (checked: boolean) => void
  customerData: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  onChange: (field: string, value: string) => void
  errors?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
}

export function CustomerBookingForm({
  isCustomerBooking,
  onToggle,
  customerData,
  onChange,
  errors = {}
}: CustomerBookingFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="customerBooking"
          checked={isCustomerBooking}
          onCheckedChange={onToggle}
        />
        <Label
          htmlFor="customerBooking"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Customer's Booked Appointment
        </Label>
      </div>

      {isCustomerBooking && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={customerData.firstName}
                    onChange={(e) => onChange('firstName', e.target.value)}
                    className={`pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={customerData.lastName}
                    onChange={(e) => onChange('lastName', e.target.value)}
                    className={`pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">
                {customerData.phone.trim() ? "Email (optional)" : "Email *"}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={customerData.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
              {errors.email && (
                <p role="alert" className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                {customerData.email.trim() ? "Cellphone Number (optional)" : "Cellphone Number *"}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+1 (555) 123-4567"
                  value={customerData.phone}
                  onChange={(e) => onChange('phone', e.target.value)}
                  className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  aria-invalid={Boolean(errors.phone)}
                />
              </div>
              {errors.phone ? (
                <p role="alert" className="text-xs text-red-500">{errors.phone}</p>
              ) : !customerData.email.trim() && !customerData.phone.trim() ? (
                <p className="text-xs text-muted-foreground">Add a phone number, an email, or both.</p>
              ) : null}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-md p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                This appointment will be marked as a customer booking and will appear in the Booked tab.
                The system will prevent duplicate bookings for this customer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
