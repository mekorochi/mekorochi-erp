import { requirePermission } from "@/lib/auth";
import { CustomerForm } from "@/components/shared/customer-form";

export default async function NewCustomerPage() {
  await requirePermission("customers:create");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">New Customer</h1>
        <p className="text-sm text-muted-foreground">
          Add a new customer record
        </p>
      </div>
      <CustomerForm />
    </div>
  );
}
