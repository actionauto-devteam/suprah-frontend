"use client"

import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, X, UserPlus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"

interface User {
  _id: string
  name: string
  fullName?: string
  email: string
  avatar?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as { response?: { data?: { message?: string } } }
    return response.response?.data?.message || fallback
  }
  return error instanceof Error ? error.message || fallback : fallback
}

interface UserSearchProps {
  selectedUsers: string[]
  onSelectUsers: (userIds: string[]) => void
  label?: string
  placeholder?: string
  multiple?: boolean
  excludeCurrentUser?: boolean
  knownUsers?: User[]
}

export function UserSearch({
  selectedUsers,
  onSelectUsers,
  label = "Select Users",
  placeholder = "Search users by name or email...",
  multiple = true,
  excludeCurrentUser = true,
  knownUsers = []
}: UserSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const { getToken, isSignedIn } = useAuth()

  // Fetch users when search query changes
  const fetchUsers = React.useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setUsers([])
      setError(null)
      return
    }

    if (!isSignedIn) {
      setError('Please sign in to search users')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('[UserSearch] Searching for:', query)

      const token = await getToken()
      const response = await apiClient.get('/api/users/search', {
        params: {
          q: query.trim(),
          limit: 10,
          excludeSelf: excludeCurrentUser ? 'true' : 'false'
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log('[UserSearch] Response:', response.data)

      const data = response.data?.data || response.data
      const usersList = Array.isArray(data) ? data : data.users || []

      console.log('[UserSearch] Found users:', usersList.length)
      setUsers(usersList)

      if (usersList.length === 0) {
        setError(`No users found matching "${query}"`)
      }
    } catch (error: unknown) {
      console.error('[UserSearch] Search failed:', error)
      setError(getErrorMessage(error, 'Failed to search users'))
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [excludeCurrentUser, getToken, isSignedIn])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchUsers])

  // senior dev: merge search results with known users (e.g. auto-populated current user)
  // so selected badges render even before they appear in a search result
  const allKnownUsers = React.useMemo(() => {
    const byId = new Map<string, User>()
    knownUsers.forEach(u => byId.set(u._id, u))
    users.forEach(u => byId.set(u._id, u))
    return Array.from(byId.values())
  }, [knownUsers, users])

  const selectedUserObjects = allKnownUsers.filter(u => selectedUsers.includes(u._id))

  const handleSelect = (userId: string) => {
    if (multiple) {
      if (selectedUsers.includes(userId)) {
        onSelectUsers(selectedUsers.filter(id => id !== userId))
      } else {
        onSelectUsers([...selectedUsers, userId])
      }
    } else {
      onSelectUsers([userId])
      setOpen(false)
    }
  }

  const handleRemove = (userId: string) => {
    onSelectUsers(selectedUsers.filter(id => id !== userId))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {/* Selected users badges */}
      {selectedUserObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUserObjects.map(user => (
            <Badge key={user._id} variant="secondary" className="gap-1">
              {user.fullName || user.name}
              <button
                type="button"
                onClick={() => handleRemove(user._id)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="size-4" />
              {selectedUsers.length === 0
                ? placeholder
                : multiple
                  ? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`
                  : selectedUserObjects[0]?.fullName || selectedUserObjects[0]?.name
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0 z-350" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search users..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {error}
                  </div>
                ) : searchQuery ? (
                  <div className="py-6 text-center text-sm">
                    No users found
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Start typing to search users
                  </div>
                )}
              </CommandEmpty>
              {users.length > 0 && (
                <CommandGroup>
                  {users.map((user) => (
                    <CommandItem
                      key={user._id}
                      value={user._id}
                      onSelect={() => handleSelect(user._id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedUsers.includes(user._id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{user.fullName || user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
