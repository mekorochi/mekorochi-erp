import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SupplierForm } from "../supplier-form";

export default async function NewSupplierPage() {
  await requirePermission("purchasing:create");

  return (
    <div>
      <PageHeader title="New Supplier" description="Add a new ingredient or packaging supplier">
        <Link href="/purchasing/suppliers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>
      <SupplierForm />
    </div>
  );
}
