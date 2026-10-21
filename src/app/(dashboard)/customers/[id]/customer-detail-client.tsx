"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft, Building2, Mail, Phone, Edit2,
  MapPin, Users, ShoppingCart, Receipt, CreditCard,
  Plus, Loader2, Trash2,
} from "lucide-react";
import {
  addCustomerAddress,
  addCustomerContact,
  deleteCustomerAddress,
  deleteCustomerContact,
} from "../actions";

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  isBilling: boolean;
  isShipping: boolean;
}

interface Contact {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

interface CustomerDetailProps {
  customer: {
    id: string;
    name: string;
    company?: string | null;
    type: string;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    pan?: string | null;
    channel?: string | null;
    segment?: string | null;
    creditLimit?: string | number | null;
    creditDays?: number | null;
    notes?: string | null;
    isActive: boolean;
    createdAt: string;
    addresses: Address[];
    contacts: Contact[];
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      paymentStatus: string;
      totalAmount: string | number;
      orderDate: string;
    }>;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      type: string;
      status: string;
      totalAmount: string | number;
      paidAmount: string | number;
      issueDate: string;
      dueDate: string;
    }>;
    payments: Array<{
      id: string;
      paymentNumber: string;
      amount: string | number;
      method: string;
      paymentDate: string;
      status: string;
    }>;
    lead?: { id: string; name: string; source: string; status: string } | null;
  };
}

