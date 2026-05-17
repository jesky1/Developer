'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ShieldCheck,
  UserCog,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'

// ===== Types =====
interface AdminUser {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  activityCount: number
}

interface UserFormData {
  username: string
  email: string
  displayName: string
  role: string
}

// ===== Role badge config =====
const roleBadgeConfig: Record<string, { bg: string; text: string; border: string }> = {
  superadmin: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
  admin: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-orange-500/30' },
  editor: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  viewer: { bg: 'bg-sky-500/15', text: 'text-sky-500', border: 'border-sky-500/30' },
}

// ===== Helpers =====
function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid'
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  } catch {
    return 'Invalid'
  }
}

const emptyFormData: UserFormData = {
  username: '',
  email: '',
  displayName: '',
  role: 'editor',
}

// ===== Component =====
export function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null)
  const [formData, setFormData] = React.useState<UserFormData>(emptyFormData)
  const [saving, setSaving] = React.useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingUser, setDeletingUser] = React.useState<AdminUser | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Filter users
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.displayName.toLowerCase().includes(search.toLowerCase())

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  // Paginated users
  const paginatedUsers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage])

  const totalPages = Math.ceil(filteredUsers.length / pageSize)

  // Open dialog for adding
  const handleAdd = () => {
    setEditingUser(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  // Open dialog for editing
  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    })
    setDialogOpen(true)
  }

  // Open delete dialog
  const handleDeleteClick = (user: AdminUser) => {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  // Save user (create or update)
  const handleSave = async () => {
    if (!formData.username || !formData.email) {
      toast.error('Username and email are required')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        // Update
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.displayName,
            email: formData.email,
            role: formData.role,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update user')
        }
        toast.success(`User "${formData.username}" updated successfully`)
      } else {
        // Create
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create user')
        }
        toast.success(`User "${formData.username}" created successfully`)
      }
      setDialogOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  // Delete user
  const handleDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      toast.success(`User "${deletingUser.username}" deleted`)
      setDeleteDialogOpen(false)
      setDeletingUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // ===== Render =====
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Username</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedUsers.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Users className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || roleFilter !== 'all'
                          ? 'Try adjusting your search or filter'
                          : 'Add your first admin user to get started'}
                      </p>
                    </div>
                    {!search && roleFilter === 'all' && (
                      <Button onClick={handleAdd} size="sm" variant="outline" className="gap-1.5">
                        <Plus className="size-3.5" />
                        Add User
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // User rows
              <AnimatePresence mode="popLayout">
                {paginatedUsers.map((user, i) => {
                  const roleConfig = roleBadgeConfig[user.role] || roleBadgeConfig.viewer
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50 group"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback
                              className={`${roleConfig.bg} ${roleConfig.text} text-xs font-semibold`}
                            >
                              {getInitials(user.displayName || user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {user.displayName || user.username}
                            </p>
                            <p className="truncate text-xs text-muted-foreground md:hidden">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{user.username}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${roleConfig.bg} ${roleConfig.text} ${roleConfig.border} text-[10px] uppercase tracking-wider`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${
                              user.isActive
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                                : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground" title={formatDate(user.lastLoginAt)}>
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEdit(user)}
                            title="Edit user"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                            onClick={() => handleDeleteClick(user)}
                            title="Delete user"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and adjacent pages
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1]
                const showEllipsis = prev !== undefined && page - prev > 1
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                )
              })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? (
                <>
                  <UserCog className="size-5 text-neon" />
                  Edit User
                </>
              ) : (
                <>
                  <ShieldCheck className="size-5 text-neon" />
                  Add User
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user details and permissions.'
                : 'Create a new admin user with specific role access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="e.g. john_doe"
                value={formData.username}
                onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                disabled={!!editingUser}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@goalzone.com"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="e.g. John Doe"
                value={formData.displayName}
                onChange={(e) => setFormData((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500" />
                      Superadmin
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-orange-500" />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="editor">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Editor
                    </span>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-sky-500" />
                      Viewer
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingUser?.displayName || deletingUser?.username}
              </span>
              ? This action cannot be undone. All associated activity logs will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
