"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft, Building2, Mail, Phone, MessageCircle,
  IndianRupee, Calendar, User, Tag, Clock, Edit2,
  UserCheck, FileText, Loader2, ChevronDown,
  Gift, Target, Hash,
} from "lucide-react";
import {
  updateLeadStatus,
  addLeadActivity,
  convertLeadToCustomer,
  assignLead,
} from "../actions";
import { DEFAULT_PIPELINE_STAGES } from "@/components/shared/kanban-board";

interface Activity {
  id: string;
  type: string;
  subject?: string | null;
  notes?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  creator: { id: string; name: string };
  createdAt: string;
}

interface LeadDetailProps {
  lead: {
    id: string;
    name: string;
    company?: string | null;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
    source: string;
    sourceDetail?: string | null;
    status: string;
    pipelineStage: string;
    interest?: string | null;
    estimatedValue?: string | number | null;
    giftingOccasion?: string | null;
    estimatedQty?: number | null;
    desiredDate?: string | null;
    assignedTo?: { id: string; name: string } | null;
    customer?: { id: string; name: string } | null;
    customerId?: string | null;
    consent: boolean;
    notes?: string | null;
    lostReason?: string | null;
    wonDate?: string | null;
    lostDate?: string | null;
    tags?: string[] | null;
    createdAt: string;
    updatedAt: string;
    activities: Activity[];
  };
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Note" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "TASK", label: "Task" },
];

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: "📝",
  CALL: "📞",
  EMAIL: "✉️",
  MEETING: "🤝",
  WHATSAPP: "💬",
  FOLLOW_UP: "⏰",
  TASK: "✅",
  STATUS_CHANGE: "🔄",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "info",
  CONTACTED: "secondary",
  QUALIFIED: "info",
  PROPOSAL_SENT: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "destructive",
};

