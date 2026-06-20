import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteOrder, updateOrderStatus } from "@/lib/admin.functions";

interface Props {
  orderId: string;
  status: string;
}

export function OrderActions({ orderId, status }: Props) {
  const qc = useQueryClient();
  const completeFn = useServerFn(updateOrderStatus);
  const deleteFn = useServerFn(deleteOrder);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const completeMut = useMutation({
    mutationFn: () => completeFn({ data: { id: orderId, status: "Completed" } }),
    onSuccess: () => {
      toast.success("Order marked as completed");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update order"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: orderId } }),
    onSuccess: () => {
      toast.success("Order removed");
      setConfirmOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete order"),
  });

  const isCompleted = status === "Completed";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={isCompleted || completeMut.isPending}
              onClick={() => completeMut.mutate()}
              className="h-8 w-8 rounded-md text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 disabled:opacity-30"
            >
              {completeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="border-border bg-card text-foreground">
            {isCompleted ? "Already completed" : "Mark as completed"}
          </TooltipContent>
        </Tooltip>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                className="h-8 w-8 rounded-md text-primary hover:bg-primary/15 hover:text-primary"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="border-border bg-card text-foreground">
              Delete order
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this order?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This permanently removes the order from active data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border bg-background hover:bg-muted">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {deleteMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
