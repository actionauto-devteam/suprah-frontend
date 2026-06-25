// components/AlertDialog.tsx

import * as React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AlertType;
  title: string;
  message: string;
  detail?: string;
  warning?: string;
  showCloseButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    buttonColor: "bg-green-600 hover:bg-green-700",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    buttonColor: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    buttonColor: "bg-yellow-600 hover:bg-yellow-700",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
  },
  confirm: {
    icon: AlertTriangle,
    iconColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    buttonColor: "bg-primary hover:bg-primary/90",
  },
};

export function AlertDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
  detail,
  warning,
  showCloseButton = true,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const config = alertConfig[type];
  const Icon = config.icon;
  const isConfirmDialog = type === "confirm";

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (error) {
        console.error("Error in confirmation:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className="border-border bg-card text-card-foreground shadow-2xl sm:max-w-md"
      >
        <DialogHeader className="space-y-5 text-left">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 rounded-2xl p-3 ${config.bgColor} border ${config.borderColor}`}
            >
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <DialogTitle className="text-lg font-bold leading-tight text-card-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                {message}
              </DialogDescription>
            </div>
          </div>

          {(detail || warning) && (
            <div className="space-y-3 pl-0 sm:pl-16">
              {detail && (
                <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    File name
                  </p>
                  <p className="mt-1 wrap-break-word text-sm font-semibold leading-5 text-foreground">
                    {detail}
                  </p>
                </div>
              )}
              {warning && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium leading-5 text-destructive">
                  {warning}
                </p>
              )}
            </div>
          )}
        </DialogHeader>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          {isConfirmDialog ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
              >
                {cancelText}
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`${config.buttonColor} text-primary-foreground shadow-sm`}
              >
                {isLoading ? "Processing..." : confirmText}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleConfirm}
              className={config.buttonColor}
              autoFocus
            >
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier alert usage
export function useAlert() {
  const [alertState, setAlertState] = React.useState<{
    open: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = React.useCallback(
    (config: Omit<typeof alertState, "open">) => {
      setAlertState({ ...config, open: true });
    },
    [],
  );

  const hideAlert = React.useCallback(() => {
    setAlertState((prev) => ({ ...prev, open: false }));
  }, []);

  const confirm = React.useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      confirmText = "Yes",
      cancelText = "No",
    ) => {
      return new Promise<boolean>((resolve) => {
        showAlert({
          type: "confirm",
          title,
          message,
          confirmText,
          cancelText,
          onConfirm: async () => {
            await onConfirm();
            resolve(true);
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });
    },
    [showAlert],
  );

  return {
    alert: alertState,
    showAlert,
    hideAlert,
    confirm,
    AlertComponent: () => (
      <AlertDialog {...alertState} onOpenChange={hideAlert} />
    ),
  };
}
