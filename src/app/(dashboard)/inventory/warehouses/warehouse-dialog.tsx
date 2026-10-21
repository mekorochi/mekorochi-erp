"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { createWarehouse, updateWarehouse } from "../actions";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  isDefault: boolean;
}

interface Props {
  warehouse?: WarehouseData;
}

export function WarehouseDialog({ warehouse }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!warehouse;
  const action = isEdit ? updateWarehouse : createWarehouse;

  const [state, formAction, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    if (isEdit) formData.set("id", warehouse.id);
    const result = await action(_prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm" className="w-full">
            <Pencil className="h-3 w-3 mr-2" />
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Warehouse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update warehouse details" : "Create a new stock location"}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={warehouse?.name} placeholder="e.g. Main Warehouse" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required maxLength={10} defaultValue={warehouse?.code} placeholder="e.g. WH-MAIN" className="uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={warehouse?.type || "GENERAL"}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="RAW_MATERIALS">Raw Materials</SelectItem>
                <SelectItem value="PACKAGING">Packaging</SelectItem>
                <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                <SelectItem value="DISPATCH">Dispatch</SelectItem>
                <SelectItem value="QUARANTINE">Quarantine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Textarea id="address" name="address" rows={2} defaultValue={warehouse?.address} />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="isDefault" name="isDefault" value="true" defaultChecked={warehouse?.isDefault} />
            <Label htmlFor="isDefault">Set as default warehouse</Label>
          </div>

          {state && "error" in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
