import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertCircle,
    X,
    LogOut,
    CheckCircle2,
    Check,
    Loader2,
    CircleDot,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnlineStatus } from '@/types/user';
import { onlineStatusOptions } from './profile-constants';

const MAX_CUSTOM_STATUS_LENGTH = 100;

const STATUS_EXPIRY_OPTIONS = [
    { label: "Don't clear", value: 0 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '4 hours', value: 240 },
] as const;

interface ProfileDialogsProps {
    showDeleteDialog: boolean;
    setShowDeleteDialog: (show: boolean) => void;
    showDeleteConfirmDialog: boolean;
    setShowDeleteConfirmDialog: (show: boolean) => void;
    deleteConfirmText: string;
    setDeleteConfirmText: (text: string) => void;
    handleDeleteAccount: () => void;

    showLogoutDialog: boolean;
    setShowLogoutDialog: (show: boolean) => void;
    handleLogout: () => void;

    showSaveConfirmDialog: boolean;
    setShowSaveConfirmDialog: (show: boolean) => void;
    handleSavePersonalInfo: () => void;
    isSaving: boolean;

    showStatusDialog: boolean;
    setShowStatusDialog: (show: boolean) => void;
    onlineStatus: OnlineStatus;
    setOnlineStatus: (status: OnlineStatus) => void;
    customStatus: string;
    handleCustomStatusChange: (text: string) => void;
    customStatusError: string | null;
    handleUpdateOnlineStatus: () => void;
    statusExpiresIn: number;
    setStatusExpiresIn: (minutes: number) => void;
}

export const ProfileDialogs: React.FC<ProfileDialogsProps> = ({
    showDeleteDialog,
    setShowDeleteDialog,
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    deleteConfirmText,
    setDeleteConfirmText,
    handleDeleteAccount,

    showLogoutDialog,
    setShowLogoutDialog,
    handleLogout,

    showSaveConfirmDialog,
    setShowSaveConfirmDialog,
    handleSavePersonalInfo,
    isSaving,

    showStatusDialog,
    setShowStatusDialog,
    onlineStatus,
    setOnlineStatus,
    customStatus,
    handleCustomStatusChange,
    customStatusError,
    handleUpdateOnlineStatus,
    statusExpiresIn,
    setStatusExpiresIn,
}) => {
    return (
        <>
            {/* First Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="size-5" />
                            Delete Account?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account? This will permanently remove:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-center gap-2">
                                <X className="size-4 text-red-500" />
                                All your personal information
                            </li>
                            <li className="flex items-center gap-2">
                                <X className="size-4 text-red-500" />
                                Your quotes and shipment history
                            </li>
                            <li className="flex items-center gap-2">
                                <X className="size-4 text-red-500" />
                                All notification preferences
                            </li>
                            <li className="flex items-center gap-2">
                                <X className="size-4 text-red-500" />
                                Connected services (Google Calendar, etc.)
                            </li>
                        </ul>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setShowDeleteConfirmDialog(true);
                            }}
                        >
                            Yes, I want to delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Second Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirmDialog} onOpenChange={(open) => {
                setShowDeleteConfirmDialog(open);
                if (!open) setDeleteConfirmText('');
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="size-5" />
                            Final Confirmation
                        </DialogTitle>
                        <DialogDescription>
                            This action is PERMANENT and cannot be undone. Type <strong>DELETE</strong> below to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                ⚠️ Warning: All your data will be permanently deleted and cannot be recovered.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deleteConfirm">Type DELETE to confirm:</Label>
                            <Input
                                id="deleteConfirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => {
                            setShowDeleteConfirmDialog(false);
                            setDeleteConfirmText('');
                        }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleteConfirmText !== 'DELETE'}
                            onClick={handleDeleteAccount}
                        >
                            Permanently Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogOut className="size-5 text-gray-600 dark:text-gray-400" />Log Out?
                        </DialogTitle>
                        <DialogDescription>Are you sure you want to log out of your account?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>Cancel</Button>
                        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">Log Out</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Personal Info Confirmation Dialog */}
            <Dialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-emerald-600" />Save Changes?
                        </DialogTitle>
                        <DialogDescription>Does everything look correct? Your personal information will be updated.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowSaveConfirmDialog(false)}>Go Back</Button>
                        <Button onClick={handleSavePersonalInfo} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}Yes, Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Online Status Dialog */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CircleDot className="size-5 text-emerald-600" />Set Your Status
                        </DialogTitle>
                        <DialogDescription>
                            Let others know your availability. Stays exactly as you set it — on every
                            device — until you change it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Online Status</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {onlineStatusOptions.map((option) => {
                                    const Icon = option.icon;
                                    const selected = onlineStatus === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => setOnlineStatus(option.value)}
                                            className={cn(
                                                "flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
                                                selected
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-md ring-1 ring-emerald-500/20"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center justify-center size-8 rounded-lg shrink-0 bg-black/5 dark:bg-white/10">
                                                <Icon className={cn("size-4", option.color.replace('bg-', 'text-'))} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold">{option.label}</span>
                                                    {selected && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-left leading-snug">{option.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {onlineStatus !== 'online' && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-muted-foreground" />
                                    Clear this status after
                                </Label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {STATUS_EXPIRY_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setStatusExpiresIn(opt.value)}
                                            className={cn(
                                                "py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                                statusExpiresIn === opt.value
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="customStatus">Custom Status Message</Label>
                            <Input
                                id="customStatus"
                                value={customStatus}
                                onChange={(e) => handleCustomStatusChange(e.target.value)}
                                placeholder="What's on your mind?"
                                maxLength={MAX_CUSTOM_STATUS_LENGTH}
                                className={cn(
                                    customStatusError && "border-red-500 focus-visible:ring-red-500"
                                )}
                            />
                            <div className="flex items-center justify-between">
                                {customStatusError ? (
                                    <p className="text-xs text-red-500">{customStatusError}</p>
                                ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Keep it short and fun!</p>
                                )}
                                <p className={cn(
                                    "text-xs",
                                    customStatus.length >= MAX_CUSTOM_STATUS_LENGTH ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                                )}>
                                    {customStatus.length}/{MAX_CUSTOM_STATUS_LENGTH}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
                        <Button onClick={handleUpdateOnlineStatus} disabled={isSaving || !!customStatusError}>
                            {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                            Save Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