export function LeadDetailClient({ lead, users, currentUserId }: LeadDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const handleStatusChange = async (status: string) => {
    if (status === "LOST" && !lostReason) {
      setLostReason("");
      return;
    }
    setLoading("status");
    const stage = DEFAULT_PIPELINE_STAGES.find((s) => s.id === status);
    await updateLeadStatus(lead.id, {
      status,
      pipelineStage: stage?.title,
      lostReason: status === "LOST" ? lostReason : undefined,
    });
    setShowStatusMenu(false);
    setLoading(null);
    router.refresh();
  };

  const handleConvert = async () => {
    setLoading("convert");
    const result = await convertLeadToCustomer(lead.id);
    setLoading(null);
    if (result.customerId) {
      router.push(`/customers/${result.customerId}`);
    }
    router.refresh();
  };

  const handleAssign = async (userId: string) => {
    setLoading("assign");
    await assignLead(lead.id, userId);
    setLoading(null);
    router.refresh();
  };

  const handleAddActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("activity");
    const formData = new FormData(e.currentTarget);
    await addLeadActivity({
      leadId: lead.id,
      type: formData.get("type") as string,
      subject: (formData.get("subject") as string) || undefined,
      notes: (formData.get("activityNotes") as string) || undefined,
      scheduledAt: (formData.get("scheduledAt") as string) || undefined,
    });
    setShowActivityForm(false);
    setLoading(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  };

  const whatsappLink = lead.phone
    ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`
    : null;
  const mailtoLink = lead.email ? `mailto:${lead.email}` : null;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/leads")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-display">
              {lead.name}
            </h1>
            <Badge variant={(STATUS_COLORS[lead.status] || "default") as "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"}>
              {lead.pipelineStage}
            </Badge>
          </div>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {lead.company}
              {lead.role && <span>· {lead.role}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {whatsappLink && (
          <Button variant="outline" size="sm" asChild>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </a>
          </Button>
        )}
        {mailtoLink && (
          <Button variant="outline" size="sm" asChild>
            <a href={mailtoLink}>
              <Mail className="h-4 w-4 mr-1" /> Email
            </a>
          </Button>
        )}
        {lead.phone && (
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${lead.phone}`}>
              <Phone className="h-4 w-4 mr-1" /> Call
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/leads/${lead.id}/edit`)}
        >
          <Edit2 className="h-4 w-4 mr-1" /> Edit
        </Button>
        {!lead.customerId && lead.status !== "LOST" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConvert}
            disabled={loading === "convert"}
          >
            {loading === "convert" ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4 mr-1" />
            )}
            Convert to Customer
          </Button>
        )}
        {lead.customerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/customers/${lead.customerId}`)}
          >
            <User className="h-4 w-4 mr-1" /> View Customer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Interest */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {lead.email && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </dt>
                    <dd className="font-medium">{lead.email}</dd>
                  </div>
                )}
                {lead.phone && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </dt>
                    <dd className="font-medium">{lead.phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Source
                  </dt>
                  <dd className="font-medium">
                    {lead.source.replace("_", " ")}
                    {lead.sourceDetail && (
                      <span className="text-muted-foreground"> · {lead.sourceDetail}</span>
                    )}
                  </dd>
                </div>
                {lead.interest && (
                  <div>
                    <dt className="text-muted-foreground">Interest</dt>
                    <dd className="font-medium">{lead.interest}</dd>
                  </div>
                )}
                {lead.estimatedValue && Number(lead.estimatedValue) > 0 && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" /> Estimated Value
                    </dt>
                    <dd className="font-medium text-gold-deep">
                      {formatCurrency(Number(lead.estimatedValue))}
                    </dd>
                  </div>
                )}
                {lead.giftingOccasion && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" /> Gifting Occasion
                    </dt>
                    <dd className="font-medium">{lead.giftingOccasion}</dd>
                  </div>
                )}
                {lead.estimatedQty && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Estimated Qty
                    </dt>
                    <dd className="font-medium">{lead.estimatedQty}</dd>
                  </div>
                )}
                {lead.desiredDate && (
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Desired Date
                    </dt>
                    <dd className="font-medium">{formatDate(lead.desiredDate)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDateTime(lead.createdAt)}</dd>
                </div>
                {lead.consent && (
                  <div>
                    <dt className="text-muted-foreground">Consent</dt>
                    <dd><Badge variant="success" className="text-xs">Given</Badge></dd>
                  </div>
                )}
              </dl>
              {lead.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowActivityForm(!showActivityForm)}
              >
                + Add Activity
              </Button>
            </CardHeader>
            <CardContent>
              {showActivityForm && (
                <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="type" className="text-xs">Type</Label>
                      <select
                        name="type"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        required
                      >
                        {ACTIVITY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="subject" className="text-xs">Subject</Label>
                      <Input name="subject" className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="activityNotes" className="text-xs">Notes</Label>
                    <Textarea name="activityNotes" rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowActivityForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={loading === "activity"}>
                      {loading === "activity" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save Activity
                    </Button>
                  </div>
                </form>
              )}

              {lead.activities.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No activities yet
                </p>
              ) : (
                <div className="space-y-0">
                  {lead.activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <span className="text-lg leading-none">
                          {ACTIVITY_ICONS[activity.type] || "📋"}
                        </span>
                        {idx < lead.activities.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {activity.subject || activity.type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            by {activity.creator.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                        {activity.notes && (
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={lead.status === "WON" || lead.status === "LOST"}
                >
                  {lead.pipelineStage}
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showStatusMenu && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg py-1">
                    {DEFAULT_PIPELINE_STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => handleStatusChange(stage.id)}
                        disabled={loading === "status"}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {lead.wonDate && (
                <p className="text-xs text-muted-foreground">
                  Won on {formatDate(lead.wonDate)}
                </p>
              )}
              {lead.lostDate && (
                <div className="text-xs text-muted-foreground">
                  <p>Lost on {formatDate(lead.lostDate)}</p>
                  {lead.lostReason && (
                    <p className="mt-1">Reason: {lead.lostReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned To */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned To</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={lead.assignedTo?.id || ""}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={loading === "assign"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Quick Create */}
          {lead.status !== "LOST" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!lead.customerId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleConvert}
                    disabled={loading === "convert"}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Convert to Customer
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push(`/quotations/new?leadId=${lead.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Quotation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