type Tab = "orders" | "invoices" | "payments" | "addresses" | "contacts";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"> = {
  DRAFT: "outline",
  CONFIRMED: "info",
  PREPARING: "warning",
  PACKED: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "destructive",
  POSTED: "info",
  PAID: "success",
  PARTIALLY_PAID: "warning",
  OVERDUE: "destructive",
  VOID: "destructive",
  UNPAID: "outline",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export function CustomerDetailClient({ customer }: CustomerDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAddAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("address");
    const fd = new FormData(e.currentTarget);
    const result = await addCustomerAddress(customer.id, {
      label: fd.get("label") as string,
      addressLine1: fd.get("addressLine1") as string,
      addressLine2: (fd.get("addressLine2") as string) || undefined,
      city: fd.get("city") as string,
      state: fd.get("state") as string,
      pincode: fd.get("pincode") as string,
      isDefault: fd.get("isDefault") === "on",
    });
    setLoading(null);
    if (result.success) {
      setShowAddAddress(false);
      router.refresh();
    }
  };

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("contact");
    const fd = new FormData(e.currentTarget);
    const result = await addCustomerContact(customer.id, {
      name: fd.get("contactName") as string,
      role: (fd.get("contactRole") as string) || undefined,
      email: (fd.get("contactEmail") as string) || undefined,
      phone: (fd.get("contactPhone") as string) || undefined,
      isPrimary: fd.get("isPrimary") === "on",
    });
    setLoading(null);
    if (result.success) {
      setShowAddContact(false);
      router.refresh();
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { id: "orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" />, count: customer.orders.length },
    { id: "invoices", label: "Invoices", icon: <Receipt className="h-4 w-4" />, count: customer.invoices.length },
    { id: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" />, count: customer.payments.length },
    { id: "addresses", label: "Addresses", icon: <MapPin className="h-4 w-4" />, count: customer.addresses.length },
    { id: "contacts", label: "Contacts", icon: <Users className="h-4 w-4" />, count: customer.contacts.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-display">{customer.name}</h1>
            <Badge variant={(
              customer.type === "CORPORATE" ? "info" :
              customer.type === "WHOLESALE" ? "warning" : "default"
            ) as "default" | "info" | "warning"}>
              {customer.type.replace("_", " ")}
            </Badge>
          </div>
          {customer.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {customer.company}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/customers/${customer.id}/edit`)}>
          <Edit2 className="h-4 w-4 mr-1" /> Edit
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <dl className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline truncate">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                </div>
              )}
              {customer.channel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span>{customer.channel}</span>
                </div>
              )}
              {customer.segment && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segment</span>
                  <span>{customer.segment}</span>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <dl className="space-y-2 text-sm">
              {customer.gstin && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GSTIN</span>
                  <span className="font-mono text-xs">{customer.gstin}</span>
                </div>
              )}
              {customer.pan && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PAN</span>
                  <span className="font-mono text-xs">{customer.pan}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Days</span>
                <span>{customer.creditDays ?? 0} days</span>
              </div>
              {customer.creditLimit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span>{formatCurrency(Number(customer.creditLimit))}</span>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{customer.orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoices</span>
                <span className="font-medium">{customer.invoices.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Since</span>
                <span>{formatDate(customer.createdAt)}</span>
              </div>
              {customer.lead && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From Lead</span>
                  <button
                    className="text-primary hover:underline text-xs"
                    onClick={() => router.push(`/leads/${customer.lead!.id}`)}
                  >
                    {customer.lead.source}
                  </button>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b scrollbar-thin pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "orders" && (
        <Card>
          <CardContent className="p-0">
            {customer.orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No orders yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[order.status] || "default"} className="text-xs">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[order.paymentStatus] || "default"} className="text-xs">
                            {order.paymentStatus.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(order.totalAmount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            {customer.invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No invoices yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.invoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                      >
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="text-xs">{inv.type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[inv.status] || "default"} className="text-xs">
                            {inv.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(inv.totalAmount))}</TableCell>
                        <TableCell className="text-right">{formatDate(inv.dueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "payments" && (
        <Card>
          <CardContent className="p-0">
            {customer.payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No payments yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.payments.map((pmt) => (
                      <TableRow key={pmt.id}>
                        <TableCell className="font-medium">{pmt.paymentNumber}</TableCell>
                        <TableCell>{formatDate(pmt.paymentDate)}</TableCell>
                        <TableCell>{pmt.method.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={pmt.status === "CONFIRMED" ? "success" : "outline"} className="text-xs">
                            {pmt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(pmt.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "addresses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddAddress(!showAddAddress)}>
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </Button>
          </div>

          {showAddAddress && (
            <Card>
              <CardHeader><CardTitle className="text-base">New Address</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input name="label" defaultValue="Primary" required />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Address Line 1 *</Label>
                    <Input name="addressLine1" required />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Address Line 2</Label>
                    <Input name="addressLine2" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City *</Label>
                    <Input name="city" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State *</Label>
                    <select name="state" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pincode *</Label>
                    <Input name="pincode" required />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="isDefault" className="rounded" /> Default
                    </label>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddAddress(false)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={loading === "address"}>
                      {loading === "address" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save Address
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {customer.addresses.length === 0 && !showAddAddress ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground text-sm">
                No addresses yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customer.addresses.map((addr) => (
                <Card key={addr.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{addr.label}</span>
                        {addr.isDefault && <Badge variant="success" className="text-[10px]">Default</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={async () => {
                          await deleteCustomerAddress(addr.id, customer.id);
                          router.refresh();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-sm">{addr.addressLine2}</p>}
                    <p className="text-sm">{addr.city}, {addr.state} {addr.pincode}</p>
                    <div className="flex gap-2 mt-2">
                      {addr.isBilling && <Badge variant="outline" className="text-[10px]">Billing</Badge>}
                      {addr.isShipping && <Badge variant="outline" className="text-[10px]">Shipping</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddContact(!showAddContact)}>
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          </div>

          {showAddContact && (
            <Card>
              <CardHeader><CardTitle className="text-base">New Contact</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input name="contactName" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Input name="contactRole" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input name="contactEmail" type="email" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input name="contactPhone" type="tel" />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="isPrimary" className="rounded" /> Primary
                    </label>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddContact(false)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={loading === "contact"}>
                      {loading === "contact" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save Contact
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {customer.contacts.length === 0 && !showAddContact ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground text-sm">
                No contacts yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customer.contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="font-medium text-sm">{contact.name}</span>
                        {contact.isPrimary && <Badge variant="success" className="text-[10px] ml-2">Primary</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={async () => {
                          await deleteCustomerContact(contact.id, customer.id);
                          router.refresh();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                    <div className="flex flex-col gap-1 mt-2 text-sm">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:underline">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
