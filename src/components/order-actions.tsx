import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orderId: string;
  status: string;
}

export function OrderActions({ orderId, status }: Props) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["aggregated_orders"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const completeMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "Completed" })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
    onSuccess: () => {
      toast.success("Order marked as completed");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update order"),
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
      </div>
    </TooltipProvider>
  );
}
